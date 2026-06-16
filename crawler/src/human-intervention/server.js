const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { sendVerificationNotification } = require('./notification');

const REQUEST_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
};

class RemoteServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    this.port = parseInt(process.env.REMOTE_SERVER_PORT || '3456', 10);
    this.authToken = process.env.REMOTE_AUTH_TOKEN || 'default-token';
    this.verificationRequests = new Map();
    this.operatorSockets = new Set();
    this.crawlerSockets = new Map();
    this.setupMiddleware();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use((req, res, next) => {
      if (req.path === '/api/health') return next();
      const token = req.query.token || req.headers['x-auth-token'];
      if (req.path.startsWith('/api/') && token !== this.authToken) {
        return res.status(401).json({ error: '未授权' });
      }
      next();
    });
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });
    this.app.get('/api/requests', (req, res) => {
      const requests = Array.from(this.verificationRequests.values())
        .filter(r => r.status === REQUEST_STATUS.PENDING)
        .map(r => ({
          id: r.id,
          type: r.type,
          typeLabel: r.typeLabel,
          title: r.title,
          description: r.description,
          crawler: r.crawler,
          timestamp: r.timestamp,
          timeout: r.timeout,
        }));
      res.json({ requests });
    });
    this.app.get('/api/requests/:id', (req, res) => {
      const request = this.verificationRequests.get(req.params.id);
      if (!request) return res.status(404).json({ error: '请求不存在' });
      res.json({
        id: request.id,
        type: request.type,
        typeLabel: request.typeLabel,
        title: request.title,
        description: request.description,
        crawler: request.crawler,
        screenshot: request.screenshot,
        timestamp: request.timestamp,
        timeout: request.timeout,
        status: request.status,
      });
    });
    this.app.post('/api/requests/:id/respond', (req, res) => {
      const request = this.verificationRequests.get(req.params.id);
      if (!request) return res.status(404).json({ error: '请求不存在' });
      if (request.status !== REQUEST_STATUS.PENDING) {
        return res.status(400).json({ error: '请求已处理' });
      }
      const { response } = req.body;
      if (!response) return res.status(400).json({ error: '缺少响应内容' });
      this.resolveRequest(request.id, response);
      res.json({ success: true });
    });
    this.app.post('/api/requests/:id/cancel', (req, res) => {
      const request = this.verificationRequests.get(req.params.id);
      if (!request) return res.status(404).json({ error: '请求不存在' });
      this.cancelRequest(request.id);
      res.json({ success: true });
    });
  }

  setupSocketHandlers() {
    this.io.use((socket, next) => {
      const { token, role } = socket.handshake.auth;
      if (token !== this.authToken) {
        return next(new Error('认证失败: token 无效'));
      }
      socket.role = role || 'unknown';
      next();
    });

    this.io.on('connection', (socket) => {
      const role = socket.role;
      console.log(`[服务器] ${role} 已连接: ${socket.id}`);

      if (role === 'operator') {
        this.operatorSockets.add(socket);
        socket.emit('operator:init', {
          pendingCount: this.getPendingCount(),
        });
      } else if (role === 'crawler') {
        this.crawlerSockets.set(socket.id, socket);
      }

      socket.on('verification:request', (data) => {
        if (role !== 'crawler') return;
        const request = {
          ...data,
          status: REQUEST_STATUS.PENDING,
          createdAt: Date.now(),
        };
        this.verificationRequests.set(data.id, request);
        console.log(`[服务器] 收到验证请求: ${data.title} (${data.crawler})`);
        this.broadcastToOperators('verification:new', {
          id: request.id,
          type: request.type,
          typeLabel: request.typeLabel,
          title: request.title,
          description: request.description,
          crawler: request.crawler,
          timestamp: request.timestamp,
          timeout: request.timeout,
        });
        if (process.env.NOTIFY_ON_VERIFICATION !== 'false') {
          sendVerificationNotification(request);
        }
        setTimeout(() => {
          const current = this.verificationRequests.get(data.id);
          if (current && current.status === REQUEST_STATUS.PENDING) {
            current.status = REQUEST_STATUS.TIMEOUT;
            socket.emit('verification:resolved', { id: data.id, response: null, status: REQUEST_STATUS.TIMEOUT });
            this.broadcastToOperators('verification:updated', {
              id: data.id, status: REQUEST_STATUS.TIMEOUT,
            });
            console.log(`[服务器] 验证请求超时: ${data.title}`);
          }
        }, data.timeout || 300000);
      });

      socket.on('verification:respond', (data) => {
        if (role !== 'operator') return;
        this.resolveRequest(data.id, data.response);
      });

      socket.on('verification:cancel', (data) => {
        if (role !== 'operator') return;
        this.cancelRequest(data.id);
      });

      socket.on('verification:timeout', (data) => {
        const request = this.verificationRequests.get(data.id);
        if (request && request.status === REQUEST_STATUS.PENDING) {
          request.status = REQUEST_STATUS.TIMEOUT;
          this.broadcastToOperators('verification:updated', {
            id: data.id, status: REQUEST_STATUS.TIMEOUT,
          });
        }
      });

      socket.on('disconnect', () => {
        if (role === 'operator') {
          this.operatorSockets.delete(socket);
        } else if (role === 'crawler') {
          this.crawlerSockets.delete(socket.id);
          const crawlerRequests = Array.from(this.verificationRequests.values())
            .filter(r => r.status === REQUEST_STATUS.PENDING);
          for (const req of crawlerRequests) {
            this.cancelRequest(req.id);
          }
        }
        console.log(`[服务器] ${role} 已断开: ${socket.id}`);
      });
    });
  }

  resolveRequest(id, response) {
    const request = this.verificationRequests.get(id);
    if (!request || request.status !== REQUEST_STATUS.PENDING) return;
    request.status = REQUEST_STATUS.RESOLVED;
    request.response = response;
    request.resolvedAt = Date.now();
    const crawlerSocket = this.crawlerSockets.get(request._crawlerSocketId);
    if (crawlerSocket) {
      crawlerSocket.emit('verification:resolved', { id, response, status: REQUEST_STATUS.RESOLVED });
    }
    this.broadcastToOperators('verification:updated', {
      id, status: REQUEST_STATUS.RESOLVED,
    });
    console.log(`[服务器] 验证请求已处理: ${request.title}`);
  }

  cancelRequest(id) {
    const request = this.verificationRequests.get(id);
    if (!request || request.status !== REQUEST_STATUS.PENDING) return;
    request.status = REQUEST_STATUS.CANCELLED;
    const crawlerSocket = this.crawlerSockets.get(request._crawlerSocketId);
    if (crawlerSocket) {
      crawlerSocket.emit('verification:cancelled', { id });
    }
    this.broadcastToOperators('verification:updated', {
      id, status: REQUEST_STATUS.CANCELLED,
    });
  }

  broadcastToOperators(event, data) {
    for (const socket of this.operatorSockets) {
      socket.emit(event, data);
    }
  }

  getPendingCount() {
    let count = 0;
    for (const req of this.verificationRequests.values()) {
      if (req.status === REQUEST_STATUS.PENDING) count++;
    }
    return count;
  }

  start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log('══════════════════════════════════════════');
        console.log('  远程交互服务器已启动');
        console.log(`  地址: http://0.0.0.0:${this.port}`);
        console.log(`  Web UI: http://localhost:${this.port}`);
        console.log('  健康检查: http://localhost:' + this.port + '/api/health');
        console.log('══════════════════════════════════════════');
        resolve();
      });
    });
  }

  stop() {
    this.io.close();
    this.server.close();
  }
}

module.exports = RemoteServer;