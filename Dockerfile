# Utiliser Node.js 20 Alpine
FROM node:20-alpine AS base

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
FROM base AS deps
RUN npm ci

# Builder l'application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build de production Vite
RUN npm run build

# Image de production avec Nginx
FROM nginx:alpine AS runner

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposer le port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
