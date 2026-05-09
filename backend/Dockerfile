# ─── Stage 1: Base ────────────────────────────────────────────────────────────
# Shared foundation for all stages. Install deps once, reuse everywhere.
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Copy manifests first — Docker layer cache means npm install only
# reruns when package.json / package-lock.json actually change.
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --frozen-lockfile        \
 && npx prisma generate             # Generate Prisma client into node_modules

# ─── Stage 2: Development ─────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app

# Copy full source — ts-node-dev watches and recompiles on change
COPY . .

# Port for API (worker doesn't need this but it's harmless)
EXPOSE 3000

# Default command — overridden per-service in docker-compose.yml
CMD ["npm", "run", "dev"]

# ─── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY . .

# Compile TypeScript → JavaScript
RUN npm run build

# ─── Stage 4: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only copy production artifacts — no source, no dev tools, no TypeScript
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma
COPY package*.json ./

# Security: run as non-root user
# If this user doesn't exist on alpine, create it
RUN addgroup -S ims && adduser -S ims -G ims
USER ims

EXPOSE 3000
CMD ["node", "dist/app.js"]