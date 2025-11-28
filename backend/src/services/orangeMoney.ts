import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const OM_BASE_URL = process.env.ORANGE_MONEY_BASE_URL || 'https://api.orange.com/orange-money-webpay/sn/v1';

interface OrangeMoneyTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

interface OrangeMoneyPaymentRequest {
  merchant_key: string;
  currency: string;
  order_id: string;
  amount: number;
  return_url: string;
  cancel_url: string;
  notif_url: string;
  lang: string;
  reference: string;
}

interface OrangeMoneyPaymentResponse {
  status: number;
  message: string;
  pay_token: string;
  payment_url: string;
  notif_token: string;
}

interface OrangeMoneyStatus {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  order_id: string;
  amount: number;
  txnid: string;
}

// Cache du token d'accès
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Obtenir un token d'accès OAuth2
const getAccessToken = async (): Promise<string | null> => {
  // Retourner le token en cache s'il est encore valide
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const credentials = Buffer.from(
      `${process.env.ORANGE_MONEY_API_KEY}:${process.env.ORANGE_MONEY_MERCHANT_KEY}`
    ).toString('base64');

    const response = await axios.post<OrangeMoneyTokenResponse>(
      'https://api.orange.com/oauth/v3/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    // Expire 5 minutes avant pour être sûr
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

    return accessToken;
  } catch (error: any) {
    logger.error('Erreur token Orange Money:', error.response?.data || error.message);
    return null;
  }
};

// Créer une session de paiement Orange Money
export const createOrangeMoneyPayment = async (
  amount: number,
  orderId: string,
  reference: string,
  returnUrl: string,
  cancelUrl: string,
  notifUrl: string
): Promise<{ paymentUrl: string; payToken: string } | null> => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Impossible d\'obtenir le token Orange Money');
    }

    const response = await axios.post<OrangeMoneyPaymentResponse>(
      `${OM_BASE_URL}/webpayment`,
      {
        merchant_key: process.env.ORANGE_MONEY_MERCHANT_KEY,
        currency: 'OUV', // Code devise Orange pour XOF
        order_id: orderId,
        amount,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notif_url: notifUrl,
        lang: 'fr',
        reference
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 201) {
      logger.info(`Orange Money payment créé: ${orderId}`);
      return {
        paymentUrl: response.data.payment_url,
        payToken: response.data.pay_token
      };
    }

    logger.error('Orange Money erreur:', response.data.message);
    return null;
  } catch (error: any) {
    logger.error('Erreur Orange Money payment:', error.response?.data || error.message);
    return null;
  }
};

// Vérifier le statut d'un paiement Orange Money
export const getOrangeMoneyStatus = async (
  orderId: string,
  payToken: string
): Promise<OrangeMoneyStatus | null> => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Impossible d\'obtenir le token Orange Money');
    }

    const response = await axios.post<OrangeMoneyStatus>(
      `${OM_BASE_URL}/transactionstatus`,
      {
        order_id: orderId,
        pay_token: payToken
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Erreur statut Orange Money:', error.response?.data || error.message);
    return null;
  }
};

// Vérifier la signature du webhook Orange Money
export const verifyOrangeMoneyWebhook = (payload: any, notifToken: string): boolean => {
  // Orange Money utilise un notif_token pour valider les callbacks
  // La vérification exacte dépend de leur documentation
  return payload.notif_token === notifToken;
};
