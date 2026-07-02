import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { generateFeedback, getFeedbackHistory } from '../controllers/feedback.controller';

const router = Router();

// POST /api/feedback/generate - Generate AI feedback
router.post('/generate', authenticate, generateFeedback);

// GET /api/feedback/history/:userId - Get feedback history
router.get('/history/:userId', authenticate, getFeedbackHistory);

export default router;
