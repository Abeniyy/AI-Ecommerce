const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const { query, checkConnection, shutdown } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:3001';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

// sanity log to prove the right file is running
console.log('▶️  server entry:', __filename);

// --- health includes DB check ---
app.get('/api/health', async (_req, res) => {
  const ok = await checkConnection();
  res.json({ status: ok ? 'ok' : 'error', service: 'server', db: ok ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

// --- explicit DB test route ---
app.get('/api/test-db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- products from Postgres ---
app.get('/api/products', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, price, category, ai_recommendation_score
       FROM public.products
       ORDER BY id ASC`
    );
    const products = rows.map(r => ({
      id: r.id, name: r.name, price: r.price,
      category: r.category, tags: r.category ? [r.category] : [],
      ai_recommendation_score: r.ai_recommendation_score
    }));
    res.json({ products });
  } catch (e) {
    console.error('GET /api/products error:', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// --- ML proxy with DB fallback ---
app.get('/api/recommendations', async (req, res) => {
  const userId = req.query.user_id || 'demo';
  try {
    const { data } = await axios.get(`${ML_SERVICE_URL}/recommend`, { params: { user_id: userId } });
    res.json(data);
  } catch (err) {
    console.error('ML service error:', err.message);
    try {
      const { rows } = await query(
        `SELECT id, name, COALESCE(ai_recommendation_score, 0.5) AS score
         FROM public.products
         ORDER BY score DESC, id ASC
         LIMIT 5`
      );
      res.json({ source: 'fallback-db', recommendations: rows.map(r => ({ id: r.id, name: r.name, score: Number(r.score) })) });
    } catch {
      res.json({ source: 'fallback-static', recommendations: [] });
    }
  }
});

const server = app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
const stop = async () => { console.log('\nShutting down...'); server.close(async () => { await shutdown(); process.exit(0); }); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
