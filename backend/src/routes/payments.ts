import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma, io } from '../index';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createWaveCheckout, getWavePaymentStatus, verifyWaveWebhook } from '../services/wave';
import { createOrangeMoneyPayment, getOrangeMoneyStatus } from '../services/orangeMoney';
import { logger } from '../utils/logger';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ============ INITIER UN PAIEMENT ============
router.post('/initiate',
  body('bookingId').isUUID().withMessage('ID de réservation invalide'),
  body('method').isIn(['WAVE', 'ORANGE_MONEY', 'CASH']).withMessage('Méthode de paiement invalide'),
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.user!.id;
      const { bookingId, method } = req.body;

      // Vérifier la réservation
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { ride: true, payment: true }
      });

      if (!booking) {
        throw new AppError('Réservation non trouvée', 404);
      }

      if (booking.passengerId !== userId) {
        throw new AppError('Cette réservation ne vous appartient pas', 403);
      }

      if (booking.status === 'CONFIRMED') {
        throw new AppError('Cette réservation est déjà confirmée', 400);
      }

      // Si un paiement existe déjà et est complété
      if (booking.payment?.status === 'COMPLETED') {
        throw new AppError('Le paiement a déjà été effectué', 400);
      }

      const amount = booking.totalPrice;

      // Paiement en espèces
      if (method === 'CASH') {
        const payment = await prisma.payment.upsert({
          where: { bookingId },
          update: { method: 'CASH', status: 'PENDING' },
          create: {
            bookingId,
            payerId: userId,
            amount,
            method: 'CASH',
            status: 'PENDING'
          }
        });

        return res.json({
          success: true,
          message: 'Paiement en espèces enregistré. Le conducteur confirmera à l\'embarquement.',
          data: {
            paymentId: payment.id,
            method: 'CASH',
            amount,
            status: 'PENDING'
          }
        });
      }

      // Paiement Wave
      if (method === 'WAVE') {
        const waveResult = await createWaveCheckout(
          amount,
          bookingId,
          `${FRONTEND_URL}/booking/${bookingId}/success`,
          `${FRONTEND_URL}/booking/${bookingId}/error`
        );

        if (!waveResult) {
          throw new AppError('Erreur lors de la création du paiement Wave', 500);
        }

        const payment = await prisma.payment.upsert({
          where: { bookingId },
          update: {
            method: 'WAVE',
            status: 'PROCESSING',
            externalId: waveResult.sessionId
          },
          create: {
            bookingId,
            payerId: userId,
            amount,
            method: 'WAVE',
            status: 'PROCESSING',
            externalId: waveResult.sessionId
          }
        });

        return res.json({
          success: true,
          data: {
            paymentId: payment.id,
            method: 'WAVE',
            amount,
            redirectUrl: waveResult.checkoutUrl
          }
        });
      }

      // Paiement Orange Money
      if (method === 'ORANGE_MONEY') {
        const omResult = await createOrangeMoneyPayment(
          amount,
          bookingId,
          `SUNU-${bookingId.substring(0, 8)}`,
          `${FRONTEND_URL}/booking/${bookingId}/success`,
          `${FRONTEND_URL}/booking/${bookingId}/error`,
          `${BACKEND_URL}/webhooks/orange`
        );

        if (!omResult) {
          throw new AppError('Erreur lors de la création du paiement Orange Money', 500);
        }

        const payment = await prisma.payment.upsert({
          where: { bookingId },
          update: {
            method: 'ORANGE_MONEY',
            status: 'PROCESSING',
            externalId: omResult.payToken
          },
          create: {
            bookingId,
            payerId: userId,
            amount,
            method: 'ORANGE_MONEY',
            status: 'PROCESSING',
            externalId: omResult.payToken
          }
        });

        return res.json({
          success: true,
          data: {
            paymentId: payment.id,
            method: 'ORANGE_MONEY',
            amount,
            redirectUrl: omResult.paymentUrl
          }
        });
      }

      throw new AppError('Méthode de paiement non supportée', 400);
    } catch (error) {
      next(error);
    }
  }
);

