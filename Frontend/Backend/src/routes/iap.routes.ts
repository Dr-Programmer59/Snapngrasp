import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { verifyAppleIap } from '../controllers/iap.controller';

const router = Router();

router.post('/apple/verify', authenticate, verifyAppleIap);

export default router;
