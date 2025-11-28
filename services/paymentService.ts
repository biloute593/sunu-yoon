import { ApiClient } from './apiClient';

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

// Service de gestion des paiements
export const paymentService = {
  // Initier un paiement
  async initiatePayment(data: PaymentInitData): Promise<PaymentInitResponse> {
    const response = await ApiClient.post<PaymentInitResponse>('/payments/initiate', {
      bookingId: data.bookingId,
      method: data.method,
      amount: data.amount,
      currency: data.currency || 'XOF'
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Erreur lors du paiement');
  },

  // Vérifier le statut d'un paiement
  async getPaymentStatus(bookingId: string): Promise<PaymentStatus | null> {
    const response = await ApiClient.get<PaymentStatus>(`/payments/${bookingId}/status`);
    return response.success ? response.data || null : null;
  },

  // Rediriger vers le paiement externe
  redirectToPayment(redirectUrl: string): void {
    window.location.href = redirectUrl;
  }
};
