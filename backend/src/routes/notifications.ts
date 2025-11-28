import { Router } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ============ LISTER MES NOTIFICATIONS ============
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly, limit = 20, offset = 0 } = req.query;

    const whereClause: any = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          unreadCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============ MARQUER COMME LUE ============
router.put('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    if (notification.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification non trouvée' }
      });
    }

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    next(error);
  }
});

// ============ MARQUER TOUTES COMME LUES ============
router.put('/read-all', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues'
    });
  } catch (error) {
    next(error);
  }
});

// ============ SUPPRIMER UNE NOTIFICATION ============
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await prisma.notification.deleteMany({
      where: { id, userId }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification non trouvée' }
      });
    }

    res.json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    next(error);
  }
});

// ============ COMPTER LES NON LUES ============
router.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
