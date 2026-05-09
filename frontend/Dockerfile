# ─── Stage 1: Base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

# ─── Stage 2: Development ─────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ─── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY . .

# VITE_API_URL must be set at BUILD time for Vite to inline it
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build                   # Outputs to /app/dist

# ─── Stage 4: Production (nginx) ──────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle React Router (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]