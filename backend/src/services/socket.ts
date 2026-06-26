import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

export const setupSocketHandlers = (io: SocketServer) => {
  // Middleware d'authentification
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token requis'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true }
      });

      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      socket.userId = user.id;
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`🔌 Utilisateur connecté: ${socket.userName} (${userId})`);

    // Rejoindre sa propre room pour les notifications personnelles
    socket.join(`user_${userId}`);

    // ============ REJOINDRE UNE CONVERSATION ============
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Vérifier que l'utilisateur fait partie de cette conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            ride: {
              include: {
                bookings: {
                  where: { passengerId: userId },
                  select: { id: true }
                }
              }
            }
          }
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation non trouvée' });
          return;
        }

        // L'utilisateur doit être soit le conducteur, soit un passager
        const isDriver = conversation.ride.driverId === userId;
        const isPassenger = conversation.ride.bookings.length > 0;

        if (!isDriver && !isPassenger) {
          socket.emit('error', { message: 'Accès non autorisé' });
          return;
        }

        socket.join(`conversation_${conversationId}`);
        logger.info(`${socket.userName} a rejoint la conversation ${conversationId}`);

        // Envoyer l'historique des messages
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true }
            }
          }
        });

        socket.emit('conversation_history', messages);

        // Marquer les messages comme lus
        await prisma.message.updateMany({
          where: {
            conversationId,
            receiverId: userId,
            isRead: false
          },
          data: { isRead: true }
        });
      } catch (error) {
        logger.error('Erreur join_conversation:', error);
        socket.emit('error', { message: 'Erreur serveur' });
      }
    });

    // ============ ENVOYER UN MESSAGE ============
    socket.on('send_message', async (data: {
      conversationId: string;
      content: string;
    }) => {
      try {
        const { conversationId, content } = data;

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message vide' });
          return;
        }

        // 1. Récupérer la conversation pour trouver l'autre participant
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            ride: {
              include: {
                bookings: {
                  where: { status: 'CONFIRMED' },
                  select: { passengerId: true }
                }
              }
            }
          }
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation non trouvée' });
          return;
        }

        // 2. Déterminer le destinataire (receiverId)
        // Soit l'expéditeur est le conducteur, le destinataire est le passager
        // Soit l'expéditeur est le passager, le destinataire est le conducteur
        let receiverId: string | undefined;
        
        if (conversation.ride.driverId === userId) {
          // L'expéditeur est le conducteur. On cherche le passager.
          // Note: S'il y a plusieurs passagers, la logique des conversations 
          // devrait être 1-to-1 (un conducteur avec un passager spécifique).
          // On prend le premier passager pour l'instant (à améliorer selon le modèle de données).
          receiverId = conversation.ride.bookings[0]?.passengerId;
        } else {
          // L'expéditeur est un passager. Le destinataire est le conducteur.
          receiverId = conversation.ride.driverId;
        }

        if (!receiverId) {
          socket.emit('error', { message: 'Destinataire introuvable' });
          return;
        }

        // 3. Créer le message
        const message = await prisma.message.create({
          data: {
            conversationId,
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

        // 4. Mettre à jour la date de la conversation
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });

        // Envoyer à tous dans la conversation
        io.to(`conversation_${conversationId}`).emit('new_message', message);

        // Notifier le destinataire s'il n'est pas dans la conversation
        io.to(`user_${receiverId}`).emit('message_notification', {
          conversationId,
          senderName: socket.userName,
          preview: content.substring(0, 50)
        });

        // Créer une notification
        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: 'NEW_MESSAGE',
            title: 'Nouveau message',
            message: `${socket.userName}: ${content.substring(0, 100)}`,
            data: { conversationId, messageId: message.id }
          }
        });

        logger.info(`Message envoyé de ${socket.userName} à ${receiverId}`);
      } catch (error) {
        logger.error('Erreur send_message:', error);
        socket.emit('error', { message: 'Erreur lors de l\'envoi' });
      }
    });

    // ============ MARQUER COMME LU ============
    socket.on('mark_as_read', async (conversationId: string) => {
      try {
        await prisma.message.updateMany({
          where: {
            conversationId,
            receiverId: userId,
            isRead: false
          },
          data: { isRead: true }
        });

        // Notifier l'expéditeur que ses messages ont été lus
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              where: { receiverId: userId },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { senderId: true }
            }
          }
        });

        if (conversation?.messages[0]) {
          io.to(`user_${conversation.messages[0].senderId}`).emit('messages_read', {
            conversationId,
            readBy: userId
          });
        }
      } catch (error) {
        logger.error('Erreur mark_as_read:', error);
      }
    });

    // ============ TYPING INDICATOR ============
    socket.on('typing_start', (conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName: socket.userName
      });
    });

    socket.on('typing_stop', (conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId
      });
    });

    // ============ QUITTER UNE CONVERSATION ============
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation_${conversationId}`);
      logger.info(`${socket.userName} a quitté la conversation ${conversationId}`);
    });

    // ============ TRACKING EN TEMPS RÉEL ============
    
    // Conducteur: Rejoindre le room de tracking pour son trajet
    socket.on('tracking:join', async (data: { rideId: string }) => {
      try {
        const { rideId } = data;
        
        // Vérifier que l'utilisateur est le conducteur
        const ride = await prisma.ride.findUnique({
          where: { id: rideId },
          select: { driverId: true, status: true }
        });

        if (!ride || ride.driverId !== userId) {
          socket.emit('tracking:error', { message: 'Non autorisé' });
          return;
        }

        socket.join(`tracking_${rideId}`);
        logger.info(`🚗 Conducteur ${socket.userName} démarre le tracking pour trajet ${rideId}`);
        
        // Mettre le trajet en cours
        if (ride.status === 'OPEN') {
          await prisma.ride.update({
            where: { id: rideId },
            data: { status: 'IN_PROGRESS' }
          });
        }

        socket.emit('tracking:started', { rideId });
      } catch (error) {
        logger.error('Erreur tracking:join:', error);
        socket.emit('tracking:error', { message: 'Erreur serveur' });
      }
    });

    // Passager: S'abonner au tracking d'un trajet
    socket.on('tracking:subscribe', async (data: { rideId: string }) => {
      try {
        const { rideId } = data;
        
        // Vérifier que l'utilisateur a une réservation confirmée
        const booking = await prisma.booking.findFirst({
          where: {
            rideId,
            passengerId: userId,
            status: 'CONFIRMED'
          }
        });

        if (!booking) {
          socket.emit('tracking:error', { message: 'Réservation non trouvée' });
          return;
        }

        socket.join(`tracking_${rideId}`);
        logger.info(`📍 Passager ${socket.userName} suit le trajet ${rideId}`);
        
        socket.emit('tracking:subscribed', { rideId });
      } catch (error) {
        logger.error('Erreur tracking:subscribe:', error);
      }
    });

    // Mise à jour de position en temps réel (conducteur)
    socket.on('tracking:update', async (data: {
      rideId: string;
      coords: { lat: number; lng: number };
      speed?: number;
      heading?: number;
    }) => {
      try {
        const { rideId, coords, speed, heading } = data;

        // Vérifier que l'utilisateur est le conducteur
        const ride = await prisma.ride.findUnique({
          where: { id: rideId },
          select: { driverId: true }
        });

        if (!ride || ride.driverId !== userId) {
          return;
        }

        // Broadcast à tous les abonnés du trajet
        const locationUpdate = {
          rideId,
          driverId: userId,
          coords,
          speed,
          heading,
          timestamp: new Date()
        };

        io.to(`tracking_${rideId}`).emit('tracking:update', locationUpdate);
        
        // Log moins verbeux (seulement toutes les 10 mises à jour)
        if (Math.random() < 0.1) {
          logger.debug(`📍 Position mise à jour pour trajet ${rideId}`);
        }
      } catch (error) {
        logger.error('Erreur tracking:update:', error);
      }
    });

    // Quitter le tracking
    socket.on('tracking:leave', (data: { rideId: string }) => {
      socket.leave(`tracking_${data.rideId}`);
      logger.info(`🛑 ${socket.userName} quitte le tracking ${data.rideId}`);
    });

    socket.on('tracking:unsubscribe', (data: { rideId: string }) => {
      socket.leave(`tracking_${data.rideId}`);
      logger.info(`🛑 ${socket.userName} arrête de suivre ${data.rideId}`);
    });

    // ============ MISE À JOUR DE LOCALISATION (legacy) ============
    socket.on('location_update', async (data: {
      rideId: string;
      lat: number;
      lng: number;
    }) => {
      try {
        const { rideId, lat, lng } = data;

        // Vérifier que l'utilisateur est le conducteur
        const ride = await prisma.ride.findUnique({
          where: { id: rideId },
          include: {
            bookings: {
              where: { status: 'CONFIRMED' },
              select: { passengerId: true }
            }
          }
        });

        if (!ride || ride.driverId !== userId) {
          return;
        }

        // Envoyer la position à tous les passagers
        ride.bookings.forEach(booking => {
          io.to(`user_${booking.passengerId}`).emit('driver_location', {
            rideId,
            lat,
            lng,
            timestamp: new Date()
          });
        });
      } catch (error) {
        logger.error('Erreur location_update:', error);
      }
    });

    // ============ DEMANDE DE RÉSERVATION TEMPS RÉEL ============
    socket.on('request_booking', async (data: {
      rideId: string;
      seats: number;
      passengerName: string;
      passengerPhone: string;
    }) => {
      try {
        const { rideId, seats = 1, passengerName, passengerPhone } = data;

        // 1. Trouver le trajet
        const ride = await prisma.ride.findUnique({
          where: { id: rideId },
          include: { driver: true }
        });

        if (!ride) {
          socket.emit('booking_error', { message: 'Trajet introuvable' });
          return;
        }

        if (ride.status !== 'OPEN') {
          socket.emit('booking_error', { message: 'Ce trajet n\'est plus disponible' });
          return;
        }

        if (ride.availableSeats < seats) {
          socket.emit('booking_error', { message: `Plus que ${ride.availableSeats} places disponibles` });
          return;
        }

        // 2. Créer une réservation PENDING dans la DB
        const totalPrice = ride.pricePerSeat * seats;

        // Supprimer toute ancienne réservation PENDING pour éviter les conflits uniques
        await prisma.booking.deleteMany({
          where: {
            rideId,
            passengerId: userId,
            status: 'PENDING'
          }
        });

        const booking = await prisma.booking.create({
          data: {
            rideId,
            passengerId: userId,
            seats,
            totalPrice,
            status: 'PENDING'
          }
        });

        // 3. Envoyer la demande au chauffeur
        io.to(`user_${ride.driverId}`).emit('booking_requested', {
          bookingId: booking.id,
          passengerName: passengerName || socket.userName || 'Passager',
          passengerPhone: passengerPhone,
          rideId,
          seats,
          originCity: ride.originCity,
          destinationCity: ride.destinationCity
        });

        logger.info(`Booking request ${booking.id} sent from passenger ${userId} to driver ${ride.driverId}`);
      } catch (error) {
        logger.error('Erreur request_booking:', error);
        socket.emit('booking_error', { message: 'Erreur lors de la demande de réservation' });
      }
    });

    // ============ RÉPONSE DU CHAUFFEUR À LA RÉSERVATION ============
    socket.on('respond_booking', async (data: {
      bookingId: string;
      accepted: boolean;
    }) => {
      try {
        const { bookingId, accepted } = data;

        // 1. Trouver la réservation
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            ride: {
              include: { driver: true }
            },
            passenger: true
          }
        });

        if (!booking) {
          socket.emit('error', { message: 'Réservation introuvable' });
          return;
        }

        // Vérifier que le chauffeur est bien celui qui répond
        if (booking.ride.driverId !== userId) {
          socket.emit('error', { message: 'Action non autorisée' });
          return;
        }

        if (accepted) {
          // A. Accepter la réservation
          const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' }
          });

          // B. Décrémenter les places sur le trajet
          const remainingSeats = Math.max(0, booking.ride.availableSeats - booking.seats);
          await prisma.ride.update({
            where: { id: booking.rideId },
            data: {
              availableSeats: remainingSeats,
              status: remainingSeats <= 0 ? 'FULL' : booking.ride.status
            }
          });

          // C. Trouver ou créer une conversation pour ce trajet
          let conversation = await prisma.conversation.findFirst({
            where: {
              rideId: booking.rideId
            }
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                rideId: booking.rideId
              }
            });
          }

          // D. Créer le premier message système automatique du chauffeur au passager
          const initialMessageText = `Bonjour ! J'ai accepté votre demande de réservation pour le trajet ${booking.ride.originCity} → ${booking.ride.destinationCity}. À bientôt !`;
          
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: booking.ride.driverId,
              receiverId: booking.passengerId,
              content: initialMessageText
            }
          });

          // E. Notifier le passager que le chauffeur a accepté
          io.to(`user_${booking.passengerId}`).emit('booking_response', {
            bookingId,
            status: 'CONFIRMED',
            conversationId: conversation.id,
            driverName: booking.ride.driver.name || 'Conducteur',
            driverPhone: booking.ride.driver.phone || '',
            driverAvatar: booking.ride.driver.avatarUrl || '',
            message: 'Le chauffeur a accepté votre course !'
          });

          // Notifier le chauffeur du succès
          socket.emit('booking_processed', { bookingId, status: 'CONFIRMED' });

          logger.info(`Booking ${bookingId} CONFIRMED by driver ${userId}`);
        } else {
          // A. Refuser la réservation
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
          });

          // B. Notifier le passager
          io.to(`user_${booking.passengerId}`).emit('booking_response', {
            bookingId,
            status: 'CANCELLED',
            message: 'Le chauffeur ne prend plus de client sur ce trajet.'
          });

          // Notifier le chauffeur du succès
          socket.emit('booking_processed', { bookingId, status: 'CANCELLED' });

          logger.info(`Booking ${bookingId} CANCELLED by driver ${userId}`);
        }
      } catch (error) {
        logger.error('Erreur respond_booking:', error);
        socket.emit('error', { message: 'Erreur lors du traitement de la réservation' });
      }
    });

    // ============ DÉCONNEXION ============
    socket.on('disconnect', () => {
      logger.info(`🔌 Utilisateur déconnecté: ${socket.userName}`);
    });
  });

  logger.info('✅ Handlers WebSocket configurés');
};
