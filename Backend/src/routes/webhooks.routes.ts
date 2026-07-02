import { Router } from 'express';
import { revenueCatWebhook } from '../controllers/revenuecat.controller';

const router = Router();

// POST /webhooks/revenuecat
router.post('/revenuecat', revenueCatWebhook);

export default router;
