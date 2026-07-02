import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

// Plan limits config (matches DB but kept here for quick reference)
const PLAN_LIMITS: Record<string, any> = {
  free: {
    uploads_per_period: 5,
    upload_period: 'week',
    max_pages: 5,
    diagrams_per_month: 0,
    voice_minutes_per_month: 0,
    flashcard_model: 'haiku',
    quiz_model: 'haiku',
    priority_processing: false,
  },
  pro: {
    uploads_per_period: 10,
    upload_period: 'day',
    max_pages: 15,
    diagrams_per_month: 30,
    voice_minutes_per_month: 15,
    flashcard_model: 'haiku',
    quiz_model: 'sonnet',
    priority_processing: false,
  },
  pro_annual: {
    uploads_per_period: 10,
    upload_period: 'day',
    max_pages: 15,
    diagrams_per_month: 30,
    voice_minutes_per_month: 15,
    flashcard_model: 'haiku',
    quiz_model: 'sonnet',
    priority_processing: false,
  },
  pro_plus: {
    uploads_per_period: 25,
    upload_period: 'day',
    max_pages: 30,
    diagrams_per_month: 80,
    voice_minutes_per_month: 45,
    flashcard_model: 'sonnet',
    quiz_model: 'sonnet',
    priority_processing: true,
  },
};

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL || process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://snapngrasp.com/privacy';
const TERMS_OF_USE_URL = process.env.TERMS_OF_USE_URL || process.env.EXPO_PUBLIC_TERMS_URL || 'https://snapngrasp.com/terms';
const AUTO_RENEWAL_TEXT = 'Subscription automatically renews unless canceled at least 24 hours before the end of the current billing period.';

const formatCurrency = (value: any): string => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '$0.00';
  }

  return `$${numericValue.toFixed(2)}`;
};

const getBillingPeriod = (plan: any): 'free' | 'monthly' | 'yearly' => {
  if (plan?.id === 'free') {
    return 'free';
  }

  if (plan?.price_yearly !== null && plan?.price_yearly !== undefined) {
    return 'yearly';
  }

  return 'monthly';
};

const getSubscriptionLength = (billingPeriod: 'free' | 'monthly' | 'yearly'): string => {
  if (billingPeriod === 'yearly') {
    return '1 Year';
  }

  if (billingPeriod === 'monthly') {
    return '1 Month';
  }

  return 'Free';
};

const getIncludedFeatures = (plan: any): string[] => {
  if (!plan) {
    return [];
  }

  if (plan.id === 'free') {
    return [
      '5 uploads per week',
      '5 pages per upload',
      'Haiku flashcards and quizzes',
      'Mobile access',
    ];
  }

  if (plan.id === 'pro') {
    return [
      '10 uploads per day',
      '15 pages per upload',
      'Smart Haiku and Sonnet routing',
      '30 diagrams per month',
      '15 voice minutes per month',
      'All platforms',
    ];
  }

  if (plan.id === 'pro_annual') {
    return [
      '10 uploads per day',
      '15 pages per upload',
      'Smart Haiku and Sonnet routing',
      '30 diagrams per month',
      '15 voice minutes per month',
      'All platforms',
    ];
  }

  if (plan.id === 'pro_plus') {
    return [
      '25 uploads per day',
      '30 pages per upload',
      'Sonnet for all quizzes',
      '80 diagrams per month',
      '45 voice minutes per month',
      'Priority processing',
      'All platforms',
    ];
  }

  const features: string[] = [];

  if (plan.uploads_per_period && plan.upload_period) {
    const periodLabel = plan.upload_period === 'day' ? 'day' : plan.upload_period === 'week' ? 'week' : plan.upload_period;
    features.push(`${plan.uploads_per_period} uploads per ${periodLabel}`);
  }

  if (plan.max_pages) {
    features.push(`${plan.max_pages} pages per upload`);
  }

  if (plan.diagrams_per_month) {
    features.push(`${plan.diagrams_per_month} diagrams per month`);
  }

  if (plan.voice_minutes_per_month) {
    features.push(`${plan.voice_minutes_per_month} voice minutes per month`);
  }

  if (plan.priority_processing) {
    features.push('Priority processing');
  }

  return features;
};

const normalizePlan = (plan: any) => {
  const billingPeriod = getBillingPeriod(plan);
  const priceValue = billingPeriod === 'yearly' ? plan?.price_yearly : plan?.price_monthly;

  return {
    ...plan,
    plan_name: plan?.name || '',
    price: formatCurrency(priceValue),
    billing_period: billingPeriod,
    subscription_length: getSubscriptionLength(billingPeriod),
    included_features: getIncludedFeatures(plan),
    auto_renewal_text: billingPeriod === 'free' ? null : AUTO_RENEWAL_TEXT,
    privacy_policy_url: PRIVACY_POLICY_URL,
    terms_of_use_url: TERMS_OF_USE_URL,
  };
};

const getPlanById = async (supabase: ReturnType<typeof getSupabaseServer>, planId: string) => {
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  return plan || null;
};

