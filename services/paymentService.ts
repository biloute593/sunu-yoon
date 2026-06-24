import { supabase, supabaseEnabled } from './supabase';
import { notificationService } from './notificationService';

export type PaymentMethod = 'WAVE' | 'ORANGE_MONEY' | 'CASH';

export interface PaymentInitData {
  bookingId: string;
  method: PaymentMethod;
  amount: number;
  currency?: string;
}

export interface PaymentInitResponse {
  paymentId: string;
  method: PaymentMethod;
  amount: number;
  checkoutUrl?: string;
  redirectUrl?: string;
  status?: string;
}

interface PaymentStatus {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NO_PAYMENT';
  method?: PaymentMethod;
  amount?: number;
  paidAt?: string;
}

export const paymentService = {
  async initiatePayment(data: PaymentInitData): Promise<PaymentInitResponse> {
    const currency = data.currency || 'XOF';

    if (data.method === 'CASH') {
      if (supabaseEnabled && supabase) {
        await supabase
          .from('bookings')
          .update({ payment_method: 'CASH' })
          .eq('id', data.bookingId);
      }
      notificationService.push(
        'payment',
        'Paiement en espèces',
        `Payez ${data.amount.toLocaleString()} ${currency} directement au conducteur lors du voyage.`
      );
      return { paymentId: data.bookingId, method: 'CASH', amount: data.amount, status: 'CONFIRMED' };
    }

    if (data.method === 'WAVE') {
      const waveUrl = `https://pay.wave.com/m/sunu_yoon?amount=${data.amount}&currency=${currency}&ref=${data.bookingId}`;
      notificationService.push(
        'payment',
        'Paiement Wave',
        `Vous allez être redirigé vers Wave pour payer ${data.amount.toLocaleString()} ${currency}.`
      );
      return {
        paymentId: data.bookingId,
        method: 'WAVE',
        amount: data.amount,
        checkoutUrl: waveUrl,
        redirectUrl: waveUrl,
        status: 'PENDING',
      };
    }

    if (data.method === 'ORANGE_MONEY') {
      notificationService.push(
        'payment',
        'Paiement Orange Money',
        `Composez #144# sur votre téléphone Orange pour payer ${data.amount.toLocaleString()} ${currency}. Réf: ${data.bookingId.slice(0, 8)}`
      );
      return {
        paymentId: data.bookingId,
        method: 'ORANGE_MONEY',
        amount: data.amount,
        status: 'PENDING',
      };
    }

    throw new Error('Méthode de paiement non supportée');
  },

  async getPaymentStatus(bookingId: string): Promise<PaymentStatus | null> {
    if (supabaseEnabled && supabase) {
      const { data } = await supabase
        .from('bookings')
        .select('status, payment_method')
        .eq('id', bookingId)
        .single();
      if (!data) return null;
      return {
        status: data.payment_method ? 'COMPLETED' : 'NO_PAYMENT',
        method: data.payment_method as PaymentMethod | undefined,
      };
    }
    return null;
  },

  redirectToPayment(redirectUrl: string): void {
    window.location.href = redirectUrl;
  }
};

