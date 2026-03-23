# ── Stage 1: Builder ─────────────────────────────────────────────────────────
# Installs all deps, builds Vite bundle → /dist
# Never shipped — only /dist is copied forward

FROM node:20-alpine AS builder

WORKDIR /app

# Vite bakes env vars into the JS bundle at build time (not runtime)
# ARG makes it available during build steps; ENV exposes it to the npm run build process
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy manifests first — npm ci layer is cached unless package.json changes
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
# Lightweight image — only /dist copied from builder, no source or build tools

FROM node:20-alpine AS runner

RUN npm install -g serve

WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 80

# Exec form: serve becomes PID 1 and receives shutdown signals directly
# -s = SPA mode (unknown routes return index.html)
# -l 80 = listen on port 80
CMD ["serve", "-s", "dist", "-l", "80"]
