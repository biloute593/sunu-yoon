import { Router, Request } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import { Response, NextFunction } from 'express';
import {
  clearTrackingPoint,
  getTrackingPoint,
  registerTrackingStream,
  saveTrackingPoint
} from '../services/trackingStore';

const router = Router();

const validateRideParam = [
  param('rideId').isString().trim().notEmpty().withMessage('Identifiant de trajet requis')
];

const ensureValid = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }
};

router.post(
  '/:rideId',
  validateRideParam,
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('speed').optional().isFloat({ min: 0, max: 200 }).withMessage('Vitesse invalide'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Orientation invalide'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { rideId } = req.params;
      const { lat, lng, speed, heading } = req.body;

      const snapshot = saveTrackingPoint(rideId, {
        coords: { lat: Number(lat), lng: Number(lng) },
        speed: speed !== undefined ? Number(speed) : undefined,
        heading: heading !== undefined ? Number(heading) : undefined
      });

      res.json({ success: true, data: snapshot });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:rideId', validateRideParam, (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureValid(req);
    const { rideId } = req.params;
    const snapshot = getTrackingPoint(rideId);

    if (!snapshot) {
      throw new AppError('Aucune position récente pour ce trajet', 404);
    }

    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
});

router.get('/:rideId/stream', validateRideParam, (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureValid(req);
    const { rideId } = req.params;
    registerTrackingStream(rideId, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/:rideId', validateRideParam, (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureValid(req);
    const { rideId } = req.params;
    clearTrackingPoint(rideId, 'Tracking terminé');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
