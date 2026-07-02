import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

const PLAN_LIMITS: Record<string, {
  uploads_per_period: number;
  upload_period: 'week' | 'day';
  max_pages: number;
  diagrams_per_month: number;
  voice_minutes_per_month: number;
}> = {
  free: {
    uploads_per_period: 5,
    upload_period: 'week',
    max_pages: 5,
    diagrams_per_month: 0,
    voice_minutes_per_month: 0,
  },
  pro: {
    uploads_per_period: 10,
    upload_period: 'day',
    max_pages: 15,
    diagrams_per_month: 30,
    voice_minutes_per_month: 15,
  },
  pro_annual: {
    uploads_per_period: 10,
    upload_period: 'day',
    max_pages: 15,
    diagrams_per_month: 30,
    voice_minutes_per_month: 15,
  },
  pro_plus: {
    uploads_per_period: 25,
    upload_period: 'day',
    max_pages: 30,
    diagrams_per_month: 80,
    voice_minutes_per_month: 45,
  },
};

const PRODUCT_PLAN_MAP: Record<string, 'pro' | 'pro_annual' | 'pro_plus'> = {
  [process.env.APPLE_IAP_MONTHLY_PRODUCT_ID || 'com.snapngrasp.pro.monthly']: 'pro',
  [process.env.APPLE_IAP_YEARLY_PRODUCT_ID || 'com.snapngrasp.pro.yearly']: 'pro_annual',
  [process.env.APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID || 'com.snapngrasp.proplus.monthly']: 'pro_plus',
};

const ENTITLEMENT_PRO = process.env.REVENUECAT_ENTITLEMENT_PRO || 'pro';
const ENTITLEMENT_PRO_PLUS = process.env.REVENUECAT_ENTITLEMENT_PRO_PLUS || 'pro_plus';
const WEBHOOK_AUTH_HEADER = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER || '';

const processedEventIds = new Set<string>();

