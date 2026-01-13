import twilio from 'twilio';

// Initialiser le client Twilio seulement si les credentials sont présentes
let twilioClient: ReturnType<typeof twilio> | null = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Client Twilio initialisé');
} else {
  console.log('⚠️  Twilio non configuré - Les SMS seront affichés en console uniquement');
}

// Fonction générique d'envoi de SMS
const sendSMS = async (to: string, message: string): Promise<boolean> => {
  console.log(`[SMS] Envoi à ${to}:`);
  console.log(message);
  console.log('---');

  // Si Twilio est configuré et activé, envoyer le vrai SMS
  if (twilioClient && process.env.SMS_API_ENABLED === 'true') {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        to: to,
        from: process.env.TWILIO_PHONE_NUMBER || ''
      });
      console.log(`✅ SMS envoyé avec succès! SID: ${result.sid}`);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur envoi SMS Twilio:', error.message);
      return false;
    }
  } else {
    console.log('ℹ️  Mode développement - SMS non envoyé (Twilio désactivé)');
    return true;
  }
};

export const sendVerificationCode = async (phone: string, code: string) => {
  const message = `Votre code de verification SUNU YOON: ${code}\nValable 10 minutes.`;
  return await sendSMS(phone, message);
};

// Envoyer une notification SMS au conducteur pour une nouvelle réservation
export const sendBookingNotificationToDriver = async (
  driverPhone: string,
  passengerName: string,
  seats: number,
  origin: string,
  destination: string,
  departureDate: string
) => {
  const message = `SUNU YOON - Nouvelle reservation!\n\n` +
    `${passengerName} souhaite reserver ${seats} place(s)\n` +
    `${origin} -> ${destination}\n` +
    `${departureDate}\n\n` +
    `Connectez-vous pour accepter.`;

  return await sendSMS(driverPhone, message);
};

// Envoyer une notification SMS au passager pour confirmation
export const sendBookingConfirmationToPassenger = async (
  passengerPhone: string,
  driverName: string,
  driverPhone: string,
  origin: string,
  destination: string,
  departureDate: string
) => {
  const message = `SUNU YOON - Reservation confirmee!\n\n` +
    `Conducteur: ${driverName}\n` +
    `Tel: ${driverPhone}\n` +
    `${origin} -> ${destination}\n` +
    `${departureDate}\n\n` +
    `Bon voyage!`;

  return await sendSMS(passengerPhone, message);
};
