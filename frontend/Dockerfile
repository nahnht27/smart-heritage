# syntax=docker/dockerfile:1

# ---- Stage 1: Build the static Vite bundle ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Public backend origin baked into the bundle at build time. Leave empty to use
# same-origin requests (`/api/...`) through the Nginx reverse proxy below.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:1.27-alpine
ARG APP_VERSION=dev

LABEL org.opencontainers.image.title="smart-heritage-frontend" \
      org.opencontainers.image.description="Smart Heritage Admin Web (static build + API proxy)" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/nahnht27/smart-heritage"

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
