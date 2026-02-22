/**
 * RoomManager - Manages all in-memory room state
 * Handles room creation, player management, and cleanup
 */

import { initializeGameState, cleanupRoom } from '../game/gameEngine.js';

class RoomManager {
  constructor() {
    // Map<roomId, Room>
    this.rooms = new Map();
    // Map<socketId, {roomId, userId}> for quick disconnect lookups
    this.socketToPlayer = new Map();
  }

  /**
   * Creates a new room
   * @param {string} roomId - Unique room identifier
   * @returns {Object} Created room object
   */
  createRoom(roomId) {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const room = {
      roomId,
      players: new Map(), // Map<userId, Player>
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    // Initialize game state (Phase 2)
    initializeGameState(room);

    this.rooms.set(roomId, room);
    console.log(`[RoomManager] Room created: ${roomId}`);
    return room;
  }

  /**
   * Adds a player to a room
   * @param {string} roomId - Room to join
   * @param {Object} player - Player object {userId, username, socketId, isConnected, score}
   * @returns {Object} Updated room object
   */
  joinRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room does not exist');
    }

    // Check for duplicate username in the same room
    for (const [, existingPlayer] of room.players) {
      if (existingPlayer.username === player.username && existingPlayer.userId !== player.userId) {
        throw new Error('Username already taken in this room');
      }
    }

    // Check if player already in room
    if (room.players.has(player.userId)) {
      throw new Error('Player already in room');
    }

    // Add player to room
    room.players.set(player.userId, {
      userId: player.userId,
      username: player.username,
      socketId: player.socketId,
      isConnected: true,
      score: 0,
      joinedAt: Date.now(),
      hasGuessedCurrentRound: false // Phase 2: Game state
    });

    // Track socket mapping for quick lookups
    this.socketToPlayer.set(player.socketId, {
      roomId,
      userId: player.userId
    });

    room.lastActivity = Date.now();
    console.log(`[RoomManager] Player ${player.username} joined room ${roomId}`);
    
    return room;
  }

  /**
   * Removes a player from a room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to remove
   * @returns {boolean} True if player was removed
   */
  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return false;
    }

    const player = room.players.get(userId);
    if (player) {
      this.socketToPlayer.delete(player.socketId);
      room.players.delete(userId);
      console.log(`[RoomManager] Player ${player.username} left room ${roomId}`);
      
      // Clean up empty rooms
      if (room.players.size === 0) {
        cleanupRoom(roomId); // Phase 2: Cleanup game resources
        this.rooms.delete(roomId);
        console.log(`[RoomManager] Room ${roomId} deleted (empty)`);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Handles player disconnect - marks as disconnected but doesn't remove
   * @param {string} socketId - Socket ID of disconnected player
   * @returns {Object|null} {roomId, userId, username} or null
   */
  removePlayerOnDisconnect(socketId) {
    const mapping = this.socketToPlayer.get(socketId);
    
    if (!mapping) {
      return null;
    }

    const { roomId, userId } = mapping;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      this.socketToPlayer.delete(socketId);
      return null;
    }

    const player = room.players.get(userId);
    
    if (player) {
      player.isConnected = false;
      player.disconnectedAt = Date.now();
      console.log(`[RoomManager] Player ${player.username} disconnected from room ${roomId}`);
      
      return {
        roomId,
        userId,
        username: player.username
      };
    }

    return null;
  }

  /**
   * Handles player reconnection - updates socketId and marks as connected
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {string} newSocketId - New socket ID
   * @returns {Object|null} Updated player object or null
   */
  reassignSocketOnReconnect(roomId, userId, newSocketId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room does not exist');
    }

    const player = room.players.get(userId);
    
    if (!player) {
      throw new Error('Player not found in room');
    }

    // Remove old socket mapping if exists
    if (player.socketId) {
      this.socketToPlayer.delete(player.socketId);
    }

    // Update player
    player.socketId = newSocketId;
    player.isConnected = true;
    player.reconnectedAt = Date.now();

    // Add new socket mapping
    this.socketToPlayer.set(newSocketId, {
      roomId,
      userId
    });

    console.log(`[RoomManager] Player ${player.username} reconnected to room ${roomId}`);
    
    return player;
  }

  /**
   * Gets a room by ID
   * @param {string} roomId - Room ID
   * @returns {Object|null} Room object or null
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Gets all players in a room as an array
   * @param {string} roomId - Room ID
   * @returns {Array} Array of player objects
   */
  getRoomPlayers(roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return [];
    }

    return Array.from(room.players.values());
  }

  /**
   * Gets player info by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object|null} {roomId, userId} or null
   */
  getPlayerBySocketId(socketId) {
    return this.socketToPlayer.get(socketId) || null;
  }

  /**
   * Checks if a room exists
   * @param {string} roomId - Room ID
   * @returns {boolean}
   */
  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Gets total number of rooms
   * @returns {number}
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Gets total number of connected players across all rooms
   * @returns {number}
   */
  getTotalPlayerCount() {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.players.size;
    }
    return count;
  }

  /**
   * Debug: Get all rooms (for testing)
   * @returns {Array}
   */
  getAllRooms() {
    return Array.from(this.rooms.entries()).map(([roomId, room]) => ({
      roomId,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        isConnected: p.isConnected
      }))
    }));
  }
}

// Export singleton instance
export default new RoomManager();
