FROM php:8.3-cli

# ==================== 系统依赖 ====================
# 更换 Debian 软件源并安装必要工具
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev libonig-dev libxml2-dev libsqlite3-dev supervisor cron \
    # Chromium/Playwright 所需的系统依赖
    libglib2.0-0 libnss3 libx11-xcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libgbm1 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# ==================== Node.js ====================
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# ==================== PHP 扩展 ====================
RUN docker-php-ext-configure gd --with-freetype --with-jpeg
RUN docker-php-ext-install pdo pdo_mysql pdo_sqlite zip gd mbstring xml bcmath sockets pcntl

# ==================== 工作目录 ====================
WORKDIR /app

# 设置 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

# ==================== Playwright 浏览器 ====================
# 全局安装 Playwright 和浏览器（挂载的代码会使用这些）
RUN npm install -g playwright && npx playwright install chromium --with-deps

# 注意：代码通过目录映射挂载，不打包进镜像

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8787 8282 3000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]