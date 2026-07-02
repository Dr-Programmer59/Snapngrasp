import { Request, Response } from 'express';
import { completeOnboarding, setLearningStyle } from '../services/supabase.service';
import { logger } from '../utils/logger';

// POST /onboarding/complete - Complete onboarding with learning style
export const completeOnboardingHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { learning_style, display_name, study_goals } = req.body;

    if (!learning_style) {
      res.status(400).json({
        status: 'error',
        message: 'learning_style is required',
      });
      return;
    }

    if (!['visual', 'auditory', 'interactive', 'reading'].includes(learning_style)) {
      res.status(400).json({
        status: 'error',
        message: 'learning_style must be visual, auditory, interactive, or reading',
      });
      return;
    }

    const profile = await completeOnboarding(req.user.id, learning_style, display_name, study_goals);

    res.status(200).json({
      status: 'success',
      data: {
        profile: {
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          learning_style: profile.learning_style,
          study_goals: profile.study_goals,
          onboarding_completed: profile.onboarding_completed,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Complete onboarding error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete onboarding',
    });
  }
};

// POST /onboarding/set-style - Update learning style
export const setStyleHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { learning_style } = req.body;

    if (!learning_style) {
      res.status(400).json({
        status: 'error',
        message: 'learning_style is required',
      });
      return;
    }

    if (!['visual', 'auditory', 'interactive'].includes(learning_style)) {
      res.status(400).json({
        status: 'error',
        message: 'learning_style must be visual, auditory, or interactive',
      });
      return;
    }

    const profile = await setLearningStyle(req.user.id, learning_style);

    res.status(200).json({
      status: 'success',
      data: {
        profile: {
          user_id: profile.user_id,
          learning_style: profile.learning_style,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Set learning style error');
    res.status(500).json({
      status: 'error',
      message: 'Failed to set learning style',
    });
  }
};
