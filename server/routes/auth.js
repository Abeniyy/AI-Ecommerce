const express = require('express');
const { validationResult } = require('express-validator');
const { registerRules, loginRules } = require('../validators/auth');
const { query } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signJwt } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerRules, async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name } = req.body;
  try {
    const existing = await query('SELECT id FROM public.users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO public.users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,'customer') RETURNING id, email, full_name, role`,
      [email.toLowerCase(), hash, full_name || null]
    );

    const user = rows[0];
    const token = signJwt({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user });
  } catch (e) {
    console.error('register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const { rows } = await query(
      `SELECT id, email, password_hash, role, full_name FROM public.users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await verifyPassword(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ id: user.id, email: user.email, role: user.role });
    delete user.password_hash;
    res.json({ token, user });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, created_at FROM public.users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
