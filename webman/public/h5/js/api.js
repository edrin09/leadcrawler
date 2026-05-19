const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 || response.status === 601) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('登录已过期，请重新登录');
      }

      const data = await response.json();

      // 处理后端返回的 {code, message, data} 格式
      const code = String(data.code);
      if (code && code !== '200') {
        console.error('后端返回错误:', data);
        throw new Error(data.message || '请求失败');
      }

      return data.data || data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络设置');
      }
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async login(username, password) {
    return this.post('/mobile/login/accountLogin', { "parameter": { username, password } });
  }

  async logout() {
    return this.post('/mobile/login/logout');
  }

  async getUserInfo() {
    return this.get('/user');
  }

  async getList(params = {}) {
    const token = localStorage.getItem('auth_token');
    const body = {
      authenticate: {
        token: token || ''
      },
      parameter: {
        is_page: true,
        paging: {
          page: params.page || 1,
          limit: params.limit || 10
        }
      }
    };
    return this.post('/business/crawler/getList', body);
  }

  async getItemPhones(id) {
    const token = localStorage.getItem('auth_token');
    const body = {
      authenticate: {
        token: token || ''
      },
      parameter: {
        id: id
      }
    };
    return this.post('/business/phones/getItemPhones', body);
  }

  async InvalidPhoneNumber(id) {
    const token = localStorage.getItem('auth_token');
    const body = {
      authenticate: {
        token: token || ''
      },
      parameter: {
        id: id
      }
    };
    return this.post('/business/phones/saveInvalidPhone', body);
  }

  async addPhone(mallDataId, phone) {
    const token = localStorage.getItem('auth_token');
    const body = {
      authenticate: {
        token: token || ''
      },
      parameter: {
        mall_data_id: mallDataId,
        phone: phone
      }
    };
    return this.post('/business/phones/addPhone', body);
  }
}

export const api = new ApiService();
export default api;