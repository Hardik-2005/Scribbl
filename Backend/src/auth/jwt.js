import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Signs a JWT token with the given payload.
 * @param {{ userId: string, username: string }} payload
 * @returns {string} signed JWT
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ userId: string, username: string, iat: number, exp: number }}
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
