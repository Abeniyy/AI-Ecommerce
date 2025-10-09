-- Prevent double-processing of Stripe events (idempotency for webhooks)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);