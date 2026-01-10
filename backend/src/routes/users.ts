import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', authMiddleware, (req: any, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
});

export default router;
