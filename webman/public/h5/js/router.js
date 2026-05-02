import { auth } from './auth.js';

class Router {
  constructor() {
    this.routes = {
      '/login': { viewId: 'login-view', hasView: true },
      '/list': { viewId: 'list-view', hasView: true, onShow: 'listViewOnShow', onHide: 'listViewOnHide' }
    };
    this.currentView = null;
    this.app = null;
  }

  setApp(app) {
    this.app = app;
  }

  init() {
    window.addEventListener('popstate', () => this.handleRoute());
    window.addEventListener('auth:login', () => {
      this.go('/list');
    });
    window.addEventListener('auth:logout', () => {
      this.go('/login');
    });
  }

  navigate(path) {
    history.pushState(null, '', path);
    this.handleRoute();
  }

  go(path) {
    this.navigate(path);
  }

  handleRoute() {
    let path = window.location.pathname;
    
    // 去掉 /h5 前缀（如果存在）
    if (path.startsWith('/h5')) {
      path = path.replace('/h5', '') || '/';
    }
    
    // 处理末尾的斜杠
    if (path.endsWith('/') && path !== '/') {
      path = path.slice(0, -1);
    }
    
    // 处理 index.html
    if (path.endsWith('/index.html')) {
      path = path.replace('/index.html', '');
    }
    
    // 默认路径处理
    if (!path || path === '/') {
      if (auth.isAuthenticated()) {
        this.navigate('/list');
        return;
      } else {
        this.navigate('/login');
        return;
      }
    }

    // 查找匹配的路由
    const route = this.routes[path];
    if (!route) {
      // 如果没有匹配的视图，根据认证状态跳转
      if (auth.isAuthenticated()) {
        this.navigate('/list');
        return;
      } else {
        this.navigate('/login');
        return;
      }
    }

    const viewId = route.viewId;
    const view = document.getElementById(viewId);
    
    if (!view) {
      console.error('View not found:', viewId);
      return;
    }

    // 检查认证状态
    if (path === '/login' && auth.isAuthenticated()) {
      this.navigate('/list');
      return;
    }
    if (path === '/list' && !auth.isAuthenticated()) {
      this.navigate('/login');
      return;
    }

    // 隐藏当前视图
    if (this.currentView && this.currentView !== viewId) {
      const prevView = document.getElementById(this.currentView);
      if (prevView) {
        prevView.classList.remove('active');
        // 调用 onHide
        if (this.currentView === 'list-view' && this.app?.listView?.onHide) {
          this.app.listView.onHide();
        }
      }
    }

    // 显示新视图
    view.classList.add('active');
    this.currentView = viewId;
    
    // 调用 onShow
    if (viewId === 'list-view' && this.app?.listView?.onShow) {
      this.app.listView.onShow();
    }
  }

  start() {
    this.handleRoute();
  }
}

export const router = new Router();
export default router;