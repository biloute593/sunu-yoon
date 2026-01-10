import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join_ride_room', (rideId: string) => {
      socket.join(`ride_${rideId}`);
      logger.info(`Socket ${socket.id} joined ride_${rideId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};
