import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma, io } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { sendBookingNotification } from '../services/sms';
import { sendBookingConfirmationEmail } from '../services/email';
import { logger } from '../utils/logger';

const router = Router();

// ============ CRÉER UNE RÉSERVATION ============
router.post('/',
  body('rideId').isUUID().withMessage('ID de trajet invalide'),
  body('seats').optional().isInt({ min: 1, max: 6 }).withMessage('Nombre de places invalide'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const { rideId, seats = 1, pickupAddress, pickupLat, pickupLng } = req.body;

      // Vérifier le trajet
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          driver: {
            select: { id: true, name: true, phone: true, email: true }
          }
        }
      });

      if (!ride) {
        throw new AppError('Trajet non trouvé', 404);
      }

      if (ride.status !== 'OPEN') {
        throw new AppError('Ce trajet n\'accepte plus de réservations', 400);
      }

      if (ride.driverId === userId) {
        throw new AppError('Vous ne pouvez pas réserver votre propre trajet', 400);
      }

      if (ride.availableSeats < seats) {
        throw new AppError(`Seulement ${ride.availableSeats} places disponibles`, 400);
      }

      // Vérifier si déjà réservé
      const existingBooking = await prisma.booking.findUnique({
        where: { rideId_passengerId: { rideId, passengerId: userId } }
      });

      if (existingBooking) {
        throw new AppError('Vous avez déjà réservé ce trajet', 409);
      }

      const totalPrice = ride.pricePerSeat * seats;

      // Créer la réservation
      const booking = await prisma.booking.create({
        data: {
          rideId,
          passengerId: userId,
          seats,
          totalPrice,
          pickupAddress,
          pickupLat,
          pickupLng,
          status: 'PENDING' // En attente de paiement
        },
        include: {
          ride: {
            include: {
              driver: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          },
          passenger: {
            select: { id: true, name: true, phone: true, email: true }
          }
        }
      });

      // Mettre à jour les places disponibles
      const newAvailableSeats = ride.availableSeats - seats;
      await prisma.ride.update({
        where: { id: rideId },
        data: {
          availableSeats: newAvailableSeats,
          status: newAvailableSeats === 0 ? 'FULL' : 'OPEN'
        }
      });

      // Notifier le conducteur via WebSocket
      io.to(`user_${ride.driverId}`).emit('new_booking', {
        bookingId: booking.id,
        passenger: booking.passenger,
        seats,
        ride: {
          origin: ride.originCity,
          destination: ride.destinationCity,
          departureTime: ride.departureTime
        }
      });

      // Créer une notification pour le conducteur
      await prisma.notification.create({
        data: {
          userId: ride.driverId,
          type: 'BOOKING_REQUEST',
          title: 'Nouvelle réservation',
          message: `${booking.passenger.name} a réservé ${seats} place(s) pour ${ride.originCity} → ${ride.destinationCity}`,
          data: { bookingId: booking.id, rideId }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Réservation créée. Procédez au paiement.',
        data: {
          booking: {
            id: booking.id,
            seats: booking.seats,
            totalPrice: booking.totalPrice,
            status: booking.status,
            ride: {
              id: ride.id,
              origin: ride.originCity,
              destination: ride.destinationCity,
              departureTime: ride.departureTime,
              driver: booking.ride.driver
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ MES RÉSERVATIONS ============
router.get('/my', 
  async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const whereClause: any = { passengerId: userId };
    if (status) {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        ride: {
          include: {
            driver: {
              select: { id: true, name: true, avatarUrl: true, phone: true, rating: true }
            }
          }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        bookings: bookings.map(b => ({
          id: b.id,
          seats: b.seats,
          totalPrice: b.totalPrice,
          status: b.status,
          pickupAddress: b.pickupAddress,
          createdAt: b.createdAt,
          ride: {
            id: b.ride.id,
            origin: b.ride.originCity,
            originAddress: b.ride.originAddress,
            destination: b.ride.destinationCity,
            destinationAddress: b.ride.destinationAddress,
            departureTime: b.ride.departureTime,
            duration: `${Math.floor(b.ride.estimatedDuration / 60)}h ${b.ride.estimatedDuration % 60}m`,
            driver: b.ride.driver,
            features: b.ride.features
          },
          payment: b.payment ? {
            status: b.payment.status,
            method: b.payment.method,
            paidAt: b.payment.paidAt
          } : null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ ANNULER UNE RÉSERVATION ============
router.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        ride: true,
        payment: true
      }
    });

    if (!booking) {
      throw new AppError('Réservation non trouvée', 404);
    }

    if (booking.passengerId !== userId) {
      throw new AppError('Vous n\'êtes pas autorisé à annuler cette réservation', 403);
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new AppError('Cette réservation ne peut plus être annulée', 400);
    }

    // Vérifier le délai d'annulation (24h avant le départ)
    const hoursUntilDeparture = (booking.ride.departureTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const refundable = hoursUntilDeparture > 24;

    // Annuler la réservation
    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' }
      }),
      prisma.ride.update({
        where: { id: booking.rideId },
        data: {
          availableSeats: { increment: booking.seats },
          status: 'OPEN'
        }
      })
    ]);

    // TODO: Rembourser si applicable
    if (refundable && booking.payment?.status === 'COMPLETED') {
      // Initier le remboursement
      logger.info(`Remboursement à initier pour booking ${id}`);
    }

    // Notifier le conducteur
    await prisma.notification.create({
      data: {
        userId: booking.ride.driverId,
        type: 'BOOKING_CANCELLED',
        title: 'Réservation annulée',
        message: `Une réservation pour ${booking.ride.originCity} → ${booking.ride.destinationCity} a été annulée.`,
        data: { bookingId: id, rideId: booking.rideId }
      }
    });

    res.json({
      success: true,
      message: refundable 
        ? 'Réservation annulée. Remboursement en cours.'
        : 'Réservation annulée. Aucun remboursement (annulation tardive).'
    });
  } catch (error) {
    next(error);
  }
});

// ============ CONFIRMER UNE RÉSERVATION (CONDUCTEUR) ============
router.post('/:id/confirm', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        ride: true,
        passenger: {
          select: { id: true, name: true, phone: true, email: true }
        },
        payment: true
      }
    });

    if (!booking) {
      throw new AppError('Réservation non trouvée', 404);
    }

    if (booking.ride.driverId !== userId) {
      throw new AppError('Vous n\'êtes pas le conducteur de ce trajet', 403);
    }

    // Si paiement en espèces, confirmer directement
    // Sinon, vérifier que le paiement est effectué
    if (booking.payment && booking.payment.method !== 'CASH' && booking.payment.status !== 'COMPLETED') {
      throw new AppError('Le paiement n\'a pas encore été effectué', 400);
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' }
    });

    // Notifier le passager
    const departureDate = booking.ride.departureTime.toLocaleDateString('fr-FR');
    const departureTime = booking.ride.departureTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // SMS
    if (process.env.NODE_ENV === 'production') {
      await sendBookingNotification(
        booking.passenger.phone,
        req.user!.name,
        booking.ride.originCity,
        booking.ride.destinationCity,
        `${departureDate} à ${departureTime}`
      );
    }

    // Email
    if (booking.passenger.email) {
      await sendBookingConfirmationEmail(booking.passenger.email, booking.passenger.name, {
        driverName: req.user!.name,
        origin: booking.ride.originCity,
        destination: booking.ride.destinationCity,
        date: departureDate,
        time: departureTime,
        price: booking.totalPrice,
        seats: booking.seats
      });
    }

    // Notification in-app
    await prisma.notification.create({
      data: {
        userId: booking.passengerId,
        type: 'BOOKING_CONFIRMED',
        title: 'Réservation confirmée !',
        message: `Votre trajet ${booking.ride.originCity} → ${booking.ride.destinationCity} est confirmé pour le ${departureDate}.`,
        data: { bookingId: id, rideId: booking.rideId }
      }
    });

    // WebSocket
    io.to(`user_${booking.passengerId}`).emit('booking_confirmed', { bookingId: id });

    res.json({
      success: true,
      message: 'Réservation confirmée. Le passager a été notifié.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
