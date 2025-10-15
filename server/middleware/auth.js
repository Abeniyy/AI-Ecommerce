const { verifyJwt } = require('../utils/jwt');

// Extract JWT from Authorization header or HttpOnly cookie
function extractToken(req) {
  const hdr = req.headers.authorization || '';
  const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  const cookieTok = req.cookies?.access_token || null;
  return { bearer, cookieTok };
}

// Strict auth: required
function requireAuth(req, res, next) {
  const { bearer, cookieTok } = extractToken(req);
  let token = bearer || cookieTok;

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = verifyJwt(token);
    return next();
  } catch (e1) {
    // If header failed and a cookie exists, try cookie as fallback
    if (bearer && cookieTok) {
      try {
        req.user = verifyJwt(cookieTok);
        return next();
      } catch (e2) {}
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin-only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Optional auth: attach user if valid, ignore otherwise
function maybeAuth(req, _res, next) {
  const { bearer, cookieTok } = extractToken(req);
  const candidates = [bearer, cookieTok].filter(Boolean);

  for (const tok of candidates) {
    try {
      req.user = verifyJwt(tok);
      break;
    } catch (_) {
      // ignore and try next
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, maybeAuth };
