const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query } = require('../db');


const router = express.Router();


// GET /api/admin/metrics
router.get('/metrics', requireAuth, requireAdmin, async (_req, res) => {
try {
const [{ rows: prods }, { rows: users }, { rows: orders }, { rows: rev }] = await Promise.all([
query(`SELECT COUNT(*)::int AS n FROM public.products`),
query(`SELECT COUNT(*)::int AS n FROM public.users`),
query(`SELECT COUNT(*)::int AS n FROM public.orders`),
query(`SELECT COALESCE(SUM(total_amount),0)::numeric(12,2) AS total FROM public.orders WHERE status IN ('paid','shipped','completed')`)
]);
res.json({ products: prods[0].n, users: users[0].n, orders: orders[0].n, revenue: rev[0].total });
} catch (e) {
console.error('GET /admin/metrics', e);
res.status(500).json({ error: 'Failed to load metrics' });
}
});


// GET /api/admin/orders
router.get('/orders', requireAuth, requireAdmin, async (_req, res) => {
try {
const { rows } = await query(
`SELECT o.id, o.status, o.total_amount, o.created_at, u.email
FROM public.orders o
JOIN public.users u ON u.id = o.user_id
ORDER BY o.id DESC`
);
res.json({ orders: rows });
} catch (e) {
res.status(500).json({ error: 'Failed to load orders' });
}
});


// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
const id = Number(req.params.id);
const status = String(req.body.status || '').toLowerCase();
const allowed = ['pending','paid','shipped','completed','cancelled'];
if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
try {
const r = await query(`UPDATE public.orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
if (r.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
res.json({ ok: true });
} catch (e) {
res.status(500).json({ error: 'Failed to update status' });
}
});


// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (_req, res) => {
try {
const { rows } = await query(`SELECT id, email, full_name, role, created_at FROM public.users ORDER BY created_at DESC LIMIT 200`);
res.json({ users: rows });
} catch (e) {
res.status(500).json({ error: 'Failed to load users' });
}
});


module.exports = router;