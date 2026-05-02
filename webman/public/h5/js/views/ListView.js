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
      el.addEventListener('click', () => this.handleItemClick(this.listData[index]));
    });
  }

  appendList(items) {
    const container = document.getElementById('list-container');
    if (!container) return;

    const html = items.map(item => this.createItemHTML(item)).join('');
    container.insertAdjacentHTML('beforeend', html);

    container.querySelectorAll('.list-item:not([data-bound])').forEach((el, index) => {
      el.setAttribute('data-bound', 'true');
      const dataIndex = this.listData.indexOf(items[index]);
      if (dataIndex !== -1) {
        el.addEventListener('click', () => this.handleItemClick(items[index]));
      }
    });
  }

  createItemHTML(item) {
    const imageUrl = item.imageUrl ? this.escapeHtml(item.imageUrl.trim()) : '';

    return `
      <div class="list-item">
        ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHtml(item.title || '')}" class="item-image" />` : ''}
        <div class="item-content">
          <h3 class="item-title">${this.escapeHtml(item.title || '')}</h3>
          <div class="item-meta">
            <span>区域: ${item.district}</span>
            <span>价格: ${item.price}</span>
          </div>
          <div class="item-meta">
            <span>来源: ${item.source}</span>
            <span>采集时间: ${item.crawler_time}</span>
          </div>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  handleItemClick(item) {
    if (item.detailUrl) {
      window.open(item.detailUrl, '_blank', 'noopener,noreferrer');
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