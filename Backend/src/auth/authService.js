import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { signToken } from './jwt.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helpers ──────────────────────────────────────────────────────────────────

function diceBearAvatar(seed) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email ?? null,
    avatar: user.avatar,
    isGuest: user.isGuest,
    gamesPlayed: user.gamesPlayed,
    wins: user.wins,
    totalScore: user.totalScore,
  };
}

// ── Guest Login ───────────────────────────────────────────────────────────────

/**
 * Creates or retrieves a guest user by username.
 * Guest accounts are keyed by username+isGuest flag.
 */
export async function guestLogin(username) {
  if (!username || typeof username !== 'string') {
    throw Object.assign(new Error('Username is required'), { status: 400 });
  }

  const trimmed = username.trim();

  if (trimmed.length < 2 || trimmed.length > 20) {
    throw Object.assign(
      new Error('Username must be between 2 and 20 characters'),
      { status: 400 }
    );
  }

  // Re-use existing guest with this username, or create a fresh one
  let user = await User.findOne({ username: trimmed, isGuest: true });

  if (!user) {
    const avatar = diceBearAvatar(`${trimmed}-${Date.now()}`);
    user = await User.create({ username: trimmed, avatar, isGuest: true });
  }

  const token = signToken({ userId: user._id.toString(), username: user.username });
  return { token, user: formatUser(user) };
}

// ── Google OAuth Login ────────────────────────────────────────────────────────

/**
 * Validates a Google OAuth access token via the Google userinfo endpoint,
 * then creates or links a User document.
 * @param {string} accessToken - OAuth access token from @react-oauth/google
 */
export async function googleLogin(accessToken) {
  if (!accessToken) {
    throw Object.assign(new Error('Google access token is required'), { status: 400 });
  }

  // Verify token and fetch profile from Google
  let profile;
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Token rejected by Google');
    profile = await res.json();
  } catch {
    throw Object.assign(new Error('Invalid Google access token'), { status: 401 });
  }

  const { id: googleId, email, name, picture } = profile;

  // 1. Try to find existing user by googleId
  let user = await User.findOne({ googleId });

  if (!user && email) {
    // 2. Try to find user with matching email (link accounts)
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }
  }

  if (!user) {
    // 3. Create new user
    user = await User.create({
      username: name || email.split('@')[0],
      email: email || null,
      avatar: picture || diceBearAvatar(googleId),
      googleId,
      isGuest: false,
    });
  }

  const token = signToken({ userId: user._id.toString(), username: user.username });
  return { token, user: formatUser(user) };
}

// ── Email Register ────────────────────────────────────────────────────────────

export async function registerWithEmail(username, email, password) {
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    throw Object.assign(new Error('Username must be at least 2 characters'), { status: 400 });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw Object.assign(new Error('A valid email is required'), { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatar = diceBearAvatar(`${username.trim()}-${Date.now()}`);
  const user = await User.create({
    username: username.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    avatar,
    isGuest: false,
  });

  const token = signToken({ userId: user._id.toString(), username: user.username });
  return { token, user: formatUser(user) };
}

// ── Email Login ───────────────────────────────────────────────────────────────

export async function loginWithEmail(email, password) {
  if (!email || !password) {
    throw Object.assign(new Error('Email and password are required'), { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.passwordHash) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken({ userId: user._id.toString(), username: user.username });
  return { token, user: formatUser(user) };
}

// ── Get User by ID ────────────────────────────────────────────────────────────

export async function getUserById(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return formatUser(user);
}
