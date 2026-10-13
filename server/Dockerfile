# Multi-stage ARM64 & x86_64 compatible Dockerfile for PiControl OS Server
FROM node:22-alpine AS builder

WORKDIR /app
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

COPY --from=builder /app/dist ./dist

# Persistent data directory
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["node", "dist/index.js"]
