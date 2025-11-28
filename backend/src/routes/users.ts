import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ============ MON PROFIL ============
router.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        rating: true,
        reviewCount: true,
        isVerified: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        isDriver: true,
        carModel: true,
        carPlate: true,
        carColor: true,
        createdAt: true,
        _count: {
          select: {
            ridesAsDriver: true,
            bookings: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// ============ MODIFIER MON PROFIL ============
router.put('/me',
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail(),
  body('carModel').optional().isLength({ max: 100 }),
  body('carPlate').optional().isLength({ max: 20 }),
  body('carColor').optional().isLength({ max: 50 }),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const allowedFields = ['name', 'email', 'carModel', 'carPlate', 'carColor'];
      const updateData: any = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Vérifier si l'email est déjà pris
      if (updateData.email) {
        const existing = await prisma.user.findUnique({
          where: { email: updateData.email }
        });
        if (existing && existing.id !== req.user!.id) {
          throw new AppError('Cet email est déjà utilisé', 409);
        }
        // Si l'email change, il faudra le vérifier
        updateData.isEmailVerified = false;
      }

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          carModel: true,
          carPlate: true,
          carColor: true
        }
      });

      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ METTRE À JOUR LE FCM TOKEN ============
router.put('/me/fcm-token',
  body('fcmToken').notEmpty().withMessage('Token FCM requis'),
  async (req: AuthRequest, res, next) => {
    try {
      const { fcmToken } = req.body;

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { fcmToken }
      });

      res.json({
        success: true,
        message: 'Token FCM mis à jour'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ VOIR UN PROFIL PUBLIC ============
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        rating: true,
        reviewCount: true,
        isVerified: true,
        isDriver: true,
        carModel: true,
        createdAt: true,
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        },
        _count: {
          select: {
            ridesAsDriver: { where: { status: 'COMPLETED' } },
            bookings: { where: { status: 'COMPLETED' } }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          completedRides: user._count.ridesAsDriver,
          completedTrips: user._count.bookings
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ LAISSER UN AVIS ============
router.post('/:id/reviews',
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Note entre 1 et 5'),
  body('comment').optional().isLength({ max: 500 }),
  body('rideId').optional().isUUID(),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { id } = req.params;
      const authorId = req.user!.id;
      const { rating, comment, rideId } = req.body;

      if (id === authorId) {
        throw new AppError('Vous ne pouvez pas vous évaluer vous-même', 400);
      }

      // Vérifier que l'utilisateur cible existe
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      // Vérifier qu'il y a bien eu un trajet ensemble (si rideId fourni)
      if (rideId) {
        const sharedRide = await prisma.ride.findFirst({
          where: {
            id: rideId,
            OR: [
              { driverId: id, bookings: { some: { passengerId: authorId, status: 'COMPLETED' } } },
              { driverId: authorId, bookings: { some: { passengerId: id, status: 'COMPLETED' } } }
            ]
          }
        });

        if (!sharedRide) {
          throw new AppError('Vous n\'avez pas voyagé ensemble sur ce trajet', 400);
        }
      }

      // Créer l'avis
      const review = await prisma.review.create({
        data: {
          authorId,
          targetId: id,
          rideId,
          rating,
          comment
        }
      });

      // Recalculer la note moyenne
      const reviews = await prisma.review.findMany({
        where: { targetId: id },
        select: { rating: true }
      });

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.user.update({
        where: { id },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        }
      });

      // Notifier l'utilisateur
      await prisma.notification.create({
        data: {
          userId: id,
          type: 'REVIEW_RECEIVED',
          title: 'Nouvel avis',
          message: `${req.user!.name} vous a donné ${rating} étoile(s).`,
          data: { reviewId: review.id }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Avis publié',
        data: { review }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
