import { Router } from 'express';
import {
  completeOnboardingHandler,
  setStyleHandler,
} from '../controllers/onboarding.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /onboarding/complete - Complete onboarding with learning style
router.post('/complete', authenticate, completeOnboardingHandler);

// POST /onboarding/set-style - Update learning style
router.post('/set-style', authenticate, setStyleHandler);

export default router;
