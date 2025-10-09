const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

/** Small helper to enforce admin role after requireAuth */
function requireAdminRole(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/**
 * GET /api/admin/returns
 * Query params:
 *  - status: requested|approved|rejected|canceled|received|refunded (optional)
 *  - q: free text on order_id or user email (optional)
 *  - page, page_size
 */
router.get('/', requireAuth, requireAdminRole, async (req, res) => {
  const { status, q } = req.query || {};
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.page_size || '20', 10), 1), 100);
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];
  let i = 1;

  if (status) {
    where.push(`r.status = $${i++}`);
    params.push(status);
  }
  if (q) {
    where.push(`(CAST(r.order_id AS TEXT) ILIKE $${i} OR u.email ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT r.id, r.order_id, r.status, r.reason, r.refund_amount,
           r.created_at, r.updated_at,
           u.id AS user_id, u.email, COALESCE(u.full_name, '') AS full_name,
           o.total_amount
      FROM public.order_returns r
      JOIN public.orders o ON o.id = r.order_id
      JOIN public.users u ON u.id = o.user_id
      ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}
  `;

  const totalSql = `
    SELECT COUNT(*)::int AS total
      FROM public.order_returns r
      JOIN public.orders o ON o.id = r.order_id
      JOIN public.users u ON u.id = o.user_id
      ${whereSql}
  `;

  const [rowsRes, totalRes] = await Promise.all([
    query(sql, params, { readOnly: true }),
    query(totalSql, params, { readOnly: true }),
  ]);

  res.json({
    returns: rowsRes.rows,
    page,
    page_size: pageSize,
    total: totalRes.rows[0].total,
  });
});

/**
 * GET /api/admin/returns/:id
 * Details for a single return request (+ order items)
 */
router.get('/:id', requireAuth, requireAdminRole, async (req, res) => {
  const id = req.params.id;

  const r = await query(
    `SELECT r.id, r.order_id, r.status, r.reason, r.items, r.refund_amount,
            r.created_at, r.updated_at,
            u.id AS user_id, u.email, COALESCE(u.full_name,'') AS full_name,
            o.total_amount, o.currency, o.status AS order_status
       FROM public.order_returns r
       JOIN public.orders o ON o.id = r.order_id
       JOIN public.users u ON u.id = o.user_id
      WHERE r.id = $1`,
    [id],
    { readOnly: true }
  );
  if (r.rowCount === 0) return res.status(404).json({ error: 'Return not found' });

  const items = await query(
    `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.unit_price
       FROM public.order_items oi
       JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id`,
    [r.rows[0].order_id],
    { readOnly: true }
  );

  res.json({ return_request: r.rows[0], order_items: items.rows });
});

/**
 * PATCH /api/admin/returns/:id
 * Body: { status, refund_amount? }
 * Allowed statuses: requested|approved|rejected|canceled|received|refunded
 * Notes:
 *  - Only allow status transitions within the set above.
 *  - If setting status 'refunded', you may include refund_amount (record-keeping).
 *    (Actual Stripe refund handling can be added later.)
 */
router.patch('/:id', requireAuth, requireAdminRole, async (req, res) => {
  const id = req.params.id;
  const { status, refund_amount } = req.body || {};

  const allowed = new Set(['requested','approved','rejected','canceled','received','refunded']);
  if (!status || !allowed.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const params = [status, id];
  let sql = `UPDATE public.order_returns
                SET status = $1, updated_at = NOW()`;

  if (status === 'refunded') {
    const amt = refund_amount == null ? 0 : Number(refund_amount);
    sql += `, refund_amount = ${isNaN(amt) ? 0 : amt}`;
  }

  sql += ` WHERE id = $2 RETURNING id, order_id, status, refund_amount, updated_at`;

  const r = await query(sql, params);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Return not found' });

  res.json({ ok: true, return_request: r.rows[0] });
});

module.exports = router;
