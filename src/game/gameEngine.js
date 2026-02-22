/**
 * GameEngine - Core game logic and round lifecycle management
 * Handles game state, round management, and timer coordination
 */

import { getRandomWord, maskWord, isCorrectGuess } from './wordService.js';

// Store active timers for each room
const roomTimers = new Map();

// Configuration
const DEFAULT_ROUND_DURATION = 60; // seconds
const ROUND_END_DELAY = 5000; // 5 seconds between rounds
const CORRECT_GUESS_POINTS = 10;

/**
 * Initializes game state for a room
 * @param {Object} room - Room object from RoomManager
 */
export function initializeGameState(room) {
  room.gameState = 'waiting';
  room.currentDrawerId = null;
  room.currentWord = null;
  room.roundNumber = 0;
  room.roundEndTime = null;
  room.roundDuration = DEFAULT_ROUND_DURATION;
  room.correctGuessers = new Set();
}

/**
 * Starts the game for a room
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Result object {success, error}
 */
export function startGame(room, io) {
  // Validation
  const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
  
  if (connectedPlayers.length < 2) {
    return { success: false, error: 'At least 2 connected players required' };
  }

  if (room.gameState !== 'waiting') {
    return { success: false, error: 'Game already in progress' };
  }

  // Initialize game state
  room.gameState = 'playing';
  room.roundNumber = 0;

  console.log(`[GameEngine] Game started in room ${room.roomId}`);

  // Emit game started event
  io.to(room.roomId).emit('game_started', {
    roomId: room.roomId,
    message: 'Game started!',
    timestamp: Date.now()
  });

  // Start first round after brief delay
  setTimeout(() => {
    startRound(room, io);
  }, 1000);

  return { success: true };
}

/**
 * Starts a new round in the game
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 */
export function startRound(room, io) {
  // Check if game is still active
  if (room.gameState !== 'playing') {
    console.log(`[GameEngine] Cannot start round - game not in playing state`);
    return;
  }

  // Check if we have enough players
  const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
  if (connectedPlayers.length < 2) {
    console.log(`[GameEngine] Not enough players to continue game`);
    stopGame(room, io, 'Not enough players');
    return;
  }

  // Increment round number
  room.roundNumber++;

  // Reset round state
  room.correctGuessers.clear();
  
  // Reset hasGuessedCurrentRound for all players
  for (const player of room.players.values()) {
    player.hasGuessedCurrentRound = false;
  }

  // Select drawer (rotate through connected players)
  const drawer = selectDrawer(room);
  if (!drawer) {
    console.log(`[GameEngine] No drawer available`);
    stopGame(room, io, 'No drawer available');
    return;
  }

  room.currentDrawerId = drawer.userId;

  // Select random word
  room.currentWord = getRandomWord();

  // Set round end time
  room.roundEndTime = Date.now() + (room.roundDuration * 1000);

  console.log(`[GameEngine] Round ${room.roundNumber} started - Drawer: ${drawer.username}, Word: ${room.currentWord}`);

  // Send round started event to all players
  io.to(room.roomId).emit('round_started', {
    roomId: room.roomId,
    roundNumber: room.roundNumber,
    drawerId: drawer.userId,
    drawerName: drawer.username,
    roundDuration: room.roundDuration,
    timestamp: Date.now()
  });

  // Send actual word to drawer (private)
  const drawerSocket = io.sockets.sockets.get(drawer.socketId);
  if (drawerSocket) {
    drawerSocket.emit('word_reveal', {
      word: room.currentWord,
      roundNumber: room.roundNumber
    });
  }

  // Send masked word to other players
  const maskedWord = maskWord(room.currentWord);
  for (const player of room.players.values()) {
    if (player.userId !== drawer.userId && player.isConnected) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('word_hint', {
          hint: maskedWord,
          wordLength: room.currentWord.length,
          roundNumber: room.roundNumber
        });
      }
    }
  }

  // Start timer
  startRoundTimer(room, io);
}

/**
 * Starts the server-authoritative timer for a round
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 */
function startRoundTimer(room, io) {
  // Clear any existing timer for this room
  stopRoundTimer(room.roomId);

  const timerId = setInterval(() => {
    const remainingTime = Math.max(0, Math.ceil((room.roundEndTime - Date.now()) / 1000));

    // Emit timer update
    io.to(room.roomId).emit('round_timer_update', {
      roomId: room.roomId,
      remainingTime,
      roundNumber: room.roundNumber
    });

    // Check if time is up
    if (remainingTime <= 0) {
      clearInterval(timerId);
      roomTimers.delete(room.roomId);
      endRound(room, io, 'time_up');
    }
  }, 1000);

  roomTimers.set(room.roomId, timerId);
}

/**
 * Stops the timer for a room
 * @param {string} roomId - Room ID
 */
export function stopRoundTimer(roomId) {
  const timerId = roomTimers.get(roomId);
  if (timerId) {
    clearInterval(timerId);
    roomTimers.delete(roomId);
    console.log(`[GameEngine] Timer stopped for room ${roomId}`);
  }
}

/**
 * Selects the next drawer (round-robin through connected players)
 * @param {Object} room - Room object
 * @returns {Object|null} Selected player or null
 */
