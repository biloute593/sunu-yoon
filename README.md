<div align="center">
<img width="1200" height="475" alt="Sunu Yoon Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🚗 Sunu Yoon

**La plateforme de covoiturage #1 au Sénégal**

Économique • Convivial • Sûr

</div>

---

## 📋 Description

Sunu Yoon est une application de covoiturage conçue spécifiquement pour le Sénégal. Elle permet aux conducteurs de proposer des trajets et aux passagers de les réserver facilement, avec paiement intégré via Wave et Orange Money.

## ✨ Fonctionnalités

- 🔐 **Authentification SMS** - Inscription et connexion sécurisées
- 🗺️ **Carte interactive** - Visualisation des trajets en temps réel
- 📱 **Paiements mobiles** - Wave et Orange Money intégrés
- 💬 **Chat en temps réel** - Communication directe conducteur/passager
- ⭐ **Système d'avis** - Notes et commentaires
- 🔔 **Notifications** - Rappels SMS avant le départ

## 🚀 Démarrage Rapide

### Option 1: Docker (Recommandé)

```bash
# Cloner et démarrer tous les services
docker-compose up -d

# L'application sera disponible sur:
# - Frontend: http://localhost
# - Backend API: http://localhost:3001
# - pgAdmin: http://localhost:5050 (admin@sunuyoon.sn / admin123)
```

### Option 2: Développement Local

**Prérequis:** Node.js 20+, PostgreSQL 16+

#### 1. Base de données
```bash
# Démarrer PostgreSQL et Redis avec Docker
docker-compose up -d postgres redis pgadmin
```

#### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos clés API

npm run prisma:generate
npm run prisma:migrate
npm run seed  # Données de test
npm run dev
```

#### 3. Frontend
```bash
npm install
npm run dev
```

#### 4. Lancer les deux ensemble
```bash
npm run dev:all
```

## 🔧 Configuration

### Variables d'environnement Backend (`.env`)

```env
# Base de données
DATABASE_URL=postgresql://sunuyoon:sunuyoon_secret_2024@localhost:5432/sunuyoon

# JWT
JWT_SECRET=votre_secret_jwt
JWT_REFRESH_SECRET=votre_refresh_secret

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+221xxxxxxxx

# Paiements Wave
WAVE_API_KEY=live_xxxxxxxx
WAVE_MERCHANT_ID=xxxxxxxx

# Paiements Orange Money
ORANGE_MONEY_CLIENT_ID=xxxxxxxx
ORANGE_MONEY_CLIENT_SECRET=xxxxxxxx
ORANGE_MONEY_MERCHANT_KEY=xxxxxxxx
```

### Variables d'environnement Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_MAPS_API_KEY=votre_cle_google_maps
```

## 📁 Structure du Projet

```
sunu-yoon/
├── backend/                 # API Node.js/Express
│   ├── prisma/             # Schéma et migrations DB
│   ├── src/
│   │   ├── routes/         # Endpoints API
│   │   ├── services/       # Logique métier
│   │   ├── middleware/     # Auth, validation
│   │   └── index.ts        # Point d'entrée
│   └── Dockerfile
├── components/              # Composants React
│   ├── AuthModal.tsx       # Connexion/Inscription
│   ├── BookingModal.tsx    # Réservation
│   ├── ChatWindow.tsx      # Messagerie
│   └── ...
├── contexts/               # Contextes React
│   └── AuthContext.tsx
├── services/               # Services frontend
│   ├── apiClient.ts        # Client HTTP
│   ├── authService.ts      # Authentification
│   ├── rideService.ts      # Trajets
│   ├── bookingService.ts   # Réservations
│   ├── paymentService.ts   # Paiements
│   └── messageService.ts   # Chat WebSocket
├── docker-compose.yml      # Orchestration Docker
└── README.md
```

## 🧪 Comptes de Test

Après avoir exécuté `npm run seed` dans le backend:

| Rôle | Téléphone | Mot de passe |
|------|-----------|--------------|
| Conducteur | +221771234567 | password123 |
| Passager | +221781112233 | password123 |

## 📱 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify` - Vérification SMS

### Trajets
- `GET /api/rides` - Rechercher des trajets
- `POST /api/rides` - Créer un trajet
- `GET /api/rides/:id` - Détails d'un trajet

### Réservations
- `POST /api/bookings` - Créer une réservation
- `GET /api/bookings/my` - Mes réservations
- `POST /api/bookings/:id/cancel` - Annuler

### Paiements
- `POST /api/payments/initiate` - Initier un paiement
- `GET /api/payments/:id/status` - Statut du paiement

## 🛠️ Technologies

**Frontend:**
- React 19, TypeScript, Vite
- Tailwind CSS
- Socket.io Client

**Backend:**
- Node.js, Express, TypeScript
- Prisma ORM, PostgreSQL
- Socket.io, JWT

**Services:**
- Twilio (SMS)
- Wave, Orange Money (Paiements)
- Firebase (Notifications push)

## 📄 License

MIT © 2024 Sunu Yoon
