import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: EmailOptions): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Sunu Yoon <noreply@sunuyoon.sn>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });

    logger.info(`Email envoyé à ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Erreur envoi email:', error);
    return false;
  }
};

export const sendVerificationEmail = async (email: string, code: string, name: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .code { background: #059669; color: white; font-size: 32px; padding: 15px 30px; border-radius: 8px; text-align: center; letter-spacing: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 Sunu Yoon</h1>
          <p>Covoiturage au Sénégal</p>
        </div>
        <div class="content">
          <h2>Bonjour ${name}!</h2>
          <p>Merci de vous être inscrit sur Sunu Yoon. Pour activer votre compte, veuillez entrer le code de vérification ci-dessous:</p>
          <div class="code">${code}</div>
          <p><strong>Ce code expire dans 10 minutes.</strong></p>
          <p>Si vous n'avez pas créé de compte sur Sunu Yoon, ignorez cet email.</p>
        </div>
        <div class="footer">
          <p>© 2024 Sunu Yoon - Voyagez ensemble, économisez ensemble</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `${code} - Votre code de vérification Sunu Yoon`,
    html
  });
};

export const sendBookingConfirmationEmail = async (
  email: string,
  name: string,
  booking: {
    driverName: string;
    origin: string;
    destination: string;
    date: string;
    time: string;
    price: number;
    seats: number;
  }
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .trip-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .route { display: flex; align-items: center; margin: 15px 0; }
        .dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; }
        .dot-green { background: #059669; }
        .dot-dark { background: #333; }
        .price { font-size: 24px; color: #059669; font-weight: bold; text-align: right; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Réservation Confirmée!</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${name}!</h2>
          <p>Votre réservation a bien été confirmée. Voici les détails de votre trajet:</p>
          
          <div class="trip-card">
            <p><strong>📅 ${booking.date} à ${booking.time}</strong></p>
            <div class="route">
              <span class="dot dot-green"></span>
              <span><strong>${booking.origin}</strong></span>
            </div>
            <div class="route">
              <span class="dot dot-dark"></span>
              <span><strong>${booking.destination}</strong></span>
            </div>
            <p>🚗 Conducteur: <strong>${booking.driverName}</strong></p>
            <p>🪑 Places: <strong>${booking.seats}</strong></p>
            <div class="price">${booking.price.toLocaleString('fr-FR')} FCFA</div>
          </div>
          
          <p><strong>Conseils pour votre voyage:</strong></p>
          <ul>
            <li>Soyez à l'heure au point de rendez-vous</li>
            <li>Contactez le conducteur si vous avez des questions</li>
            <li>N'oubliez pas vos affaires!</li>
          </ul>
          
          <p>Bon voyage! 🚗✨</p>
        </div>
        <div class="footer">
          <p>© 2024 Sunu Yoon - Voyagez ensemble, économisez ensemble</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Réservation confirmée - ${booking.origin} → ${booking.destination}`,
    html
  });
};
