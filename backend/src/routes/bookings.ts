import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// ============ CRÉER UNE RÉSERVATION (AUTHENTIFIÉ) ============
router.post('/',
  authMiddleware,
  body('rideId').isUUID().withMessage('ID de trajet invalide'),
  body('seats').isInt({ min: 1 }).withMessage('Au moins 1 place requise'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const { rideId, seats, notes } = req.body;

      // Transaction: Vérifier trajet, places, créer booking, décrémenter places
      const result = await prisma.$transaction(async (tx) => {
        const ride = await tx.ride.findUnique({
          where: { id: rideId },
          include: { driver: true }
        });

        if (!ride) {
          throw new AppError('Trajet non trouvé', 404);
        }

        if (ride.driverId === userId) {
          throw new AppError('Vous ne pouvez pas réserver votre propre trajet', 400);
        }

        if (ride.status !== 'OPEN') {
          throw new AppError('Ce trajet n\'est plus disponible pour réservation', 400);
        }

        if (ride.availableSeats < seats) {
          throw new AppError(`Désolé, seulement ${ride.availableSeats} place(s) disponible(s)`, 400);
        }

        // Vérifier si déjà réservé
        const existingBooking = await tx.booking.findFirst({
          where: {
            rideId,
            passengerId: userId,
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        });

        if (existingBooking) {
          throw new AppError('Vous avez déjà une réservation active sur ce trajet', 400);
        }

        // Créer la réservation
        const booking = await tx.booking.create({
          data: {
            rideId,
            passengerId: userId,
            seats,
            status: 'PENDING' // Par défaut en attente de confirmation conducteur
          },
          include: {
            ride: {
              include: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatarUrl: true,
                    rating: true
                  }
                }
              }
            }
          }
        });

        // Décrémenter les places
        const remainingSeats = ride.availableSeats - seats;
        await tx.ride.update({
          where: { id: rideId },
          data: {
            availableSeats: remainingSeats,
            status: remainingSeats === 0 ? 'FULL' : 'OPEN'
          }
        });

        // Créer une notification pour le conducteur
        await tx.notification.create({
          data: {
            userId: ride.driverId,
            type: 'BOOKING_REQUEST',
            title: 'Nouvelle réservation',
            message: `${req.user!.name.split(' ')[0]} souhaite réserver ${seats} place(s) pour ${ride.originCity} -> ${ride.destinationCity}`,
            data: {
              bookingId: booking.id,
              rideId: ride.id
            }
          }
        });

        return booking;
      });

      res.status(201).json({
        success: true,
        message: 'Demande de réservation envoyée',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }
);

// ============ MES RÉSERVATIONS (EN TANT QUE PASSAGER) ============
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const bookings = await prisma.booking.findMany({
      where: { passengerId: userId },
      include: {
        ride: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: bookings.map(b => ({
        id: b.id,
        status: b.status.toLowerCase(), // frontend attend lowercase 'pending', 'confirmed'
        seats: b.seats,
        createdAt: b.createdAt,
        ride: {
          id: b.ride.id,
          origin: b.ride.originCity,
          destination: b.ride.destinationCity,
          departureTime: b.ride.departureTime,
          driver: b.ride.driver
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ============ DEMANDES REÇUES (EN TANT QUE CONDUCTEUR) ============
router.get('/requests', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // Trouver les réservations pour les trajets de cet utilisateur
    const bookings = await prisma.booking.findMany({
      where: {
        ride: {
          driverId: userId
        },
        status: 'PENDING'
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true
          }
        },
        ride: {
          select: {
            id: true,
            originCity: true,
            destinationCity: true,
            departureTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: bookings.map(b => ({
        id: b.id,
        seats: b.seats,
        passenger: b.passenger,
        ride: {
          id: b.ride.id,
          origin: b.ride.originCity,
          destination: b.ride.destinationCity,
          departureTime: b.ride.departureTime
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ============ CONFIRMER UNE RÉSERVATION ============
router.post('/:id/confirm', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { ride: true }
    });

    if (!booking) {
      throw new AppError('Réservation non trouvée', 404);
    }

    if (booking.ride.driverId !== userId) {
      throw new AppError('Non autorisé', 403);
    }

    if (booking.status !== 'PENDING') {
      throw new AppError('Cette réservation n\'est pas en attente', 400);
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { passenger: true } // Pour notifier
    });

    // Notifier le passager
    await prisma.notification.create({
      data: {
        userId: booking.passengerId,
        type: 'BOOKING_CONFIRMED',
        title: 'Réservation confirmée !',
        message: `Votre trajet vers ${booking.ride.destinationCity} est confirmé.`,
        data: { bookingId: booking.id }
      }
    });

    res.json({
      success: true,
      message: 'Réservation confirmée',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
});

export default router;
