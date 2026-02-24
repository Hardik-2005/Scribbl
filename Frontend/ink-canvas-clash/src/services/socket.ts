import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Singleton — one socket connection shared across the whole app.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  BACKEND_URL,
  {
    transports: ["websocket", "polling"], // websocket first, polling as fallback
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  }
);

export const connectSocket = (): void => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = (): void => {
  socket.disconnect();
};
