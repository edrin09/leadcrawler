FROM php:8.3-cli

LABEL maintainer="DevOps Team"
LABEL description="Crawler Environment with Node.js, PHP 8.3 and SQLite"

ENV NODE_VERSION=20.x
ENV APP_DIR=/var/www/crawler
ENV PATH="/root/.npm-global/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg \
    ca-certificates \
    sqlite3 \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get update && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && npm config set prefix '/root/.npm-global' \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_sqlite \
    sqlite3 \
    curl \
    mbstring \
    json \
    zip \
    && docker-php-ext-enable \
    pdo \
    pdo_sqlite \
    sqlite3 \
    curl \
    mbstring \
    json \
    zip

RUN npm install -g playwright \
    && npx playwright install --with-deps

WORKDIR ${APP_DIR}

COPY crawler/package*.json ./crawler/
RUN cd crawler && npm ci --only=production

COPY webman/composer.* ./webman/
RUN cd webman && composer install --no-dev --optimize-autoloader

COPY crawler/ ./crawler/
COPY webman/ ./webman/

RUN mkdir -p ${APP_DIR}/data \
    && chown -R www-data:www-data ${APP_DIR}

ENV NODE_ENV=production
ENV DB_PATH=${APP_DIR}/data/crawler.sqlite

EXPOSE 8787

CMD ["php", "webman/start.php", "start"]