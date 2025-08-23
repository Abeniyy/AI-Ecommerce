const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { query, transaction } = require('../db');


const router = express.Router();


// GET /api/orders (current user orders)
router.get('/', requireAuth, async (req, res) => {
try {
const { rows } = await query(
`SELECT o.id, o.status, o.currency, o.total_amount, o.created_at
FROM public.orders o
WHERE o.user_id = $1
ORDER BY o.id DESC`,
[req.user.id]
);
res.json({ orders: rows });
} catch (e) {
console.error('GET /orders', e);
res.status(500).json({ error: 'Failed to load orders' });
}
});


// GET /api/orders/:id (details for current user's order)
router.get('/:id', requireAuth, async (req, res) => {
const id = Number(req.params.id);
try {
const head = await query(`SELECT id, status, currency, total_amount, created_at FROM public.orders WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
if (head.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
const items = await query(
`SELECT oi.product_id, p.name, oi.quantity, oi.unit_price, oi.subtotal
FROM public.order_items oi
JOIN public.products p ON p.id = oi.product_id
WHERE oi.order_id = $1
ORDER BY oi.id ASC`,
[id]
);
res.json({ order: head.rows[0], items: items.rows });
} catch (e) {
res.status(500).json({ error: 'Failed to load order' });
}
});


// POST /api/orders/checkout (convert active cart -> order)
router.post('/checkout', requireAuth, async (req, res) => {
try {
const result = await transaction(async (cx) => {
const cart = await cx.query(`SELECT id FROM public.carts WHERE user_id = $1 AND status = 'active'`, [req.user.id]);
if (cart.rowCount === 0) throw new Error('No active cart');
const cartId = cart.rows[0].id;


const items = await cx.query(
`SELECT ci.product_id, ci.quantity, ci.unit_price
FROM public.cart_items ci WHERE ci.cart_id = $1`,
[cartId]
);
if (items.rowCount === 0) throw new Error('Cart is empty');


const totals = await cx.query(
`SELECT COALESCE(SUM(quantity * unit_price),0)::numeric(12,2) AS total
FROM public.cart_items WHERE cart_id = $1`, [cartId]
);
const total = totals.rows[0].total;


const order = await cx.query(
`INSERT INTO public.orders (user_id, status, currency, total_amount)
VALUES ($1,'pending','USD',$2) RETURNING id, status, total_amount, created_at`,
[req.user.id, total]
);
const orderId = order.rows[0].id;


// snapshot items
for (const it of items.rows) {
await cx.query(
`INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES ($1,$2,$3,$4)`, [orderId, it.product_id, it.quantity, it.unit_price]
);
}


// mark cart converted + clear items
await cx.query(`UPDATE public.carts SET status = 'converted', updated_at = NOW() WHERE id = $1`, [cartId]);
await cx.query(`DELETE FROM public.cart_items WHERE cart_id = $1`, [cartId]);

      return { orderId, total };
    });

    // Fetch the complete order details to return
    const { rows } = await query(
      `SELECT id, status, currency, total_amount, created_at 
       FROM public.orders WHERE id = $1`,
      [result.orderId]
    );
    res.status(201).json({ order: rows[0] });
  } catch (e) {
    console.error('POST /checkout', e);
    res.status(400).json({ error: e.message });
  }
});
module.exports = router;
