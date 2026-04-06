FROM node:20-alpine
WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/package.json ./package.json
RUN npm install --production

# Copy backend source
COPY backend/ .

# shared package dist — backend imports ARENAS and other types from here
COPY packages/shared/dist/ /packages/shared/dist/

EXPOSE 8080
CMD ["node", "server.js"]
