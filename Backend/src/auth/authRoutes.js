import { Router } from 'express';
import { handleGuestLogin, handleGoogleLogin, handleGetMe, handleRegister, handleLogin } from './authController.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

// POST /auth/register — create a new email/password account
router.post('/register', handleRegister);

// POST /auth/login    — sign in with email + password
router.post('/login', handleLogin);

// POST /auth/guest  — create or retrieve a guest session
router.post('/guest', handleGuestLogin);

// POST /auth/google — verify Google ID token and issue JWT
router.post('/google', handleGoogleLogin);

// GET  /auth/me     — return the authenticated user profile (protected)
router.get('/me', authMiddleware, handleGetMe);

export default router;
