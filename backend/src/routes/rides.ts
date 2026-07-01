import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { GuestRideStatus } from '@prisma/client';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware, optionalAuth } from '../middleware/auth';
import { mapGuestRide, mapRegisteredRide } from '../utils/rideMapper';
import { buildCityFilter } from '../utils/senegalGeo';

const router = Router();

// Helper pour s'assurer qu'il y a toujours des trajets de démo dans le futur
async function ensureFutureRides() {
  try {
    const now = new Date();
    // Compter les trajets de type OPEN qui sont dans le futur
    const futureCount = await prisma.ride.count({
      where: {
        status: 'OPEN',
        departureTime: { gte: now }
      }
    });

    // Si on a moins de 3 trajets dans le futur, on décale les trajets passés dans le futur
    if (futureCount < 3) {
      console.log(`[Auto-Seed] Only ${futureCount} future rides found. Shifting past rides to future dates...`);
      
      const pastRides = await prisma.ride.findMany({
        where: {
          departureTime: { lt: now }
        }
      });

      if (pastRides.length > 0) {
        let index = 1;
        for (const ride of pastRides) {
          // Décale les départs de 1 à 5 jours dans le futur
          const newDeparture = new Date();
          newDeparture.setDate(newDeparture.getDate() + index);
          newDeparture.setHours(new Date(ride.departureTime).getHours(), new Date(ride.departureTime).getMinutes(), 0, 0);

          await prisma.ride.update({
            where: { id: ride.id },
            data: { 
              departureTime: newDeparture,
              status: 'OPEN', // Rétablir le trajet en OPEN s'il était fermé
              availableSeats: ride.totalSeats // Réinitialiser les places libres pour les tests
            }
          });
          index++;
        }
        console.log(`[Auto-Seed] Successfully shifted ${pastRides.length} rides to future dates.`);
      }
    }
  } catch (err) {
    console.error("[Auto-Seed] Error in ensureFutureRides:", err);
  }
}

