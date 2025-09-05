const express = require('express');
const { query } = require('../db');
const { maybeAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();
const W = { view: 1, add_to_cart: 3, purchase: 10 };

// Public logging (auth optional). Attach maybeAuth to read token if present.
router.post('/', maybeAuth, async (req, res) => {
  const { product_id, event, session_id } = req.body || {};
  const e = String(event || '').toLowerCase();
  const pid = Number(product_id);
  if (!['view','add_to_cart','purchase'].includes(e)) return res.status(400).json({ error: 'Invalid event' });
  if (!Number.isInteger(pid) || pid < 1) return res.status(400).json({ error: 'Invalid product_id' });

  try {
    await query(
      `INSERT INTO public.user_events (user_id, session_id, product_id, event, weight)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user?.id || null, session_id || null, pid, e, W[e]]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /api/events', err);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// Optional: protected batch purchase event (not required if you log in checkout)
router.post('/purchase', requireAuth, async (req, res) => {
  const { items = [], session_id } = req.body || {};
  try {
    for (const it of items) {
      const pid = Number(it.product_id);
      if (Number.isInteger(pid) && pid > 0) {
        await query(
          `INSERT INTO public.user_events (user_id, session_id, product_id, event, weight)
           VALUES ($1,$2,$3,'purchase',10)`, [req.user.id, session_id || null, pid]
        );
      }
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /api/events/purchase', err);
    res.status(500).json({ error: 'Failed to record purchase events' });
  }
});

module.exports = router;
