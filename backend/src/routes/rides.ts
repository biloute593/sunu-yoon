import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware, optionalAuth } from '../middleware/auth';

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
              isVerified: true
            }
          }
        },
        orderBy: { departureTime: 'asc' },
        take: 20
      });

      res.json({
        success: true,
        data: {
          rides: rides.map(ride => ({
            id: ride.id,
            driver: ride.driver,
            origin: ride.originCity,
            originAddress: ride.originAddress,
            destination: ride.destinationCity,
            destinationAddress: ride.destinationAddress,
            departureTime: ride.departureTime.toISOString(),
            duration: `${Math.floor(ride.estimatedDuration / 60)}h ${ride.estimatedDuration % 60}m`,
            estimatedDuration: ride.estimatedDuration,
            price: ride.pricePerSeat,
            currency: ride.currency,
            seatsAvailable: ride.availableSeats,
            totalSeats: ride.totalSeats,
            carModel: ride.carModel || 'Véhicule',
            features: ride.features,
            description: ride.description,
            status: ride.status,
            createdAt: ride.createdAt.toISOString()
          })),
          total: rides.length
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
            carModel: true,
            createdAt: true
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

    // Vérifier si l'utilisateur connecté a déjà réservé
    let userBooking = null;
    if (req.user) {
      userBooking = ride.bookings.find(b => b.passenger.id === req.user!.id);
    }

    res.json({
      success: true,
      data: {
        ride: {
          id: ride.id,
          driver: ride.driver,
          origin: ride.originCity,
          originAddress: ride.originAddress,
          originCoords: ride.originLat && ride.originLng ? { lat: ride.originLat, lng: ride.originLng } : null,
          destination: ride.destinationCity,
          destinationAddress: ride.destinationAddress,
          destinationCoords: ride.destinationLat && ride.destinationLng ? { lat: ride.destinationLat, lng: ride.destinationLng } : null,
          departureTime: ride.departureTime.toISOString(),
          duration: `${Math.floor(ride.estimatedDuration / 60)}h ${ride.estimatedDuration % 60}m`,
          distance: ride.distance,
          price: ride.pricePerSeat,
          currency: ride.currency,
          seatsAvailable: ride.availableSeats,
          totalSeats: ride.totalSeats,
          features: ride.features,
          description: ride.description,
          status: ride.status,
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
