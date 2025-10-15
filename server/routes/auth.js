const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { admin } = require('../firebaseAdmin');
const { validationResult } = require('express-validator');
const { registerRules, loginRules, verifyRules } = require('../validators/auth');
const { query } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signJwt } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
require('dotenv').config();

const {
  createRefreshSession,
  rotateRefreshSession,
  revokeByCookie,
  COOKIE_NAME,
} = require('../lib/refresh');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(helmet());
router.use(generalLimiter);

const sanitizeEmail = (req, _res, next) => {
  if (req.body.email) {
    req.body.email = req.body.email.toLowerCase().trim().substring(0, 255);
  }
  next();
};

router.post('/register', authLimiter, sanitizeEmail, registerRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name, phone } = req.body;

  if (password && password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const existing = await query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO public.users (email, password_hash, full_name, phone, role, isverified)
      VALUES ($1,$2,$3,$4,'customer',false)
      RETURNING id, email, full_name, phone, role, isverified`,
      [email, hash, full_name || null, phone || null]
    );

    const user = rows[0];

    await createRefreshSession(user.id, req.headers['user-agent'], req.ip, res);

    const token = signJwt({ id: user.id, email: user.email, role: user.role });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        isverified: user.isverified,
      },
      message: 'Registration successful',
    });
  } catch (e) {
    console.error('Registration error:', e.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, sanitizeEmail, loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const { rows } = await query(
      `SELECT id, email, password_hash, role, full_name, isverified FROM public.users WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await verifyPassword(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.isverified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    await createRefreshSession(user.id, req.headers['user-agent'], req.ip, res);

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.isverified,
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    const userResponse = { ...user };
    delete userResponse.password_hash;

    res.json({
      user: userResponse,
      message: 'Login successful',
    });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/firebase-login', authLimiter, async (req, res) => {
  try {
    const { idToken, full_name, phone } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        error: 'Missing idToken',
        code: 'auth/missing-id-token',
      });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      const code = e?.code || 'auth/invalid-id-token';
      const friendly =
        code === 'auth/argument-error' ? 'Invalid ID token payload' :
        code === 'auth/invalid-project-id' ? 'Server Firebase project is misconfigured' :
        code === 'auth/invalid-credential' ? 'Server service account credential is invalid' :
        code === 'auth/id-token-expired' ? 'ID token expired, please sign in again' :
        'Invalid Firebase ID token';
      return res.status(401).json({ error: friendly, code });
    }

    const email = decoded.email;
    const emailVerified = !!decoded.email_verified;

    if (!email) {
      return res.status(400).json({
        error: 'Firebase token did not include an email',
        code: 'auth/missing-email',
      });
    }

    const upsert = await query(
      `INSERT INTO public.users (email, full_name, phone, role, isverified)
      VALUES ($1, $2, $3, 'customer', $4)
      ON CONFLICT (email) DO UPDATE
        SET full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
            phone     = COALESCE(EXCLUDED.phone,     public.users.phone),
            isverified = public.users.isverified OR EXCLUDED.isverified
      RETURNING id, email, full_name, phone, role, isverified`,
      [email.toLowerCase(), full_name || null, phone || null, emailVerified]
    );
    const user = upsert.rows[0];

    await createRefreshSession(user.id, req.headers['user-agent'], req.ip, res);

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      verified: user.isverified,
    });

    // ✅ Make cookie-based auth work exactly like /login
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    // Keep token in body for backward compatibility with your client
    return res.json({ token, user });
  } catch (e) {
    console.error('firebase-login error:', e);
    return res.status(500).json({
      error: 'Login failed on server. Check server logs for details.',
      code: 'auth/server-error',
    });
  }
});

router.post('/verifyemail', authLimiter, sanitizeEmail, verifyRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const { rows } = await query(
      'SELECT id, email, isverified FROM public.users WHERE email = $1',
      [email]
    );

    // Intentional: don’t reveal whether user exists
    if (rows.length === 0) {
      return res.json({ message: 'If the email exists, a verification link has been sent' });
    }

    const user = rows[0];
    console.log(`Verification email would be sent to: ${user.email}`);
    res.json({ message: 'If the email exists, a verification link has been sent' });
  } catch (e) {
    console.error('Verification error:', e.message);
    res.status(500).json({ error: 'Verification process failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, created_at, isverified FROM public.users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('Profile fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/refresh', generalLimiter, async (req, res) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    const r = await rotateRefreshSession(raw, req.headers['user-agent'], req.ip, res);
    if (!r) return res.status(401).json({ error: 'Invalid refresh' });

    const { rows } = await query(
      `SELECT id, email, role, isverified FROM public.users WHERE id = $1`,
      [r.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });

    const token = signJwt({
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role,
      verified: rows[0].isverified,
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: 'Token refreshed successfully' });
  } catch (e) {
    console.error('Refresh error:', e.message);
    return res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/logout', generalLimiter, async (req, res) => {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    await revokeByCookie(raw, res);
    res.clearCookie('access_token');
    res.clearCookie(COOKIE_NAME);
    return res.json({ ok: true, message: 'Logged out successfully' });
  } catch (e) {
    console.error('Logout error:', e.message);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
