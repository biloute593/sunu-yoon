import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import rideRoutes from './routes/rides';
import bookingRoutes from './routes/bookings';
import guestBookingRoutes from './routes/guestBookings';
import paymentRoutes from './routes/payments';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import trackingRoutes from './routes/tracking';

// Services
import { setupSocketHandlers } from './services/socket';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Origines autorisées pour CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://sunu-yoon-app.web.app',
  'https://sunu-yoon-app.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean) as string[];

const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Prisma Client
export const prisma = new PrismaClient();

// Middleware de base
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api/', limiter);

// Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 tentatives
  message: { error: 'Trop de tentatives de connexion, réessayez dans 1 heure.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify', authLimiter);

// Routes publiques
app.use('/api/auth', authRoutes);

// Routes protégées
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/rides', rideRoutes); // Certaines routes sont publiques
app.use('/api/bookings', authMiddleware, bookingRoutes);
app.use('/api/guest-bookings', guestBookingRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/tracking', authMiddleware, trackingRoutes);

// Webhooks (sans auth middleware)
app.use('/webhooks/wave', express.raw({ type: 'application/json' }));
app.use('/webhooks/orange', express.raw({ type: 'application/json' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// DB diagnostic (temporary)
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ db: 'error', message: err.message, code: err.code });
  }
});

// Gestion des erreurs
app.use(errorHandler);

// Setup WebSocket
setupSocketHandlers(io);

// Export pour Vercel serverless et tests
export { io };
export default app;

// Démarrage du serveur (mode non-serverless uniquement)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Serveur Sunu Yoon démarré sur le port ${PORT}`);
    logger.info(`📡 WebSocket prêt pour les connexions`);

    // Self-ping : empêche Render de mettre le serveur en veille
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      const SELF_PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
      setInterval(async () => {
        try {
          const url = `${process.env.RENDER_EXTERNAL_URL}/health`;
          const res = await fetch(url);
          logger.info(`[Keep-Alive] Ping ${url} → ${res.status}`);
        } catch (err) {
          logger.warn(`[Keep-Alive] Ping échoué: ${err}`);
        }
      }, SELF_PING_INTERVAL);
      logger.info(`🔄 Keep-alive activé (ping toutes les 10 min)`);
    }
  });

  // Gestion propre de l'arrêt
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM reçu, arrêt gracieux...');
    await prisma.$disconnect();
    httpServer.close(() => {
      logger.info('Serveur arrêté');
      process.exit(0);
    });
  });
}