// ============ RECHERCHER DES TRAJETS (PUBLIC) ============
router.get('/',
  query('origin').optional().trim(),
  query('destination').optional().trim(),
  query('date').optional().isISO8601().withMessage('Date invalide'),
  query('seats').optional().isInt({ min: 1 }).withMessage('Nombre de places invalide'),
  async (req, res, next) => {
    try {
      await ensureFutureRides();
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

      const whereClause: any = {
        status: 'OPEN',
        availableSeats: { gte: minSeats }
      };

      if (origin && origin.trim()) {
        Object.assign(whereClause, buildCityFilter(origin.trim(), 'originCity'));
      }
      if (destination && destination.trim()) {
        Object.assign(whereClause, buildCityFilter(destination.trim(), 'destinationCity'));
      }

      if (date) {
        const searchDate = new Date(date as string);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.departureTime = { gte: searchDate, lt: nextDay };
      } else {
        whereClause.departureTime = { gte: new Date() };
      }

      const rides = await prisma.ride.findMany({
        where: whereClause,
        include: {
          driver: {
            select: { id: true, name: true, phone: true, avatarUrl: true, rating: true, reviewCount: true, isVerified: true, carModel: true }
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
        Object.assign(guestWhereClause, buildCityFilter(origin.trim(), 'originCity'));
      }
      if (destination && destination.trim()) {
        Object.assign(guestWhereClause, buildCityFilter(destination.trim(), 'destinationCity'));
      }
      if (date) {
        const searchDate = new Date(date as string);
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        guestWhereClause.departureTime = { gte: searchDate, lt: nextDay };
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

      res.json({ success: true, data: { rides: combined, total: combined.length } });
    } catch (error) {
      next(error);
    }
  }
);

// ============ RE-INITIALISER ET SEEDER LA BASE (PUBLIC/DEV) ============
router.post('/seed-database', async (req, res, next) => {
  try {
    console.log('🌱 Programmatically seeding database...');

    // 1. Nettoyer les anciennes données pour repartir de zéro et éviter les doublons
    await prisma.review.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.guestRide.deleteMany({});
    await prisma.ride.deleteMany({});

    // 2. Créer ou mettre à jour les utilisateurs de test
    const passwordHash = '$2a$12$R9h/lIPzMRuGzY1G6c5M/O9U7fW4q2rX6e.H.1.E5e.9e.1e.9e.9'; // password123 pré-haché
    const users = await Promise.all([
      prisma.user.upsert({
        where: { phone: '+221771234567' },
        update: {},
        create: {
          phone: '+221771234567',
          email: 'moussa.diop@example.com',
          name: 'Moussa Diop',
          passwordHash,
          avatarUrl: 'https://ui-avatars.com/api/?name=Moussa+Diop&background=059669&color=fff',
          rating: 4.8,
          reviewCount: 156,
          isVerified: true,
          isPhoneVerified: true,
          isDriver: true,
          carModel: 'Peugeot 308',
          carPlate: 'DK-1234-AB',
          carColor: 'Gris métallisé'
        }
      }),
      prisma.user.upsert({
        where: { phone: '+221777654321' },
        update: {},
        create: {
          phone: '+221777654321',
          email: 'fatou.ndiaye@example.com',
          name: 'Fatou Ndiaye',
          passwordHash,
          avatarUrl: 'https://ui-avatars.com/api/?name=Fatou+Ndiaye&background=059669&color=fff',
          rating: 4.9,
          reviewCount: 42,
          isVerified: true,
          isPhoneVerified: true,
          isDriver: true,
          carModel: 'Toyota Corolla',
          carPlate: 'DK-5678-CD',
          carColor: 'Blanc'
        }
      }),
      prisma.user.upsert({
        where: { phone: '+221781112233' },
        update: {},
        create: {
          phone: '+221781112233',
          email: 'amadou.sow@example.com',
          name: 'Amadou Sow',
          passwordHash,
          avatarUrl: 'https://ui-avatars.com/api/?name=Amadou+Sow&background=059669&color=fff',
          rating: 4.5,
          reviewCount: 12,
          isVerified: true,
          isPhoneVerified: true,
          isDriver: false
        }
      }),
      prisma.user.upsert({
        where: { phone: '+221769998877' },
        update: {},
        create: {
          phone: '+221769998877',
          email: 'aissatou.ba@example.com',
          name: 'Aissatou Ba',
          passwordHash,
          avatarUrl: 'https://ui-avatars.com/api/?name=Aissatou+Ba&background=059669&color=fff',
          rating: 4.7,
          reviewCount: 28,
          isVerified: true,
          isPhoneVerified: true,
          isDriver: true,
          carModel: 'Renault Clio',
          carPlate: 'DK-9012-EF',
          carColor: 'Bleu'
        }
      })
    ]);

    // 3. Créer des trajets de test dynamiques
    const today = new Date();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const afterTomorrow = new Date(today);
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    afterTomorrow.setHours(10, 30, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 5);
    nextWeek.setHours(14, 30, 0, 0);

    const rides = await Promise.all([
      prisma.ride.create({
        data: {
          driverId: users[0].id,
          originCity: 'Dakar',
          originAddress: 'Gare routière des Beaux Maraichers, Pikine',
          originLat: 14.7645,
          originLng: -17.4019,
          destinationCity: 'Saint-Louis',
          destinationAddress: 'Gare routière de Saint-Louis',
          destinationLat: 16.0326,
          destinationLng: -16.4818,
          departureTime: tomorrow,
          estimatedDuration: 270,
          distance: 265,
          pricePerSeat: 5000,
          totalSeats: 4,
          availableSeats: 2,
          features: ['Climatisation', 'Bagages acceptés', 'Non-fumeur'],
          description: 'Trajet confortable avec pauses café. Musique sénégalaise garantie!'
        }
      }),
      prisma.ride.create({
        data: {
          driverId: users[1].id,
          originCity: 'Dakar',
          originAddress: 'Liberté 6, près du marché',
          originLat: 14.7167,
          originLng: -17.4677,
          destinationCity: 'Touba',
          destinationAddress: 'Grande Mosquée',
          destinationLat: 14.8556,
          destinationLng: -15.8833,
          departureTime: afterTomorrow,
          estimatedDuration: 135,
          distance: 195,
          pricePerSeat: 4500,
          totalSeats: 3,
          availableSeats: 3,
          features: ['Climatisation', 'Musique', 'Non-fumeur'],
          description: 'Départ ponctuel. Arrêt possible à Thiès.'
        }
      }),
      prisma.ride.create({
        data: {
          driverId: users[3].id,
          originCity: 'Dakar',
          originAddress: 'Plateau, Place de l\'Indépendance',
          originLat: 14.6697,
          originLng: -17.4378,
          destinationCity: 'Mbour',
          destinationAddress: 'Centre-ville Mbour',
          destinationLat: 14.4167,
          destinationLng: -16.9667,
          departureTime: nextWeek,
          estimatedDuration: 90,
          distance: 85,
          pricePerSeat: 2500,
          totalSeats: 4,
          availableSeats: 4,
          features: ['Climatisation', 'Bagages acceptés'],
          description: 'Direction la Petite Côte! Parfait pour une escapade.'
        }
      }),
      prisma.ride.create({
        data: {
          driverId: users[0].id,
          originCity: 'Saint-Louis',
          originAddress: 'Gare routière',
          destinationCity: 'Dakar',
          destinationAddress: 'Gare routière Pompiers',
          departureTime: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          estimatedDuration: 270,
          distance: 265,
          pricePerSeat: 5000,
          totalSeats: 4,
          availableSeats: 4,
          features: ['Climatisation', 'Bagages acceptés', 'Non-fumeur'],
          description: 'Retour vers Dakar. Départ après la prière du Fajr.'
        }
      })
    ]);

    // 4. Créer des avis de test pour Moussa Diop
    await prisma.review.create({
      data: {
        authorId: users[2].id,
        targetId: users[0].id,
        rating: 5,
        comment: 'Excellent conducteur! Très ponctuel et voiture très propre. Je recommande vivement.'
      }
    });

    res.json({ success: true, message: 'Database reset and seeded successfully!' });
  } catch (error) {
    next(error);
  }
});

// ============ MES TRAJETS (CONDUCTEUR) - DOIT ETRE AVANT /:id ============
router.get('/my-rides', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const rides = await prisma.ride.findMany({
      where: { driverId: userId },
      include: {
        driver: {
          select: { id: true, name: true, phone: true, avatarUrl: true, rating: true, reviewCount: true, isVerified: true, carModel: true }
        },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          include: { passenger: { select: { id: true, name: true, avatarUrl: true } } }
        }
      },
      orderBy: { departureTime: 'desc' }
    });
    res.json({ success: true, data: { rides: rides.map(mapRegisteredRide) } });
  } catch (error) {
    next(error);
  }
});

// ============ DETAILS D'UN TRAJET (PUBLIC) ============
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('guest_')) {
      const guestId = id.replace('guest_', '');
      const guestRide = await prisma.guestRide.findUnique({ where: { id: guestId } });
      if (!guestRide) throw new AppError('Trajet non trouve', 404);
      const mappedRide = mapGuestRide(guestRide);
      return res.json({
        success: true,
        data: {
          ride: { ...mappedRide, originCoords: null, destinationCoords: null, distance: guestRide.distance, passengers: [] },
          userBooking: null
        }
      });
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        driver: {
          select: { id: true, name: true, phone: true, avatarUrl: true, rating: true, reviewCount: true, isVerified: true, carModel: true }
        },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          select: {
            id: true,
            status: true,
            seats: true,
            passenger: { select: { id: true, name: true, avatarUrl: true } }
          }
        }
      }
    });

    if (!ride) throw new AppError('Trajet non trouve', 404);

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
            bookingId: b.id,
            name: b.passenger.name,
            avatarUrl: b.passenger.avatarUrl,
            seats: b.seats,
            status: b.status
          }))
        },
        userBooking: userBooking ? { id: userBooking.id, seats: userBooking.seats } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ CREER UN TRAJET (AUTHENTIFIE) ============
