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

// ============ INSCRIPTION ============
router.post('/register',
  body('phone').matches(/^(\+221|221)?[7][0-9]{8}$/).withMessage('Numéro de téléphone sénégalais invalide'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Le nom doit avoir entre 2 et 100 caractères'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit avoir au moins 6 caractères'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      let { phone, name, password, email } = req.body;

      // Normaliser le numéro de téléphone
      phone = phone.replace(/^\+?221/, '').replace(/\s/g, '');
      phone = `+221${phone}`;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser) {
        throw new AppError('Ce numéro de téléphone est déjà utilisé', 409);
      }

      if (email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new AppError('Cet email est déjà utilisé', 409);
        }
      }

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(password, 12);

      // Extraire firstName et lastName du nom complet
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          phone,
          email,
          firstName,
          lastName: lastName || undefined,
          name,
          passwordHash,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`
        }
      });

      // Générer et envoyer le code de vérification SMS
      const code = generateCode();
      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code,
          type: 'PHONE_VERIFICATION',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });

      // Envoyer le SMS (en production)
      if (process.env.NODE_ENV === 'production') {
        await sendVerificationCode(phone, code);
      } else {
        logger.info(`[DEV] Code de vérification pour ${phone}: ${code}`);
      }

      // Générer les tokens
      const tokens = generateTokens(user.id, user.phone);

      // Sauvegarder le refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      res.status(201).json({
        success: true,
        message: 'Inscription réussie. Veuillez vérifier votre téléphone.',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name,
            email: user.email,
            isPhoneVerified: false
          },
          tokens,
          verificationRequired: true
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ CONNEXION ============
router.post('/login',
  body('phone').matches(/^(\+221|221)?[7][0-9]{8}$/).withMessage('Numéro de téléphone invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      let { phone, password } = req.body;

      // Normaliser le numéro
      phone = phone.replace(/^\+?221/, '').replace(/\s/g, '');
      phone = `+221${phone}`;

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        throw new AppError('Identifiants incorrects', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            rating: user.rating,
            reviewCount: user.reviewCount,
            isVerified: user.isVerified,
            isPhoneVerified: user.isPhoneVerified
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
          used: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verification) {
        throw new AppError('Code invalide ou expiré', 400);
      }

      // Marquer comme utilisé
      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { used: true }
      });

      // Mettre à jour le statut de vérification
      const updateData: any = {};
      if (type === 'PHONE_VERIFICATION') {
        updateData.isPhoneVerified = true;
        updateData.isVerified = true; // Le téléphone suffit pour être vérifié
      } else if (type === 'EMAIL_VERIFICATION') {
        updateData.isEmailVerified = true;
      }

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Vérification réussie',
        data: {
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
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
