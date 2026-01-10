# 🎯 INSTRUCTIONS POUR DÉPLOYER SUNU YOON

## ✅ TOUT EST PRÊT ! Voici ce qu'il faut faire maintenant :

---

## ÉTAPE 1 : Créer une base de données PostgreSQL (2 minutes)

### Allez sur NEON.TECH (gratuit, meilleur choix)

1. **Ouvrez** : https://neon.tech
2. **Créez un compte** avec votre email
3. **Cliquez** sur "Create a project"
4. **Nommez-le** : `sunuyoon`
5. **Sélectionnez** la région la plus proche (Europe)
6. **COPIEZ** l'URL de connexion qui ressemble à :
   ```
   postgresql://sunuyoon_owner:abc123xyz@ep-ancient-cloud-12345.eu-central-1.aws.neon.tech/sunuyoon?sslmode=require
   ```
   ⚠️ **IMPORTANT** : Gardez cette URL, vous en aurez besoin !

---

## ÉTAPE 2 : Pousser le code sur GitHub (3 minutes)

### Si vous n'avez pas de compte GitHub :
1. Allez sur https://github.com
2. Créez un compte gratuit

### Créer le dépôt et pousser le code :

```powershell
# Ouvrez PowerShell dans le dossier SUNU YOON

# Créez un nouveau dépôt sur GitHub
# (Interface web: https://github.com/new)
# Nommez-le : sunu-yoon
# NE cochez PAS "Initialize with README"

# Dans PowerShell, exécutez :
git remote add origin https://github.com/VOTRE_USERNAME/sunu-yoon.git
git branch -M main
git push -u origin main
```

Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub !

---

## ÉTAPE 3 : Déployer sur Netlify (5 minutes)

### 1. Créer un compte Netlify
- Allez sur : https://app.netlify.com
- Cliquez "Sign up with GitHub"
- Autorisez Netlify

### 2. Importer le projet
- Cliquez **"Add new site"**
- Sélectionnez **"Import an existing project"**
- Choisissez **"Deploy with GitHub"**
- Cherchez et sélectionnez **"sunu-yoon"**

### 3. Configuration du build (IMPORTANT !)

Vérifiez que ces paramètres sont corrects :

```
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

Cliquez **"Deploy site"** pour l'instant.

---

## ÉTAPE 4 : Configurer les variables d'environnement (3 minutes)

### 1. Générer les secrets JWT

Ouvrez PowerShell et exécutez 2 fois cette commande :

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Vous obtiendrez 2 longues chaînes comme :
```
a1b2c3d4e5f6...
x9y8z7w6v5u4...
```

Copiez-les quelque part !

### 2. Ajouter les variables dans Netlify

Dans Netlify, allez dans :
- **Site settings** (en haut à droite)
- **Environment variables** (dans le menu gauche)
- Cliquez **"Add a variable"**

Ajoutez ces 4 variables :

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Votre URL PostgreSQL de Neon |
| `JWT_SECRET` | Premier secret généré |
| `JWT_REFRESH_SECRET` | Deuxième secret généré |
| `NODE_ENV` | `production` |

### 3. Re-déployer

- Allez dans **Deploys**
- Cliquez **"Trigger deploy"** → **"Deploy site"**

---

## ÉTAPE 5 : Migrer la base de données (2 minutes)

Une fois le déploiement réussi :

```powershell
# Dans PowerShell, dans le dossier SUNU YOON

# Installer Netlify CLI (une seule fois)
npm install -g netlify-cli

# Se connecter à Netlify
netlify login
# (Une page web s'ouvrira, autorisez)

# Lier le projet
netlify link
# Sélectionnez votre site sunu-yoon

# Migrer la base de données
npx prisma migrate deploy
```

---

## 🎉 C'EST FINI !

Votre site est maintenant en ligne sur :
```
https://VOTRE-SITE.netlify.app
```

### ✅ Tests à faire :

1. **Ouvrez votre site**
2. **Publiez un trajet** (sans créer de compte)
3. **Rechargez la page** → Le trajet doit apparaître !
4. **Cherchez le trajet** → Il doit apparaître dans les résultats
5. **Depuis un autre navigateur/téléphone** → Le trajet doit être visible

### 🎨 Personnaliser le domaine (Optionnel)

Dans Netlify :
- **Domain settings** → **Add custom domain**
- Suivez les instructions pour connecter votre domaine

---

## 🐛 En cas de problème

### Le site ne charge pas
- Attendez 2-3 minutes (Netlify peut prendre du temps)
- Vérifiez les logs dans Netlify → Deploys → Cliquez sur le dernier déploiement

### Les trajets ne se sauvegardent pas
1. Vérifiez que `DATABASE_URL` est correcte dans les variables
2. Relancez `npx prisma migrate deploy`
3. Vérifiez les logs des fonctions dans Netlify

### Erreur de connexion base de données
- Assurez-vous d'avoir copié l'URL complète de Neon
- L'URL doit contenir `?sslmode=require` à la fin

---

## 📞 Support

Si ça ne marche pas :
1. Regardez les logs Netlify (Deploys → Latest deploy → Logs)
2. Ouvrez la console du navigateur (F12)
3. Envoyez-moi les erreurs

---

**Tout est prêt pour la production ! Les trajets seront sauvegardés dans le cloud PostgreSQL ! 🚀**
