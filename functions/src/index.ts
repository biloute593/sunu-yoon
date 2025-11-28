import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuration Express
const app = express();
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

// ============ CONFIGURATION ============
const JWT_SECRET = process.env.JWT_SECRET || 'sunu-yoon-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ============ TYPES ============
interface AuthRequest extends Request {
  user?: { id: string; phone: string; name: string };
}

// ============ MIDDLEWARE AUTH ============
const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token requis' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    if (!userDoc.exists) {
      res.status(401).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const userData = userDoc.data()!;
    req.user = { id: userDoc.id, phone: userData.phone, name: userData.name };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// ============ ROUTES AUTH ============

// Inscription
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, name, password } = req.body;

    if (!phone || !name || !password) {
      res.status(400).json({ error: 'Téléphone, nom et mot de passe requis' });
      return;
    }

    // Vérifier si le numéro existe déjà
    const existingUser = await db.collection('users').where('phone', '==', phone).get();
    if (!existingUser.empty) {
      res.status(400).json({ error: 'Ce numéro est déjà utilisé' });
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Générer un code de vérification
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Créer l'utilisateur
    const userRef = await db.collection('users').add({
      phone,
      name,
      password: hashedPassword,
      isVerified: false,
      verificationCode,
      verificationExpires: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      rating: 5.0,
      reviewCount: 0
    });

    // TODO: Envoyer le code par SMS via Twilio
    console.log(`Code de vérification pour ${phone}: ${verificationCode}`);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Vérifiez votre téléphone.',
      userId: userRef.id
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Téléphone et mot de passe requis' });
      return;
    }

    const usersSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (usersSnapshot.empty) {
      res.status(401).json({ error: 'Identifiants incorrects' });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Identifiants incorrects' });
      return;
    }

    const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: {
        id: userDoc.id,
        phone: userData.phone,
        name: userData.name,
        isVerified: userData.isVerified,
        avatarUrl: userData.avatarUrl || null,
        rating: userData.rating
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vérification du code SMS
app.post('/api/auth/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;

    const usersSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (usersSnapshot.empty) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.verificationCode !== code) {
      res.status(400).json({ error: 'Code incorrect' });
      return;
    }

    if (userData.verificationExpires.toDate() < new Date()) {
      res.status(400).json({ error: 'Code expiré' });
      return;
    }

    await db.collection('users').doc(userDoc.id).update({
      isVerified: true,
      verificationCode: null,
      verificationExpires: null
    });

    const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: {
        id: userDoc.id,
        phone: userData.phone,
        name: userData.name,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES TRAJETS ============

// Rechercher des trajets
app.get('/api/rides/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { origin, destination, seats } = req.query;

    let query: admin.firestore.Query = db.collection('rides')
      .where('status', '==', 'OPEN')
      .where('availableSeats', '>=', parseInt(seats as string) || 1);

    if (origin) {
      query = query.where('originCity', '==', origin);
    }
    if (destination) {
      query = query.where('destinationCity', '==', destination);
    }

    const ridesSnapshot = await query.orderBy('departureTime', 'asc').limit(20).get();

    const rides = await Promise.all(ridesSnapshot.docs.map(async (doc) => {
      const ride = doc.data();
      const driverDoc = await db.collection('users').doc(ride.driverId).get();
      const driver = driverDoc.data();

      return {
        id: doc.id,
        ...ride,
        driver: driver ? {
          id: driverDoc.id,
          name: driver.name,
          avatarUrl: driver.avatarUrl,
          rating: driver.rating,
          isVerified: driver.isVerified
        } : null
      };
    }));

    res.json({ success: true, data: { rides } });
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un trajet
app.post('/api/rides', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      originCity,
      originAddress,
      destinationCity,
      destinationAddress,
      departureTime,
      pricePerSeat,
      totalSeats,
      features,
      description
    } = req.body;

    const rideRef = await db.collection('rides').add({
      driverId: req.user!.id,
      originCity,
      originAddress,
      destinationCity,
      destinationAddress,
      departureTime: admin.firestore.Timestamp.fromDate(new Date(departureTime)),
      pricePerSeat,
      totalSeats,
      availableSeats: totalSeats,
      features: features || [],
      description,
      status: 'OPEN',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({
      success: true,
      message: 'Trajet publié',
      data: { rideId: rideRef.id }
    });
  } catch (error) {
    console.error('Erreur création trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Détails d'un trajet
app.get('/api/rides/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const rideDoc = await db.collection('rides').doc(req.params.id).get();
    
    if (!rideDoc.exists) {
      res.status(404).json({ error: 'Trajet non trouvé' });
      return;
    }

    const ride = rideDoc.data()!;
    const driverDoc = await db.collection('users').doc(ride.driverId).get();
    const driver = driverDoc.data();

    res.json({
      success: true,
      data: {
        ride: {
          id: rideDoc.id,
          ...ride,
          driver: driver ? {
            id: driverDoc.id,
            name: driver.name,
            avatarUrl: driver.avatarUrl,
            rating: driver.rating,
            isVerified: driver.isVerified
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Erreur détails trajet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES RÉSERVATIONS ============

// Créer une réservation
app.post('/api/bookings', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rideId, seats } = req.body;

    const rideDoc = await db.collection('rides').doc(rideId).get();
    if (!rideDoc.exists) {
      res.status(404).json({ error: 'Trajet non trouvé' });
      return;
    }

    const ride = rideDoc.data()!;
    if (ride.availableSeats < seats) {
      res.status(400).json({ error: 'Pas assez de places disponibles' });
      return;
    }

    const totalPrice = ride.pricePerSeat * seats;

    // Créer la réservation
    const bookingRef = await db.collection('bookings').add({
      rideId,
      passengerId: req.user!.id,
      seats,
      totalPrice,
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Mettre à jour les places disponibles
    await db.collection('rides').doc(rideId).update({
      availableSeats: admin.firestore.FieldValue.increment(-seats)
    });

    res.status(201).json({
      success: true,
      data: {
        booking: {
          id: bookingRef.id,
          rideId,
          seats,
          totalPrice,
          status: 'PENDING'
        }
      }
    });
  } catch (error) {
    console.error('Erreur réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES PAIEMENTS ============

// Initier un paiement
app.post('/api/payments/initiate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, method } = req.body;

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      res.status(404).json({ error: 'Réservation non trouvée' });
      return;
    }

    const booking = bookingDoc.data()!;

    // Créer l'enregistrement de paiement
    const paymentRef = await db.collection('payments').add({
      bookingId,
      userId: req.user!.id,
      amount: booking.totalPrice,
      method,
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Simuler URL de paiement (à remplacer par Wave/Orange Money API)
    const paymentUrl = `https://pay.wave.com/checkout/${paymentRef.id}`;

    res.json({
      success: true,
      data: {
        paymentId: paymentRef.id,
        paymentUrl,
        amount: booking.totalPrice
      }
    });
  } catch (error) {
    console.error('Erreur paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exporter la fonction Cloud
export const api = functions.https.onRequest(app);

// ============ TRIGGERS FIRESTORE ============

// Notification quand une réservation est confirmée
export const onBookingConfirmed = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'CONFIRMED' && after.status === 'CONFIRMED') {
      // Envoyer notification au passager
      const passengerDoc = await db.collection('users').doc(after.passengerId).get();
      const passenger = passengerDoc.data();

      if (passenger?.fcmToken) {
        await admin.messaging().send({
          token: passenger.fcmToken,
          notification: {
            title: 'Réservation confirmée !',
            body: 'Votre place a été confirmée. Bon voyage !'
          }
        });
      }
    }
  });

// Notification pour nouveau message
export const onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    
    const receiverDoc = await db.collection('users').doc(message.receiverId).get();
    const receiver = receiverDoc.data();
    const senderDoc = await db.collection('users').doc(message.senderId).get();
    const sender = senderDoc.data();

    if (receiver?.fcmToken) {
      await admin.messaging().send({
        token: receiver.fcmToken,
        notification: {
          title: `Message de ${sender?.name || 'Utilisateur'}`,
          body: message.content.substring(0, 100)
        }
      });
    }
  });