router.post('/',
  authMiddleware,
  body('originCity').notEmpty().withMessage('Ville de depart requise'),
  body('destinationCity').notEmpty().withMessage('Ville de destination requise'),
  body('departureTime').isISO8601().withMessage('Date de depart invalide'),
  body('pricePerSeat').isInt({ min: 100 }).withMessage('Prix minimum: 100 FCFA'),
  body('totalSeats').isInt({ min: 1, max: 8 }).withMessage('Nombre de places invalide (1-8)'),
  body('features').optional().isArray().withMessage('Features doit etre un tableau'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);

      const userId = req.user!.id;
      const {
        originCity, originAddress, originLat, originLng,
        destinationCity, destinationAddress, destinationLat, destinationLng,
        departureTime, estimatedDuration, distance, pricePerSeat, totalSeats, features, description
      } = req.body;

      if (new Date(departureTime) < new Date()) {
        throw new AppError('La date de depart doit etre dans le futur', 400);
      }

      await prisma.user.update({ where: { id: userId }, data: { isDriver: true } });

      const ride = await prisma.ride.create({
        data: {
          driverId: userId,
          originCity, originAddress, originLat, originLng,
          destinationCity, destinationAddress, destinationLat, destinationLng,
          departureTime: new Date(departureTime),
          estimatedDuration: estimatedDuration || 180,
          distance, pricePerSeat, totalSeats, availableSeats: totalSeats,
          features: features || [], description
        },
        include: { driver: { select: { id: true, name: true, phone: true, avatarUrl: true, rating: true, isVerified: true } } }
      });

      res.status(201).json({ success: true, message: 'Trajet publie avec succes', data: { ride } });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/guest',
  [
    body('driverName').trim().notEmpty().withMessage('Le nom du conducteur est requis'),
    body('driverPhone').trim().notEmpty().withMessage('Le numero de telephone est requis'),
    body('originCity').trim().notEmpty().withMessage('La ville de depart est requise'),
    body('destinationCity').trim().notEmpty().withMessage("La ville d'arrivee est requise"),
    body('departureTime').isISO8601().toDate().withMessage('La date de depart est invalide'),
    body('pricePerSeat').isInt({ gt: 0 }).withMessage('Le prix doit etre superieur a 0'),
    body('availableSeats').optional().isInt({ min: 1, max: 8 }).withMessage('Places disponibles invalides'),
    body('totalSeats').optional().isInt({ min: 1, max: 8 }).withMessage('Nombre total de places invalide'),
    body('features').optional().isArray().withMessage('Les options doivent etre une liste')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);

      const {
        driverName, driverPhone, originCity, originAddress,
        destinationCity, destinationAddress, departureTime, estimatedDuration,
        distance, pricePerSeat, currency, availableSeats, totalSeats, carModel, description, features
      } = req.body;

      const normalizedAvailableSeats = availableSeats ?? 1;
      const normalizedTotalSeats = totalSeats ?? normalizedAvailableSeats;

      if (normalizedAvailableSeats > normalizedTotalSeats) {
        throw new AppError('Le nombre de places disponibles ne peut pas depasser le total', 400);
      }

      const guestRide = await prisma.guestRide.create({
        data: {
          driverName, driverPhone, originCity, originAddress, destinationCity, destinationAddress,
          departureTime: new Date(departureTime),
          estimatedDuration: estimatedDuration ?? 180,
          distance: distance ?? null, pricePerSeat,
          currency: currency || 'XOF',
          availableSeats: normalizedAvailableSeats, totalSeats: normalizedTotalSeats,
          carModel: carModel ?? null, description: description ?? null,
          features: Array.isArray(features) ? features : [],
          status: GuestRideStatus.PUBLISHED
        }
      });

      return res.status(201).json({ success: true, data: { ride: mapGuestRide(guestRide) } });
    } catch (error) {
      next(error);
    }
  }
);

