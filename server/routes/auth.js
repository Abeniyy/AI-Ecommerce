const express = require('express');
const { validationResult } = require('express-validator');
const { registerRules, loginRules, verifyRules } = require('../validators/auth');
const { query } = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signJwt } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Import the functions you need from the SDKs you need
const { initializeApp } = require('firebase/app');
const { getAuth, sendSignInLinkToEmail } = require("firebase/auth");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: "ai-ecommerce-bf4bf.firebasestorage.app",
  messagingSenderId: "918376719961",
  appId: "1:918376719961:web:42ea3961b572f410a0f348",
  measurementId: "G-K4MTT1X8VG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const actionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com) for this
  // URL must be in the authorized domains list in the Firebase Console.
  url: 'localhost:5173',
  // This must be true.
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.example.ios'
  },
  android: {
    packageName: 'com.example.android',
    installApp: true,
    minimumVersion: '12'
  },
  // The domain must be configured in Firebase Hosting and owned by the project.
  linkDomain: 'localhost'
};

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
      `SELECT id, email, password_hash, role, full_name, isverified FROM public.users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await verifyPassword(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signJwt({ id: user.id, email: user.email, role: user.role, verified: user.isverified });
    delete user.password_hash;
    res.json({ token, user });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/verifyemail', verifyRules, async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email } = req.body;
  try {
    const { rows } = await query(
      'SELECT id, email, isverified FROM public.users WHERE email = $1',
      [email.toLowerCase()]
    );
    console.log(rows);
    if (rows.length === 0) return res.status(401).json({ error: 'User is not registered' });

    const user = rows[0]
    const auth = getAuth();
    sendSignInLinkToEmail(auth, user.email, actionCodeSettings)
      .then(() => {
        window.localStorage.setItem('emailForSignIn', user.email);
        console.log("Email sent!");
      })
      .catch((error) => {
        const errorMessage = error.message;
        console.log(errorMessage);
      })
      return 
  }
  catch (e) {
    console.error('Verification error:', e);
    res.status(500).json({ error: 'Verification failed' });
  }
})

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
