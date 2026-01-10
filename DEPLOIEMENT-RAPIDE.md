# 🚀 GUIDE DE DÉPLOIEMENT RAPIDE

## ✅ Préparation (5 minutes)

### 1. Créer une base de données PostgreSQL gratuite

Allez sur **https://neon.tech** :
1. Créez un compte gratuit
2. Cliquez sur "Create Project"
3. Nommez votre projet "sunuyoon"
4. Copiez l'URL de connexion qui ressemble à :
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
   ```

### 2. Initialiser Git et pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit - Sunu Yoon"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/sunu-yoon.git
git push -u origin main
```

### 3. Déployer sur Netlify

1. Allez sur **https://app.netlify.com**
2. Cliquez "Add new site" → "Import an existing project"
3. Connectez votre compte GitHub
4. Sélectionnez votre dépôt "sunu-yoon"

### 4. Configuration Build Netlify

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

### 5. Variables d'environnement Netlify

Dans Site settings → Environment variables, ajoutez :

```
DATABASE_URL = votre_url_postgresql_de_neon
JWT_SECRET = généré_avec_la_commande_ci_dessous
JWT_REFRESH_SECRET = généré_avec_la_commande_ci_dessous
NODE_ENV = production
```

**Pour générer les secrets JWT** (exécutez 2 fois) :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. Migrer la base de données

Après le premier déploiement :

```bash
# Se connecter à Netlify
netlify login

# Migrer la base
netlify env:import .env
npx prisma migrate deploy
```

### 7. Déployer !

Cliquez sur "Deploy site" dans Netlify.

## 🎉 C'est terminé !

Votre site sera accessible sur : **https://votre-site.netlify.app**

### Personnaliser le domaine

Dans Netlify → Domain settings → Add custom domain

### Tester

1. Publiez un trajet sur votre site
2. Vérifiez dans Neon que les données sont bien dans la base
3. Cherchez et réservez le trajet

## 🔧 En cas de problème

**Le site ne se charge pas**
- Vérifiez les logs de build dans Netlify
- Assurez-vous que DATABASE_URL est correcte

**Les trajets ne se sauvegardent pas**
- Vérifiez les variables d'environnement
- Lancez `npx prisma migrate deploy`
- Regardez les logs des fonctions Netlify

**Erreur de connexion base de données**
- Vérifiez que l'IP de Netlify est autorisée (Neon accepte tout par défaut)
- Testez la connexion avec `npx prisma db pull`

## 📞 Support

Si ça ne fonctionne pas :
1. Regardez les logs Netlify (dans le dashboard)
2. Vérifiez la console du navigateur (F12)
3. Testez en local avec `npm run dev:netlify`
