-- ============================================================================
-- AI-Ecommerce Schema (PostgreSQL 14+)
-- Safe to run multiple times (uses IF NOT EXISTS / drops triggers before create)
-- ============================================================================

-- Extensions you’ll likely want
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive text (email)
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram text search (name)

-- ----------------------------------------------------------------------------
-- Helper: touch updated_at automatically on row UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- USERS (client accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT,                                  -- null if social login
  full_name     VARCHAR(120),
  phone         VARCHAR(32),
  role          VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated ON public.users;
CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- ADDRESSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('shipping','billing')),
  line1         VARCHAR(200) NOT NULL,
  line2         VARCHAR(200),
  city          VARCHAR(80)  NOT NULL,
  state         VARCHAR(80),
  postal_code   VARCHAR(20),
  country       VARCHAR(2)   NOT NULL,                -- ISO-3166 alpha-2
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_addresses_updated ON public.addresses;
CREATE TRIGGER trg_addresses_updated
BEFORE UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- ----------------------------------------------------------------------------
-- PRODUCTS (catalog)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                         BIGSERIAL PRIMARY KEY,
  name                       VARCHAR(255) NOT NULL,
  description                TEXT,
  sku                        VARCHAR(64) UNIQUE,
  price                      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category                   VARCHAR(100),
  stock                      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  ai_recommendation_score    DOUBLE PRECISION,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
-- requires pg_trgm; speeds up name search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_products_name_trgm' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops)';
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- CARTS (one ACTIVE cart per user)  *** corrected partial uniqueness ***
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status     VARCHAR(20) NOT NULL DEFAULT 'active',  -- active|abandoned|converted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_carts_updated ON public.carts;
CREATE TRIGGER trg_carts_updated
BEFORE UPDATE ON public.carts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Partial unique index to enforce at most ONE active cart per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_carts_user_active
  ON public.carts(user_id)
  WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- CART ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id         BIGSERIAL PRIMARY KEY,
  cart_id    BIGINT NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

DROP TRIGGER IF EXISTS trg_cart_items_updated ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES public.users(id),
  status               VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|paid|shipped|completed|cancelled
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  total_amount         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  shipping_address_id  BIGINT REFERENCES public.addresses(id),
  billing_address_id   BIGINT REFERENCES public.addresses(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user   ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ----------------------------------------------------------------------------
-- ORDER ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal   NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- ----------------------------------------------------------------------------
-- REVIEWS (optional)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_review_user_product
  ON public.reviews(user_id, product_id);

-- ----------------------------------------------------------------------------
-- PRIVILEGES for app role
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO ecom_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES     IN SCHEMA public TO ecom_user;
GRANT USAGE, SELECT                ON ALL SEQUENCES  IN SCHEMA public TO ecom_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES   TO ecom_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT              ON SEQUENCES TO ecom_user;
