FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3008

# Variável de ambiente para produção
ENV NODE_ENV=production

# Comando de inicialização
CMD ["node", "src/server.js"]
