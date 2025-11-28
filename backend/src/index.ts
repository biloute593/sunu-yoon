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
import paymentRoutes from './routes/payments';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';

// Services
import { setupSocketHandlers } from './services/socket';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Prisma Client
export const prisma = new PrismaClient();

// Middleware de base
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// Webhooks (sans auth middleware)
app.use('/webhooks/wave', express.raw({ type: 'application/json' }));
app.use('/webhooks/orange', express.raw({ type: 'application/json' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use(errorHandler);

// Setup WebSocket
setupSocketHandlers(io);

// Export pour les tests et autres modules
export { io };

// Démarrage du serveur
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Serveur Sunu Yoon démarré sur le port ${PORT}`);
  logger.info(`📡 WebSocket prêt pour les connexions`);
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
