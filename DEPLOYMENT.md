# 🚀 GUIDE DE DÉPLOIEMENT RENDER

## État Actuel ✅

- ✅ **Code committé et pushé** sur GitHub (master branch)
- ✅ **Build production créé** (dossier `dist/`)
- ✅ **Configuration Render** prête (`render.yaml`)
- ✅ **Variables d'environnement** configurées

## Étapes de Déploiement

### 1. Connecter Render à GitHub

1. Allez sur https://dashboard.render.com
2. Cliquez sur **"New +"** → **"Blueprint"**
3. Sélectionnez votre repo GitHub: `biloute593/sunu-yoon`
4. Cliquez sur **"Connect"**

### 2. Vérifier la Configuration Render

Render va auto-détecter `render.yaml` et afficher:
- **Backend Service**: `sunu-yoon-backend`
- **Frontend Service**: `sunu-yoon-frontend`
- **Database**: PostgreSQL (déjà configurée)

### 3. Configuration des Variables d'Environnement

#### Backend (`sunu-yoon-backend`)
```
DATABASE_URL: postgresql://[user]:[password]@[host]:5432/sunuyoondb
DIRECT_URL: postgresql://[user]:[password]@[host]:5432/sunuyoondb
JWT_SECRET: [généré automatiquement]
JWT_REFRESH_SECRET: [généré automatiquement]
FRONTEND_URL: https://sunu-yoon.onrender.com
```

#### Frontend (`sunu-yoon-frontend`)
```
VITE_API_URL: https://sunu-yoon-backend.onrender.com/api
VITE_SOCKET_URL: https://sunu-yoon-backend.onrender.com
```

### 4. Déployer

Cliquez sur **"Deploy"** → Render déploiera automatiquement:
1. Backend (avec migrations Prisma)
2. Frontend (build + static hosting)

### 5. URLs de Production

- **Frontend**: https://sunu-yoon.onrender.com
- **Backend API**: https://sunu-yoon-backend.onrender.com
- **API Docs**: https://sunu-yoon-backend.onrender.com/api

## Caractéristiques du Déploiement

### Backend (`sunu-yoon-backend`)
- **Runtime**: Node.js
- **Port**: 3001
- **Build**: `npm install && npx prisma migrate deploy`
- **Start**: `npm run dev` (ts-node-dev pour auto-reload)
- **Health Check**: `/api/rides`

### Frontend (`sunu-yoon-frontend`)
- **Type**: Static Site
- **Build**: `npm install && npm run build`
- **Publish Dir**: `dist`
- **Build Env**: Vite (production)

## Après Déploiement

### ✅ Vérifier que tout fonctionne:

```bash
# 1. Teste la disponibilité du backend
curl https://sunu-yoon-backend.onrender.com/api/rides

# 2. Ouvre le frontend
https://sunu-yoon.onrender.com

# 3. Teste le guest ride creation:
- Clique sur "Proposer un trajet" (sans auth)
- Remplis le formulaire
- Valide et vérifie que ça s'enregistre
```

## Troubleshooting

### Le backend ne démarre pas
- Vérifier les logs Render: https://dashboard.render.com
- Vérifier que DATABASE_URL est correcte
- Vérifier les migrations Prisma

### Le frontend ne voit pas le backend
- Vérifier VITE_API_URL dans les env vars du frontend
- Vérifier que le backend est accessible publiquement

### Base de données indisponible
- Vérifier la connexion PostgreSQL Render
- Vérifier que la base `sunuyoondb` existe
- Relancer la migration: `npx prisma migrate deploy`

## Rollback en cas de problème

Si le déploiement cause des problèmes:
```bash
# Revenir à la version précédente
git revert HEAD
git push origin master

# Render redéploiera automatiquement la version précédente
```

## FAQ

**Q: Pourquoi `ts-node-dev` en production?**
A: Pour la facilité du développement. En production, tu peux remplacer par:
```json
"start": "npm run build && node dist/index.js"
```
Et mettre `startCommand: npm start` dans render.yaml.

**Q: Comment gérer les secrets (JWT_SECRET)?**
A: Render génère automatiquement via `generateValue: true` dans render.yaml.

**Q: Quelle est la limite du plan free?**
A: Les services free se hibernent après 15 min d'inactivité. Pour production, upgrade vers `standard` ($7/mois).

---

**Status**: ✅ Prêt au déploiement
**Branch**: `master`
**Last Updated**: 2025-12-14
