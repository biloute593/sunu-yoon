import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    email?: string;
    name: string;
    isVerified: boolean;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification manquant', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token d\'authentification invalide', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      phone: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        isVerified: true
      }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Token invalide ou expiré', 401));
    }
    next(error);
  }
};

// Middleware optionnel - n'échoue pas si pas de token
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
        };

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            phone: true,
            email: true,
            name: true,
            isVerified: true
          }
        });

        if (user) {
          req.user = user;
        }
      }
    }
    next();
  } catch {
    // Ignorer les erreurs, continuer sans authentification
    next();
  }
};
