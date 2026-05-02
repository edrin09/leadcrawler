import api from '../api.js';
import auth from '../auth.js';

class LoginView {
  constructor(container) {
    this.container = container;
    this.isLoading = false;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-logo">
          <h1>数据平台</h1>
          <p>请登录后继续访问</p>
        </div>
        <form id="login-form">
          <div class="form-group" id="username-group">
            <label for="username">用户名</label>
            <input type="text" id="username" name="username" placeholder="请输入用户名" autocomplete="username">
            <div class="error-message">请输入用户名</div>
          </div>
          <div class="form-group" id="password-group">
            <label for="password">密码</label>
            <input type="password" id="password" name="password" placeholder="请输入密码" autocomplete="current-password">
            <div class="error-message">请输入密码</div>
          </div>
          <div class="form-group" id="error-group" style="display: none;">
            <div class="error-message" id="login-error"></div>
          </div>
          <div class="form-group" id="success-group" style="display: none;">
            <div class="success-message" id="login-success"></div>
          </div>
          <button type="submit" class="login-btn" id="login-btn">登 录</button>
        </form>
      </div>
    `;
  }

  bindEvents() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (usernameInput) {
      usernameInput.addEventListener('input', () => this.clearError('username-group'));
    }
    if (passwordInput) {
      passwordInput.addEventListener('input', () => this.clearError('password-group'));
    }
  }

  showError(groupId, message) {
    const group = document.getElementById(groupId);
    if (group) {
      group.classList.add('error');
      group.style.display = 'block';
      if (message) {
        const errorEl = group.querySelector('.error-message');
        if (errorEl) {
          errorEl.textContent = message;
        }
      }
    }
  }

  showSuccess(message) {
    const group = document.getElementById('success-group');
    if (group) {
      group.style.display = 'block';
      const successEl = document.getElementById('login-success');
      if (successEl) {
        successEl.textContent = message;
      }
    }
  }

  hideMessages() {
    const errorGroup = document.getElementById('error-group');
    const successGroup = document.getElementById('success-group');
    if (errorGroup) {
      errorGroup.style.display = 'none';
    }
    if (successGroup) {
      successGroup.style.display = 'none';
    }
  }

  clearError(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
      group.classList.remove('error');
    }
  }

  hideError() {
    const errorGroup = document.getElementById('error-group');
    if (errorGroup) {
      errorGroup.style.display = 'none';
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    const btn = document.getElementById('login-btn');
    if (btn) {
      btn.disabled = loading;
      btn.classList.toggle('loading', loading);
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    let hasError = false;

    if (!username) {
      this.showError('username-group', '请输入用户名');
      hasError = true;
    }

    if (!password) {
      this.showError('password-group', '请输入密码');
      hasError = true;
    }

    if (hasError) return;

    this.setLoading(true);
    this.hideMessages();

    try {
      const response = await api.login(username, password);
      const userInfo = response?.user_info;
      const token = userInfo?.expansion?.token;
      if (!token) {
        this.showError('error-group', '登录失败，未获取到有效token');
        return;
      }
      
      this.showSuccess('登录成功，正在跳转...');
      auth.login(token, userInfo);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth:login'));
      }, 500);
    } catch (error) {
      this.showError('error-group', error.message || '登录失败，请重试');
    } finally {
      this.setLoading(false);
    }
  }
}

export default LoginView;