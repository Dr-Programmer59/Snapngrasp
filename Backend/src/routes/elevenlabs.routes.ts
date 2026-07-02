import { Router } from 'express';
import { getConversationToken, healthCheck } from '../controllers/elevenlabs.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireCredit } from '../middlewares/credit.middleware';

const router = Router();

/**
 * ElevenLabs Voice Agent Routes
 * 
 * These routes provide secure access to ElevenLabs conversation functionality.
 * The mobile app calls these endpoints to obtain tokens for real-time voice sessions.
 */

// Health check - verify ElevenLabs is configured
router.get('/health', healthCheck);

// Get conversation token - main endpoint for starting voice sessions (requires authentication + voice credit)
router.get('/conversation-token', authenticate, requireCredit('voice_minutes'), getConversationToken);

export default router;
