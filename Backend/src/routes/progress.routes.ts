import express from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  logUserProgress,
  getProgressStats,
  getStreak,
  dailyCheckIn,
  getAIGreeting,
} from '../controllers/progress.controller';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * POST /api/progress/log
 * @desc    Log user activity (MCQ, Flashcard, Visual)
 * @access  Private
 */
router.post('/log', logUserProgress);

/**
 * GET /api/progress/stats
 * @desc    Get user's overall statistics
 * @access  Private
 */
router.get('/stats', getProgressStats);

/**
 * GET /api/progress/streak
 * @desc    Get user's current streak
 * @access  Private
 */
router.get('/streak', getStreak);

/**
 * POST /api/progress/check-in
 * @desc    Check in user for today (maintains streak)
 * @access  Private
 */
router.post('/check-in', dailyCheckIn);

/**
 * GET /api/progress/greeting
 * @desc    Get personalized AI greeting
 * @access  Private
 */
router.get('/greeting', getAIGreeting);

export default router;
