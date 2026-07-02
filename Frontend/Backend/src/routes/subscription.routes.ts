import { Router } from 'express';
import {
  getPlans,
  getCurrentSubscription,
  selectPlan,
  useCredit,
  checkCredit,
} from '../controllers/subscription.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// GET /subscription/plans - List all plans (public)
router.get('/plans', getPlans);

// GET /subscription/current - Get current user's subscription + credits
router.get('/current', authenticate, getCurrentSubscription);

// POST /subscription/select - Select/change plan
router.post('/select', authenticate, selectPlan);

// POST /subscription/use-credit - Consume a credit
router.post('/use-credit', authenticate, useCredit);

// GET /subscription/check-credit/:type - Check available credits
router.get('/check-credit/:type', authenticate, checkCredit);

export default router;
