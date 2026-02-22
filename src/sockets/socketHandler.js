import roomManager from '../rooms/roomManager.js';
import { generateUserId } from '../utils/idGenerator.js';
import { startGame, handleGuess, handleDrawerDisconnect, checkPlayerCount } from '../game/gameEngine.js';

/**
 * Socket event handler
 * Manages all socket.io events and room interactions
 */

/**
 * Registers all socket event handlers for a connected client
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance
 */
export function handleSocketConnection(io, socket) {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ============================================
  // Event: create_room
  // Creates a new room
  // ============================================
  socket.on('create_room', (payload, callback) => {
    try {
      const { roomId } = payload;

      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Check if room already exists
      if (roomManager.roomExists(roomId)) {
        const error = { success: false, error: 'Room already exists' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Create room
      const room = roomManager.createRoom(roomId);

      // Send success response
      const response = { 
        success: true, 
        roomId: room.roomId,
        message: 'Room created successfully'
      };
      
      socket.emit('room_created', response);
      if (callback) callback(response);

    } catch (error) {
      console.error('[Socket] Error creating room:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('room_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: join_room
  // Joins an existing room
  // ============================================
  socket.on('join_room', (payload, callback) => {
    try {
      const { roomId, username } = payload;

      // Validation
      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        const error = { success: false, error: 'Invalid username' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Check if room exists
      if (!roomManager.roomExists(roomId)) {
        const error = { success: false, error: 'Room does not exist' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Generate user ID
      const userId = generateUserId();

      // Create player object
      const player = {
        userId,
        username: username.trim(),
        socketId: socket.id,
        isConnected: true,
        score: 0
      };

      // Join room
      roomManager.joinRoom(roomId, player);

      // Join socket.io room
      socket.join(roomId);

      // Get updated player list
      const players = roomManager.getRoomPlayers(roomId);

      // Send success to the joining player
      const response = {
        success: true,
        roomId,
        userId,
        username: player.username,
        message: 'Joined room successfully'
      };
      
      socket.emit('room_joined', response);
      if (callback) callback(response);

      // Broadcast updated player list to all in room
      io.to(roomId).emit('player_list_update', {
        roomId,
        players: players.map(p => ({
          userId: p.userId,
          username: p.username,
          isConnected: p.isConnected,
          score: p.score
        }))
      });

      console.log(`[Socket] ${username} joined room ${roomId}`);

    } catch (error) {
      console.error('[Socket] Error joining room:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('room_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: send_message
  // Broadcasts a message to all players in room
  // ============================================
  socket.on('send_message', (payload, callback) => {
    try {
      const { roomId, message } = payload;

      // Validation
      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      if (!message || typeof message !== 'string') {
        const error = { success: false, error: 'Invalid message' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Check if room exists
      if (!roomManager.roomExists(roomId)) {
        const error = { success: false, error: 'Room does not exist' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Get player info
      const playerInfo = roomManager.getPlayerBySocketId(socket.id);
      
      if (!playerInfo) {
        const error = { success: false, error: 'Player not in any room' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      const room = roomManager.getRoom(roomId);
      const player = room.players.get(playerInfo.userId);

      // Broadcast message to all in room
      io.to(roomId).emit('receive_message', {
        roomId,
        userId: player.userId,
        username: player.username,
        message: message.trim(),
        timestamp: Date.now()
      });

      // Send acknowledgment
      if (callback) callback({ success: true });

    } catch (error) {
      console.error('[Socket] Error sending message:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('room_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: reconnect_player
  // Handles player reconnection with existing userId
  // ============================================
  socket.on('reconnect_player', (payload, callback) => {
    try {
      const { roomId, userId } = payload;

      // Validation
      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      if (!userId || typeof userId !== 'string') {
        const error = { success: false, error: 'Invalid user ID' };
        socket.emit('room_error', error);
        if (callback) callback(error);
        return;
      }

      // Reconnect player
      const player = roomManager.reassignSocketOnReconnect(roomId, userId, socket.id);

      // Join socket.io room
      socket.join(roomId);

      // Get updated player list
      const players = roomManager.getRoomPlayers(roomId);

      // Send success to reconnected player
      const response = {
        success: true,
        roomId,
        userId: player.userId,
        username: player.username,
        message: 'Reconnected successfully'
      };
      
      socket.emit('room_joined', response);
      if (callback) callback(response);

      // Broadcast reconnection to all in room
      io.to(roomId).emit('player_reconnected', {
        roomId,
        userId: player.userId,
        username: player.username,
        timestamp: Date.now()
      });

      // Broadcast updated player list
      io.to(roomId).emit('player_list_update', {
        roomId,
        players: players.map(p => ({
          userId: p.userId,
          username: p.username,
          isConnected: p.isConnected,
          score: p.score
        }))
      });

      console.log(`[Socket] ${player.username} reconnected to room ${roomId}`);

    } catch (error) {
      console.error('[Socket] Error reconnecting player:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('room_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: start_game (Phase 2)
  // Starts the game in a room
  // ============================================
  socket.on('start_game', (payload, callback) => {
    try {
      const { roomId } = payload;

      // Validation
      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Check if room exists
      const room = roomManager.getRoom(roomId);
      if (!room) {
        const error = { success: false, error: 'Room does not exist' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Check if player is in the room
      const playerInfo = roomManager.getPlayerBySocketId(socket.id);
      if (!playerInfo || playerInfo.roomId !== roomId) {
        const error = { success: false, error: 'You are not in this room' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Start game
      const result = startGame(room, io);

      if (!result.success) {
        const error = { success: false, error: result.error };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Send success response
      if (callback) callback({ success: true, message: 'Game started' });

      console.log(`[Socket] Game started in room ${roomId}`);

    } catch (error) {
      console.error('[Socket] Error starting game:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('game_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: submit_guess (Phase 2)
  // Handles player guess submissions
  // ============================================
  socket.on('submit_guess', (payload, callback) => {
    try {
      const { roomId, guess } = payload;

      // Validation
      if (!roomId || typeof roomId !== 'string') {
        const error = { success: false, error: 'Invalid room ID' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
        const error = { success: false, error: 'Invalid guess' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        const error = { success: false, error: 'Room does not exist' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // Get player info
      const playerInfo = roomManager.getPlayerBySocketId(socket.id);
      if (!playerInfo || playerInfo.roomId !== roomId) {
        const error = { success: false, error: 'You are not in this room' };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      const player = room.players.get(playerInfo.userId);

      // Handle guess through game engine
      const result = handleGuess(room, playerInfo.userId, guess, io);

      if (!result.success) {
        const error = { success: false, error: result.error };
        socket.emit('game_error', error);
        if (callback) callback(error);
        return;
      }

      // If incorrect, broadcast as regular message
      if (!result.correct) {
        io.to(roomId).emit('receive_message', {
          roomId,
          userId: player.userId,
          username: player.username,
          message: guess.trim(),
          timestamp: Date.now()
        });
      }

      // Send acknowledgment
      if (callback) callback({ success: true, correct: result.correct });

    } catch (error) {
      console.error('[Socket] Error submitting guess:', error.message);
      const errorResponse = { success: false, error: error.message };
      socket.emit('game_error', errorResponse);
      if (callback) callback(errorResponse);
    }
  });

  // ============================================
  // Event: disconnect
  // Handles client disconnect
  // ============================================
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);

    try {
      // Mark player as disconnected
      const disconnectInfo = roomManager.removePlayerOnDisconnect(socket.id);

      if (disconnectInfo) {
        const { roomId, userId, username } = disconnectInfo;

        // Get room
        const room = roomManager.getRoom(roomId);

        if (room) {
          // Phase 2: Handle drawer disconnect during game
          handleDrawerDisconnect(room, userId, io);

          // Phase 2: Check if game should stop due to insufficient players
          checkPlayerCount(room, io);
        }

        // Get updated player list
        const players = roomManager.getRoomPlayers(roomId);

        // Broadcast disconnection to room
        socket.to(roomId).emit('player_disconnected', {
          roomId,
          userId,
          username,
          timestamp: Date.now()
        });

        // Broadcast updated player list
        io.to(roomId).emit('player_list_update', {
          roomId,
          players: players.map(p => ({
            userId: p.userId,
            username: p.username,
            isConnected: p.isConnected,
            score: p.score
          }))
        });

        console.log(`[Socket] Player ${username} marked as disconnected in room ${roomId}`);
      }
    } catch (error) {
      console.error('[Socket] Error handling disconnect:', error.message);
    }
  });

  // ============================================
  // Event: error
  // Handles socket errors
  // ============================================
  socket.on('error', (error) => {
    console.error(`[Socket] Socket error on ${socket.id}:`, error);
  });
}
