import { Response } from 'express';
import { logger } from '../utils/logger';

export interface TrackingSnapshot {
  rideId: string;
  coords: { lat: number; lng: number };
  speed?: number;
  heading?: number;
  updatedAt: string;
  ended?: boolean;
  reason?: string;
}

interface TrackingRecord {
  rideId: string;
  coords: { lat: number; lng: number };
  speed?: number;
  heading?: number;
  updatedAt: number;
}

const liveLocations = new Map<string, TrackingRecord>();
const subscribers = new Map<string, Set<Response>>();
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const toSnapshot = (record: TrackingRecord): TrackingSnapshot => ({
  rideId: record.rideId,
  coords: record.coords,
  speed: record.speed,
  heading: record.heading,
  updatedAt: new Date(record.updatedAt).toISOString()
});

const isStale = (record: TrackingRecord) => Date.now() - record.updatedAt > STALE_THRESHOLD_MS;

const notifySubscribers = (rideId: string, payload: TrackingSnapshot) => {
  const clients = subscribers.get(rideId);
  if (!clients || clients.size === 0) {
    return;
  }

  const serialized = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => {
    try {
      res.write(serialized);
    } catch (error) {
      logger.warn('Impossible d\'écrire vers un abonné SSE', error as Error);
    }
  });
};

export const saveTrackingPoint = (rideId: string, data: {
  coords: { lat: number; lng: number };
  speed?: number;
  heading?: number;
}): TrackingSnapshot => {
  const record: TrackingRecord = {
    rideId,
    coords: {
      lat: Number(data.coords.lat),
      lng: Number(data.coords.lng)
    },
    speed: typeof data.speed === 'number' ? data.speed : undefined,
    heading: typeof data.heading === 'number' ? data.heading : undefined,
    updatedAt: Date.now()
  };

  liveLocations.set(rideId, record);
  const snapshot = toSnapshot(record);
  notifySubscribers(rideId, snapshot);
  return snapshot;
};

export const getTrackingPoint = (rideId: string): TrackingSnapshot | null => {
  const record = liveLocations.get(rideId);
  if (!record) {
    return null;
  }

  if (isStale(record)) {
    liveLocations.delete(rideId);
    return null;
  }

  return toSnapshot(record);
};

export const clearTrackingPoint = (rideId: string, reason?: string) => {
  const existing = liveLocations.get(rideId);
  liveLocations.delete(rideId);
  notifySubscribers(rideId, {
    rideId,
    ended: true,
    reason,
    coords: existing?.coords ?? { lat: 0, lng: 0 },
    speed: existing?.speed,
    heading: existing?.heading,
    updatedAt: new Date().toISOString()
  });
};

export const registerTrackingStream = (rideId: string, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!subscribers.has(rideId)) {
    subscribers.set(rideId, new Set());
  }
  subscribers.get(rideId)!.add(res);

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    subscribers.get(rideId)?.delete(res);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  const latest = getTrackingPoint(rideId);
  if (latest) {
    try {
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
    } catch (error) {
      logger.warn('Impossible d\'envoyer l\'état initial SSE', error as Error);
    }
  }
};
