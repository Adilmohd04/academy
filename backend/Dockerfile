# ============================================================
# Multi-stage Dockerfile for the Education Platform Backend
# ============================================================
# Stages:
#   1. deps    — install production + dev dependencies
#   2. build   — compile TypeScript
#   3. prod    — slim runtime image with only prod dependencies
#
# Usage:
#   docker build -t academy-backend .
#   docker run -p 5000:5000 --env-file .env academy-backend
# ============================================================

# ---------- Stage 1: Install dependencies ----------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package manifests (better layer caching)
COPY package.json package-lock.json ./

# Install ALL dependencies (we need devDeps for TypeScript compilation)
RUN npm ci

# ---------- Stage 2: Build TypeScript ----------
FROM deps AS build

WORKDIR /app

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile
RUN npm run build

# ---------- Stage 3: Production image ----------
FROM node:20-alpine AS prod

WORKDIR /app

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package manifests and install prod dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Copy runtime assets (migration SQL, env templates, load test scripts)
COPY database/ ./database/
COPY migrations/ ./migrations/
COPY load/ ./load/
COPY .env.example ./

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Environment defaults
ENV NODE_ENV=production \
    PORT=5000

# Start the server (cluster mode)
CMD ["node", "dist/server.js"]
