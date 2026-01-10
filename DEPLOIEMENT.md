# Guide de Déploiement Sunu Yoon

## 🚀 Déploiement sur Netlify

### Prérequis
1. Compte Netlify (gratuit sur netlify.com)
2. Base de données PostgreSQL (Neon, Supabase, ou Railway)
3. Compte GitHub pour connecter le dépôt

### Étape 1: Créer une base de données PostgreSQL

**Option A: Neon (Recommandé - Gratuit)**
1. Allez sur https://neon.tech
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Copiez l'URL de connexion (DATABASE_URL)

**Option B: Supabase**
1. Allez sur https://supabase.com
2. Créez un projet
3. Dans Settings > Database, copiez la Connection String

**Option C: Railway**
1. Allez sur https://railway.app
2. Créez un nouveau projet PostgreSQL
3. Copiez l'URL de connexion

### Étape 2: Configuration Netlify

1. **Connecter votre dépôt GitHub à Netlify**
   - Push ce projet sur GitHub
   - Allez sur app.netlify.com
   - Cliquez sur "Add new site" > "Import an existing project"
   - Sélectionnez votre dépôt GitHub

2. **Configuration Build**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. **Variables d'environnement** (Settings > Environment variables)
   ```
   DATABASE_URL=votre_url_postgresql_complete
   JWT_SECRET=un_secret_tres_long_et_aleatoire
   JWT_REFRESH_SECRET=un_autre_secret_tres_long_et_aleatoire
   NODE_ENV=production
   ```

### Étape 3: Migrer la base de données

Après le premier déploiement, exécutez les migrations Prisma:

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Lancer les migrations
netlify env:import .env
npx prisma migrate deploy
```

### Étape 4: Déployer

1. **Déploiement automatique**
   - Push sur la branche main de GitHub
   - Netlify déploie automatiquement

2. **Déploiement manuel**
   ```bash
   npm run build
   netlify deploy --prod
   ```

## 🔧 Configuration des secrets JWT

Pour générer des secrets sécurisés:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Exécutez cette commande 2 fois pour JWT_SECRET et JWT_REFRESH_SECRET.

## ✅ Vérification

Après le déploiement:
1. Testez la publication d'un trajet
2. Vérifiez dans votre base de données PostgreSQL que les données sont bien sauvegardées
3. Testez la recherche de trajets

## 📝 Variables d'environnement requises

- `DATABASE_URL`: URL complète de PostgreSQL
- `JWT_SECRET`: Secret pour les tokens JWT
- `JWT_REFRESH_SECRET`: Secret pour les refresh tokens
- `NODE_ENV`: "production"

## 🐛 Dépannage

**Erreur: "Database connection failed"**
- Vérifiez que DATABASE_URL est correcte
- Assurez-vous que la base de données accepte les connexions externes

**Erreur: "Prisma schema not found"**
- Vérifiez que le dossier `prisma` est bien dans le dépôt
- Relancez `npm install`

**Les fonctions Netlify ne fonctionnent pas**
- Vérifiez netlify.toml
- Assurez-vous que le dossier `netlify/functions` existe

## 🌐 Après le déploiement

Votre site sera accessible sur: `https://votre-site.netlify.app`

Configurez un domaine personnalisé dans Netlify > Domain settings
