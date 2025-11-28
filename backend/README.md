# Sunu Yoon - Backend API

Backend complet pour l'application de covoiturage Sunu Yoon au Sénégal.

## 🚀 Fonctionnalités

- **Authentification** : Inscription/Connexion avec vérification SMS (Twilio) et Email
- **Trajets** : Création, recherche, réservation et gestion des trajets
- **Paiements** : Intégration Wave et Orange Money
- **Messagerie** : Chat en temps réel via WebSocket (Socket.io)
- **Notifications** : SMS, Push et in-app

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 14+
- Compte Twilio (pour SMS)
- Compte Wave Business (pour paiements)
- Compte Orange Money Merchant (pour paiements)

## 🛠️ Installation

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` avec vos propres valeurs :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/sunuyoon?schema=public"

# JWT
JWT_SECRET="votre-secret-super-securise"
JWT_REFRESH_SECRET="votre-refresh-secret"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="votre-sid"
TWILIO_AUTH_TOKEN="votre-token"
TWILIO_PHONE_NUMBER="+221xxxxxxxxx"

# Wave
WAVE_API_KEY="votre-wave-api-key"
WAVE_WEBHOOK_SECRET="votre-webhook-secret"

# Orange Money
ORANGE_MONEY_API_KEY="votre-om-api-key"
ORANGE_MONEY_MERCHANT_KEY="votre-merchant-key"
```

### 3. Initialiser la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer les tables
npm run prisma:migrate

# (Optionnel) Remplir avec des données de test
npm run seed
```

### 4. Lancer le serveur

```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:3001`

## 📡 API Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/verify` | Vérifier code SMS/Email |
| POST | `/api/auth/resend-code` | Renvoyer le code |
| POST | `/api/auth/refresh-token` | Rafraîchir le token |
| POST | `/api/auth/logout` | Déconnexion |

### Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users/me` | Mon profil |
| PUT | `/api/users/me` | Modifier mon profil |
| GET | `/api/users/:id` | Profil public |
| POST | `/api/users/:id/reviews` | Laisser un avis |

### Trajets

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/rides/search` | Rechercher des trajets |
| GET | `/api/rides/:id` | Détails d'un trajet |
| POST | `/api/rides` | Publier un trajet |
| PUT | `/api/rides/:id` | Modifier un trajet |
| POST | `/api/rides/:id/cancel` | Annuler un trajet |
| GET | `/api/rides/my/published` | Mes trajets publiés |

### Réservations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/bookings` | Réserver un trajet |
| GET | `/api/bookings/my` | Mes réservations |
| POST | `/api/bookings/:id/cancel` | Annuler ma réservation |
| POST | `/api/bookings/:id/confirm` | Confirmer (conducteur) |

### Paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/payments/initiate` | Initier un paiement |
| GET | `/api/payments/:bookingId/status` | Statut du paiement |

### Messages

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/messages/conversations` | Créer/Obtenir une conversation |
| GET | `/api/messages/conversations` | Lister mes conversations |
| GET | `/api/messages/conversations/:id/messages` | Messages d'une conversation |
| POST | `/api/messages/conversations/:id/messages` | Envoyer un message |

### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` | Mes notifications |
| PUT | `/api/notifications/:id/read` | Marquer comme lue |
| PUT | `/api/notifications/read-all` | Tout marquer comme lu |
| DELETE | `/api/notifications/:id` | Supprimer |
| GET | `/api/notifications/unread-count` | Compter les non lues |

## 🔌 WebSocket Events

### Client → Serveur

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `conversationId` | Rejoindre une conversation |
| `leave_conversation` | `conversationId` | Quitter une conversation |
| `send_message` | `{ conversationId, receiverId, content }` | Envoyer un message |
| `mark_as_read` | `conversationId` | Marquer messages comme lus |
| `typing_start` | `conversationId` | Indicateur "en train d'écrire" |
| `typing_stop` | `conversationId` | Fin de l'écriture |
| `location_update` | `{ rideId, lat, lng }` | Position du conducteur |

### Serveur → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `conversation_history` | `Message[]` | Historique des messages |
| `new_message` | `Message` | Nouveau message |
| `message_notification` | `{ conversationId, senderName, preview }` | Notification de message |
| `messages_read` | `{ conversationId, readBy }` | Messages lus par l'autre |
| `user_typing` | `{ conversationId, userId, userName }` | Utilisateur écrit |
| `notification` | `Notification` | Nouvelle notification |
| `booking_confirmed` | `{ bookingId }` | Réservation confirmée |
| `payment_completed` | `{ bookingId, amount }` | Paiement réussi |
| `driver_location` | `{ rideId, lat, lng, timestamp }` | Position en temps réel |

## 🗄️ Modèle de données

```
User
├── id, phone, email, name, passwordHash
├── avatarUrl, rating, reviewCount
├── isVerified, isPhoneVerified, isEmailVerified
├── isDriver, carModel, carPlate, carColor
└── Relations: rides, bookings, reviews, messages, notifications

Ride
├── id, driverId
├── originCity, originAddress, originLat, originLng
├── destinationCity, destinationAddress, destinationLat, destinationLng
├── departureTime, estimatedDuration, distance
├── pricePerSeat, totalSeats, availableSeats
├── features[], description, status
└── Relations: driver, bookings, conversations

Booking
├── id, rideId, passengerId
├── seats, totalPrice, status
├── pickupAddress, pickupLat, pickupLng
└── Relations: ride, passenger, payment

Payment
├── id, bookingId, payerId
├── amount, currency, method, status
├── externalId, externalRef, paidAt
└── Relations: booking, payer

Conversation / Message
├── conversationId, rideId
├── senderId, receiverId, content, isRead
└── Relations: ride, messages, sender, receiver

Notification
├── id, userId, type, title, message
├── data (JSON), isRead
└── Relation: user
```

## 🔒 Sécurité

- Authentification JWT avec refresh tokens
- Validation des entrées (express-validator)
- Rate limiting sur les routes sensibles
- Helmet pour les headers HTTP
- CORS configuré
- Hachage bcrypt pour les mots de passe

## 📱 Intégrations

### Wave
- Checkout sessions pour paiements
- Webhooks pour confirmation
- Remboursements automatiques

### Orange Money
- OAuth2 pour authentification
- Webpay pour paiements
- Callbacks de statut

### Twilio
- Envoi de SMS de vérification
- Notifications de réservation
- Rappels de départ

## 🧪 Comptes de test

Après avoir exécuté `npm run seed` :

| Téléphone | Mot de passe | Rôle |
|-----------|--------------|------|
| +221771234567 | password123 | Conducteur (Moussa) |
| +221777654321 | password123 | Conducteur (Fatou) |
| +221781112233 | password123 | Passager (Amadou) |
| +221769998877 | password123 | Conducteur (Aissatou) |

## 📝 License

MIT
