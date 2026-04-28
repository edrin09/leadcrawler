class App {
  constructor() {
    this.apiUrl = '/api/listings';
    this.page = 1;
    this.limit = 10;
    this.isLoading = false;
    this.hasMore = true;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadListings();
  }

  bindEvents() {
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.loadListings(true);
    });

    document.getElementById('load-more-btn').addEventListener('click', () => {
      this.loadMoreListings();
    });
  }

  async loadListings(reset = false) {
    if (this.isLoading) return;

    this.isLoading = true;

    if (reset) {
      this.page = 1;
      this.hasMore = true;
      document.getElementById('content').classList.add('hidden');
      document.getElementById('error').classList.add('hidden');
    }

    document.getElementById('loading').classList.remove('hidden');

    try {
      const response = await fetch(`${this.apiUrl}?page=${this.page}&limit=${this.limit}`);

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const data = await response.json();

      if (reset) {
        this.renderListings(data.data);
      } else {
        this.appendListings(data.data);
      }

      if (data.pagination && data.pagination.page >= data.pagination.pages) {
        this.hasMore = false;
        document.getElementById('load-more').classList.add('hidden');
        document.getElementById('no-more').classList.remove('hidden');
      }

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.remove('hidden');

    } catch (error) {
      console.error('加载数据失败:', error);
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('content').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
      document.getElementById('error-message').textContent =
        error.message.includes('Failed to fetch') ? '网络连接失败，请检查网络设置' :
          error.message.includes('HTTP') ? '服务器响应异常' : '数据加载失败，请稍后重试';
    } finally {
      this.isLoading = false;
    }
  }

  async loadMoreListings() {
    if (!this.hasMore || this.isLoading) return;

    this.page++;
    await this.loadListings();
  }

  renderListings(listings) {
    const container = document.getElementById('listings-container');
    container.innerHTML = '';

    listings.forEach(listing => {
      const card = this.createCard(listing);
      container.appendChild(card);
    });

    this.setupLazyLoad();
  }

  appendListings(listings) {
    const container = document.getElementById('listings-container');

    listings.forEach(listing => {
      const card = this.createCard(listing);
      container.appendChild(card);
    });

    this.setupLazyLoad();
  }

  createCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    card.dataset.url = listing.link_url;

    card.innerHTML = `
      <div class="card-image">
        <div class="placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <img data-src="${listing.image_url}" alt="${listing.title}" class="lazy-image" />
        <div class="image-error hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${this.escapeHtml(listing.title)}</h3>
        <div class="card-meta">
          <span class="card-price">¥${listing.price.toLocaleString()}<span>/月</span></span>
          <span class="card-area">${this.escapeHtml(listing.area)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url) {
        window.open(url, '_blank');
      }
    });

    return card;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupLazyLoad() {
    const lazyImages = document.querySelectorAll('.lazy-image');

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const placeholder = img.previousElementSibling;
          const errorDiv = img.nextElementSibling;

          img.onload = () => {
            placeholder.classList.add('hidden');
            img.classList.remove('hidden');
            errorDiv.classList.add('hidden');
          };

          img.onerror = () => {
            placeholder.classList.add('hidden');
            img.classList.add('hidden');
            errorDiv.classList.remove('hidden');
          };

          img.src = img.dataset.src;
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    lazyImages.forEach(img => {
      imageObserver.observe(img);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  }
});