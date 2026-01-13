import express from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth, requireAuth } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Créer une demande de trajet (passager)
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const {
      originCity,
      destinationCity,
      departureDate,
      seats,
      maxPricePerSeat,
      description,
      passengerName,
      passengerPhone
    } = req.body;

    if (!originCity || !destinationCity || !departureDate || !seats) {
      return res.status(400).json({
        success: false,
        error: 'originCity, destinationCity, departureDate et seats sont requis'
      });
    }

    let passengerId = userId;

    // Si non authentifié, créer ou récupérer utilisateur guest
    if (!passengerId) {
      if (!passengerName || !passengerPhone) {
        return res.status(400).json({
          success: false,
          error: 'passengerName et passengerPhone requis pour invités'
        });
      }

      const normalizedPhone = passengerPhone.startsWith('+') 
        ? passengerPhone 
        : `+221${passengerPhone}`;

      let guest = await prisma.user.findUnique({
        where: { phone: normalizedPhone }
      });

      if (!guest) {
        guest = await prisma.user.create({
          data: {
            phone: normalizedPhone,
            name: passengerName,
            password: Math.random().toString(36),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerName)}&background=3b82f6&color=fff`
          }
        });
      }

      passengerId = guest.id;
    }

    const rideRequest = await prisma.rideRequest.create({
      data: {
        passengerId,
        originCity,
        destinationCity,
        departureDate: new Date(departureDate),
        seats: parseInt(seats),
        maxPricePerSeat: maxPricePerSeat ? parseInt(maxPricePerSeat) : null,
        description,
        status: 'PENDING'
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Demande de trajet créée',
      data: rideRequest
    });
  } catch (error) {
    next(error);
  }
});

// Lister les demandes de trajets actives (pour conducteurs)
router.get('/active', async (req, res, next) => {
  try {
    const { originCity, destinationCity, limit = 20 } = req.query;

    const where: any = {
      status: 'PENDING',
      departureDate: {
        gte: new Date()
      }
    };

    if (originCity) where.originCity = originCity;
    if (destinationCity) where.destinationCity = destinationCity;

    const requests = await prisma.rideRequest.findMany({
      where,
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
});

// Mes demandes (passager authentifié)
router.get('/my-requests', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;

    const requests = await prisma.rideRequest.findMany({
      where: { passengerId: userId },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true
          }
        },
        acceptedByDriver: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            rating: true,
            carModel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
});

// Accepter une demande (conducteur)
router.post('/:requestId/accept', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { passenger: true }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Demande déjà traitée'
      });
    }

    const updated = await prisma.rideRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACCEPTED',
        acceptedByDriverId: userId
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
        acceptedByDriver: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            rating: true,
            carModel: true
          }
        }
      }
    });

    // Créer notification pour le passager
    await prisma.notification.create({
      data: {
        userId: request.passengerId,
        type: 'REQUEST_ACCEPTED',
        title: 'Demande acceptée',
        message: `Un conducteur a accepté votre demande ${request.originCity} → ${request.destinationCity}`,
        data: { requestId: request.id }
      }
    });

    res.json({
      success: true,
      message: 'Demande acceptée',
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// Annuler une demande
router.post('/:requestId/cancel', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable'
      });
    }

    if (request.passengerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé'
      });
    }

    const updated = await prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' }
    });

    res.json({
      success: true,
      message: 'Demande annulée',
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

export default router;
