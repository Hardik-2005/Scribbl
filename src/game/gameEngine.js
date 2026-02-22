/**
 * GameEngine â€” Core game logic and round lifecycle management
 * Phase 3 + Distributed (Redis-backed state, distributed timer locking)
 *
 * Timer ownership strategy
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * When a round starts the server that calls startRound() tries to acquire
 *   lock:room:{roomId}:timer
 * via Redis SETNX (NX EX 70).  Only the winner starts the local setInterval.
 * Each tick re-fetches the room from Redis so stale in-memory state is never
 * used for decisions.  On round end the lock is released so either server can
 * win for the next round.  A heartbeat refreshes the TTL mid-round.
 */

import * as roomStore from '../redis/roomStore.js';
import { getRandomWord, maskWord, isCorrectGuess } from './wordService.js';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Constants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_ROUND_DURATION = 60;   // seconds
const DEFAULT_TOTAL_ROUNDS   = 3;
const MIN_ROUNDS             = 1;
const MAX_ROUNDS             = 10;
const ROUND_END_DELAY        = 5000; // ms between rounds
const DRAWER_BONUS_POINTS    = 50;
const TIMER_LOCK_TTL         = 70;   // seconds â€” slightly longer than max round

/** Unique identity for this server process (used for lock ownership checks) */
const INSTANCE_ID = `pid-${process.pid}-${Date.now()}`;

/** In-memory map of active setInterval handles (local to this process only) */
const roomTimers = new Map();

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Internal helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function timerLockKey(roomId) { return `lock:room:${roomId}:timer`; }

/** Cancels the local setInterval for a room (does NOT release the Redis lock). */
export function stopRoundTimer(roomId) {
  const id = roomTimers.get(roomId);
  if (id) {
    clearInterval(id);
    roomTimers.delete(roomId);
    console.log(`[GameEngine] Local timer stopped for room ${roomId}`);
  }
}

function selectDrawer(room) {
  const connected = [...room.players.values()]
    .filter(p => p.isConnected)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  if (connected.length === 0) return null;
  return connected[(room.roundNumber - 1) % connected.length];
}

function isCloseGuess(guess, correctWord) {
  if (!guess || !correctWord) return false;
  const g = guess.toLowerCase().trim();
  const w = correctWord.toLowerCase();
  if (g === w) return false;
  if (g.length >= 3 && (g.includes(w) || w.includes(g))) return true;
  return levenshteinDistance(g, w) === 1;
}

function levenshteinDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i-1] === s2[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function calculateTimeBasedScore(roundEndTime, roundDuration) {
  const remaining = Math.max(0, (roundEndTime - Date.now()) / 1000);
  return Math.max(Math.floor(100 * (remaining / roundDuration)), 10);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Game lifecycle
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Starts the game.
 * @param {Object} room      - Hydrated room (from roomStore.getRoom)
 * @param {number} totalRounds
 * @param {Object} io        - Socket.IO server instance
 * @returns {Promise<{success:boolean, error?:string}>}
 */
export async function startGame(room, totalRounds, io) {
  const connected = [...room.players.values()].filter(p => p.isConnected);
  if (connected.length < 2) {
    return { success: false, error: 'At least 2 connected players required' };
  }
  if (room.gameState !== 'waiting' && room.gameState !== 'finished') {
    return { success: false, error: 'Game already in progress' };
  }
  if (totalRounds < MIN_ROUNDS || totalRounds > MAX_ROUNDS) {
    return { success: false, error: `Total rounds must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}` };
  }

  room.gameState   = 'playing';
  room.roundNumber = 0;
  room.totalRounds = totalRounds;

  await roomStore.saveRoomMeta(room);

  console.log(`[GameEngine] Game started in room ${room.roomId} â€” ${totalRounds} rounds`);

  io.to(room.roomId).emit('game_started', {
    roomId: room.roomId, totalRounds, message: 'Game started!', timestamp: Date.now()
  });

  const roomId = room.roomId;
  setTimeout(() => {
    startRound({ roomId }, io).catch(err =>
      console.error('[GameEngine] startRound error:', err.message));
  }, 1000);

  return { success: true };
}

/**
 * Starts a new round.  Always re-fetches room from Redis to avoid stale state.
 * @param {{roomId:string}} roomRef
 * @param {Object} io
 */
export async function startRound(roomRef, io) {
  const roomId = roomRef.roomId;
  const room   = await roomStore.getRoom(roomId);
  if (!room || room.gameState !== 'playing') {
    console.log(`[GameEngine] startRound aborted â€” room ${roomId} not in playing state`);
    return;
  }

  const connected = [...room.players.values()].filter(p => p.isConnected);
  if (connected.length < 2) { await stopGame(room, io, 'Not enough players'); return; }

  room.roundNumber++;
  room.correctGuessers.clear();
  for (const p of room.players.values()) p.hasGuessedCurrentRound = false;

  const drawer = selectDrawer(room);
  if (!drawer) { await stopGame(room, io, 'No drawer available'); return; }

  room.currentDrawerId = drawer.userId;
  room.currentWord     = getRandomWord();
  room.roundEndTime    = Date.now() + (room.roundDuration * 1000);

  await Promise.all([
    roomStore.saveRoomMeta(room),
    roomStore.savePlayers(roomId, room.players)
  ]);

  console.log(`[GameEngine] Round ${room.roundNumber} started â€” Drawer: ${drawer.username}, Word: ${room.currentWord}`);

  io.to(roomId).emit('round_started', {
    roomId,
    roundNumber:   room.roundNumber,
    drawerId:      drawer.userId,
    drawerName:    drawer.username,
    roundDuration: room.roundDuration,
    timestamp:     Date.now()
  });

  const drawerSock = io.sockets.sockets.get(drawer.socketId);
  if (drawerSock) drawerSock.emit('word_reveal', { word: room.currentWord, roundNumber: room.roundNumber });

  const masked = maskWord(room.currentWord);
  for (const p of room.players.values()) {
    if (p.userId !== drawer.userId && p.isConnected) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) s.emit('word_hint', { hint: masked, wordLength: room.currentWord.length, roundNumber: room.roundNumber });
    }
  }

  await startRoundTimer(roomId, room.roundNumber, io);
}

/**
 * Acquires the distributed timer lock and starts the 1-second tick.
 * Only ONE server instance will win the lock per round.
 */
async function startRoundTimer(roomId, roundNumber, io) {
  stopRoundTimer(roomId);

  const lockKey  = timerLockKey(roomId);
  const acquired = await roomStore.acquireLock(lockKey, INSTANCE_ID, TIMER_LOCK_TTL);

  if (!acquired) {
    console.log(`[GameEngine] Timer lock NOT acquired for room ${roomId} â€” another instance owns it`);
    return;
  }
  console.log(`[GameEngine] Timer lock acquired for room ${roomId} (${INSTANCE_ID})`);

  const timerId = setInterval(async () => {
    try {
      const fresh = await roomStore.getRoom(roomId);

      if (!fresh || fresh.gameState !== 'playing' || fresh.roundNumber !== roundNumber) {
        clearInterval(timerId);
        roomTimers.delete(roomId);
        await roomStore.releaseLock(lockKey, INSTANCE_ID);
        return;
      }

      const remaining = Math.max(0, Math.ceil((fresh.roundEndTime - Date.now()) / 1000));

      io.to(roomId).emit('round_timer_update', { roomId, remainingTime: remaining, roundNumber: fresh.roundNumber });

      if (remaining > 5) await roomStore.refreshLock(lockKey, INSTANCE_ID, TIMER_LOCK_TTL);

      if (remaining <= 0) {
        clearInterval(timerId);
        roomTimers.delete(roomId);
        await roomStore.releaseLock(lockKey, INSTANCE_ID);
        await endRound(fresh, io, 'time_up');
      }
    } catch (err) {
      console.error('[GameEngine] Timer tick error:', err.message);
    }
  }, 1000);

  roomTimers.set(roomId, timerId);
}

/**
 * Ends the current round, awards drawer bonus, schedules next round or game end.
 */
