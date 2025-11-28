import twilio from 'twilio';
import { logger } from '../utils/logger';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface SMSOptions {
  to: string;
  message: string;
}

export const sendSMS = async ({ to, message }: SMSOptions): Promise<boolean> => {
  try {
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
