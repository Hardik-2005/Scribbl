import { Router } from 'express';
import { handleGuestLogin, handleGoogleLogin, handleGetMe } from './authController.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

// POST /auth/guest  — create or retrieve a guest session
router.post('/guest', handleGuestLogin);

// POST /auth/google — verify Google ID token and issue JWT
router.post('/google', handleGoogleLogin);

// GET  /auth/me     — return the authenticated user profile (protected)
router.get('/me', authMiddleware, handleGetMe);

export default router;
