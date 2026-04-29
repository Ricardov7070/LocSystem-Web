# Usa a imagem oficial do Node.js
FROM node:20

# Define o diretório de trabalho
WORKDIR /app

# 1. Ajuste de Permissões: Garante que o diretório pertença ao usuário 'node'
# O usuário 'node' tem UID 1000, que geralmente coincide com o seu usuário do Linux
RUN chown -R node:node /app

# 2. Muda para o usuário 'node' ANTES de instalar as dependências
USER node

# Copia o package.json com as permissões corretas
COPY --chown=node:node package.json package-lock.json* ./

# Instala as dependências usando npm (consistente com o ambiente local)
RUN npm install --legacy-peer-deps

# Copia o restante do código garantindo que o dono continue sendo o usuário node
COPY --chown=node:node . .

# Expõe a porta do Vite
EXPOSE 5174

# Inicia o servidor
CMD ["npm", "run", "dev", "--", "--host"]