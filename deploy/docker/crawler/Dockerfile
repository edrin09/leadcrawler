FROM php:8.2-cli

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NODE_ENV=production \
    COMPOSER_HOME=/tmp/composer

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg \
    ca-certificates \
    git \
    unzip \
    supervisor \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-wqy-zenhei \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libu2f-udev \
    libvulkan1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    sqlite3 \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-eng \
    imagemagick \
    procps \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mysqli \
    zip \
    gd \
    mbstring \
    xml \
    bcmath \
    pcntl \
    sockets

RUN pecl install redis && docker-php-ext-enable redis

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN npx playwright install-deps chromium 2>/dev/null || true

RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && \
    php composer-setup.php --install-dir=/usr/local/bin --filename=composer && \
    php -r "unlink('composer-setup.php');"

WORKDIR /app

COPY crawler/package*.json /app/crawler/
RUN cd /app/crawler && npm ci --omit=dev && npx playwright install chromium

COPY webman/composer.json webman/composer.lock* /app/webman/
RUN cd /app/webman && composer install --no-dev --no-interaction --optimize-autoloader --no-scripts

COPY crawler/ /app/crawler/
COPY webman/ /app/webman/

RUN cd /app/webman && composer dump-autoload --optimize && \
    mkdir -p /app/webman/runtime/logs /app/webman/runtime/views /app/webman/runtime/windows && \
    chmod -R 777 /app/webman/runtime

RUN mkdir -p /app/crawler/output /app/crawler/logs /app/crawler/screenshots /app/crawler/storage

COPY deploy/docker/crawler/entrypoint.sh /entrypoint.sh
COPY deploy/docker/crawler/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -f "node\|php" || exit 1

ENTRYPOINT ["/entrypoint.sh"]