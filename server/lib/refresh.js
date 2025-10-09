const crypto = require('crypto');
const { query } = require('../db');

const COOKIE_NAME = 'refresh_token';
const COOKIE_SECURE = (process.env.NODE_ENV === 'production');

// Helpers
const DAYS = (n) => n * 24 * 60 * 60 * 1000;

/**
 * Parse TTL env values safely.
 * Accepts:
 *  - integer milliseconds: "2592000000"
 *  - with units: "30d", "12h", "45m", "900s", "600000ms"
 */
function parseTtlMs(val, fallbackMs) {
  if (val == null || val === '') return fallbackMs;

  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val : fallbackMs;
  }

  const s = String(val).trim().toLowerCase();
  // plain integer (milliseconds)
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : fallbackMs;
  }

  // number + optional unit
  const m = s.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!m) return fallbackMs;

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return fallbackMs;

  const unit = m[2];
  const mult =
    unit === 'ms' ? 1 :
    unit === 's'  ? 1000 :
    unit === 'm'  ? 60 * 1000 :
    unit === 'h'  ? 60 * 60 * 1000 :
    /* d */         24 * 60 * 60 * 1000;

  return n * mult;
}

// Default to 30 days if not provided or invalid
const REFRESH_TTL_MS = parseTtlMs(process.env.REFRESH_TTL_MS, DAYS(30));

function safeExpiresAt() {
  const ms = Date.now() + REFRESH_TTL_MS;
  if (!Number.isFinite(REFRESH_TTL_MS) || !Number.isFinite(ms)) {
    throw new Error('Invalid REFRESH_TTL_MS configuration');
  }
  const d = new Date(ms);
  if (isNaN(d.getTime())) throw new Error('Invalid expires_at computed from REFRESH_TTL_MS');
  return d;
}

/** Generate an opaque token and its sha256 hash */
function makeToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('base64url');
  return { raw, hash };
}

function setCookie(res, rawToken) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/api/auth/refresh', // cookie only sent to refresh endpoint
    maxAge: REFRESH_TTL_MS,
  });
}

async function createRefreshSession(userId, ua, ip, res) {
  const { raw, hash } = makeToken();
  const expiresAt = safeExpiresAt();
  await query(
    `INSERT INTO public.auth_refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hash, ua || null, ip || null, expiresAt]
  );
  setCookie(res, raw);
}

async function rotateRefreshSession(rawToken, ua, ip, res) {
  if (!rawToken) return null;
  const hash = crypto.createHash('sha256').update(rawToken).digest('base64url');

  // find valid token
  const cur = await query(
    `SELECT id, user_id, revoked, expires_at
       FROM public.auth_refresh_tokens
      WHERE token_hash = $1`,
    [hash]
  );
  if (cur.rowCount === 0) return null;

  const t = cur.rows[0];
  if (t.revoked || new Date(t.expires_at) < new Date()) return null;

  // rotate: create new, revoke old, link
  const { raw, hash: newHash } = makeToken();
  const expiresAt = safeExpiresAt();
  const ins = await query(
    `INSERT INTO public.auth_refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [t.user_id, newHash, ua || null, ip || null, expiresAt]
  );
  await query(
    `UPDATE public.auth_refresh_tokens
        SET revoked = TRUE, replaced_by_id = $2
      WHERE id = $1`,
    [t.id, ins.rows[0].id]
  );
  setCookie(res, raw);
  return { userId: t.user_id };
}

async function revokeByCookie(rawToken, res) {
  if (!rawToken) return;
  // ✅ fixed: use rawToken and close parentheses
  const hash = crypto.createHash('sha256').update(rawToken).digest('base64url');
  await query(
    `UPDATE public.auth_refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
    [hash]
  );
  res.clearCookie(COOKIE_NAME, { path: '/api/auth/refresh' });
}

module.exports = {
  COOKIE_NAME,
  createRefreshSession,
  rotateRefreshSession,
  revokeByCookie,
};
