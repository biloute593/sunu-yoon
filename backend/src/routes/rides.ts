import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { GuestRideStatus } from '@prisma/client';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware, optionalAuth } from '../middleware/auth';
import { mapGuestRide, mapRegisteredRide } from '../utils/rideMapper';

const router = Router();

// ============ RECHERCHER DES TRAJETS (PUBLIC) ============
router.get('/',
  query('origin').optional().trim(),
  query('destination').optional().trim(),
  query('date').optional().isISO8601().withMessage('Date invalide'),
  query('seats').optional().isInt({ min: 1 }).withMessage('Nombre de places invalide'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { origin, destination, date, seats } = req.query as {
        origin?: string;
        destination?: string;
        date?: string;
        seats?: string;
      };
      const minSeats = seats ? parseInt(seats, 10) : 1;

      // Construire la requête
      const whereClause: any = {
        status: 'OPEN',
        availableSeats: { gte: minSeats }
      };

      // Ajouter les filtres optionnels de ville
      if (origin && origin.trim()) {
        whereClause.originCity = { contains: origin.trim(), mode: 'insensitive' };
      }
      if (destination && destination.trim()) {
        whereClause.destinationCity = { contains: destination.trim(), mode: 'insensitive' };
      }

      // Filtrer par date si fournie
      if (date) {
        const searchDate = new Date(date as string);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        whereClause.departureTime = {
          gte: searchDate,
          lt: nextDay
        };
      } else {
        // Par défaut, trajets futurs uniquement
        whereClause.departureTime = { gte: new Date() };
      }

      const rides = await prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              rating: true,
              reviewCount: true,
              isVerified: true,
              carModel: true
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: 20
      });

      const guestWhereClause: any = {
        status: GuestRideStatus.PUBLISHED,
        availableSeats: { gte: minSeats }
      };

      if (origin && origin.trim()) {
        guestWhereClause.originCity = { contains: origin.trim(), mode: 'insensitive' };
      }
      if (destination && destination.trim()) {
        guestWhereClause.destinationCity = { contains: destination.trim(), mode: 'insensitive' };
      }
      if (date) {
        const searchDate = new Date(date as string);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);

        guestWhereClause.departureTime = {
          gte: searchDate,
          lt: nextDay
        };
      } else {
        guestWhereClause.departureTime = { gte: new Date() };
      }

      const guestRides = await prisma.guestRide.findMany({
        where: guestWhereClause,
        orderBy: { departureTime: 'asc' },
        take: 20
      });

      const combined = [...rides.map(mapRegisteredRide), ...guestRides.map(mapGuestRide)]
        .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

      res.json({
        success: true,
        data: {
          rides: combined,
          total: combined.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ DÉTAILS D'UN TRAJET (PUBLIC) ============
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('guest_')) {
      const guestId = id.replace('guest_', '');
      const guestRide = await prisma.guestRide.findUnique({ where: { id: guestId } });

      if (!guestRide) {
        throw new AppError('Trajet non trouvé', 404);
      }

      const mappedRide = mapGuestRide(guestRide);

      return res.json({
        success: true,
        data: {
          ride: {
            ...mappedRide,
            originCoords: null,
            destinationCoords: null,
            distance: guestRide.distance,
            passengers: []
          },
          userBooking: null
        }
      });
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
            carModel: true
          }
        },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          select: {
            id: true,
            seats: true,
            passenger: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        }
      }
    });

    if (!ride) {
      throw new AppError('Trajet non trouvé', 404);
    }

    let userBooking = null;
    if (req.user) {
      userBooking = ride.bookings.find(b => b.passenger.id === req.user!.id);
    }

    const mappedRide = mapRegisteredRide(ride);

    res.json({
      success: true,
      data: {
        ride: {
          ...mappedRide,
          originCoords: ride.originLat && ride.originLng ? { lat: ride.originLat, lng: ride.originLng } : null,
          destinationCoords: ride.destinationLat && ride.destinationLng ? { lat: ride.destinationLat, lng: ride.destinationLng } : null,
          distance: ride.distance,
          passengers: ride.bookings.map(b => ({
            id: b.passenger.id,
            name: b.passenger.name,
            avatarUrl: b.passenger.avatarUrl,
            seats: b.seats
          }))
        },
        userBooking: userBooking ? { id: userBooking.id, seats: userBooking.seats } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ CRÉER UN TRAJET (AUTHENTIFIÉ) ============
router.post('/',
  authMiddleware,
  body('originCity').notEmpty().withMessage('Ville de départ requise'),
  body('destinationCity').notEmpty().withMessage('Ville de destination requise'),
  body('departureTime').isISO8601().withMessage('Date de départ invalide'),
  body('pricePerSeat').isInt({ min: 500 }).withMessage('Prix minimum: 500 FCFA'),
  body('totalSeats').isInt({ min: 1, max: 8 }).withMessage('Nombre de places invalide (1-8)'),
  body('features').optional().isArray().withMessage('Features doit être un tableau'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const {
        originCity,
        originAddress,
        originLat,
        originLng,
        destinationCity,
        destinationAddress,
        destinationLat,
        destinationLng,
        departureTime,
        estimatedDuration,
        distance,
        pricePerSeat,
        totalSeats,
        features,
        description
      } = req.body;

      // Vérifier que la date est dans le futur
      if (new Date(departureTime) < new Date()) {
        throw new AppError('La date de départ doit être dans le futur', 400);
      }

      // Marquer l'utilisateur comme conducteur
      await prisma.user.update({
        where: { id: userId },
        data: { isDriver: true }
      });

      const ride = await prisma.ride.create({
        data: {
          driverId: userId,
          originCity,
          originAddress,
          originLat,
          originLng,
          destinationCity,
          destinationAddress,
          destinationLat,
          destinationLng,
          departureTime: new Date(departureTime),
          estimatedDuration: estimatedDuration || 180, // 3h par défaut
          distance,
          pricePerSeat,
          totalSeats,
          availableSeats: totalSeats,
          features: features || [],
          description
        },
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              rating: true,
              isVerified: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Trajet publié avec succès',
        data: { ride }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/guest',
  [
    body('driverName').trim().notEmpty().withMessage('Le nom du conducteur est requis'),
    body('driverPhone').trim().notEmpty().withMessage('Le numéro de téléphone est requis'),
    body('originCity').trim().notEmpty().withMessage('La ville de départ est requise'),
    body('destinationCity').trim().notEmpty().withMessage('La ville d\'arrivée est requise'),
    body('departureTime').isISO8601().toDate().withMessage('La date de départ est invalide'),
    body('pricePerSeat').isInt({ gt: 0 }).withMessage('Le prix doit être supérieur à 0'),
    body('availableSeats').optional().isInt({ min: 1, max: 8 }).withMessage('Places disponibles invalides'),
    body('totalSeats').optional().isInt({ min: 1, max: 8 }).withMessage('Nombre total de places invalide'),
    body('features').optional().isArray().withMessage('Les options doivent être une liste')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const {
        driverName,
        driverPhone,
        originCity,
        originAddress,
        destinationCity,
        destinationAddress,
        departureTime,
        estimatedDuration,
        distance,
        pricePerSeat,
        currency,
        availableSeats,
        totalSeats,
        carModel,
        description,
        features
      } = req.body;

      const normalizedAvailableSeats = availableSeats ?? 1;
      const normalizedTotalSeats = totalSeats ?? normalizedAvailableSeats;

      if (normalizedAvailableSeats > normalizedTotalSeats) {
        throw new AppError('Le nombre de places disponibles ne peut pas dépasser le total', 400);
      }

      const guestRide = await prisma.guestRide.create({
        data: {
          driverName,
          driverPhone,
          originCity,
          originAddress,
          destinationCity,
          destinationAddress,
          departureTime: new Date(departureTime),
          estimatedDuration: estimatedDuration ?? 180,
          distance: distance ?? null,
          pricePerSeat,
          currency: currency || 'XOF',
          availableSeats: normalizedAvailableSeats,
          totalSeats: normalizedTotalSeats,
          carModel: carModel ?? null,
          description: description ?? null,
          features: Array.isArray(features) ? features : [],
          status: GuestRideStatus.PUBLISHED
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          ride: mapGuestRide(guestRide)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ MODIFIER UN TRAJET ============
router.put('/:id',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const ride = await prisma.ride.findUnique({ where: { id } });
      if (!ride) {
        throw new AppError('Trajet non trouvé', 404);
      }

      if (ride.driverId !== userId) {
        throw new AppError('Vous n\'êtes pas autorisé à modifier ce trajet', 403);
      }

      if (ride.status !== 'OPEN') {
        throw new AppError('Ce trajet ne peut plus être modifié', 400);
      }

      const allowedFields = [
        'originAddress', 'destinationAddress', 'departureTime',
        'pricePerSeat', 'features', 'description'
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (updateData.departureTime) {
        updateData.departureTime = new Date(updateData.departureTime);
      }

      const updatedRide = await prisma.ride.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Trajet modifié',
        data: { ride: updatedRide }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ ANNULER UN TRAJET ============
router.post('/:id/cancel',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const ride = await prisma.ride.findUnique({
        where: { id },
        include: { bookings: { where: { status: 'CONFIRMED' } } }
      });

      if (!ride) {
        throw new AppError('Trajet non trouvé', 404);
      }

      if (ride.driverId !== userId) {
        throw new AppError('Vous n\'êtes pas autorisé à annuler ce trajet', 403);
      }

      if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
        throw new AppError('Ce trajet ne peut plus être annulé', 400);
      }

      // Annuler le trajet et toutes les réservations
      await prisma.$transaction([
        prisma.ride.update({
          where: { id },
          data: { status: 'CANCELLED' }
        }),
        prisma.booking.updateMany({
          where: { rideId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
          data: { status: 'CANCELLED' }
        })
      ]);

      // TODO: Rembourser les paiements et notifier les passagers

      res.json({
        success: true,
        message: 'Trajet annulé. Les passagers seront notifiés.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ MES TRAJETS (CONDUCTEUR) ============
router.get('/my-rides',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.id;

      const rides = await prisma.ride.findMany({
        where: { driverId: userId },
        include: {
          bookings: {
            where: { status: { in: ['CONFIRMED', 'PENDING'] } },
            include: {
              passenger: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          }
        },
        orderBy: { departureTime: 'desc' }
      });

      res.json({
        success: true,
        data: { rides }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
