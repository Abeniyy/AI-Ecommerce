require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const { query, checkConnection } = require('./db');
// auto-refresh popularity MV every 15 minutes
setInterval(() => {
  query('REFRESH MATERIALIZED VIEW public.product_popularity_30d')
    .catch(err => console.warn('popularity MV refresh skipped:', err.message));
}, 5 * 60 * 1000);

const { maybeAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/carts');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const adminReturnRoutes = require('./routes/admin.returns');

const cookieParser = require('cookie-parser');

const { router: paymentsRouter, stripeWebhook } = require('./routes/payments');

//background reconciler
const { startStripeReconciler } = require('./jobs/stripeReconcile');

const app = express();

app.use(cookieParser());

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// app.set('trust proxy', true);

  // Safer defaults: trust loopback in dev; single proxy in prod | Won't work now b/c trust proxy is commented out
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', 'loopback');
  }

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));

// Parse JSON for all normal routes (NOT the webhook)
app.use(express.json());

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  })
);

app.get('/api/test-db', async (_req, res) => {
  try {
    const ok = await checkConnection();
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);

// Stripe payments (create checkout session, etc.)
app.use('/api/payments', paymentsRouter);

app.use('/api/admin/returns', adminReturnRoutes);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
app.get('/api/recommendations', maybeAuth, async (req, res) => {
  const userId = req.user?.id || null;
  const sessionId = req.query.session_id || null;

  // 1) Try ML service
  if (ML_SERVICE_URL) {
    try {
      const { data } = await axios.get(`${ML_SERVICE_URL}/recommend`, {
        params: { user_id: userId || `anon:${sessionId || 'none'}`, k: 8 },
        timeout: 2500,
      });
      return res.json({ source: 'ml', ...data });
    } catch (e) {
      console.warn('ML unavailable, falling back:', e.message);
    }
  }

  // 2) Popularity (30d)
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.price, COALESCE(pop.score,0) AS score
         FROM public.products p
         LEFT JOIN public.product_popularity_30d pop ON pop.product_id = p.id
        ORDER BY pop.score DESC NULLS LAST, p.id ASC
        LIMIT 8`
    );
    return res.json({ source: 'db-popular', recommendations: rows });
  } catch (e) {
    console.error('popularity fallback failed:', e);
  }

  // 3) Static score
  const { rows } = await query(
    `SELECT id, name, price, COALESCE(ai_recommendation_score, 0.5) AS score
       FROM public.products
      ORDER BY ai_recommendation_score DESC NULLS LAST, id ASC
      LIMIT 8`
  );
  res.json({ source: 'db-score', recommendations: rows });
});

// 404 for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

// Start server
const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // ✅ Start Stripe reconciliation worker
  startStripeReconciler();
});

module.exports = app;