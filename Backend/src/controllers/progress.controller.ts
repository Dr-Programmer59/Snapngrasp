import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  logProgress,
  getUserStats,
  getUserStreak,
  checkInUser,
} from '../services/progress.service';
import { generatePersonalizedGreeting, getMotivationalQuote } from '../services/ai-greeting.service';

/**
 * POST /api/progress/log
 * Log user activity (MCQ, Flashcard, Visual)
 */
export const logUserProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const {
      uploadId,
      activityType,
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpentSeconds,
    } = req.body;

    // Validate required fields
    if (!activityType || score === undefined || total === undefined) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required fields: activityType, score, total',
      });
      return;
    }

    // Validate activity type
    if (!['mcq', 'flashcard', 'visual', 'labeled_visual'].includes(activityType)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid activity type',
      });
      return;
    }

    // Log progress
    const progress = await logProgress(userId, {
      uploadId,
      activityType,
      score,
      total,
      difficulty,
      subject,
      topic,
      timeSpentSeconds,
    });

    logger.info({ userId, activityType }, '[Progress Controller] Progress logged');

    res.status(201).json({
      status: 'success',
      message: 'Progress logged successfully',
      data: progress,
    });
  } catch (error) {
    logger.error({ err: error }, '[Progress Controller] Error logging progress');
    res.status(500).json({
      status: 'error',
      message: 'Failed to log progress',
    });
  }
};

/**
 * GET /api/progress/stats
 * Get user's overall statistics
 */
export const getProgressStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const stats = await getUserStats(userId);

    logger.info({ userId }, '[Progress Controller] Stats retrieved');

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    logger.error({ err: error }, '[Progress Controller] Error getting stats');
    res.status(500).json({
      status: 'error',
      message: 'Failed to get statistics',
    });
  }
};

/**
 * GET /api/progress/streak
 * Get user's current streak
 */
export const getStreak = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const streak = await getUserStreak(userId);

    logger.info({ userId, streak: streak.current_streak }, '[Progress Controller] Streak retrieved');

    res.status(200).json({
      status: 'success',
      data: streak,
    });
  } catch (error) {
    logger.error({ err: error }, '[Progress Controller] Error getting streak');
    res.status(500).json({
      status: 'error',
      message: 'Failed to get streak',
    });
  }
};

/**
 * POST /api/progress/check-in
 * Check in user for today (maintains streak)
 */
export const dailyCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const result = await checkInUser(userId);

    logger.info({ userId, alreadyCheckedIn: result.alreadyCheckedIn }, '[Progress Controller] Check-in completed');

    res.status(200).json({
      status: 'success',
      message: result.alreadyCheckedIn ? 'Already checked in today' : 'Check-in successful',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, '[Progress Controller] Error checking in');
    res.status(500).json({
      status: 'error',
      message: 'Failed to check in',
    });
  }
};

/**
 * GET /api/progress/greeting
 * Get personalized AI greeting
 */
export const getAIGreeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    console.log('🤖 [Progress Controller] Generating AI greeting for user:', userId);

    try {
      // Try to generate personalized greeting
      const greeting = await generatePersonalizedGreeting(userId, userName);

      logger.info({ userId, greetingType: greeting.type }, '[Progress Controller] AI greeting generated');

      res.status(200).json({
        status: 'success',
        data: greeting,
      });
    } catch (greetingError) {
      // Fallback to motivational quote if AI greeting fails
      console.log('⚠️ [Progress Controller] AI greeting failed, using fallback');
      const fallback = getMotivationalQuote();

      res.status(200).json({
        status: 'success',
        data: {
          message: fallback.message,
          type: 'motivational',
          emoji: fallback.emoji,
          stats: null,
        },
      });
    }
  } catch (error) {
    logger.error({ err: error }, '[Progress Controller] Error getting greeting');
    res.status(500).json({
      status: 'error',
      message: 'Failed to get greeting',
    });
  }
};
