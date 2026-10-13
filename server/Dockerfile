# ==============================================================================
# PiControl OS — Production Dockerfile
# ==============================================================================

# Build React Frontend
FROM node:22-alpine AS client-builder
WORKDIR /client
COPY ../client/package*.json ../client/tsconfig*.json ../client/vite.config.ts ../client/tailwind.config.js ../client/postcss.config.js ../client/index.html ./
RUN npm ci
COPY ../client/src/ ./src/
RUN npm run build

# Build Server Backend
FROM node:22-alpine AS server-builder
WORKDIR /server
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8090

COPY package*.json ./
RUN npm ci --only=production

COPY --from=server-builder /server/dist ./dist
COPY --from=client-builder /client/dist ./public

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["node", "dist/index.js"]
