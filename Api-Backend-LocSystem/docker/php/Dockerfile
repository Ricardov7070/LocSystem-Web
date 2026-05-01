# Usa a imagem oficial do PHP 8.1 com FPM
FROM php:8.1-fpm

# Atualizando o sistema e instalando dependências básicas
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    libzip-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libpq-dev \
    procps \
    && apt-get clean

# Instalando extensões PHP adicionais
RUN docker-php-ext-install \
    zip \
    mbstring \
    curl \
    xml \
    bcmath \
    pdo \
    pdo_mysql

# Ativa extensão do MySQL
RUN docker-php-ext-install pdo pdo_mysql

# Instalando o Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin \
    --filename=composer

# Instalando o Node.js na versão 18.16.0
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g n && \
    n 18.16.0 && \
    apt-get remove -y nodejs && \
    apt-get autoremove -y

# Definindo o diretório de trabalho
WORKDIR /var/www/laravel

# Limpe os arquivos temporários para reduzir o tamanho da imagem
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copiando arquivos do projeto para o container
COPY . .

# Instalando dependências do Composer
RUN composer update darkaonline/l5-swagger --no-interaction --prefer-dist --optimize-autoloader

# Ajuste de permissão ANTES do volume ser montado (útil para build de prod)
RUN chown -R www-data:www-data /var/www/laravel/storage /var/www/laravel/bootstrap/cache

# Expondo a porta do PHP-FPM
EXPOSE 5000

# Inicia o PHP-FPM no container
CMD ["php-fpm"]