export async function endRound(room, io, reason = 'time_up') {
  stopRoundTimer(room.roomId);

  try {
    const { clearCanvas } = await import('./drawingEngine.js');
    await clearCanvas(room, io);
  } catch (err) {
    console.error('[GameEngine] clearCanvas error:', err.message);
  }

  room.gameState = 'round_end';

  if (room.correctGuessers.size > 0 && room.currentDrawerId) {
    const drawer = room.players.get(room.currentDrawerId);
    if (drawer) {
      drawer.score += DRAWER_BONUS_POINTS;
      await roomStore.savePlayer(room.roomId, drawer);
      console.log(`[GameEngine] Drawer ${drawer.username} earned +${DRAWER_BONUS_POINTS} pts`);
    }
  }

  await roomStore.saveRoomMeta(room);
  console.log(`[GameEngine] Round ${room.roundNumber} ended â€” Reason: ${reason}`);

  io.to(room.roomId).emit('round_ended', {
    roomId:      room.roomId,
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    word:        room.currentWord,
    reason,
    players:     [...room.players.values()].map(p => ({
      userId: p.userId, username: p.username, score: p.score, guessedCorrectly: p.hasGuessedCurrentRound
    })),
    timestamp: Date.now()
  });

  const roomId = room.roomId;

  if (room.roundNumber >= room.totalRounds) {
    setTimeout(() => endGame({ roomId }, io).catch(err =>
      console.error('[GameEngine] endGame error:', err.message)), ROUND_END_DELAY);
  } else {
    setTimeout(async () => {
      const fresh = await roomStore.getRoom(roomId);
      if (!fresh || fresh.gameState !== 'round_end') return;
      const conn = [...fresh.players.values()].filter(p => p.isConnected);
      if (conn.length >= 2) {
        fresh.gameState = 'playing';
        await roomStore.saveRoomMeta(fresh);
        await startRound(fresh, io);
      } else {
        await stopGame(fresh, io, 'Not enough players');
      }
    }, ROUND_END_DELAY);
  }
}

/**
 * Ends the game and broadcasts leaderboard + winner.
 */
export async function endGame(roomRef, io) {
  const room = await roomStore.getRoom(roomRef.roomId);
  if (!room) return;

  stopRoundTimer(room.roomId);
  room.gameState = 'finished';
  await roomStore.saveRoomMeta(room);

  const leaderboard = [...room.players.values()]
    .map(p => ({ userId: p.userId, username: p.username, score: p.score, isConnected: p.isConnected }))
    .sort((a, b) => b.score - a.score);

  const winner = leaderboard[0];
  console.log(`[GameEngine] Game ended in room ${room.roomId} â€” Winner: ${winner.username} (${winner.score} pts)`);

  io.to(room.roomId).emit('game_ended', {
    roomId: room.roomId,
    winner: { userId: winner.userId, username: winner.username, score: winner.score },
    leaderboard,
    timestamp: Date.now()
  });
}

/**
 * Resets game state and all player scores back to zero.
 */
export async function resetGame(room, io) {
  if (room.gameState === 'playing' || room.gameState === 'round_end') {
    return { success: false, error: 'Cannot reset game while round is in progress' };
  }

  stopRoundTimer(room.roomId);

  room.gameState = 'waiting'; room.currentDrawerId = null; room.currentWord = null;
  room.roundNumber = 0; room.roundEndTime = null;
  room.correctGuessers.clear();

  for (const p of room.players.values()) { p.score = 0; p.hasGuessedCurrentRound = false; }

  await Promise.all([
    roomStore.saveRoomMeta(room),
    roomStore.savePlayers(room.roomId, room.players)
  ]);

  console.log(`[GameEngine] Game reset in room ${room.roomId}`);

  io.to(room.roomId).emit('game_reset', { roomId: room.roomId, message: 'Game has been reset', timestamp: Date.now() });
  io.to(room.roomId).emit('player_list_update', {
    roomId: room.roomId,
    players: [...room.players.values()].map(p => ({
      userId: p.userId, username: p.username, isConnected: p.isConnected, score: p.score
    }))
  });

  return { success: true };
}

