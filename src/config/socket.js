import { Server } from 'socket.io';
import { handleSocketConnection } from '../sockets/socketHandler.js';

/**
 * Initializes and configures Socket.IO server
 * @param {Object} httpServer - HTTP server instance from Express
 * @returns {Object} Socket.IO server instance
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

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
