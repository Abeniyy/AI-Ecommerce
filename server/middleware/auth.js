const { verifyJwt } = require('../utils/jwt');

// Middleware to enforce authentication - rejects requests without valid token
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  
  try {
    const payload = verifyJwt(token);
    req.user = payload; // Attach user payload to request object
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to restrict access to admin users only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

// Optional authentication - attaches user if valid token exists, but doesn't require it
function maybeAuth(req, _res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  
  if (!token) return next();
  
  try { 
    req.user = verifyJwt(token); // Attach user if token is valid
  } catch (e) {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}

module.exports = { requireAuth, requireAdmin, maybeAuth };