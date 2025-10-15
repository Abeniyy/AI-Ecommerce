const admin = require('firebase-admin');

function getPrivateKey() {
  const b64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (b64 && b64.trim()) {
    try {
      return Buffer.from(b64.trim(), 'base64').toString('utf8');
    } catch {
      console.warn('FIREBASE_PRIVATE_KEY_BASE64 provided but could not be decoded. Falling back to FIREBASE_PRIVATE_KEY.');
    }
  }
  // Allow \n escaping in .env
  return (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Firebase Admin credentials are missing. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY_BASE64).'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Firebase Admin initialized for project:', projectId || '(unknown)');
  }
}

module.exports = { admin };