// ============ MODIFIER UN TRAJET ============
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new AppError('Trajet non trouve', 404);
    if (ride.driverId !== userId) throw new AppError("Vous n'etes pas autorise a modifier ce trajet", 403);
    if (ride.status !== 'OPEN') throw new AppError('Ce trajet ne peut plus etre modifie', 400);

    const allowedFields = ['originAddress', 'destinationAddress', 'departureTime', 'pricePerSeat', 'features', 'description'];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.departureTime) updateData.departureTime = new Date(updateData.departureTime);

    const updatedRide = await prisma.ride.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'Trajet modifie', data: { ride: updatedRide } });
  } catch (error) {
    next(error);
  }
});

// ============ ANNULER UN TRAJET ============
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const ride = await prisma.ride.findUnique({ where: { id }, include: { bookings: { where: { status: 'CONFIRMED' } } } });
    if (!ride) throw new AppError('Trajet non trouve', 404);
    if (ride.driverId !== userId) throw new AppError("Vous n'etes pas autorise a annuler ce trajet", 403);
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') throw new AppError('Ce trajet ne peut plus etre annule', 400);

    await prisma.$transaction([
      prisma.ride.update({ where: { id }, data: { status: 'CANCELLED' } }),
      prisma.booking.updateMany({ where: { rideId: id, status: { in: ['PENDING', 'CONFIRMED'] } }, data: { status: 'CANCELLED' } })
    ]);

    res.json({ success: true, message: 'Trajet annule. Les passagers seront notifies.' });
  } catch (error) {
    next(error);
  }
});

// Route de débogage pour voir tous les trajets
// ============ CLÔTURER UN TRAJET ============
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new AppError('Trajet non trouve', 404);
    if (ride.driverId !== userId) throw new AppError("Vous n'etes pas autorise a cloturer ce trajet", 403);
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') throw new AppError('Ce trajet est deja cloture ou annule', 400);

    const updatedRide = await prisma.ride.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    res.json({ success: true, message: 'Trajet cloture avec succes.', data: { ride: updatedRide } });
  } catch (error) {
    next(error);
  }
});

export default router;
