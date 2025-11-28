# Utiliser Node.js 20 Alpine pour une image légère
FROM node:20-alpine AS base

# Installer les dépendances de build
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
FROM base AS deps
RUN npm ci

# Builder l'application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler TypeScript
RUN npm run build

# Image de production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copier les fichiers nécessaires
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Changer le propriétaire
RUN chown -R expressjs:nodejs /app

USER expressjs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV PORT=3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Commande de démarrage
CMD ["node", "dist/index.js"]
