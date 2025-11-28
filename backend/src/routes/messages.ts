import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma, io } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ============ OBTENIR OU CRÉER UNE CONVERSATION ============
router.post('/conversations',
  body('rideId').isUUID().withMessage('ID de trajet invalide'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const { rideId } = req.body;

      // Vérifier le trajet et les droits
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          driver: {
            select: { id: true, name: true, avatarUrl: true }
          },
          bookings: {
            where: { 
              passengerId: userId,
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          }
        }
      });

      if (!ride) {
        throw new AppError('Trajet non trouvé', 404);
      }

      // L'utilisateur doit être soit le conducteur, soit un passager avec réservation
      const isDriver = ride.driverId === userId;
      const isPassenger = ride.bookings.length > 0;

      if (!isDriver && !isPassenger) {
        throw new AppError('Vous devez avoir une réservation pour contacter le conducteur', 403);
      }

      // Chercher une conversation existante ou en créer une
      let conversation = await prisma.conversation.findFirst({
        where: { rideId }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { rideId }
        });
      }

      // Récupérer les derniers messages
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true }
          }
        }
      });

      res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            rideId: ride.id,
            ride: {
              origin: ride.originCity,
              destination: ride.destinationCity,
              departureTime: ride.departureTime
            },
            otherParticipant: isDriver 
              ? null // Le conducteur voit tous les passagers
              : ride.driver,
            messages: messages.reverse()
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============ LISTER MES CONVERSATIONS ============
router.get('/conversations', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // Trouver toutes les conversations où l'utilisateur participe
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { ride: { driverId: userId } },
          { ride: { bookings: { some: { passengerId: userId } } } }
        ]
      },
      include: {
        ride: {
          include: {
            driver: {
              select: { id: true, name: true, avatarUrl: true }
            },
            bookings: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
              include: {
                passenger: {
                  select: { id: true, name: true, avatarUrl: true }
                }
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Compter les messages non lus pour chaque conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            isRead: false
          }
        });

        const isDriver = conv.ride.driverId === userId;
        const lastMessage = conv.messages[0];

        return {
          id: conv.id,
          ride: {
            id: conv.ride.id,
            origin: conv.ride.originCity,
            destination: conv.ride.destinationCity,
            departureTime: conv.ride.departureTime
          },
          participants: isDriver 
            ? conv.ride.bookings.map(b => b.passenger)
            : [conv.ride.driver],
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderName: lastMessage.sender.name,
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.senderId === userId
          } : null,
          unreadCount,
          updatedAt: conv.updatedAt
        };
      })
    );

    res.json({
      success: true,
      data: { conversations: conversationsWithUnread }
    });
  } catch (error) {
    next(error);
  }
});

// ============ MESSAGES D'UNE CONVERSATION ============
router.get('/conversations/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    // Vérifier l'accès
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        ride: {
          include: {
            bookings: {
              where: { passengerId: userId }
            }
          }
        }
      }
    });

    if (!conversation) {
      throw new AppError('Conversation non trouvée', 404);
    }

    const isDriver = conversation.ride.driverId === userId;
    const isPassenger = conversation.ride.bookings.length > 0;

    if (!isDriver && !isPassenger) {
      throw new AppError('Accès non autorisé', 403);
    }

    const whereClause: any = { conversationId: id };
    if (before) {
      whereClause.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    // Marquer comme lus
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        hasMore: messages.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ ENVOYER UN MESSAGE (REST fallback) ============
router.post('/conversations/:id/messages',
  body('content').notEmpty().withMessage('Message requis'),
  body('receiverId').isUUID().withMessage('Destinataire requis'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const { id } = req.params;
      const { content, receiverId } = req.body;

      // Créer le message
      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          receiverId,
          content: content.trim()
        },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true }
          }
        }
      });

      // Mettre à jour la conversation
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      // Notifier via WebSocket
      io.to(`conversation_${id}`).emit('new_message', message);
      io.to(`user_${receiverId}`).emit('message_notification', {
        conversationId: id,
        senderName: req.user!.name,
        preview: content.substring(0, 50)
      });

      // Créer notification
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'NEW_MESSAGE',
          title: 'Nouveau message',
          message: `${req.user!.name}: ${content.substring(0, 100)}`,
          data: { conversationId: id, messageId: message.id }
        }
      });

      res.status(201).json({
        success: true,
        data: { message }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
