# -- Build stage --
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/
RUN npm run build

# -- Production stage --
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/server-dist/ ./server-dist/
USER appuser
EXPOSE 3000
CMD ["node", "server-dist/index.js"]
