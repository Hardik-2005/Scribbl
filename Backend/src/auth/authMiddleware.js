import { verifyToken } from './jwt.js';
import User from '../models/User.js';

/**
 * Express middleware — verifies the Bearer JWT and attaches the decoded
 * payload to req.user: { userId, username }.
 *
 * Responds with 401 if the token is missing, malformed, or expired.
 * Does NOT fetch the full user document from MongoDB — use req.user.userId
 * inside controllers to load the full profile only when needed.
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = verifyToken(token);
    req.user = { userId: decoded.userId, username: decoded.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Socket.IO middleware — verifies JWT sent in socket.handshake.auth.token.
 * On success attaches socket.user = { userId, username, _doc }.
 * On failure calls next() with an Error which Socket.IO propagates to the client.
 */
export async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = verifyToken(token);

    // Fetch full user document so game logic can reference _id, username, avatar, etc.
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}
