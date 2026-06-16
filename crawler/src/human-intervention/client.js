const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

const VERIFICATION_TYPES = {
  CAPTCHA: { type: 'captcha', label: '验证码' },
  LOGIN_QR: { type: 'login_qr', label: '二维码登录' },
  LOGIN_MODAL: { type: 'login_modal', label: '登录弹窗' },
  SMS_CODE: { type: 'sms_code', label: '短信验证码' },
  ANTI_BOT: { type: 'anti_bot', label: '反爬验证' },
  CUSTOM: { type: 'custom', label: '自定义验证' },
};

const REQUEST_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
};

class HumanInterventionClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.authToken = '';
    this.pendingRequests = new Map();
  }

  async connect(serverUrl, token) {
    this.authToken = token;
    return new Promise((resolve) => {
      this.socket = io(serverUrl, {
        auth: { token, role: 'crawler' },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity,
      });
      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`[人工干预] 已连接到远程服务器: ${serverUrl}`);
        resolve(true);
      });
      this.socket.on('connect_error', (err) => {
        console.log(`[人工干预] 连接失败: ${err.message}`);
        resolve(false);
      });
      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log('[人工干预] 与远程服务器断开连接');
      });
      this.socket.on('verification:resolved', (data) => {
        const pending = this.pendingRequests.get(data.id);
        if (pending) {
          pending.resolve({ status: REQUEST_STATUS.RESOLVED, response: data.response });
          this.pendingRequests.delete(data.id);
        }
      });
      this.socket.on('verification:cancelled', (data) => {
        const pending = this.pendingRequests.get(data.id);
        if (pending) {
          pending.resolve({ status: REQUEST_STATUS.CANCELLED, response: null });
          this.pendingRequests.delete(data.id);
        }
      });
      setTimeout(() => {
        if (!this.connected) resolve(false);
      }, 5000);
    });
  }

  async ensureConnected() {
    if (this.connected) return true;
    const serverUrl = process.env.REMOTE_SERVER_URL || `http://localhost:${process.env.REMOTE_SERVER_PORT || 3456}`;
    const token = process.env.REMOTE_AUTH_TOKEN || 'default-token';
    return this.connect(serverUrl, token);
  }

  async requestVerification({ type, screenshot, title, description, timeout = 300000 }) {
    await this.ensureConnected();
    if (!this.connected) {
      console.log('[人工干预] 无法连接到远程服务器，跳过验证请求');
      return { status: REQUEST_STATUS.CANCELLED, response: null };
    }
    const id = uuidv4();
    const request = {
      id,
      type: type.type || type,
      typeLabel: type.label || '验证',
      screenshot,
      title: title || '需要人工验证',
      description: description || '',
      crawler: process.env.CRAWLER_NAME || 'unknown',
      timeout,
      timestamp: Date.now(),
      status: REQUEST_STATUS.PENDING,
    };
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.socket.emit('verification:timeout', { id });
        console.log(`[人工干预] 验证请求超时 (${Math.round(timeout / 1000)}秒): ${title}`);
        resolve({ status: REQUEST_STATUS.TIMEOUT, response: null });
      }, timeout);
      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        request,
      });
      this.socket.emit('verification:request', request);
      console.log(`[人工干预] 已发送验证请求: ${title} (超时 ${Math.round(timeout / 60000)} 分钟)`);
    });
  }

  async requestLoginModal(screenshot, description = '检测到登录弹窗，请扫码或登录') {
    return this.requestVerification({
      type: VERIFICATION_TYPES.LOGIN_MODAL,
      screenshot,
      title: '登录弹窗',
      description,
    });
  }

  async requestCaptcha(screenshot, description = '检测到验证码，请输入') {
    return this.requestVerification({
      type: VERIFICATION_TYPES.CAPTCHA,
      screenshot,
      title: '验证码',
      description,
    });
  }

  async requestAntiBot(screenshot, description = '检测到反爬验证') {
    return this.requestVerification({
      type: VERIFICATION_TYPES.ANTI_BOT,
      screenshot,
      title: '反爬验证',
      description,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}

const defaultClient = new HumanInterventionClient();

module.exports = {
  HumanInterventionClient,
  defaultClient,
  VERIFICATION_TYPES,
  REQUEST_STATUS,
};