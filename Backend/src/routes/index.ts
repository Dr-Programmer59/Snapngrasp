import { Router } from 'express';
import authRoutes from './auth.routes';
import appleAuthRoutes from './apple-auth.routes';
import googleAuthRoutes from './google-auth.routes';
import onboardingRoutes from './onboarding.routes';
import uploadRoutes from './upload.routes';
import mcqRoutes from './mcq.routes';
import flashcardRoutes from './flashcard.routes';
import visualRoutes from './visual.routes';
import labeledVisualRoutes from './labeled-visual.routes';
import chatRoutes from './chat.routes';
import feedbackRoutes from './feedback.routes';
import profileRoutes from './profile.routes';
import notesRoutes from './notes.routes';
import folderRoutes from './folder.routes';
import activityRoutes from './activity.routes';
import elevenLabsRoutes from './elevenlabs.routes';
import progressRoutes from './progress.routes';
import favoritesRoutes from './favorites.routes';
import motivationRoutes from './motivation.routes';
import generateAllRoutes from './generate-all.routes';
import subscriptionRoutes from './subscription.routes';
import iapRoutes from './iap.routes';
import webhooksRoutes from './webhooks.routes';
import { authenticate } from '../middlewares/auth.middleware';
import { getMeSubscriptionStatus } from '../controllers/revenuecat.controller';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auth/apple', appleAuthRoutes);
router.use('/auth/google', googleAuthRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/uploads', uploadRoutes);
router.use('/mcqs', mcqRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/visuals', visualRoutes);
router.use('/labeled-visuals', labeledVisualRoutes);
router.use('/chat', chatRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/profile', profileRoutes);
router.use('/notes', notesRoutes);
router.use('/folders', folderRoutes);
router.use('/activity', activityRoutes);
router.use('/elevenlabs', elevenLabsRoutes);
router.use('/progress', progressRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/motivation', motivationRoutes);
router.use('/generate-all', generateAllRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/iap', iapRoutes);
router.use('/webhooks', webhooksRoutes);
router.get('/me/subscription', authenticate, getMeSubscriptionStatus);

// Placeholder routes (to be implemented)
// router.use('/study', studyRoutes);
// router.use('/voice', voiceRoutes);
// router.use('/visual', visualRoutes);
// router.use('/progress', progressRoutes);
// router.use('/canvas', canvasRoutes);
// router.use('/admin', adminRoutes);

export default router;
