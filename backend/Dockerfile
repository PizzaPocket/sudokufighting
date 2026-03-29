FROM node:20-alpine
WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/package.json ./package.json
RUN npm install --production

# Copy backend source
COPY backend/ .

# arenas.js is shared — backend imports it from ../frontend/js/arenas.js
COPY frontend/js/arenas.js /frontend/js/arenas.js

EXPOSE 8080
CMD ["node", "server.js"]
