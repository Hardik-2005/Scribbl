/**
 * GameEngine - Core game logic and round lifecycle management
 * Handles game state, round management, and timer coordination
 * Phase 3: Competitive system with time-based scoring and proper game endings
 */

import { getRandomWord, maskWord, isCorrectGuess } from './wordService.js';

// Store active timers for each room
const roomTimers = new Map();

// Configuration
const DEFAULT_ROUND_DURATION = 60; // seconds
const DEFAULT_TOTAL_ROUNDS = 3; // default number of rounds
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10;
const ROUND_END_DELAY = 5000; // 5 seconds between rounds
const DRAWER_BONUS_POINTS = 50; // Phase 3: Drawer gets bonus if someone guesses correctly

/**
 * Initializes game state for a room
 * @param {Object} room - Room object from RoomManager
 */
export function initializeGameState(room) {
  room.gameState = 'waiting';
  room.currentDrawerId = null;
  room.currentWord = null;
  room.roundNumber = 0;
  room.totalRounds = DEFAULT_TOTAL_ROUNDS; // Phase 3
  room.roundEndTime = null;
  room.roundDuration = DEFAULT_ROUND_DURATION;
  room.correctGuessers = new Set();
  room.gameConfig = {
    totalRounds: DEFAULT_TOTAL_ROUNDS,
    roundDuration: DEFAULT_ROUND_DURATION
  };
  // Phase 4: Drawing engine fields
  room.strokeHistory = [];
  room.lastStrokeTimestamp = 0;
}

/**
 * Starts the game for a room (Phase 3: with configurable rounds)
 * @param {Object} room - Room object
 * @param {number} totalRounds - Total rounds to play
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Result object {success, error}
 */
