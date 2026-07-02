import axios from 'axios';
import { Request, Response } from 'express';
import { getSupabaseServer } from '../services/supabase.service';
import { logger } from '../utils/logger';

type AppleReceiptItem = {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  expires_date_ms?: string;
};

type AppleVerifyResponse = {
  status: number;
  latest_receipt_info?: AppleReceiptItem[];
  receipt?: {
    in_app?: AppleReceiptItem[];
  };
  environment?: string;
};

const PLAN_LIMITS: Record<'pro' | 'pro_annual' | 'pro_plus', {
  uploads_per_period: number;
  upload_period: 'day';
  max_pages: number;
  diagrams_per_month: number;
  voice_minutes_per_month: number;
}> = {
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

const APPLE_PRODUCT_PLAN_MAP: Record<string, 'pro' | 'pro_annual' | 'pro_plus'> = {
  [process.env.APPLE_IAP_MONTHLY_PRODUCT_ID || 'com.snapngrasp.pro.monthly']: 'pro',
  [process.env.APPLE_IAP_YEARLY_PRODUCT_ID || 'com.snapngrasp.pro.yearly']: 'pro_annual',
  [process.env.APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID || 'com.snapngrasp.proplus.monthly']: 'pro_plus',
};

const APPLE_VERIFY_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

const parseDateMs = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const verifyWithApple = async (receipt: string, sharedSecret: string): Promise<AppleVerifyResponse> => {
  const payload = {
    'receipt-data': receipt,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  const productionResponse = await axios.post<AppleVerifyResponse>(APPLE_VERIFY_PRODUCTION_URL, payload, {
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  if (productionResponse.data.status === 21007) {
    const sandboxResponse = await axios.post<AppleVerifyResponse>(APPLE_VERIFY_SANDBOX_URL, payload, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
    return sandboxResponse.data;
  }

  return productionResponse.data;
};

const findBestReceiptItem = (
  data: AppleVerifyResponse,
  productId: string,
  transactionId?: string,
): AppleReceiptItem | null => {
  const latestReceiptInfo = Array.isArray(data.latest_receipt_info) ? data.latest_receipt_info : [];
  const inAppPurchases = Array.isArray(data.receipt?.in_app) ? data.receipt?.in_app ?? [] : [];
  const combined = [...latestReceiptInfo, ...inAppPurchases].filter((item) => item.product_id === productId);

  if (!combined.length) {
    return null;
  }

  const exactMatches = transactionId
    ? combined.filter((item) => item.transaction_id === transactionId || item.original_transaction_id === transactionId)
    : combined;

  const candidates = exactMatches.length ? exactMatches : combined;
  candidates.sort((left, right) => parseDateMs(right.expires_date_ms) - parseDateMs(left.expires_date_ms));

  return candidates[0] || null;
};

const activatePaidPlan = async (userId: string, planId: 'pro' | 'pro_annual' | 'pro_plus', expiresAt: Date): Promise<void> => {
  const supabase = getSupabaseServer();
  const limits = PLAN_LIMITS[planId];
  const billingCycle = planId === 'pro_annual' ? 'yearly' : 'monthly';
  const now = new Date().toISOString();

  const { error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        started_at: now,
        expires_at: expiresAt.toISOString(),
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

  if (subscriptionError) {
    throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
  }

  const { error: creditsError } = await supabase
    .from('user_credits')
    .upsert(
      {
        user_id: userId,
        uploads_used: 0,
        uploads_limit: limits.uploads_per_period,
        upload_period: limits.upload_period,
        upload_period_start: now,
        diagrams_used: 0,
        diagrams_limit: limits.diagrams_per_month,
        diagrams_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        voice_seconds_used: 0,
        voice_seconds_limit: limits.voice_minutes_per_month * 60,
        voice_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        max_pages: limits.max_pages,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

  if (creditsError) {
    throw new Error(`Failed to update user credits: ${creditsError.message}`);
  }
};

export const verifyAppleIap = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUserId = req.user?.id;
    if (!authUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { platform, productId, transactionId, receipt } = req.body as {
      platform?: string;
      productId?: string;
      transactionId?: string;
      receipt?: string;
    };

    if (platform && platform !== 'ios') {
      res.status(400).json({ success: false, message: 'Only iOS Apple IAP is supported by this endpoint' });
      return;
    }

    if (!productId || !receipt) {
      res.status(400).json({ success: false, message: 'productId and receipt are required' });
      return;
    }

    const planId = APPLE_PRODUCT_PLAN_MAP[productId];
    if (!planId) {
      res.status(403).json({ success: false, message: 'Product ID is not allowed for subscriptions' });
      return;
    }

    const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET || '';
    if (!sharedSecret) {
      logger.error('[IAP] APPLE_IAP_SHARED_SECRET is missing');
      res.status(500).json({ success: false, message: 'Apple IAP is not configured on server' });
      return;
    }

    const appleData = await verifyWithApple(receipt, sharedSecret);
    if (!appleData || appleData.status !== 0) {
      logger.warn(`[IAP] Apple verification failed: status=${appleData?.status ?? 'unknown'}`);
      res.status(400).json({ success: false, message: 'Apple receipt verification failed' });
      return;
    }

    const matchedReceipt = findBestReceiptItem(appleData, productId, transactionId);
    if (!matchedReceipt) {
      res.status(400).json({ success: false, message: 'No matching Apple receipt found' });
      return;
    }

    const expiresAtMs = parseDateMs(matchedReceipt.expires_date_ms);
    const expiresAt = expiresAtMs ? new Date(expiresAtMs) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      res.status(400).json({ success: false, message: 'Apple receipt does not include a valid expiry' });
      return;
    }

    if (expiresAt.getTime() <= Date.now()) {
      res.status(400).json({ success: false, subscriptionActive: false, message: 'Subscription is expired' });
      return;
    }

    await activatePaidPlan(authUserId, planId, expiresAt);

    res.json({
      success: true,
      subscriptionActive: true,
      plan: planId === 'pro_annual' ? 'yearly' : 'monthly',
      expiresAt: expiresAt.toISOString(),
      productId,
      transactionId: matchedReceipt.transaction_id || transactionId || null,
      environment: appleData.environment || 'production',
    });
  } catch (error: any) {
    logger.error(`[IAP] verifyAppleIap error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