// ============ VÉRIFIER LE STATUT D'UN PAIEMENT ============
router.get('/:bookingId/status', async (req: AuthRequest, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true }
    });

    if (!booking) {
      throw new AppError('Réservation non trouvée', 404);
    }

    if (booking.passengerId !== userId) {
      throw new AppError('Accès non autorisé', 403);
    }

    if (!booking.payment) {
      return res.json({
        success: true,
        data: { status: 'NO_PAYMENT' }
      });
    }

    // Si le paiement est en cours, vérifier avec le provider
    if (booking.payment.status === 'PROCESSING' && booking.payment.externalId) {
      let externalStatus: string | null = null;

      if (booking.payment.method === 'WAVE') {
        const waveStatus = await getWavePaymentStatus(booking.payment.externalId);
        if (waveStatus) {
          externalStatus = waveStatus.checkout_status;
          
          if (externalStatus === 'complete') {
            await prisma.payment.update({
              where: { id: booking.payment.id },
              data: { status: 'COMPLETED', paidAt: new Date() }
            });
            await prisma.booking.update({
              where: { id: bookingId },
              data: { status: 'CONFIRMED' }
            });
          } else if (externalStatus === 'expired' || externalStatus === 'failed') {
            await prisma.payment.update({
              where: { id: booking.payment.id },
              data: { status: 'FAILED' }
            });
          }
        }
      }

      if (booking.payment.method === 'ORANGE_MONEY') {
        const omStatus = await getOrangeMoneyStatus(bookingId, booking.payment.externalId);
        if (omStatus) {
          externalStatus = omStatus.status;
          
          if (externalStatus === 'SUCCESS') {
            await prisma.payment.update({
              where: { id: booking.payment.id },
              data: { 
                status: 'COMPLETED', 
                paidAt: new Date(),
                externalRef: omStatus.txnid
              }
            });
            await prisma.booking.update({
              where: { id: bookingId },
              data: { status: 'CONFIRMED' }
            });
          } else if (externalStatus === 'FAILED' || externalStatus === 'EXPIRED') {
            await prisma.payment.update({
              where: { id: booking.payment.id },
              data: { status: 'FAILED' }
            });
          }
        }
      }
    }

    // Récupérer le statut mis à jour
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: booking.payment.id }
    });

    res.json({
      success: true,
      data: {
        status: updatedPayment?.status,
        method: updatedPayment?.method,
        amount: updatedPayment?.amount,
        paidAt: updatedPayment?.paidAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ WEBHOOK WAVE ============
router.post('/webhooks/wave', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['wave-signature'] as string;
    const payload = req.body.toString();

    if (!verifyWaveWebhook(payload, signature)) {
      logger.warn('Webhook Wave: signature invalide');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    logger.info('Webhook Wave reçu:', event.type);

    if (event.type === 'checkout.session.completed') {
      const { client_reference: bookingId, id: sessionId } = event.data;

      const payment = await prisma.payment.findFirst({
        where: { externalId: sessionId }
      });

      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED', paidAt: new Date() }
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' }
          })
        ]);

        // Notifier via WebSocket
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
          include: { ride: true }
        });

        if (booking) {
          io.to(`user_${booking.passengerId}`).emit('payment_completed', {
            bookingId: booking.id,
            amount: payment.amount
          });

          io.to(`user_${booking.ride.driverId}`).emit('booking_paid', {
            bookingId: booking.id
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur webhook Wave:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============ WEBHOOK ORANGE MONEY ============
router.post('/webhooks/orange', async (req: Request, res: Response) => {
  try {
    const { status, order_id, txnid, pay_token } = req.body;
    
    logger.info('Webhook Orange Money reçu:', { status, order_id });

    if (status === 'SUCCESS') {
      const payment = await prisma.payment.findFirst({
        where: { 
          bookingId: order_id,
          method: 'ORANGE_MONEY'
        }
      });

      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'COMPLETED', 
              paidAt: new Date(),
              externalRef: txnid
            }
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' }
          })
        ]);

        // Notifier via WebSocket
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
          include: { ride: true }
        });

        if (booking) {
          io.to(`user_${booking.passengerId}`).emit('payment_completed', {
            bookingId: booking.id,
            amount: payment.amount
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur webhook Orange Money:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
