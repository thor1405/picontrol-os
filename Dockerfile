# ==============================================================================
# PiControl OS — Production Multi-Stage Dockerfile (ARM64 & x86_64)
# Builds both the React SPA Frontend and the Node.js Express Backend
# ==============================================================================

# Stage 1: Build React Frontend
FROM node:22-alpine AS client-builder
WORKDIR /client

COPY client/package*.json client/tsconfig*.json client/vite.config.ts client/tailwind.config.js client/postcss.config.js client/index.html ./
RUN npm ci

COPY client/src/ ./src/
RUN npm run build

# Stage 2: Build Express TypeScript Backend
FROM node:22-alpine AS server-builder
WORKDIR /server

COPY server/package*.json server/tsconfig*.json ./
RUN npm ci

COPY server/src/ ./src/
RUN npm run build

# Stage 3: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8090

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy compiled server code
COPY --from=server-builder /server/dist ./dist

# Copy compiled frontend into /app/public for Express static serving
COPY --from=client-builder /client/dist ./public

# Create data directory for SQLite persistence
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

CMD ["node", "dist/index.js"]
