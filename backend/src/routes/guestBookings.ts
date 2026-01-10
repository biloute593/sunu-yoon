import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

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
  body('notes').optional().isLength({ max: 500 }).withMessage('Max 500 chars')
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

    // Normaliser téléphone
    let phone = passengerPhone.replace(/^\+?221/, '').replace(/\s/g, '');
    phone = `+221${phone}`;

    // Transaction pour l'atomicité
    const result = await prisma.$transaction(async (tx) => {
      // 1. Trouver ou créer l'utilisateur "Invité"
      let user = await tx.user.findUnique({ where: { phone } });

      if (!user) {
        // Créer un compte invité
        const nameParts = passengerName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        const passwordHash = await bcrypt.hash('guest_' + Math.random().toString(36), 10);

        user = await tx.user.create({
          data: {
            phone,
            name: passengerName,
            firstName,
            lastName: lastName || undefined, // Prisma n'aime pas les chaines vides pour optional? check schema
            passwordHash,
            isVerified: false,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerName)}&background=10b981&color=fff`
          }
        });
      }

      // 2. Vérifier le trajet
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: { driver: true }
      });

      if (!ride) throw new AppError('Trajet non trouvé', 404);
      if (ride.status !== 'OPEN') throw new AppError('Trajet non disponible', 400);
      if (ride.availableSeats < seats) throw new AppError(`Plus que ${ride.availableSeats} places`, 400);

      // 3. Créer Booking
      const booking = await tx.booking.create({
        data: {
          rideId,
          passengerId: user!.id,
          seats,
          status: 'PENDING'
        },
        include: {
          ride: {
            include: {
              driver: {
                select: { id: true, name: true, phone: true, email: true }
              }
            }
          },
          passenger: {
            select: { name: true, phone: true }
          }
        }
      });

      // 4. Update Ride
      const remainingSeats = ride.availableSeats - seats;
      await tx.ride.update({
        where: { id: rideId },
        data: {
          availableSeats: remainingSeats,
          status: remainingSeats === 0 ? 'FULL' : 'OPEN'
        }
      });

      // 5. Notification
      await tx.notification.create({
        data: {
          userId: ride.driverId,
          type: 'BOOKING_REQUEST',
          title: 'Nouvelle réservation (Invité)',
          message: `${passengerName} (${passengerPhone}) veut ${seats} place(s)`,
          data: {
            bookingId: booking.id,
            guest: true,
            phone: passengerPhone
          }
        }
      });

      return { booking, remainingSeats };
    });

    res.status(201).json({
      success: true,
      data: {
        booking: {
          id: result.booking.id,
          status: result.booking.status.toLowerCase(), // 'pending'
          seats: result.booking.seats,
          passenger: {
            name: result.booking.passenger.name,
            phone: result.booking.passenger.phone,
            contactPreference
          },
          paymentMethod: paymentMethod || 'CASH',
          ride: {
            id: result.booking.ride.id,
            origin: result.booking.ride.originCity,
            destination: result.booking.ride.destinationCity,
            departureTime: result.booking.ride.departureTime,
            driver: result.booking.ride.driver
          },
          remainingSeats: result.remainingSeats
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
