# 📱 Configuration des Notifications SMS

## ✅ Ce qui est déjà implémenté

Le système de notifications SMS est maintenant **entièrement intégré** dans l'application :

### Notifications automatiques aux conducteurs 🚗
Quand un passager réserve un trajet, le conducteur reçoit instantanément un SMS :
```
🚗 SUNU YOON - Nouvelle réservation!

Moussa Diop souhaite réserver 2 place(s)
📍 Dakar → Saint-Louis
📅 lun. 13 janv., 14:30

Connectez-vous pour accepter ou refuser.
```

### Notifications aux passagers ✅
Quand le conducteur accepte la réservation, le passager reçoit :
```
✅ SUNU YOON - Réservation confirmée!

Conducteur: Abdou Seck
📞 +221771234567
📍 Dakar → Saint-Louis
📅 lun. 13 janv., 14:30

Bon voyage! 🚗
```

## 🔧 Configuration pour la production

### Option 1: Twilio (Recommandé - International)

1. **Créer un compte** sur [Twilio](https://www.twilio.com)
2. **Obtenir** un numéro de téléphone Twilio
3. **Installer le SDK**:
```bash
npm install twilio
```

4. **Ajouter dans `.env`**:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SMS_API_ENABLED=true
NODE_ENV=production
```

5. **Modifier `backend/src/services/sms.ts`**:
```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendBookingNotificationToDriver = async (...) => {
  // ... code existant ...
  
  if (process.env.NODE_ENV === 'production' && process.env.SMS_API_ENABLED === 'true') {
    await twilioClient.messages.create({
      body: message,
      to: driverPhone,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  }
};
```

### Option 2: Orange SMS API (Sénégal)

1. **S'inscrire** sur [Orange Developer](https://developer.orange.com)
2. **Obtenir** les clés API SMS
3. **Installer axios** si pas déjà fait
4. **Configuration**:

```typescript
import axios from 'axios';

const sendOrangeSMS = async (to: string, message: string) => {
  const tokenResponse = await axios.post(
    'https://api.orange.com/oauth/v3/token',
    new URLSearchParams({
      grant_type: 'client_credentials'
    }),
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`
        ).toString('base64')}`
      }
    }
  );

  await axios.post(
    'https://api.orange.com/smsmessaging/v1/outbound/tel:+221XXXXXXXXX/requests',
    {
      outboundSMSMessageRequest: {
        address: `tel:${to}`,
        senderAddress: `tel:${process.env.ORANGE_SENDER_PHONE}`,
        outboundSMSTextMessage: { message }
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${tokenResponse.data.access_token}`
      }
    }
  );
};
```

### Option 3: Services SMS Sénégalais

**Autres options populaires au Sénégal:**
- **Kirene SMS** - API SMS locale
- **Expresso SMS API**
- **Free SMS API**

## 🧪 Mode Développement

Actuellement, en mode développement (`NODE_ENV=development`), les SMS sont **affichés dans la console** :

```
[SMS] Envoi notification conducteur à +221771234567:
🚗 SUNU YOON - Nouvelle réservation!

Moussa Diop souhaite réserver 2 place(s)
📍 Dakar → Saint-Louis
📅 lun. 13 janv., 14:30

Connectez-vous pour accepter ou refuser.
```

Cela permet de **tester sans coût** avant de passer en production.

## 📊 Points d'envoi SMS

Les SMS sont envoyés automatiquement dans ces cas :

1. **Nouvelle réservation** → SMS au conducteur
   - Fichier: `backend/src/routes/bookings.ts` (ligne ~110)
   - Fichier: `backend/src/routes/guestBookings.ts` (ligne ~130)

2. **Confirmation de réservation** → SMS au passager
   - Fichier: `backend/src/routes/bookings.ts` (ligne ~245)

## 💰 Coûts estimés

- **Twilio**: ~0.05$ par SMS (5 FCFA)
- **Orange SMS API**: Prix négociables en volume
- **Services locaux**: 10-25 FCFA par SMS

## 🔐 Sécurité

- ✅ Les numéros sont **normalisés** (+221...)
- ✅ Les SMS **ne bloquent pas** la réservation en cas d'échec
- ✅ Les erreurs SMS sont **loguées** mais invisibles pour l'utilisateur
- ✅ Les messages respectent la **limite de 160 caractères**

## 🚀 Activation

Pour activer les SMS en production:

```bash
# Dans votre fichier .env
NODE_ENV=production
SMS_API_ENABLED=true
```

**Note**: Sans ces variables, le système fonctionne normalement mais affiche les SMS dans les logs au lieu de les envoyer.