export function startGame(room, totalRounds, io) {
  // Validation
  const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
  
  if (connectedPlayers.length < 2) {
    return { success: false, error: 'At least 2 connected players required' };
  }

  // Phase 3: Allow restarting finished games
  if (room.gameState !== 'waiting' && room.gameState !== 'finished') {
    return { success: false, error: 'Game already in progress' };
  }

  // Phase 3: Validate totalRounds
  if (totalRounds < MIN_ROUNDS || totalRounds > MAX_ROUNDS) {
    return { success: false, error: `Total rounds must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}` };
  }

  // Initialize game state
  room.gameState = 'playing';
  room.roundNumber = 0; // Will be incremented to 1 in startRound
  room.totalRounds = totalRounds;
  room.gameConfig.totalRounds = totalRounds;

  console.log(`[GameEngine] Game started in room ${room.roomId} - ${totalRounds} rounds`);

  // Emit game started event
  io.to(room.roomId).emit('game_started', {
    roomId: room.roomId,
    totalRounds: totalRounds,
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
 * Phase 3: Checks if a guess is close to the correct word
 * @param {string} guess - Player's guess
 * @param {string} correctWord - The correct word
 * @returns {boolean} True if guess is close
 */
function isCloseGuess(guess, correctWord) {
  if (!guess || !correctWord) return false;
  
  const g = guess.toLowerCase().trim();
  const w = correctWord.toLowerCase();
  
  // Avoid matching the exact word
  if (g === w) return false;
  
  // Check if one contains the other
  if (g.length >= 3 && (g.includes(w) || w.includes(g))) {
    return true;
  }
  
  // Simple Levenshtein distance (edit distance)
  const distance = levenshteinDistance(g, w);
  return distance <= 1 && distance > 0;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Phase 3: Calculates time-based score
 * @param {number} roundEndTime - When the round ends
 * @param {number} roundDuration - Total round duration in seconds
 * @returns {number} Score based on remaining time
 */
function calculateTimeBasedScore(roundEndTime, roundDuration) {
  const remainingTime = Math.max(0, (roundEndTime - Date.now()) / 1000);
  const score = Math.floor(100 * (remainingTime / roundDuration));
  return Math.max(score, 10); // Minimum 10 points
}

/**
 * Handles a player's guess (Phase 3: Time-based scoring, close guess detection)
 * @param {Object} room - Room object
 * @param {string} userId - Player's user ID
 * @param {string} guess - The guess
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Individual socket for close guess notification
 * @returns {Object} Result {success, correct, close, error}
 */
export function handleGuess(room, userId, guess, io, socket) {
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

  // Validate guess - check if correct
  const correct = isCorrectGuess(guess, room.currentWord);

  if (correct) {
    // Phase 3: Calculate time-based score
    const earnedPoints = calculateTimeBasedScore(room.roundEndTime, room.roundDuration);
    
    // Mark player as having guessed correctly
    player.hasGuessedCurrentRound = true;
    room.correctGuessers.add(userId);

    // Award points
    player.score += earnedPoints;

    console.log(`[GameEngine] ${player.username} guessed correctly! +${earnedPoints} points`);

    // Phase 3: Emit correct guess event (NO chat message with the word)
    io.to(room.roomId).emit('correct_guess', {
      roomId: room.roomId,
      userId: player.userId,
      username: player.username,
      pointsEarned: earnedPoints,
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

  // Phase 3: Check if it's a close guess
  const close = isCloseGuess(guess, room.currentWord);
  if (close && socket) {
    socket.emit('close_guess', {
      message: 'So close! Keep trying!'
    });
    return { success: true, correct: false, close: true };
  }

  // Incorrect guess - will be broadcast as message
  return { success: true, correct: false, close: false };
}

/**
 * Ends the current round (Phase 3: Check if game should end, award drawer bonus)
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @param {string} reason - Reason for ending ('time_up', 'all_guessed', 'drawer_left')
 */
export function endRound(room, io, reason = 'time_up') {
  // Stop timer
  stopRoundTimer(room.roomId);

  // Phase 4: Clear canvas
  // Dynamic import to avoid circular dependency
  import('../game/drawingEngine.js').then(({ clearCanvas }) => {
    clearCanvas(room, io);
  }).catch(err => {
    console.error('[GameEngine] Error clearing canvas:', err.message);
  });

  // Set state to round_end
  room.gameState = 'round_end';

  // Phase 3: Award drawer bonus if at least one correct guess
  if (room.correctGuessers.size > 0 && room.currentDrawerId) {
    const drawer = room.players.get(room.currentDrawerId);
    if (drawer) {
      drawer.score += DRAWER_BONUS_POINTS;
      console.log(`[GameEngine] Drawer ${drawer.username} earned bonus: +${DRAWER_BONUS_POINTS} points`);
    }
  }

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
    totalRounds: room.totalRounds, // Phase 3
    word: room.currentWord,
    reason,
    players,
    timestamp: Date.now()
  });

  // Phase 3: Check if game should end or continue
  if (room.roundNumber >= room.totalRounds) {
    // Game is complete
    console.log(`[GameEngine] All rounds complete - ending game`);
    setTimeout(() => {
      endGame(room, io);
    }, ROUND_END_DELAY);
  } else {
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
}

/**
 * Phase 3: Ends the game and declares winner
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 */
export function endGame(room, io) {
  stopRoundTimer(room.roomId);
  
  room.gameState = 'finished';
  
  // Sort players by score descending
  const leaderboard = Array.from(room.players.values())
    .map(p => ({
      userId: p.userId,
      username: p.username,
      score: p.score,
      isConnected: p.isConnected
    }))
    .sort((a, b) => b.score - a.score);

  // Determine winner
  const winner = leaderboard[0];

  console.log(`[GameEngine] Game ended in room ${room.roomId} - Winner: ${winner.username} with ${winner.score} points`);

  // Emit game ended event
  io.to(room.roomId).emit('game_ended', {
    roomId: room.roomId,
    winner: {
      userId: winner.userId,
      username: winner.username,
      score: winner.score
    },
    leaderboard,
    timestamp: Date.now()
  });
}

/**
 * Phase 3: Resets the game state
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Result {success, error}
 */
export function resetGame(room, io) {
  // Can only reset if not mid-round
  if (room.gameState === 'playing' || room.gameState === 'round_end') {
    return { success: false, error: 'Cannot reset game while round is in progress' };
  }

  stopRoundTimer(room.roomId);
  
  // Reset game state
  room.gameState = 'waiting';
  room.currentDrawerId = null;
  room.currentWord = null;
  room.roundNumber = 0;
  room.roundEndTime = null;
  room.correctGuessers.clear();

  // Reset all player scores
  for (const player of room.players.values()) {
    player.score = 0;
    player.hasGuessedCurrentRound = false;
  }

  console.log(`[GameEngine] Game reset in room ${room.roomId}`);

  // Emit reset event
  io.to(room.roomId).emit('game_reset', {
    roomId: room.roomId,
    message: 'Game has been reset',
    timestamp: Date.now()
  });

  // Broadcast updated player list with reset scores
  io.to(room.roomId).emit('player_list_update', {
    roomId: room.roomId,
    players: Array.from(room.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      isConnected: p.isConnected,
      score: p.score
    }))
  });

  return { success: true };
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
