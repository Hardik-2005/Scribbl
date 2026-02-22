import express from 'express';
import { createServer } from 'http';
import { initializeSocket } from './config/socket.js';
import roomManager from './rooms/roomManager.js';
import { connectRedis } from './redis/redisClient.js';
import { createAdapter } from "@socket.io/redis-adapter";

// Configuration
const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// ============================================
// REST API Endpoints (Optional - for testing)
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Get server stats
app.get('/api/stats', async (req, res) => {
  try {
    const [totalRooms, allRooms] = await Promise.all([
      roomManager.getRoomCount(),
      roomManager.getAllRooms()
    ]);
    res.json({ totalRooms, rooms: allRooms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get specific room info
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const [room, players] = await Promise.all([
      roomManager.getRoom(roomId),
      roomManager.getRoomPlayers(roomId)
    ]);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      roomId: room.roomId,
      playerCount: players.length,
      players: players.map(p => ({
        userId: p.userId,
        username: p.username,
        isConnected: p.isConnected,
        score: p.score
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Express] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Initialize Socket.IO
// ============================================

const io = initializeSocket(httpServer);

// ============================================
// Redis Adapter (Socket.IO horizontal scaling)
// ============================================

const pubClient = await connectRedis();
const subClient = pubClient.duplicate();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

console.log('[Redis] Adapter connected');

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🎮 Scribble Game Backend - Phase 1');
  console.log('='.repeat(50));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server ready`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Stats API: http://localhost:${PORT}/api/stats`);
  console.log('='.repeat(50));
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, closing server gracefully...');
  httpServer.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, closing server gracefully...');
  httpServer.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
