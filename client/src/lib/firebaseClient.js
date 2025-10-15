import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

function envTrim(name) {
  const v = import.meta.env[name];
  return typeof v === 'string' ? v.trim() : v;
}

const config = {
  apiKey: envTrim('VITE_FIREBASE_API_KEY'),
  authDomain: envTrim('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: envTrim('VITE_FIREBASE_PROJECT_ID'),
  appId: envTrim('VITE_FIREBASE_APP_ID'),
};

// Basic validation to catch silent misconfigurations
const missing = Object.entries(config)
  .filter(([_, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `Firebase config missing: ${missing.join(', ')}. ` +
    `Check client/.env and restart Vite (env is loaded at startup).`
  );
}

const app = initializeApp(config);
export const fbAuth = getAuth(app);

// optional but helpful at debug time
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('Firebase app options:', app.options);
}
