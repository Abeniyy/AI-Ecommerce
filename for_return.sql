-- Customer-initiated return requests
CREATE TABLE IF NOT EXISTS public.order_returns (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested','approved','rejected','canceled','received','refunded')),
  reason        TEXT,
  items         JSONB, -- optional per-item quantities: [{order_item_id, quantity}]
  refund_amount NUMERIC(12,2) DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_order_returns_order_id ON public.order_returns(order_id);
