import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { guestBookingStore } from '../services/guestBookingStore';
import { logger } from '../utils/logger';

const router = Router();

const inputValidators = [
  body('rideId').isUUID().withMessage('Trajet invalide'),
  body('passengerName')
    .trim()
    .notEmpty().withMessage('Nom requis')
    .isLength({ min: 2, max: 100 }).withMessage('Nom invalide (2-100 caractères)'),
  body('passengerPhone')
    .trim()
    .notEmpty().withMessage('Téléphone requis')
    .matches(/^(\+221|00221)?[7][0-9]{8}$/).withMessage('Numéro sénégalais invalide (ex: 771234567)'),
  body('seats').optional().isInt({ min: 1, max: 6 }).withMessage('Nombre de places invalide'),
  body('paymentMethod')
    .optional()
    .isIn(['WAVE', 'ORANGE_MONEY', 'CASH'])
    .withMessage('Mode de paiement non supporté'),
  body('contactPreference')
    .optional()
    .isIn(['call', 'whatsapp', 'sms'])
    .withMessage('Préférence de contact invalide'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne doivent pas dépasser 500 caractères')
];

router.post('/', inputValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }

    const {
      rideId,
      passengerName,
      passengerPhone,
      seats = 1,
      paymentMethod,
      notes,
      contactPreference
    } = req.body;

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

    if (ride.availableSeats < seats) {
      throw new AppError(`Plus que ${ride.availableSeats} place(s) disponibles`, 400);
    }

    const snapshot = guestBookingStore.create({
      rideId,
      passengerName,
      passengerPhone,
      seats,
      paymentMethod,
      notes,
      contactPreference
    });

    const remainingSeats = ride.availableSeats - seats;
    await prisma.ride.update({
      where: { id: rideId },
      data: {
        availableSeats: remainingSeats,
        status: remainingSeats <= 0 ? 'FULL' : ride.status
      }
    });

    await prisma.notification.create({
      data: {
        userId: ride.driverId,
        type: 'BOOKING_REQUEST',
        title: 'Nouvelle réservation invitée',
        message: `${passengerName} (${passengerPhone}) veut ${seats} place(s) sur ${ride.originCity} → ${ride.destinationCity}`,
        data: {
          rideId,
          guestBookingId: snapshot.id,
          seats,
          passengerName,
          passengerPhone,
          paymentMethod
        }
      }
    }).catch((error) => {
      logger.warn('Impossible de créer la notification invité', { error });
    });

    res.status(201).json({
      success: true,
      data: {
        booking: {
          id: snapshot.id,
          status: snapshot.status,
          seats,
          passenger: {
            name: passengerName,
            phone: passengerPhone,
            contactPreference
          },
          paymentMethod: paymentMethod || 'CASH',
          notes,
          ride: {
            id: ride.id,
            origin: ride.originCity,
            destination: ride.destinationCity,
            departureTime: ride.departureTime,
            driver: {
              name: ride.driver.name,
              phone: ride.driver.phone,
              email: ride.driver.email
            }
          },
          remainingSeats
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
