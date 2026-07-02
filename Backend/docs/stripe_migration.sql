-- ============================================================
-- STRIPE INTEGRATION MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add Stripe columns to user_subscriptions
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_customer
  ON user_subscriptions (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_subscription
  ON user_subscriptions (stripe_subscription_id);
