import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { initializeSocket } from "./config/socket.js";
import roomManager from "./rooms/roomManager.js";

import { connectRedis } from "./redis/redisClient.js";
import { createAdapter } from "@socket.io/redis-adapter";

import { connectDB } from "./config/db.js";
import authRoutes from "./auth/authRoutes.js";

// ============================================
// Database Connection
// ============================================

connectDB();

// ============================================
// Paths
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

// ============================================
// App Setup
// ============================================

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

// ============================================
// Middleware
// ============================================

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// ============================================
// Authentication Routes
// ============================================

app.use("/auth", authRoutes);

// ============================================
// Health Endpoint
// ============================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// ============================================
// Stats Endpoint
// ============================================

app.get("/api/stats", async (req, res) => {
  try {
    const [totalRooms, allRooms] = await Promise.all([
      roomManager.getRoomCount(),
      roomManager.getAllRooms(),
    ]);

    res.json({ totalRooms, rooms: allRooms });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============================================
// Room Info Endpoint
// ============================================

app.get("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const [room, players] = await Promise.all([
      roomManager.getRoom(roomId),
      roomManager.getRoomPlayers(roomId),
    ]);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({
      roomId: room.roomId,
      playerCount: players.length,
      players: players.map((p) => ({
        userId: p.userId,
        username: p.username,
        isConnected: p.isConnected,
        score: p.score,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

// ============================================
// Error Handling
// ============================================

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("[Express] Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// Initialize Socket.IO
// ============================================

const io = initializeSocket(httpServer);

// ============================================
// Redis Adapter (ONLY if REDIS_URL exists)
// ============================================

if (process.env.REDIS_URL) {
  try {
    const pubClient = await connectRedis();
    const subClient = pubClient.duplicate();

    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    console.log("[Redis] Adapter connected");
  } catch (err) {
    console.error("[Redis] Failed to initialize adapter:", err);
  }
} else {
  console.log("[Redis] REDIS_URL not set. Running without Redis.");
}

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ============================================
// Graceful Shutdown
// ============================================

process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, closing server...");
  httpServer.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n[Server] SIGINT received, closing server...");
  httpServer.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});

// ============================================
// Unhandled Promise Rejections
// ============================================

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
});