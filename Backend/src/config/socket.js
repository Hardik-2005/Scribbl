import { Server } from 'socket.io';
import { handleSocketConnection } from '../sockets/socketHandler.js';
import { socketAuthMiddleware } from '../auth/authMiddleware.js';

/**
 * Initializes and configures Socket.IO server
 * @param {Object} httpServer - HTTP server instance from Express
 * @returns {Object} Socket.IO server instance
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // JWT authentication middleware — populates socket.user on every connection
  io.use(socketAuthMiddleware);

  // Connection event handler
  io.on('connection', (socket) => {
    handleSocketConnection(io, socket);
  });

  // Global error handler
  io.on('error', (error) => {
    console.error('[Socket.IO] Server error:', error);
  });

  console.log('[Socket.IO] Server initialized');

  return io;
}
