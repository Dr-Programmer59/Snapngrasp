import { Router } from 'express';
import { generateMotivationalMessage } from '../controllers/motivation.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Generate motivational message (requires authentication)
router.post('/generate', authenticate, generateMotivationalMessage);

export default router;