const buildSubscriptionResponse = (subscription: any, credits: any, plan: any) => ({
  status: 'success',
  data: {
    subscription: {
      ...subscription,
      subscription_plans: plan || null,
      plan_details: plan ? normalizePlan(plan) : null,
    },
    credits: resetExpiredCredits(credits),
  },
});

/**
 * GET /subscription/plans - List all available plans
 */
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) {
      logger.error(`[Subscription] Error fetching plans: ${error.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to fetch plans' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        plans: (data || []).map((plan) => normalizePlan(plan)),
      },
    });
  } catch (err: any) {
    logger.error(`[Subscription] getPlans error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /subscription/current - Get current user's subscription + credits
 */
export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const supabase = getSupabaseServer();

    // Fetch the latest subscription record regardless of status.
    // We cannot assume only `active` matters because `canceling` remains valid until period end.
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch credits
    const { data: credits, error: credError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      logger.error(`[Subscription] Error fetching subscription: ${subError.message}`);
    }
    if (credError && credError.code !== 'PGRST116') {
      logger.error(`[Subscription] Error fetching credits: ${credError.message}`);
    }

    // If no subscription exists, create a free one
    if (!subscription) {
      logger.info(`[Subscription] No subscription for user ${userId}, creating free plan`);
      await assignFreePlan(userId);
      
      // Re-fetch
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const newPlan = newSub?.plan_id ? await getPlanById(supabase, newSub.plan_id) : null;

      const { data: newCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      res.json(buildSubscriptionResponse(newSub, newCredits, newPlan));
      return;
    }

    // If a canceling subscription has passed its expiry, ensure the user is downgraded.
    if (subscription.status === 'canceling' && subscription.expires_at) {
      const expiresAt = new Date(subscription.expires_at);
      if (new Date() > expiresAt) {
        await assignFreePlan(userId);

        const { data: downgradedSub } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        const downgradedPlan = downgradedSub?.plan_id ? await getPlanById(supabase, downgradedSub.plan_id) : null;

        const { data: downgradedCredits } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', userId)
          .single();

        res.json(buildSubscriptionResponse(downgradedSub, downgradedCredits, downgradedPlan));
        return;
      }
    }

    // Attach plan details for UI parity with existing response shape.
    const plan = await getPlanById(supabase, subscription.plan_id);

    res.json(buildSubscriptionResponse(subscription, credits, plan));
  } catch (err: any) {
    logger.error(`[Subscription] getCurrentSubscription error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /subscription/select - Select/change subscription plan
 */
export const selectPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { plan_id } = req.body;
    if (!plan_id || !PLAN_LIMITS[plan_id]) {
      res.status(400).json({ status: 'error', message: 'Invalid plan_id. Must be: free, pro, pro_annual, or pro_plus' });
      return;
    }

    // Paid plans are activated only via verified Stripe events.
    // This prevents clients from self-upgrading without successful payment.
    if (plan_id !== 'free') {
      res.status(400).json({
        status: 'error',
        message: 'Paid plans must be activated through Stripe checkout',
      });
      return;
    }

    const supabase = getSupabaseServer();
    const limits = PLAN_LIMITS[plan_id];

    // Determine billing cycle
    let billing_cycle = 'monthly';
    if (plan_id === 'free') billing_cycle = 'free';
    else if (plan_id === 'pro_annual') billing_cycle = 'yearly';

    // Upsert subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_id,
        status: 'active',
        billing_cycle,
        started_at: new Date().toISOString(),
        expires_at: billing_cycle === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : billing_cycle === 'monthly'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*, subscription_plans(*)')
      .single();

    if (subError) {
      logger.error(`[Subscription] Error upserting subscription: ${subError.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to update subscription' });
      return;
    }

    // Reset credits to match new plan
    const { data: credits, error: credError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        uploads_used: 0,
        uploads_limit: limits.uploads_per_period,
        upload_period: limits.upload_period,
        upload_period_start: new Date().toISOString(),
        diagrams_used: 0,
        diagrams_limit: limits.diagrams_per_month,
        diagrams_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        voice_seconds_used: 0,
        voice_seconds_limit: limits.voice_minutes_per_month * 60,
        voice_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        max_pages: limits.max_pages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (credError) {
      logger.error(`[Subscription] Error upserting credits: ${credError.message}`);
    }

    logger.info(`[Subscription] User ${userId} switched to plan: ${plan_id}`);

    res.json({
      status: 'success',
      data: {
        subscription,
        credits,
        message: `Successfully switched to ${plan_id} plan`,
      },
    });
  } catch (err: any) {
    logger.error(`[Subscription] selectPlan error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /subscription/use-credit - Consume a credit (called internally)
 */
export const useCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { type, amount = 1 } = req.body;  // type: 'upload', 'diagram', 'voice_seconds'
    if (!type || !['upload', 'diagram', 'voice_seconds'].includes(type)) {
      res.status(400).json({ status: 'error', message: 'Invalid credit type' });
      return;
    }

    const supabase = getSupabaseServer();

    // Fetch current credits
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !credits) {
      res.status(404).json({ status: 'error', message: 'No credits found for user' });
      return;
    }

    // Check and reset expired periods
    const resetCredits = resetExpiredCredits(credits);

    // Check limit
    let used: number, limit: number, fieldUsed: string;
    if (type === 'upload') {
      used = resetCredits.uploads_used;
      limit = resetCredits.uploads_limit;
      fieldUsed = 'uploads_used';
    } else if (type === 'diagram') {
      used = resetCredits.diagrams_used;
      limit = resetCredits.diagrams_limit;
      fieldUsed = 'diagrams_used';
    } else {
      used = resetCredits.voice_seconds_used;
      limit = resetCredits.voice_seconds_limit;
      fieldUsed = 'voice_seconds_used';
    }

    if (limit > 0 && used + amount > limit) {
      res.status(403).json({
        status: 'error',
        message: `Credit limit reached for ${type}. Used: ${used}/${limit}. Upgrade your plan for more.`,
        data: { used, limit, type },
      });
      return;
    }

    // For free plan features with 0 limit (diagrams/voice), block entirely
    if (limit === 0 && (type === 'diagram' || type === 'voice_seconds')) {
      res.status(403).json({
        status: 'error',
        message: `${type === 'diagram' ? 'Diagrams' : 'Voice'} not available on your current plan. Upgrade to Pro or higher.`,
        data: { used: 0, limit: 0, type },
      });
      return;
    }

    // Consume credit
    const updateData: any = {
      [fieldUsed]: used + amount,
      updated_at: new Date().toISOString(),
    };

    // Also update period starts if they were reset
    if (type === 'upload' && resetCredits._upload_reset) {
      updateData.uploads_used = amount;
      updateData.upload_period_start = new Date().toISOString();
    }
    if (type === 'diagram' && resetCredits._diagram_reset) {
      updateData.diagrams_used = amount;
      updateData.diagrams_period_start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    }
    if (type === 'voice_seconds' && resetCredits._voice_reset) {
      updateData.voice_seconds_used = amount;
      updateData.voice_period_start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_credits')
      .update(updateData)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateError) {
      logger.error(`[Subscription] Error consuming credit: ${updateError.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to consume credit' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        credits: updated,
        consumed: { type, amount },
      },
    });
  } catch (err: any) {
    logger.error(`[Subscription] useCredit error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /subscription/check-credit/:type - Check if user has credits available
 */
export const checkCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { type } = req.params;
    if (!type || !['upload', 'diagram', 'voice_seconds'].includes(type)) {
      res.status(400).json({ status: 'error', message: 'Invalid credit type' });
      return;
    }

    const supabase = getSupabaseServer();
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !credits) {
      res.status(404).json({ status: 'error', message: 'No credits found' });
      return;
    }

    const resetCredits = resetExpiredCredits(credits);
    let used: number, limit: number;

    if (type === 'upload') {
      used = resetCredits.uploads_used;
      limit = resetCredits.uploads_limit;
    } else if (type === 'diagram') {
      used = resetCredits.diagrams_used;
      limit = resetCredits.diagrams_limit;
    } else {
      used = resetCredits.voice_seconds_used;
      limit = resetCredits.voice_seconds_limit;
    }

    const hasCredits = limit === 0 && type === 'upload' ? false : (limit === 0 ? false : used < limit);

    res.json({
      status: 'success',
      data: {
        type,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        hasCredits,
      },
    });
  } catch (err: any) {
    logger.error(`[Subscription] checkCredit error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ---- Helper functions ----

async function assignFreePlan(userId: string) {
  const supabase = getSupabaseServer();
  
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_id: 'free',
      status: 'active',
      billing_cycle: 'free',
      started_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      uploads_used: 0,
      uploads_limit: 5,
      upload_period: 'week',
      upload_period_start: new Date().toISOString(),
      diagrams_used: 0,
      diagrams_limit: 0,
      diagrams_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      voice_seconds_used: 0,
      voice_seconds_limit: 0,
      voice_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      max_pages: 5,
    }, { onConflict: 'user_id' });
}

/**
 * Reset credits if the period has expired
 */
function resetExpiredCredits(credits: any) {
  if (!credits) return credits;
  
  const now = new Date();
  const result = { ...credits, _upload_reset: false, _diagram_reset: false, _voice_reset: false };

  // Check upload period reset
  if (credits.upload_period_start) {
    const periodStart = new Date(credits.upload_period_start);
    const periodMs = credits.upload_period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (now.getTime() - periodStart.getTime() > periodMs) {
      result.uploads_used = 0;
      result._upload_reset = true;
    }
  }

  // Check diagram period reset (monthly)
  if (credits.diagrams_period_start) {
    const periodStart = new Date(credits.diagrams_period_start);
    if (now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()) {
      result.diagrams_used = 0;
      result._diagram_reset = true;
    }
  }

  // Check voice period reset (monthly)
  if (credits.voice_period_start) {
    const periodStart = new Date(credits.voice_period_start);
    if (now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()) {
      result.voice_seconds_used = 0;
      result._voice_reset = true;
    }
  }

  return result;
}