/**
 * Stops the game completely (forced stop or insufficient players).
 */
export async function stopGame(room, io, reason = 'Game ended') {
  stopRoundTimer(room.roomId);

  room.gameState = 'waiting'; room.currentDrawerId = null; room.currentWord = null;
  room.roundNumber = 0; room.roundEndTime = null;
  room.correctGuessers.clear();

  await roomStore.saveRoomMeta(room);
  console.log(`[GameEngine] Game stopped in room ${room.roomId} â€” Reason: ${reason}`);

  io.to(room.roomId).emit('game_stopped', { roomId: room.roomId, reason, timestamp: Date.now() });
}

/**
 * Handles a player's guess â€” time-based scoring, close guess detection.
 * @returns {Promise<{success:boolean, correct?:boolean, close?:boolean, error?:string}>}
 */
export async function handleGuess(room, userId, guess, io, socket) {
  if (room.gameState !== 'playing') return { success: false, error: 'Game not in progress' };

  const player = room.players.get(userId);
  if (!player)                       return { success: false, error: 'Player not found' };
  if (userId === room.currentDrawerId) return { success: false, error: 'Drawer cannot guess' };
  if (player.hasGuessedCurrentRound)  return { success: false, error: 'Already guessed correctly' };

  if (isCorrectGuess(guess, room.currentWord)) {
    const pts = calculateTimeBasedScore(room.roundEndTime, room.roundDuration);
    player.hasGuessedCurrentRound = true;
    player.score += pts;
    room.correctGuessers.add(userId);

    await Promise.all([
      roomStore.savePlayer(room.roomId, player),
      roomStore.saveRoomMeta(room)
    ]);

    console.log(`[GameEngine] ${player.username} guessed correctly! +${pts} pts`);

    io.to(room.roomId).emit('correct_guess', {
      roomId: room.roomId, userId: player.userId, username: player.username,
      pointsEarned: pts, score: player.score, timestamp: Date.now()
    });
    io.to(room.roomId).emit('player_list_update', {
      roomId: room.roomId,
      players: [...room.players.values()].map(p => ({
        userId: p.userId, username: p.username, isConnected: p.isConnected, score: p.score
      }))
    });

    const nonDrawers = [...room.players.values()]
      .filter(p => p.isConnected && p.userId !== room.currentDrawerId);
    if (nonDrawers.length > 0 && nonDrawers.every(p => p.hasGuessedCurrentRound)) {
      console.log('[GameEngine] All players guessed â€” ending round early');
      stopRoundTimer(room.roomId);
      await roomStore.releaseLock(timerLockKey(room.roomId), INSTANCE_ID);
      await endRound(room, io, 'all_guessed');
    }

    return { success: true, correct: true };
  }

  if (isCloseGuess(guess, room.currentWord) && socket) {
    socket.emit('close_guess', { message: 'So close! Keep trying!' });
    return { success: true, correct: false, close: true };
  }

  return { success: true, correct: false, close: false };
}

/** Called when the current drawer disconnects mid-round. */
export async function handleDrawerDisconnect(room, userId, io) {
  if (room.gameState === 'playing' && room.currentDrawerId === userId) {
    console.log('[GameEngine] Drawer disconnected â€” ending round');
    stopRoundTimer(room.roomId);
    await roomStore.releaseLock(timerLockKey(room.roomId), INSTANCE_ID);
    await endRound(room, io, 'drawer_left');
  }
}

/** Stops the game if fewer than 2 connected players remain. */
export async function checkPlayerCount(room, io) {
  if (room.gameState === 'playing' || room.gameState === 'round_end') {
    const connected = [...room.players.values()].filter(p => p.isConnected);
    if (connected.length < 2) {
      console.log('[GameEngine] Insufficient players â€” stopping game');
      await stopGame(room, io, 'Not enough players to continue');
    }
  }
}

/** Cleans up timer resources when a room is deleted. */
export function cleanupRoom(roomId) {
  stopRoundTimer(roomId);
  console.log(`[GameEngine] Cleaned up resources for room ${roomId}`);
}

