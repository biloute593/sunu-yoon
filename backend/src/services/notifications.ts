import { prisma, io } from '../index';
import { sendSMS, sendRideReminder } from './sms';
import { logger } from '../utils/logger';

// Service de notifications push (Firebase Cloud Messaging)
interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Simuler l'envoi FCM (à remplacer par firebase-admin en production)
export const sendPushNotification = async (
  fcmToken: string,
  notification: PushNotification
): Promise<boolean> => {
  try {
    // En production, utiliser firebase-admin:
    // const admin = require('firebase-admin');
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: { title: notification.title, body: notification.body },
    //   data: notification.data
    // });

    logger.info(`[PUSH] Notification envoyée à ${fcmToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logger.error('Erreur push notification:', error);
    return false;
  }
};

// Envoyer une notification à un utilisateur (multi-canal)
export const notifyUser = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
  options?: {
    sendPush?: boolean;
    sendSms?: boolean;
    smsMessage?: string;
  }
): Promise<void> => {
  try {
    // 1. Créer la notification en base
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data
      }
    });

    // 2. Envoyer via WebSocket
    io.to(`user_${userId}`).emit('notification', {
      id: notification.id,
      type,
      title,
      message,
      data,
      createdAt: notification.createdAt
    });

    // 3. Récupérer l'utilisateur pour push/sms
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, phone: true }
    });

    if (!user) return;

    // 4. Push notification
    if (options?.sendPush && user.fcmToken) {
      await sendPushNotification(user.fcmToken, {
        title,
        body: message,
        data: data ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ) : undefined
      });
    }

    // 5. SMS (pour les notifications importantes)
    if (options?.sendSms && options.smsMessage && process.env.NODE_ENV === 'production') {
      await sendSMS({ to: user.phone, message: options.smsMessage });
    }
  } catch (error) {
    logger.error('Erreur notifyUser:', error);
  }
};

// Programmer un rappel de départ
export const scheduleRideReminder = async (
  rideId: string,
  minutesBefore: number = 60
): Promise<void> => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: { select: { id: true, phone: true, fcmToken: true } },
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            passenger: { select: { id: true, phone: true, fcmToken: true, name: true } }
          }
        }
      }
    });

    if (!ride) return;

    const departureTime = new Date(ride.departureTime);
    const reminderTime = new Date(departureTime.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    // Si le rappel est dans le passé, ne rien faire
    if (reminderTime <= now) return;

    const delay = reminderTime.getTime() - now.getTime();

    // Programmer le rappel
    setTimeout(async () => {
      // Vérifier que le trajet n'a pas été annulé
      const currentRide = await prisma.ride.findUnique({ where: { id: rideId } });
      if (!currentRide || currentRide.status === 'CANCELLED') return;

      const message = `Rappel: Départ dans ${minutesBefore} minutes pour ${ride.originCity} → ${ride.destinationCity}`;

      // Notifier le conducteur
      await notifyUser(
        ride.driver.id,
        'RIDE_REMINDER',
        'Rappel de départ',
        message,
        { rideId },
        {
          sendPush: true,
          sendSms: true,
          smsMessage: `Sunu Yoon: ${message}`
        }
      );

      // Notifier chaque passager
      for (const booking of ride.bookings) {
        await notifyUser(
          booking.passenger.id,
          'RIDE_REMINDER',
          'Rappel de départ',
          message,
          { rideId, bookingId: booking.id },
          {
            sendPush: true,
            sendSms: true,
            smsMessage: `Sunu Yoon: ${message}. Conducteur: ${ride.driver.id}`
          }
        );
      }

      logger.info(`Rappels envoyés pour le trajet ${rideId}`);
    }, delay);

    logger.info(`Rappel programmé pour le trajet ${rideId} dans ${Math.round(delay / 60000)} minutes`);
  } catch (error) {
    logger.error('Erreur scheduleRideReminder:', error);
  }
};

// Tâche périodique pour programmer les rappels
export const startReminderScheduler = async (): Promise<void> => {
  const checkInterval = 15 * 60 * 1000; // Toutes les 15 minutes

  const scheduleUpcomingReminders = async () => {
    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Trouver les trajets qui partent dans les 2 prochaines heures
      const upcomingRides = await prisma.ride.findMany({
        where: {
          status: { in: ['OPEN', 'FULL'] },
          departureTime: {
            gte: now,
            lte: twoHoursFromNow
          }
        },
        select: { id: true, departureTime: true }
      });

      for (const ride of upcomingRides) {
        const minutesUntilDeparture = (ride.departureTime.getTime() - now.getTime()) / 60000;
        
        // Envoyer un rappel à 60 minutes si on est entre 60 et 75 minutes
        if (minutesUntilDeparture >= 60 && minutesUntilDeparture < 75) {
          await scheduleRideReminder(ride.id, 60);
        }
        // Envoyer un rappel à 30 minutes si on est entre 30 et 45 minutes
        else if (minutesUntilDeparture >= 30 && minutesUntilDeparture < 45) {
          await scheduleRideReminder(ride.id, 30);
        }
      }
    } catch (error) {
      logger.error('Erreur scheduleUpcomingReminders:', error);
    }
  };

  // Lancer immédiatement puis périodiquement
  await scheduleUpcomingReminders();
  setInterval(scheduleUpcomingReminders, checkInterval);

  logger.info('✅ Scheduler de rappels démarré');
};
