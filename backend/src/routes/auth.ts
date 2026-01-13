import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { sendVerificationCode } from '../services/sms';
import { sendVerificationEmail } from '../services/email';
import { logger } from '../utils/logger';

const router = Router();

// Générer un code de vérification à 6 chiffres
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Générer les tokens JWT

const generateTokens = (userId: string, phone: string) => {
  const accessSecret = process.env.JWT_SECRET as jwt.Secret | undefined;
  const refreshSecret = process.env.JWT_REFRESH_SECRET as jwt.Secret | undefined;

  if (!accessSecret || !refreshSecret) {
    throw new AppError('Configuration JWT manquante', 500);
  }

  const accessOptions: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn']
  };

  const refreshOptions: jwt.SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(
    { userId, phone },
    accessSecret,
    accessOptions
  );

  const refreshToken = jwt.sign(
    { userId, phone, type: 'refresh' },
    refreshSecret,
    refreshOptions
  );

  return { accessToken, refreshToken };
};

// ============ INSCRIPTION SIMPLIFIÉE (Pseudo + Mot de passe) ============
router.post('/register',
  body('username').isLength({ min: 3, max: 30 }).withMessage('Le pseudo doit avoir entre 3 et 30 caractères'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit avoir au moins 6 caractères'),
  body('phone').optional().matches(/^(\+221|221)?[7][0-9]{8}$/).withMessage('Numéro de téléphone invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { username, password, phone } = req.body;

      // Vérifier si le pseudo existe déjà
      const existingUser = await prisma.user.findFirst({ 
        where: { 
          name: { equals: username, mode: 'insensitive' }
        } 
      });
      
      if (existingUser) {
        throw new AppError('Ce pseudo est déjà utilisé', 409);
      }

      // Normaliser le téléphone si fourni
      let normalizedPhone = phone;
      if (phone) {
        normalizedPhone = phone.replace(/^\+?221/, '').replace(/\s/g, '');
        normalizedPhone = `+221${normalizedPhone}`;
        
        // Vérifier si le téléphone existe déjà
        const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
        if (existingPhone) {
          throw new AppError('Ce numéro de téléphone est déjà utilisé', 409);
        }
      } else {
        // Générer un numéro fictif unique si pas de téléphone
        normalizedPhone = `+221${Date.now().toString().slice(-9)}`;
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 12);

      // Créer l'utilisateur (plus de vérification nécessaire)
      const user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: username,
          password: hashedPassword,
          isVerified: true, // Auto-vérifié
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=059669&color=fff`
        }
      });

      // Générer les tokens
      const tokens = generateTokens(user.id, user.phone);

      // Sauvegarder le refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès !',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ CONNEXION SIMPLIFIÉE (Pseudo ou Téléphone + Mot de passe) ============
router.post('/login',
  body('identifier').notEmpty().withMessage('Pseudo ou téléphone requis'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { identifier, password } = req.body;

      // Chercher l'utilisateur par pseudo ou téléphone
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { equals: identifier, mode: 'insensitive' } },
            { phone: { contains: identifier.replace(/\s/g, '') } }
          ]
        }
      });

      if (!user) {
        throw new AppError('Identifiants incorrects', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Identifiants incorrects', 401);
      }

      const tokens = generateTokens(user.id, user.phone);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            rating: user.rating,
            reviewCount: user.reviewCount,
            isVerified: user.isVerified,
            isDriver: user.isDriver
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ VÉRIFICATION PAR CODE ============
router.post('/verify',
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code invalide'),
  body('type').isIn(['PHONE_VERIFICATION', 'EMAIL_VERIFICATION']).withMessage('Type invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('Token requis', 401);
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

      const { code, type } = req.body;

      const verification = await prisma.verificationCode.findFirst({
        where: {
          userId: decoded.userId,
          code,
          type,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verification) {
        throw new AppError('Code invalide ou expiré', 400);
      }

      // Supprimer le code (le modèle actuel ne gère pas "used")
      await prisma.verificationCode.delete({ where: { id: verification.id } });

      // Mettre à jour le statut de vérification
      const updateData: any = {};
      // Dans ce schéma, on ne distingue pas phone/email; on marque simplement l'utilisateur comme vérifié.
      if (type === 'PHONE_VERIFICATION' || type === 'EMAIL_VERIFICATION') {
        updateData.isVerified = true;
      }

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Vérification réussie',
        data: {
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ RENVOYER LE CODE ============
router.post('/resend-code',
  body('type').isIn(['PHONE_VERIFICATION', 'EMAIL_VERIFICATION']).withMessage('Type invalide'),
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('Token requis', 401);
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

      const { type } = req.body;

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      // Supprimer les anciens codes
      await prisma.verificationCode.deleteMany({
        where: { userId: user.id, type }
      });

      // Générer un nouveau code
      const code = generateCode();
      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code,
          type,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      });

      // Envoyer le code
      if (type === 'PHONE_VERIFICATION') {
        if (process.env.NODE_ENV === 'production') {
          await sendVerificationCode(user.phone, code);
        } else {
          logger.info(`[DEV] Code SMS pour ${user.phone}: ${code}`);
        }
      } else if (type === 'EMAIL_VERIFICATION' && user.email) {
        if (process.env.NODE_ENV === 'production') {
          await sendVerificationEmail(user.email, code, user.name);
        } else {
          logger.info(`[DEV] Code Email pour ${user.email}: ${code}`);
        }
      }

      res.json({
        success: true,
        message: 'Code renvoyé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ RAFRAÎCHIR LE TOKEN ============
router.post('/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token requis'),
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
        userId: string;
        phone: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError('Token invalide', 401);
      }

      const tokens = generateTokens(user.id, user.phone);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      res.json({
        success: true,
        data: { tokens }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ DÉCONNEXION ============
router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        await prisma.user.update({
          where: { id: decoded.userId },
          data: { refreshToken: null }
        });
      } catch {
        // Token invalide, on continue quand même
      }
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
