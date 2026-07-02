import { Request, Response, NextFunction } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

// Credit type to check
type CreditType = 'uploads' | 'diagrams' | 'voice_minutes';

// Plan credit limits
const PLAN_LIMITS: Record<string, Record<CreditType, number>> = {
  free:       { uploads: 5,  diagrams: 0,   voice_minutes: 0 },
  pro:        { uploads: 10, diagrams: 30,  voice_minutes: 15 },
  pro_annual: { uploads: 10, diagrams: 30,  voice_minutes: 15 },
  pro_plus:   { uploads: 25, diagrams: 80,  voice_minutes: 45 },
};

/**
 * Middleware factory: checks if user has remaining credits for a given type.
 * Usage: router.post('/image', requireCredit('uploads'), uploadMiddleware, uploadImage);
 */
export const requireCredit = (creditType: CreditType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const supabase = getSupabaseServer();
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Not authenticated' });
        return;
      }

      // Get user's subscription
      const { data: sub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status, expires_at')
        .eq('user_id', userId)
        .single();

      if (subError || !sub) {
        // No subscription found — treat as free plan and allow (auto-assign should handle this)
        logger.warn(`No subscription found for user ${userId}, treating as free`);
      }

      let planId = sub?.plan_id || 'free';

      // Enforce free-tier limits for non-paying states.
      if (sub?.status === 'past_due' || sub?.status === 'canceled') {
        planId = 'free';
      }

      // `canceling` should still keep paid limits until expiration.
      if (sub?.status === 'canceling' && sub?.expires_at) {
        const expiresAt = new Date(sub.expires_at);
        if (new Date() > expiresAt) {
          planId = 'free';
        }
      }

      const limits = PLAN_LIMITS[planId] || PLAN_LIMITS['free'];
      const limit = limits[creditType];

      // If limit is 0 for this plan, block immediately
      if (limit === 0) {
        res.status(403).json({
          status: 'error',
          message: `${creditType.replace('_', ' ')} are not available on your current plan. Please upgrade.`,
          code: 'CREDIT_UNAVAILABLE',
          creditType,
          planId,
        });
        return;
      }

      // Get user's current credits
      const { data: credits, error: credError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (credError || !credits) {
        // No credits record — allow and let the system create one later
        logger.warn(`No credits record for user ${userId}, allowing request`);
        next();
        return;
      }

      // Check if period has expired and needs reset
      const now = new Date();
      const periodEnd = new Date(credits.period_end);
      if (now > periodEnd) {
        // Reset credits for new period
        const periodDays = planId === 'free' ? 7 : 30;
        const newPeriodStart = now;
        const newPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

        await supabase
          .from('user_credits')
          .update({
            uploads_used: 0,
            diagrams_used: 0,
            voice_minutes_used: 0,
            period_start: newPeriodStart.toISOString(),
            period_end: newPeriodEnd.toISOString(),
          })
          .eq('user_id', userId);

        // After reset, credits are available
        next();
        return;
      }

      // Check usage against limit
      const usedField = `${creditType}_used` as keyof typeof credits;
      const used = (credits[usedField] as number) || 0;

      if (used >= limit) {
        res.status(403).json({
          status: 'error',
          message: `You've used all your ${creditType.replace('_', ' ')} for this period. Upgrade your plan for more.`,
          code: 'CREDIT_EXHAUSTED',
          creditType,
          used,
          limit,
          periodEnd: credits.period_end,
        });
        return;
      }

      // Credits available — proceed
      next();
    } catch (error) {
      logger.error(`Credit check middleware error: ${error}`);
      // On error, allow the request to avoid blocking users
      next();
    }
  };
};

/**
 * Helper to consume a credit after successful operation.
 * Call this in controller after the operation succeeds.
 */
export const consumeCredit = async (userId: string, creditType: CreditType, amount: number = 1): Promise<void> => {
  const supabase = getSupabaseServer();
  try {
    const usedField = `${creditType}_used`;
    
    // Get current value first
    const { data: credits } = await supabase
      .from('user_credits')
      .select(usedField)
      .eq('user_id', userId)
      .single();

    if (credits) {
      const currentUsed = (credits as any)[usedField] || 0;
      await supabase
        .from('user_credits')
        .update({ [usedField]: currentUsed + amount })
        .eq('user_id', userId);
    }
  } catch (error) {
    logger.error(`Failed to consume ${creditType} credit for user ${userId}: ${error}`);
  }
};
