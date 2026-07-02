import { Router } from 'express';
import { googleAuthCallback, googleAuthRevoke } from '../controllers/google-auth.controller';

const router = Router();

/**
 * POST /api/auth/google/callback
 * Receive Google ID token, verify and create/login user
 */
router.post('/callback', googleAuthCallback);

/**
 * POST /api/auth/google/revoke
 * Revoke Google Sign-In token (for account deletion)
 */
router.post('/revoke', googleAuthRevoke);

export default router;
