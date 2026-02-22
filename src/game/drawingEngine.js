/**
 * Drawing Engine (Phase 4)
 * Handles real-time stroke validation, broadcasting, storage, and canvas management
 * Modular and separate from game logic
 */

// ============================================
// Constants
// ============================================

const MAX_STROKE_SIZE = 50;
const MIN_STROKE_SIZE = 1;
const THROTTLE_MS = 16; // ~60 strokes per second (1000ms / 60 = 16.67ms)
const HEX_COLOR_REGEX = /^#([0-9A-F]{3}){1,2}$/i;

// ============================================
// Validation Functions
// ============================================

/**
 * Validates stroke data structure and values
 * @param {Object} stroke - Stroke object to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateStroke(stroke) {
  if (!stroke || typeof stroke !== 'object') {
    return { valid: false, error: 'Stroke must be an object' };
  }

  // Validate required fields exist
  const requiredFields = ['x', 'y', 'prevX', 'prevY', 'color', 'size'];
  for (const field of requiredFields) {
    if (!(field in stroke)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate coordinates are numbers
  const coords = ['x', 'y', 'prevX', 'prevY'];
  for (const coord of coords) {
    if (typeof stroke[coord] !== 'number' || isNaN(stroke[coord])) {
      return { valid: false, error: `${coord} must be a valid number` };
    }
  }

  // Validate size
  if (typeof stroke.size !== 'number' || isNaN(stroke.size)) {
    return { valid: false, error: 'size must be a valid number' };
  }

  if (stroke.size < MIN_STROKE_SIZE || stroke.size > MAX_STROKE_SIZE) {
    return { valid: false, error: `size must be between ${MIN_STROKE_SIZE} and ${MAX_STROKE_SIZE}` };
  }

  // Validate color format
  if (typeof stroke.color !== 'string') {
    return { valid: false, error: 'color must be a string' };
  }

  if (!HEX_COLOR_REGEX.test(stroke.color)) {
    return { valid: false, error: 'color must be a valid hex color (#RGB or #RRGGBB)' };
  }

  return { valid: true };
}

/**
 * Checks if drawer is authorized to draw
 * @param {Object} room - Room object
 * @param {string} userId - User attempting to draw
 * @returns {Object} { authorized: boolean, error?: string }
 */
function isDrawerAuthorized(room, userId) {
  // Check game state
  if (room.gameState !== 'playing') {
    return { authorized: false, error: 'Drawing only allowed during active round' };
  }

  // Check if user is the current drawer
  if (room.currentDrawerId !== userId) {
    return { authorized: false, error: 'Only the drawer can draw' };
  }

  return { authorized: true };
}

/**
 * Checks if stroke should be throttled
 * @param {Object} room - Room object
 * @returns {boolean} True if stroke should be throttled (ignored)
 */
function shouldThrottle(room) {
  const now = Date.now();
  const timeSinceLastStroke = now - (room.lastStrokeTimestamp || 0);
  
  return timeSinceLastStroke < THROTTLE_MS;
}

// ============================================
// Core Drawing Functions
// ============================================

/**
 * Handles a draw stroke from a client
 * @param {Object} room - Room object
 * @param {string} userId - User ID of the drawer
 * @param {Object} stroke - Stroke data
 * @param {Object} socket - Socket instance of the drawer
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} { success: boolean, error?: string }
 */
export function handleDrawStroke(room, userId, stroke, socket, io) {
  try {
    // 1. Authorization check
    const authCheck = isDrawerAuthorized(room, userId);
    if (!authCheck.authorized) {
      console.log(`[DrawingEngine] Unauthorized draw attempt by ${userId}: ${authCheck.error}`);
      return { success: false, error: authCheck.error };
    }

    // 2. Throttling check
    if (shouldThrottle(room)) {
      // Silently ignore (don't log spam)
      return { success: false, error: 'Rate limited', throttled: true };
    }

    // 3. Validate stroke data
    const validation = validateStroke(stroke);
    if (!validation.valid) {
      console.log(`[DrawingEngine] Invalid stroke from ${userId}: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    // 4. Store stroke in history
    const strokeData = {
      x: stroke.x,
      y: stroke.y,
      prevX: stroke.prevX,
      prevY: stroke.prevY,
      color: stroke.color,
      size: stroke.size,
      timestamp: Date.now()
    };

    room.strokeHistory.push(strokeData);

    // 5. Update last stroke timestamp
    room.lastStrokeTimestamp = Date.now();

    // 6. Broadcast to other players (NOT to drawer)
    socket.to(room.roomId).emit('draw_stroke', {
      roomId: room.roomId,
      stroke: strokeData
    });

    // Log for testing
    console.log(`[DrawingEngine] Stroke broadcast in room ${room.roomId} - Total strokes: ${room.strokeHistory.length}`);

    return { success: true };

  } catch (error) {
    console.error('[DrawingEngine] Error handling draw stroke:', error.message);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Syncs stroke history to a client (on join/reconnect)
 * @param {Object} room - Room object
 * @param {Object} socket - Socket instance to sync to
 * @returns {Object} { success: boolean, strokeCount?: number }
 */
export function syncStrokes(room, socket) {
  try {
    // Only sync during active gameplay
    if (room.gameState !== 'playing') {
      console.log(`[DrawingEngine] No sync - game not playing in room ${room.roomId}`);
      return { success: true, strokeCount: 0 };
    }

    // Send stroke history
    socket.emit('sync_strokes', {
      roomId: room.roomId,
      strokes: room.strokeHistory
    });

    console.log(`[DrawingEngine] Synced ${room.strokeHistory.length} strokes to ${socket.id} in room ${room.roomId}`);

    return { success: true, strokeCount: room.strokeHistory.length };

  } catch (error) {
    console.error('[DrawingEngine] Error syncing strokes:', error.message);
    return { success: false, error: 'Failed to sync strokes' };
  }
}

/**
 * Clears the canvas (stroke history)
 * @param {Object} room - Room object
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} { success: boolean }
 */
export function clearCanvas(room, io) {
  try {
    const previousStrokeCount = room.strokeHistory.length;

    // Clear stroke history
    room.strokeHistory = [];
    room.lastStrokeTimestamp = 0;

    // Broadcast clear event to all clients in the room
    io.to(room.roomId).emit('clear_canvas', {
      roomId: room.roomId
    });

    console.log(`[DrawingEngine] Canvas cleared in room ${room.roomId} - ${previousStrokeCount} strokes removed`);

    return { success: true };

  } catch (error) {
    console.error('[DrawingEngine] Error clearing canvas:', error.message);
    return { success: false, error: 'Failed to clear canvas' };
  }
}

/**
 * Gets current stroke count for a room (for monitoring/debugging)
 * @param {Object} room - Room object
 * @returns {number} Number of strokes in history
 */
export function getStrokeCount(room) {
  return room.strokeHistory ? room.strokeHistory.length : 0;
}

// ============================================
// Export validation constants (for testing)
// ============================================

export const CONSTANTS = {
  MAX_STROKE_SIZE,
  MIN_STROKE_SIZE,
  THROTTLE_MS,
  HEX_COLOR_REGEX
};
