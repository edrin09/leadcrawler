import api from '../api.js';
import auth from '../auth.js';

class ListView {
  constructor(container) {
    this.container = container;
    this.page = 1;
    this.limit = 10;
    this.isLoading = false;
    this.hasMore = true;
    this.listData = [];
    this.currentItem = null;
    this.render();
    this.bindEvents();
  }

  render() {
    const user = auth.getUser();
    const avatar = user?.username?.charAt(0).toUpperCase() || 'U';

    this.container.innerHTML = `
      <header class="list-header">
        <h1>数据列表</h1>
        <div class="user-info">
          <div class="dropdown-wrapper">
            <div class="user-avatar" id="user-avatar">${avatar}</div>
          </div>
        </div>
      </header>
      <main class="list-content">
        <div id="loading-indicator" class="loading-indicator">
          <div class="spinner"></div>
          <span class="loading-text">加载中...</span>
        </div>
        <div id="error-container" class="error-container" style="display: none;">
          <div class="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <p class="error-title">加载失败</p>
          <p class="error-desc" id="error-desc">数据加载失败，请稍后重试</p>
          <button type="button" class="retry-btn" id="retry-btn">重新加载</button>
        </div>
        <div id="list-container" class="list-container" style="display: none;"></div>
        <div id="empty-state" class="empty-state" style="display: none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <p>暂无数据</p>
        </div>
        <div id="load-more-container" class="load-more-container" style="display: none;">
          <button type="button" class="load-more-btn" id="load-more-btn">加载更多</button>
        </div>
     <div id="no-more-data" class="no-more-data" style="display: none;">已加载全部数据</div>
        </main>
        <div id="phone-modal" class="modal-overlay" style="display: none;">
          <div class="modal-container">
            <div class="modal-header">
              <h3>手机号列表</h3>
              <button type="button" class="modal-close" id="phone-modal-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div id="phone-list" class="phone-list">
                <div class="empty-phone">暂无手机号</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="add-phone-btn" id="add-phone-btn">添加手机号</button>
            </div>
          </div>
        </div>
        <div id="add-phone-modal" class="modal-overlay" style="display: none;">
          <div class="modal-container small">
            <div class="modal-header">
              <h3>添加手机号</h3>
              <button type="button" class="modal-close" id="add-phone-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>手机号</label>
                <input type="tel" id="phone-input" placeholder="请输入手机号" maxlength="11">
                <div class="error-message" id="phone-error"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-cancel" id="add-phone-cancel">取消</button>
              <button type="button" class="btn-confirm" id="add-phone-submit">确认添加</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('user-avatar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('logout-menu')?.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      document.getElementById('logout-menu')?.classList.remove('show');
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      auth.logout();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    });

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.loadList(true);
    });

    document.getElementById('load-more-btn')?.addEventListener('click', () => {
      this.loadMore();
    });

    window.addEventListener('scroll', () => {
      if (this.shouldAutoLoad()) {
        this.loadMore();
      }
    });

    document.getElementById('phone-modal-close')?.addEventListener('click', () => {
      this.closePhoneModal();
    });

    document.getElementById('phone-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('phone-modal')) {
        this.closePhoneModal();
      }
    });

    document.getElementById('add-phone-btn')?.addEventListener('click', () => {
      this.showAddPhoneModal();
    });

    document.getElementById('add-phone-close')?.addEventListener('click', () => {
      this.closeAddPhoneModal();
    });

    document.getElementById('add-phone-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('add-phone-modal')) {
        this.closeAddPhoneModal();
      }
    });

    document.getElementById('add-phone-cancel')?.addEventListener('click', () => {
      this.closeAddPhoneModal();
    });

    document.getElementById('add-phone-submit')?.addEventListener('click', () => {
      this.addPhoneNumber();
    });

    document.getElementById('phone-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addPhoneNumber();
      }
    });
  }

  shouldAutoLoad() {
    if (!this.hasMore || this.isLoading) return false;
    const btn = document.getElementById('load-more-btn');
    if (!btn || btn.style.display === 'none') return false;

    const rect = btn.getBoundingClientRect();
    return rect.top < window.innerHeight + 100;
  }

  showLoading() {
    const loading = document.getElementById('loading-indicator');
    const error = document.getElementById('error-container');
    const list = document.getElementById('list-container');
    const empty = document.getElementById('empty-state');
    const loadMore = document.getElementById('load-more-container');
    const noMore = document.getElementById('no-more-data');

    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    if (list) list.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (loadMore) loadMore.style.display = 'none';
    if (noMore) noMore.style.display = 'none';
  }

  showError(message = '数据加载失败，请稍后重试') {
    const loading = document.getElementById('loading-indicator');
    const error = document.getElementById('error-container');
    const errorDesc = document.getElementById('error-desc');
    const list = document.getElementById('list-container');
    const empty = document.getElementById('empty-state');
    const loadMore = document.getElementById('load-more-container');
    const noMore = document.getElementById('no-more-data');

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'flex';
    if (errorDesc) errorDesc.textContent = message;
    if (list) list.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (loadMore) loadMore.style.display = 'none';
    if (noMore) noMore.style.display = 'none';
  }

  showContent() {
    const loading = document.getElementById('loading-indicator');
    const error = document.getElementById('error-container');
    const list = document.getElementById('list-container');

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (list) list.style.display = 'flex';
  }

  showEmpty() {
    const loading = document.getElementById('loading-indicator');
    const error = document.getElementById('error-container');
    const list = document.getElementById('list-container');
    const empty = document.getElementById('empty-state');
    const loadMore = document.getElementById('load-more-container');
    const noMore = document.getElementById('no-more-data');

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (list) list.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    if (loadMore) loadMore.style.display = 'none';
    if (noMore) noMore.style.display = 'none';
  }

  showLoadMore() {
    const loadMore = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const noMore = document.getElementById('no-more-data');

    if (loadMore) loadMore.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.disabled = false;
    if (noMore) noMore.style.display = 'none';
  }

  showNoMore() {
    const loadMore = document.getElementById('load-more-container');
    const noMore = document.getElementById('no-more-data');

    if (loadMore) loadMore.style.display = 'none';
    if (noMore) noMore.style.display = 'block';
  }

  hideLoadMore() {
    const loadMore = document.getElementById('load-more-container');
    const noMore = document.getElementById('no-more-data');

    if (loadMore) loadMore.style.display = 'none';
    if (noMore) noMore.style.display = 'none';
  }

  setLoadMoreLoading(loading) {
    const btn = document.getElementById('load-more-btn');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? '加载中...' : '加载更多';
    }
  }

  async loadList(reset = false) {
    if (this.isLoading) return;

    this.isLoading = true;

    if (reset) {
      this.page = 1;
      this.hasMore = true;
      this.listData = [];
      this.showLoading();
    }

    try {
      const response = await api.getList({ page: this.page, limit: this.limit });
      this.handleSuccess(response, reset);
    } catch (error) {
      this.handleError(error, reset);
    } finally {
      this.isLoading = false;
    }
  }

  handleSuccess(response, reset) {
    const { list, paginated } = response;

    if (reset) {
      this.listData = list || [];
      if (this.listData.length === 0) {
        this.showEmpty();
        return;
      }
      this.renderList(this.listData);
      this.showContent();
    } else {
      this.listData = [...this.listData, ...(list || [])];
      this.appendList(list || []);
    }

    if (paginated) {
      this.hasMore = paginated.more === '1';
    } else {
      this.hasMore = list?.length >= this.limit;
    }

    if (this.hasMore) {
      this.showLoadMore();
    } else {
      if (this.listData.length > 0) {
        this.showNoMore();
      }
    }
  }

  handleError(error, reset) {
    if (reset && this.listData.length === 0) {
      this.showError(error.message);
    } else {
      const loadMoreContainer = document.getElementById('load-more-container');
      if (loadMoreContainer) {
        loadMoreContainer.style.display = 'block';
        const btn = document.getElementById('load-more-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '加载失败，点击重试';
        }
      }
    }
  }

  renderList(items) {
    const container = document.getElementById('list-container');
    if (!container) return;

    container.innerHTML = items.map(item => this.createItemHTML(item)).join('');

    container.querySelectorAll('.list-item').forEach((el, index) => {
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.view-phones-btn')) {
          this.handleItemClick(this.listData[index]);
        }
      });
    });

    container.querySelectorAll('.view-phones-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showPhoneModal(this.listData[index]);
      });
    });
  }

  appendList(items) {
    const container = document.getElementById('list-container');
    if (!container) return;

    const html = items.map(item => this.createItemHTML(item)).join('');
    container.insertAdjacentHTML('beforeend', html);

    container.querySelectorAll('.list-item:not([data-bound])').forEach((el, index) => {
      el.setAttribute('data-bound', 'true');
      el.addEventListener('click', (e) => {
        if (!e.target.closest('.view-phones-btn')) {
          this.handleItemClick(items[index]);
        }
      });
    });

    container.querySelectorAll('.view-phones-btn:not([data-bound])').forEach((btn, index) => {
      btn.setAttribute('data-bound', 'true');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showPhoneModal(items[index]);
      });
    });
  }

  createItemHTML(item) {
    const image_url = item.image_url ? this.escapeHtml(item.image_url.trim()) : '';
    const phoneCount = item.phones?.length || 0;

    return `
      <div class="list-item">
        ${image_url ? `<img src="${image_url}" alt="${this.escapeHtml(item.title || '')}" class="item-image" />` : ''}
        <div class="item-content">
          <h3 class="item-title">${this.escapeHtml(item.title || '')}</h3>
          <div class="item-meta">
            <span>区域: ${item.district}</span>
            <span>价格: ${item.price}</span>
          </div>
          <div class="item-meta">
            <span>来源: ${item.source}</span>
            <span>采集时间: ${item.create_time}</span>
          </div>
        </div>
        <button type="button" class="view-phones-btn" data-item-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span>查看手机号${phoneCount > 0 ? `(${phoneCount})` : ''}</span>
        </button>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async showPhoneModal(item) {
    this.currentItem = item;
    const modal = document.getElementById('phone-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this.renderPhoneList(true);

      try {
        const response = await api.getItemPhones(item.id);
        this.currentItem.phones = response || [];
        this.renderPhoneList(false);
      } catch (error) {
        console.error('获取手机号失败:', error);
        this.renderPhoneList(false);
      }
    }
  }

  closePhoneModal() {
    const modal = document.getElementById('phone-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  showAddPhoneModal() {
    const modal = document.getElementById('add-phone-modal');
    const input = document.getElementById('phone-input');
    const error = document.getElementById('phone-error');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    if (input) {
      input.value = '';
      input.focus();
    }
    if (error) {
      error.style.display = 'none';
    }
  }

  closeAddPhoneModal() {
    const modal = document.getElementById('add-phone-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  async addPhoneNumber() {
    const input = document.getElementById('phone-input');
    const error = document.getElementById('phone-error');
    const phone = input?.value?.trim();

    if (!phone) {
      if (error) {
        error.textContent = '请输入手机号';
        error.style.display = 'block';
      }
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      if (error) {
        error.textContent = '请输入正确的手机号';
        error.style.display = 'block';
      }
      return;
    }

    if (!this.currentItem) {
      if (error) {
        error.textContent = '操作失败';
        error.style.display = 'block';
      }
      return;
    }

    const phoneExists = this.currentItem.phones?.some(p => p.phone === phone);
    if (phoneExists) {
      if (error) {
        error.textContent = '该手机号已存在';
        error.style.display = 'block';
      }
      return;
    }

    try {
      await api.addPhone(this.currentItem.id, phone);
      alert('添加成功');
      this.closeAddPhoneModal();
      this.showPhoneModal(this.currentItem);
    } catch (err) {
      console.error('添加手机号失败:', err);
      if (error) {
        error.textContent = '添加失败，请稍后重试';
        error.style.display = 'block';
      }
    }
  }

  async deletePhoneNumber(index, phoneId) {
    if (!this.currentItem?.phones) return;

    if (!confirm('确定要删除该手机号吗？')) {
      return;
    }

    try {
      await api.InvalidPhoneNumber(phoneId);
      this.currentItem.phones.splice(index, 1);
      this.renderPhoneList(false);
    } catch (error) {
      console.error('删除手机号失败:', error);
      alert('删除失败，请稍后重试');
    }
  }

  renderPhoneList(loading = false) {
    const phoneList = document.getElementById('phone-list');
    if (!phoneList || !this.currentItem) return;

    if (loading) {
      phoneList.innerHTML = '<div class="phone-loading">加载中...</div>';
      return;
    }

    const phones = this.currentItem.phones || [];

    if (phones.length === 0) {
      phoneList.innerHTML = '<div class="empty-phone">暂无手机号</div>';
      return;
    }

    phoneList.innerHTML = phones.map((phoneItem, index) => `
      <div class="phone-item">
        <a href="tel:${phoneItem.phone}" class="phone-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span class="phone-number">${phoneItem.phone}</span>
        </a>
        <button type="button" class="action-btn delete-btn" onclick="document.getElementById('list-view').__listView.deletePhoneNumber(${index}, ${phoneItem.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `).join('');
  }

  handleItemClick(item) {
    if (item.detail_url) {
      window.open(item.detail_url, '_blank', 'noopener,noreferrer');
    }
  }

  async loadMore() {
    if (!this.hasMore || this.isLoading) return;

    this.page++;
    this.setLoadMoreLoading(true);
    this.isLoading = true;

    try {
      const response = await api.getList({ page: this.page, limit: this.limit });
      this.handleSuccess(response, false);
    } catch (error) {
      this.page--;
      this.handleError(error, false);
    } finally {
      this.isLoading = false;
      this.setLoadMoreLoading(false);
    }
  }

  onShow() {
    if (this.listData.length === 0) {
      this.loadList(true);
    }
  }

  onHide() {
    this.hideLoadMore();
  }
}

export default ListView;