/* ============================================================================
   E-commerce: Track user interactions + 30-day rolling product popularity
   - Supports anonymous users via session_id (user_id nullable)
   - Events: view / add_to_cart / purchase
   - Weighted scoring: view=1, add_to_cart=3, purchase=10
   - Indexes optimized for most common reads by user, session, product (newest first)
   - Materialized view aggregates 30-day popularity; refresh on your schedule
   ============================================================================ */

-- Track user interactions (anonymous allowed via session_id)
CREATE TABLE IF NOT EXISTS public.user_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,                                   -- nullable if anonymous
  session_id  TEXT,                                   -- client-generated id
  product_id  BIGINT NOT NULL
                 REFERENCES public.products(id) ON DELETE CASCADE,
  event       TEXT NOT NULL
                 CHECK (event IN ('view','add_to_cart','purchase')),
  weight      INT  NOT NULL,                          -- view=1, add_to_cart=3, purchase=10
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Read-path indexes (order by newest)
CREATE INDEX IF NOT EXISTS idx_ev_user     ON public.user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ev_session  ON public.user_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ev_product  ON public.user_events(product_id, created_at DESC);

-- Rolling popularity over 30d (materialized; refresh when needed)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.product_popularity_30d AS
SELECT product_id, SUM(weight)::int AS score
FROM public.user_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY product_id;

-- Rank by score descending
CREATE INDEX IF NOT EXISTS idx_pop30d_score ON public.product_popularity_30d(score DESC);

-- grant to app role
GRANT SELECT ON public.product_popularity_30d TO ecom_user;

