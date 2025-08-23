const express = require('express');
const { validationResult } = require('express-validator');
const { listRules, createRules, idParam } = require('../validators/products');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products?search=&category=&page=&page_size=
router.get('/', listRules, async (req, res) => {
  const { search = '', category, page = 1, page_size = 12 } = req.query;
  const p = Number(page) || 1;
  const ps = Math.min(Number(page_size) || 12, 100);
  const off = (p - 1) * ps;

  const clauses = [];
  const params = [];
  let i = 1;

  if (search) { clauses.push(`(name ILIKE $${i} OR sku ILIKE $${i})`); params.push(`%${search}%`); i++; }
  if (category) { clauses.push(`category = $${i}`); params.push(category); i++; }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const { rows } = await query(
      `SELECT id, name, price, category, stock, sku, ai_recommendation_score
       FROM public.products
       ${where}
       ORDER BY id ASC
       LIMIT ${ps} OFFSET ${off}`
    , params);
    const count = await query(`SELECT COUNT(*)::int AS total FROM public.products ${where}`, params);
    res.json({ products: rows, page: p, page_size: ps, total: count.rows[0].total });
  } catch (e) {
    console.error('GET /products', e);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', idParam, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rows } = await query(
      `SELECT id, name, description, sku, price, category, stock, ai_recommendation_score
       FROM public.products WHERE id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin: create
router.post('/', requireAuth, requireAdmin, createRules, async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description, sku, price, category, stock = 0 } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO public.products (name, description, sku, price, category, stock)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, price, category, stock, sku`,
      [name, description || null, sku || null, price, category || null, stock]
    );
    res.status(201).json({ product: rows[0] });
  } catch (e) {
    if (String(e.message).includes('duplicate key value violates unique constraint') && String(e.message).includes('sku'))
      return res.status(409).json({ error: 'SKU already exists' });
    console.error('POST /products', e);
    res.status(500).json({ error: 'Create failed' });
  }
});

// Admin: update
router.put('/:id', requireAuth, requireAdmin, idParam, async (req, res) => {
  const id = Number(req.params.id);
  const fields = ['name','description','sku','price','category','stock'];
  const sets = [];
  const params = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(req.body[f]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);
  try {
    const { rows } = await query(
      `UPDATE public.products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: rows[0] });
  } catch (e) {
    console.error('PUT /products/:id', e);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Admin: delete
router.delete('/:id', requireAuth, requireAdmin, idParam, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const r = await query(`DELETE FROM public.products WHERE id = $1`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
