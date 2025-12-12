import twilio from 'twilio';
import { logger } from '../utils/logger';

// Initialiser Twilio seulement si les credentials sont fournis
let client: any = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    logger.info('✅ Twilio initialisé');
  } catch (error) {
    logger.warn('⚠️ Twilio non configuré - SMS désactivés');
  }
} else {
  logger.warn('⚠️ Variables Twilio manquantes - SMS désactivés');
}

export interface SMSOptions {
  to: string;
  message: string;
}

export const sendSMS = async ({ to, message }: SMSOptions): Promise<boolean> => {
  try {
    // Si Twilio n'est pas configuré, logger le code et simuler l'envoi
    if (!client) {
      logger.warn(`📱 MODE DÉVELOPPEMENT - Code SMS pour ${to}: ${message}`);
      return true;
    }

    // Formater le numéro pour le Sénégal si nécessaire
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      formattedNumber = to.startsWith('221') ? `+${to}` : `+221${to}`;
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    logger.info(`SMS envoyé à ${formattedNumber}: ${result.sid}`);
    return true;
  } catch (error) {
    logger.error('Erreur envoi SMS:', error);
    return false;
  }
};

export const sendVerificationCode = async (phone: string, code: string): Promise<boolean> => {
  const message = `Sunu Yoon: Votre code de vérification est ${code}. Ce code expire dans 10 minutes.`;
  return sendSMS({ to: phone, message });
};

export const sendBookingNotification = async (
  phone: string, 
  driverName: string, 
  departure: string,
  destination: string,
  time: string
): Promise<boolean> => {
  const message = `Sunu Yoon: Réservation confirmée! ${driverName} vous emmène de ${departure} à ${destination} le ${time}. Bon voyage!`;
  return sendSMS({ to: phone, message });
};

export const sendRideReminder = async (
  phone: string,
  departure: string,
  destination: string,
  time: string,
  minutesBefore: number
): Promise<boolean> => {
  const message = `Sunu Yoon: Rappel! Votre trajet ${departure} → ${destination} part dans ${minutesBefore} minutes. Préparez-vous!`;
  return sendSMS({ to: phone, message });
};
