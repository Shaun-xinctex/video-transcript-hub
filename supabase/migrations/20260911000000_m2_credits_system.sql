-- ============================================================
-- M2 — Stripe credits system
-- Already applied to the remote project on 2026-09-11; this file keeps the
-- repo's migration history in sync. Idempotent — safe to re-run.
-- ============================================================

-- 0. profiles (M1 never created it in this project)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. credits_balance
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_balance numeric NOT NULL DEFAULT 30;

UPDATE public.profiles SET credits_balance = 30 WHERE credits_balance = 0;

-- 2. ledger
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'deduction', 'signup_bonus', 'admin_grant')),
  description text,
  job_id uuid REFERENCES public.jobs(id),
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
  ON public.credit_transactions(user_id, created_at DESC);

-- Idempotency for webhook retries: at most one purchase row per payment_intent.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_tx_payment_intent
  ON public.credit_transactions(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. products catalog
CREATE TABLE IF NOT EXISTS public.credit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits numeric NOT NULL,
  price_usd numeric NOT NULL,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view active products" ON public.credit_products
    FOR SELECT TO authenticated USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.credit_products (name, credits, price_usd, stripe_price_id)
SELECT v.name, v.credits, v.price_usd, v.stripe_price_id
FROM (VALUES
  ('10 Credits', 10::numeric, 10.00::numeric, 'price_1UEPgPAXSjTQn8U8KCFKhVds'),
  ('45 Credits', 45::numeric, 30.00::numeric, 'price_1UEPgRAXSjTQn8U8UZQ9PwMe'),
  ('90 Credits', 90::numeric, 60.00::numeric, 'price_1UEPgSAXSjTQn8U8yHOphW8f')
) AS v(name, credits, price_usd, stripe_price_id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_products p WHERE p.stripe_price_id = v.stripe_price_id
);

-- 4. signup trigger: 30-credit welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, credits_balance)
    VALUES (NEW.id, 'user', NEW.email, 30)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (NEW.id, 30, 'signup_bonus', 'Welcome bonus - 30 free credits');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. widen jobs.status to allow insufficient_credits.
-- M1's actual constraint in THIS repo was: pending / downloading / transcribe / done
-- (the course skill's template says 'transcribing' + 'error' — do not copy it blindly,
-- a mismatch here kills the worker on its first status write).
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'downloading', 'transcribe', 'done', 'error', 'insufficient_credits'));

-- 6. backfill profiles for users created before this migration
INSERT INTO public.profiles (id, role, email, credits_balance)
SELECT u.id, 'user', u.email, 30
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 7. backfill signup_bonus ledger rows
INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT u.id, 30, 'signup_bonus', 'Welcome bonus - 30 free credits (backfilled)'
FROM auth.users u
LEFT JOIN public.credit_transactions ct
  ON ct.user_id = u.id AND ct.type = 'signup_bonus'
WHERE ct.id IS NULL;
