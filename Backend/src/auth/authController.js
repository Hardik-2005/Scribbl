import { guestLogin, googleLogin, getUserById, registerWithEmail, loginWithEmail } from './authService.js';

// ── POST /auth/guest ──────────────────────────────────────────────────────────

export async function handleGuestLogin(req, res) {
  try {
    const { username } = req.body;
    const result = await guestLogin(username);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}

// ── POST /auth/google ─────────────────────────────────────────────────────────

export async function handleGoogleLogin(req, res) {
  try {
    const { idToken } = req.body;
    const result = await googleLogin(idToken);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}

// ── POST /auth/register ───────────────────────────────────────────────────────

export async function handleRegister(req, res) {
  try {
    const { username, email, password } = req.body;
    const result = await registerWithEmail(username, email, password);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginWithEmail(email, password);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
// Protected — relies on authMiddleware attaching req.user

export async function handleGetMe(req, res) {
  try {
    // req.user.userId is set by authMiddleware
    const user = await getUserById(req.user.userId);
    return res.status(200).json({ user });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
