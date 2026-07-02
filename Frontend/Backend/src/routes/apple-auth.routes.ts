import { Router } from 'express';
import { appleAuthCallback, appleAuthRevoke } from '../controllers/apple-auth.controller';

const router = Router();

/**
 * POST /api/auth/apple/callback
 * Receive Apple authorization code and ID token, verify and create/login user
 */
router.post('/callback', appleAuthCallback);

/**
 * POST /api/auth/apple/revoke
 * Revoke Apple Sign-In token (for account deletion)
 */
router.post('/revoke', appleAuthRevoke);

export default router;
