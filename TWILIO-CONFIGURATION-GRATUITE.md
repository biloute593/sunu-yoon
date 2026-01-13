# 🎁 CONFIGURATION TWILIO GRATUITE (15$ de crédit = ~300 SMS)

## ✅ CE QUI EST DÉJÀ FAIT
- ✅ Twilio SDK installé
- ✅ Code d'envoi SMS fonctionnel
- ✅ Gestion d'erreurs en place

## 🚀 ÉTAPES POUR ACTIVER LES VRAIS SMS (5 MINUTES)

### 1️⃣ Créer un compte Twilio GRATUIT

1. Aller sur : **https://www.twilio.com/try-twilio**
2. Cliquer "**Start for free**" / "**Sign up**"
3. Remplir le formulaire :
   - Email
   - Mot de passe
   - **Cocher** : "I'm not a robot"
4. Vérifier votre email
5. **IMPORTANT** : Au téléphone de vérification, entrer votre **vrai numéro sénégalais** : `+221XXXXXXXXX`

### 2️⃣ Obtenir vos identifiants (GRATUIT - 15$ offerts!)

Une fois connecté :

1. Sur le **Dashboard**, vous verrez :
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: [Cliquer "Show" pour voir]
   ```
   
2. **Copier ces 2 valeurs** (vous en aurez besoin)

### 3️⃣ Obtenir un numéro de téléphone Twilio

1. Dans le menu : **Phone Numbers** > **Manage** > **Buy a number**
2. Choisir le pays : **Sénégal** ou **États-Unis** (recommandé, fonctionne partout)
3. **Filter** > Cocher "SMS"
4. Cliquer "**Search**"
5. Choisir un numéro et cliquer "**Buy**" (Gratuit avec le crédit!)
6. **Copier le numéro** (format : +1234567890 ou +221...)

### 4️⃣ Configurer dans votre projet

Ouvrir le fichier `.env` dans `backend/` et ajouter :

```env
# SMS Configuration (Twilio - GRATUIT 15$)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
SMS_API_ENABLED=true
```

**IMPORTANT** : Remplacer par vos vraies valeurs !

### 5️⃣ Ajouter des numéros de test (Mode Trial)

En mode gratuit (Trial), Twilio n'envoie que vers des numéros **vérifiés** :

1. Dans Twilio : **Phone Numbers** > **Verified Caller IDs**
2. Cliquer "**Add a new caller ID**"
3. Entrer votre numéro : `+221XXXXXXXXX`
4. Twilio vous appelle pour vérifier
5. Entrer le code reçu
6. ✅ Ce numéro peut maintenant recevoir des SMS !

### 6️⃣ Tester !

1. **Redémarrer le backend** :
   ```bash
   cd backend
   npm run dev
   ```

2. **Créer un trajet** avec le numéro vérifié
3. **Réserver ce trajet** 
4. 📱 **BOOM!** Vous recevez le SMS sur votre téléphone ! 🎉

## 📊 LIMITES DU MODE GRATUIT

✅ **15$ de crédit offerts** (~300 SMS)
✅ SMS vers **tous les pays**
⚠️ **Mais seulement vers les numéros vérifiés** (jusqu'à 10 numéros gratuits)
⚠️ Message préfixé par : *"Sent from your Twilio trial account -"*

## 💰 PASSER EN MODE PRODUCTION (Plus tard)

Quand vous voulez enlever les limitations :

1. **Ajouter 20$ minimum** sur votre compte Twilio
2. Les SMS fonctionneront vers **TOUS les numéros** (pas besoin de vérifier)
3. Plus de préfixe "trial"
4. Prix : ~0.05$ par SMS (environ 5 FCFA)

## 🧪 EXEMPLE DE TEST RAPIDE

Dans votre terminal backend, vous verrez :

```bash
✅ Client Twilio initialisé
[SMS] Envoi à +221771234567:
SUNU YOON - Nouvelle reservation!

Moussa Diop souhaite reserver 2 place(s)
Dakar -> Saint-Louis
mar. 13 janv., 14:30

Connectez-vous pour accepter.
---
✅ SMS envoyé avec succès! SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Et **VOUS RECEVEZ LE SMS** ! 📲

## ❓ PROBLÈMES FRÉQUENTS

### "Error: The number +221XXXXXXXXX is unverified"
➡️ Vérifiez le numéro dans **Verified Caller IDs** (voir étape 5)

### "Authentication Error"
➡️ Vérifiez vos `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN` dans `.env`

### "Invalid 'From' Phone Number"
➡️ Vérifiez que `TWILIO_PHONE_NUMBER` est correct dans `.env`

### Les SMS ne partent pas
➡️ Vérifiez que `SMS_API_ENABLED=true` dans `.env`
➡️ Redémarrez le backend après modification du `.env`

## 🎯 RÉSUMÉ - CHECKLIST

- [ ] Compte Twilio créé ✅ GRATUIT
- [ ] Account SID et Auth Token copiés
- [ ] Numéro Twilio obtenu ✅ GRATUIT
- [ ] Fichier `.env` configuré
- [ ] Votre numéro vérifié dans Twilio
- [ ] Backend redémarré
- [ ] Test réservation → **SMS REÇU !** 🎉

---

**VOUS AVEZ 15$ GRATUITS = ~300 SMS pour tester !**

C'est largement suffisant pour valider que tout fonctionne avant de mettre en production ! 💪
