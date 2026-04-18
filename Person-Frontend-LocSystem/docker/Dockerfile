# Usa a imagem oficial mais recente do Node.js (slim)
FROM node:20

# Ativa o corepack e instala o Yarn mais recente
RUN corepack enable && corepack prepare yarn@stable --activate

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia só o package.json (remove o yarn.lock)
COPY package.json ./

# Instala dependências
RUN yarn install

# Copia o restante do código
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5174

# Inicia o servidor de desenvolvimento com Vite
CMD ["yarn", "dev", "--host"]