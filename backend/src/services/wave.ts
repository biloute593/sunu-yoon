import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const WAVE_BASE_URL = process.env.WAVE_BASE_URL || 'https://api.wave.com/v1';

interface WaveCheckoutRequest {
  amount: number;
  currency: string;
  errorUrl: string;
  successUrl: string;
  clientReference: string;
}

interface WaveCheckoutResponse {
  id: string;
  checkout_status: string;
  client_reference: string;
  currency: string;
  amount: string;
  when_completed: string | null;
  when_created: string;
  when_expires: string;
  wave_launch_url: string;
}

interface WavePaymentStatus {
  id: string;
  checkout_status: 'pending' | 'complete' | 'expired' | 'failed';
  amount: string;
  currency: string;
  client_reference: string;
  when_completed: string | null;
}

// Créer une session de paiement Wave
export const createWaveCheckout = async (
  amount: number,
  bookingId: string,
  successUrl: string,
  errorUrl: string
): Promise<{ checkoutUrl: string; sessionId: string } | null> => {
  try {
    const response = await axios.post<WaveCheckoutResponse>(
      `${WAVE_BASE_URL}/checkout/sessions`,
      {
        amount: amount.toString(),
        currency: 'XOF',
        error_url: errorUrl,
        success_url: successUrl,
        client_reference: bookingId
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info(`Wave checkout créé: ${response.data.id}`);

    return {
      checkoutUrl: response.data.wave_launch_url,
      sessionId: response.data.id
    };
  } catch (error: any) {
    logger.error('Erreur Wave checkout:', error.response?.data || error.message);
    return null;
  }
};

// Vérifier le statut d'un paiement Wave
export const getWavePaymentStatus = async (sessionId: string): Promise<WavePaymentStatus | null> => {
  try {
    const response = await axios.get<WavePaymentStatus>(
      `${WAVE_BASE_URL}/checkout/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WAVE_API_KEY}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Erreur vérification Wave:', error.response?.data || error.message);
    return null;
  }
};

// Vérifier la signature du webhook Wave
export const verifyWaveWebhook = (payload: string, signature: string): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WAVE_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Initier un remboursement Wave
export const initiateWaveRefund = async (
  originalTransactionId: string,
  amount: number,
  reason: string
): Promise<boolean> => {
  try {
    await axios.post(
      `${WAVE_BASE_URL}/refunds`,
      {
        transaction_id: originalTransactionId,
        amount: amount.toString(),
        reason
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info(`Remboursement Wave initié pour ${originalTransactionId}`);
    return true;
  } catch (error: any) {
    logger.error('Erreur remboursement Wave:', error.response?.data || error.message);
    return false;
  }
};
