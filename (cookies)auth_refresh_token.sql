-- Refresh tokens table (UUID users)
CREATE TABLE IF NOT EXISTS public.auth_refresh_tokens (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  user_agent      TEXT,
  ip              TEXT,  -- keep TEXT for simplicity; you can switch to INET if you prefer
  revoked         BOOLEAN NOT NULL DEFAULT FALSE,
  replaced_by_id  BIGINT REFERENCES public.auth_refresh_tokens(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auth_refresh_tokens_user_id ON public.auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_auth_refresh_tokens_expires ON public.auth_refresh_tokens(expires_at);