function selectDrawer(room) {
  const connectedPlayers = Array.from(room.players.values())
    .filter(p => p.isConnected)
    .sort((a, b) => a.joinedAt - b.joinedAt); // Consistent ordering

  if (connectedPlayers.length === 0) return null;

  // Round-robin selection
  const drawerIndex = (room.roundNumber - 1) % connectedPlayers.length;
  return connectedPlayers[drawerIndex];
}

/**
 * Handles a player's guess
 * @param {Object} room - Room object
 * @param {string} userId - Player's user ID
 * @param {string} guess - The guess
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Result {success, correct, error}
 */
export function handleGuess(room, userId, guess, io) {
  // Validate game state
  if (room.gameState !== 'playing') {
    return { success: false, error: 'Game not in progress' };
  }

  // Get player
  const player = room.players.get(userId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  // Check if player is the drawer
  if (userId === room.currentDrawerId) {
    return { success: false, error: 'Drawer cannot guess' };
  }

  // Check if player already guessed correctly
  if (player.hasGuessedCurrentRound) {
    return { success: false, error: 'Already guessed correctly' };
  }

  // Validate guess
  const correct = isCorrectGuess(guess, room.currentWord);

  if (correct) {
    // Mark player as having guessed correctly
    player.hasGuessedCurrentRound = true;
    room.correctGuessers.add(userId);

    // Award points
    player.score += CORRECT_GUESS_POINTS;

    console.log(`[GameEngine] ${player.username} guessed correctly!`);

    // Emit correct guess event
    io.to(room.roomId).emit('correct_guess', {
      roomId: room.roomId,
      userId: player.userId,
      username: player.username,
      score: player.score,
      timestamp: Date.now()
    });

    // Broadcast updated player list
    io.to(room.roomId).emit('player_list_update', {
      roomId: room.roomId,
      players: Array.from(room.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        isConnected: p.isConnected,
        score: p.score
      }))
    });

    // Check if all non-drawer players guessed correctly
    const nonDrawerPlayers = Array.from(room.players.values())
      .filter(p => p.isConnected && p.userId !== room.currentDrawerId);
    
    const allGuessed = nonDrawerPlayers.every(p => p.hasGuessedCurrentRound);

    if (allGuessed && nonDrawerPlayers.length > 0) {
      console.log(`[GameEngine] All players guessed correctly - ending round early`);
      stopRoundTimer(room.roomId);
      endRound(room, io, 'all_guessed');
    }

    return { success: true, correct: true };
  }

  // Incorrect guess - broadcast as message
  return { success: true, correct: false };
}

/**
 * Ends the current round
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @param {string} reason - Reason for ending ('time_up', 'all_guessed', 'drawer_left')
 */
export function endRound(room, io, reason = 'time_up') {
  // Stop timer
  stopRoundTimer(room.roomId);

  // Set state to round_end
  room.gameState = 'round_end';

  console.log(`[GameEngine] Round ${room.roundNumber} ended - Reason: ${reason}`);

  // Get final scores
  const players = Array.from(room.players.values()).map(p => ({
    userId: p.userId,
    username: p.username,
    score: p.score,
    guessedCorrectly: p.hasGuessedCurrentRound
  }));

  // Emit round ended event
  io.to(room.roomId).emit('round_ended', {
    roomId: room.roomId,
    roundNumber: room.roundNumber,
    word: room.currentWord,
    reason,
    players,
    timestamp: Date.now()
  });

  // Schedule next round
  setTimeout(() => {
    // Check if room still exists and game should continue
    if (room.gameState === 'round_end') {
      const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
      
      if (connectedPlayers.length >= 2) {
        room.gameState = 'playing';
        startRound(room, io);
      } else {
        stopGame(room, io, 'Not enough players');
      }
    }
  }, ROUND_END_DELAY);
}

/**
 * Stops the game completely
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @param {string} reason - Reason for stopping
 */
export function stopGame(room, io, reason = 'Game ended') {
  stopRoundTimer(room.roomId);
  
  room.gameState = 'waiting';
  room.currentDrawerId = null;
  room.currentWord = null;
  room.roundNumber = 0;
  room.roundEndTime = null;
  room.correctGuessers.clear();

  console.log(`[GameEngine] Game stopped in room ${room.roomId} - Reason: ${reason}`);

  io.to(room.roomId).emit('game_stopped', {
    roomId: room.roomId,
    reason,
    timestamp: Date.now()
  });
}

/**
 * Handles drawer disconnect during active round
 * @param {Object} room - Room object
 * @param {string} userId - Disconnected drawer's user ID
 * @param {Object} io - Socket.IO server instance
 */
export function handleDrawerDisconnect(room, userId, io) {
  if (room.gameState === 'playing' && room.currentDrawerId === userId) {
    console.log(`[GameEngine] Drawer disconnected during round - ending round`);
    stopRoundTimer(room.roomId);
    endRound(room, io, 'drawer_left');
  }
}

/**
 * Checks if game should be stopped due to insufficient players
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 */
export function checkPlayerCount(room, io) {
  if (room.gameState === 'playing' || room.gameState === 'round_end') {
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
    
    if (connectedPlayers.length < 2) {
      console.log(`[GameEngine] Insufficient players - stopping game`);
      stopGame(room, io, 'Not enough players to continue');
    }
  }
}

/**
 * Cleans up game resources for a room (called on room deletion)
 * @param {string} roomId - Room ID
 */
export function cleanupRoom(roomId) {
  stopRoundTimer(roomId);
  console.log(`[GameEngine] Cleaned up resources for room ${roomId}`);
}