const parseDate = (rawValue?: string | number | null): string | null => {
  if (!rawValue && rawValue !== 0) {
    return null;
  }

  if (typeof rawValue === 'number') {
    return new Date(rawValue).toISOString();
  }

  const numeric = Number(rawValue);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Date(numeric).toISOString();
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const getBillingCycleForPlan = (planId: string): 'monthly' | 'yearly' | 'free' => {
  if (planId === 'pro_annual') {
    return 'yearly';
  }

  if (planId === 'free') {
    return 'free';
  }

  return 'monthly';
};

const getPlanFromEvent = (event: any): 'pro' | 'pro_annual' | 'pro_plus' | null => {
  const productId = event?.product_id;
  if (productId && PRODUCT_PLAN_MAP[productId]) {
    return PRODUCT_PLAN_MAP[productId];
  }

  const entitlements = Array.isArray(event?.entitlement_ids) ? event.entitlement_ids : [];
  if (entitlements.includes(ENTITLEMENT_PRO_PLUS)) {
    return 'pro_plus';
  }
  if (entitlements.includes(ENTITLEMENT_PRO)) {
    return 'pro';
  }

  return null;
};

const updateCreditsForPlan = async (userId: string, planId: string) => {
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS.free;
  const supabase = getSupabaseServer();

  const { error } = await supabase
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
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to update credits: ${error.message}`);
  }
};

const upsertSubscription = async (
  userId: string,
  planId: string,
  status: string,
  expiresAt: string | null,
  startedAt: string | null,
) => {
  const supabase = getSupabaseServer();
  const billingCycle = getBillingCycleForPlan(planId);

  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      status,
      billing_cycle: billingCycle,
      started_at: startedAt || new Date().toISOString(),
      expires_at: expiresAt,
      cancelled_at: status === 'canceled' || status === 'canceling' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
};

const shouldSkipFromMemory = (eventId: string): boolean => {
  if (processedEventIds.has(eventId)) {
    return true;
  }

  processedEventIds.add(eventId);

  if (processedEventIds.size > 1000) {
    const first = processedEventIds.values().next().value;
    if (first) {
      processedEventIds.delete(first);
    }
  }

  return false;
};

const alreadyProcessedInDatabase = async (eventId: string): Promise<boolean> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('billing_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    if ((error.message || '').toLowerCase().includes('relation') && (error.message || '').includes('billing_webhook_events')) {
      return false;
    }

    throw new Error(`Failed to check webhook idempotency: ${error.message}`);
  }

  return Boolean(data?.event_id);
};

const markProcessedInDatabase = async (eventId: string, payload: unknown): Promise<void> => {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('billing_webhook_events')
    .upsert({
      event_id: eventId,
      provider: 'revenuecat',
      payload,
      received_at: new Date().toISOString(),
    }, { onConflict: 'event_id', ignoreDuplicates: true });

  if (error) {
    if ((error.message || '').toLowerCase().includes('relation') && (error.message || '').includes('billing_webhook_events')) {
      return;
    }

    throw new Error(`Failed to persist webhook idempotency marker: ${error.message}`);
  }
};

const isPremiumActive = (subscription: any): boolean => {
  if (!subscription || subscription.plan_id === 'free') {
    return false;
  }

  if (!['active', 'canceling'].includes(subscription.status)) {
    return false;
  }

  if (!subscription.expires_at) {
    return true;
  }

  return new Date(subscription.expires_at).getTime() > Date.now();
};

export const getMeSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      res.status(500).json({ status: 'error', message: 'Failed to fetch subscription' });
      return;
    }

    const hasPremiumAccess = isPremiumActive(data);

    res.status(200).json({
      status: 'success',
      data: {
        hasPremiumAccess,
        subscription: data,
      },
    });
  } catch (error: any) {
    logger.error(`[RevenueCat] getMeSubscriptionStatus error: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const revenueCatWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    if (WEBHOOK_AUTH_HEADER) {
      const authorization = req.header('authorization') || '';
      if (authorization !== WEBHOOK_AUTH_HEADER) {
        res.status(401).json({ status: 'error', message: 'Invalid webhook authorization header' });
        return;
      }
    }

    const event = req.body?.event || req.body;
    if (!event) {
      res.status(400).json({ status: 'error', message: 'Missing RevenueCat event payload' });
      return;
    }

    const eventId = event.id || event.event_id || `${event.type || 'unknown'}:${event.app_user_id || 'unknown'}:${event.product_id || 'none'}:${event.purchased_at_ms || Date.now()}`;

    if (shouldSkipFromMemory(eventId)) {
      res.status(200).json({ status: 'success', message: 'Event already processed (memory)' });
      return;
    }

    const wasProcessed = await alreadyProcessedInDatabase(eventId);
    if (wasProcessed) {
      res.status(200).json({ status: 'success', message: 'Event already processed (database)' });
      return;
    }

    const eventType = (event.type || '').toString().toUpperCase();
    const userId = event.app_user_id;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'RevenueCat event is missing app_user_id' });
      return;
    }

    const planFromEvent = getPlanFromEvent(event);
    const expirationAt = parseDate(event.expiration_at_ms || event.expiration_at);
    const startedAt = parseDate(event.purchased_at_ms || event.purchased_at);

    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'].includes(eventType)) {
      if (!planFromEvent) {
        res.status(202).json({ status: 'success', message: 'Event received, but product/entitlement is not mapped' });
        return;
      }

      await upsertSubscription(userId, planFromEvent, 'active', expirationAt, startedAt);
      await updateCreditsForPlan(userId, planFromEvent);
    } else if (eventType === 'CANCELLATION') {
      const cancelStatus = expirationAt && new Date(expirationAt).getTime() > Date.now() ? 'canceling' : 'canceled';
      const nextPlan = planFromEvent || 'free';
      await upsertSubscription(userId, nextPlan, cancelStatus, expirationAt, startedAt);
      await updateCreditsForPlan(userId, nextPlan);
    } else if (eventType === 'EXPIRATION') {
      await upsertSubscription(userId, 'free', 'active', null, startedAt);
      await updateCreditsForPlan(userId, 'free');
    } else if (eventType === 'BILLING_ISSUE') {
      if (!planFromEvent) {
        res.status(202).json({ status: 'success', message: 'Billing issue received for unmapped product' });
        return;
      }

      await upsertSubscription(userId, planFromEvent, 'past_due', expirationAt, startedAt);
      await updateCreditsForPlan(userId, planFromEvent);
    } else {
      logger.info(`[RevenueCat] Ignoring unsupported event type: ${eventType}`);
    }

    await markProcessedInDatabase(eventId, req.body);

    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    logger.error(`[RevenueCat] webhook error: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Webhook processing failed' });
  }
};
