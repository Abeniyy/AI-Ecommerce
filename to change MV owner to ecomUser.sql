-- See current owner
SELECT matviewname, matviewowner
FROM pg_matviews
WHERE schemaname = 'public' AND matviewname = 'product_popularity_30d';

-- Make your app the owner
ALTER MATERIALIZED VIEW public.product_popularity_30d OWNER TO ecom_user;

-- Ensure read access to base tables (usually already true)
GRANT SELECT ON public.orders, public.order_items, public.products TO ecom_user;
