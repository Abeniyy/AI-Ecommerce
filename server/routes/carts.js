const express = require('express');
const { validationResult } = require('express-validator');
const { upsertItemRules, productIdParam } = require('../validators/carts');
const { query, transaction } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get (or create) active cart with items
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    let cart = await query(`SELECT id, status, created_at FROM public.carts WHERE user_id = $1 AND status = 'active'`, [userId]);
    if (cart.rowCount === 0) {
      cart = await query(`INSERT INTO public.carts (user_id, status) VALUES ($1,'active') RETURNING id, status, created_at`, [userId]);
    }
    const cartId = cart.rows[0].id;
    const items = await query(
      `SELECT ci.product_id, p.name, ci.quantity, ci.unit_price,
              (ci.quantity * ci.unit_price)::numeric(12,2) AS line_total
         FROM public.cart_items ci
         JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.id ASC`, [cartId]
    );
    const totals = await query(
      `SELECT COALESCE(SUM(quantity * unit_price),0)::numeric(12,2) AS total
         FROM public.cart_items WHERE cart_id = $1`, [cartId]
    );
    res.json({ cart: { id: cartId, status: 'active' }, items: items.rows, total: totals.rows[0].total });
  } catch (e) {
    console.error('GET /cart', e);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

// Add/update item
router.post('/items', requireAuth, upsertItemRules, async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  try {
    const out = await transaction(async (cx) => {
      // Ensure active cart
      let cart = await cx.query(`SELECT id FROM public.carts WHERE user_id = $1 AND status = 'active'`, [userId]);
      if (cart.rowCount === 0) {
        cart = await cx.query(`INSERT INTO public.carts (user_id, status) VALUES ($1,'active') RETURNING id`, [userId]);
      }
      const cartId = cart.rows[0].id;

      // Load current price to snapshot as unit_price
      const prod = await cx.query(`SELECT price FROM public.products WHERE id = $1`, [product_id]);
      if (prod.rowCount === 0) throw new Error('Product not found');

      // Upsert item
      const existing = await cx.query(
        `SELECT id, quantity FROM public.cart_items WHERE cart_id = $1 AND product_id = $2`,
        [cartId, product_id]
      );
      if (existing.rowCount === 0) {
        await cx.query(
          `INSERT INTO public.cart_items (cart_id, product_id, quantity, unit_price)
           VALUES ($1,$2,$3,$4)`, [cartId, product_id, quantity, prod.rows[0].price]
        );
      } else {
        await cx.query(
          `UPDATE public.cart_items SET quantity = $1, unit_price = $2, updated_at = NOW()
           WHERE id = $3`, [quantity, prod.rows[0].price, existing.rows[0].id]
        );
      }
      return cartId;
    });

    // Return updated cart
    const items = await query(
      `SELECT ci.product_id, p.name, ci.quantity, ci.unit_price,
              (ci.quantity * ci.unit_price)::numeric(12,2) AS line_total
         FROM public.cart_items ci
         JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.id ASC`, [out]
    );
    const totals = await query(
      `SELECT COALESCE(SUM(quantity * unit_price),0)::numeric(12,2) AS total
         FROM public.cart_items WHERE cart_id = $1`, [out]
    );
    res.status(201).json({ cart: { id: out, status: 'active' }, items: items.rows, total: totals.rows[0].total });
  } catch (e) {
    console.error('POST /cart/items', e);
    res.status(500).json({ error: e.message || 'Failed to add item' });
  }
});

// Change quantity
router.put('/items/:productId', requireAuth, productIdParam, async (req, res) => {
  const productId = Number(req.params.productId);
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'quantity must be >= 1' });

  try {
    const userId = req.user.id;
    const cart = await query(`SELECT id FROM public.carts WHERE user_id = $1 AND status = 'active'`, [userId]);
    if (cart.rowCount === 0) return res.status(404).json({ error: 'No active cart' });

    const cartId = cart.rows[0].id;
    const prod = await query(`SELECT price FROM public.products WHERE id = $1`, [productId]);
    if (prod.rowCount === 0) return res.status(404).json({ error: 'Product not found' });

    const r = await query(
      `UPDATE public.cart_items SET quantity = $1, unit_price = $2, updated_at = NOW()
       WHERE cart_id = $3 AND product_id = $4`,
      [qty, prod.rows[0].price, cartId, productId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Item not in cart' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Remove item
router.delete('/items/:productId', requireAuth, productIdParam, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    const userId = req.user.id;
    const cart = await query(`SELECT id FROM public.carts WHERE user_id = $1 AND status = 'active'`, [userId]);
    if (cart.rowCount === 0) return res.status(404).json({ error: 'No active cart' });
    const cartId = cart.rows[0].id;

    const r = await query(`DELETE FROM public.cart_items WHERE cart_id = $1 AND product_id = $2`, [cartId, productId]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Item not in cart' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

module.exports = router;
