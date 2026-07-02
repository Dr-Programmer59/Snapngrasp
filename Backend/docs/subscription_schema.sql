-- ============================================================
-- SUBSCRIPTION & CREDITS SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Subscription Plans (reference table)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),
  uploads_per_period INTEGER NOT NULL DEFAULT 5,
  upload_period TEXT NOT NULL DEFAULT 'week',  -- 'week' or 'day'
  max_pages INTEGER NOT NULL DEFAULT 5,
  diagrams_per_month INTEGER NOT NULL DEFAULT 0,
  voice_minutes_per_month INTEGER NOT NULL DEFAULT 0,
  flashcard_model TEXT NOT NULL DEFAULT 'haiku',
  quiz_model TEXT NOT NULL DEFAULT 'haiku',
  priority_processing BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the 4 plans
INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, uploads_per_period, upload_period, max_pages, diagrams_per_month, voice_minutes_per_month, flashcard_model, quiz_model, priority_processing)
VALUES
  ('free', 'SNG Free', 0, NULL, 5, 'week', 5, 0, 0, 'haiku', 'haiku', false),
  ('pro', 'SNG Pro', 9.99, NULL, 10, 'day', 15, 30, 15, 'haiku', 'sonnet', false),
  ('pro_annual', 'SNG Pro Annual', 5.83, 69.99, 10, 'day', 15, 30, 15, 'haiku', 'sonnet', false),
  ('pro_plus', 'SNG Pro+', 19.99, NULL, 25, 'day', 30, 80, 45, 'sonnet', 'sonnet', true)
ON CONFLICT (id) DO NOTHING;

-- 2. User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',  -- active, cancelled, expired
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',  -- monthly, yearly, free
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)  -- one active subscription per user
);

-- 3. Usage Credits Tracking
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Upload credits
  uploads_used INTEGER NOT NULL DEFAULT 0,
  uploads_limit INTEGER NOT NULL DEFAULT 5,
  upload_period TEXT NOT NULL DEFAULT 'week',
  upload_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Diagram credits
  diagrams_used INTEGER NOT NULL DEFAULT 0,
  diagrams_limit INTEGER NOT NULL DEFAULT 0,
  diagrams_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  
  -- Voice credits (stored in seconds for precision)
  voice_seconds_used INTEGER NOT NULL DEFAULT 0,
  voice_seconds_limit INTEGER NOT NULL DEFAULT 0,
  voice_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  
  -- Page limit per upload
  max_pages INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe re-run)
DROP POLICY IF EXISTS "Anyone can read plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can read own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can read own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can manage credits" ON user_credits;

-- Plans are readable by all authenticated users
CREATE POLICY "Anyone can read plans" ON subscription_plans
  FOR SELECT USING (true);

-- Users can only see their own subscription
CREATE POLICY "Users can read own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (true);

-- Users can only see their own credits
CREATE POLICY "Users can read own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits" ON user_credits
  FOR ALL USING (true);

-- 5. Auto-assign free plan on signup (function + trigger)
CREATE OR REPLACE FUNCTION assign_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create subscription
  INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
  VALUES (NEW.id, 'free', 'active', 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create credits
  INSERT INTO user_credits (user_id, uploads_limit, upload_period, max_pages, diagrams_limit, voice_seconds_limit)
  VALUES (NEW.id, 5, 'week', 5, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION assign_free_subscription();

-- 6. Function to update user credits when plan changes
CREATE OR REPLACE FUNCTION update_user_credits_for_plan(
  p_user_id UUID,
  p_plan_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;
  
  INSERT INTO user_credits (user_id, uploads_limit, upload_period, max_pages, diagrams_limit, voice_seconds_limit, uploads_used, diagrams_used, voice_seconds_used, upload_period_start, diagrams_period_start, voice_period_start)
  VALUES (
    p_user_id,
    v_plan.uploads_per_period,
    v_plan.upload_period,
    v_plan.max_pages,
    v_plan.diagrams_per_month,
    v_plan.voice_minutes_per_month * 60,
    0, 0, 0,
    NOW(), date_trunc('month', NOW()), date_trunc('month', NOW())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    uploads_limit = v_plan.uploads_per_period,
    upload_period = v_plan.upload_period,
    max_pages = v_plan.max_pages,
    diagrams_limit = v_plan.diagrams_per_month,
    voice_seconds_limit = v_plan.voice_minutes_per_month * 60,
    uploads_used = 0,
    diagrams_used = 0,
    voice_seconds_used = 0,
    upload_period_start = NOW(),
    diagrams_period_start = date_trunc('month', NOW()),
    voice_period_start = date_trunc('month', NOW()),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
