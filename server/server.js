require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const { query, checkConnection } = require('./db');

const { requireAuth, requireAdmin, maybeAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/carts');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');

const app = express();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// events first if you like
app.use('/api/events', eventRoutes);

// Health + DB ping
app.get('/api/health', async (_req, res) => {
  const ok = await checkConnection();
  res.json({
    status: ok ? 'ok' : 'error',
    db: ok ? 'connected' : 'disconnected',
    time: new Date().toISOString()
  });
});

app.get('/api/test-db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// smarter recommendations; try ML, else popularity, else score
app.get('/api/recommendations', maybeAuth, async (req, res) => {
  const userId = req.user?.id || null;
  const sessionId = req.query.session_id || null;

  // 1) ML service first
  try {
    const { data } = await axios.get(`${ML_SERVICE_URL}/recommend`, {
      params: { user_id: userId || `anon:${sessionId || 'none'}`, k: 8 }
    });
    return res.json({ source: 'ml', ...data });
  } catch (e) {
    console.warn('ML unavailable, fallback:', e.message);
  }

  // 2) Popularity (last 30d)
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

// Feature routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
