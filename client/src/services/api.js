import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Send cookies (for /auth/refresh)
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// ---- Access token in memory (mirrored to localStorage) ----
let accessToken = localStorage.getItem('token') || null;
export function setInitialAccessFromStorage() {
  accessToken = localStorage.getItem('token') || null;
}
function setAccess(token) {
  accessToken = token;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

// Attach Authorization header if present
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- One-flight refresh with request queue ----
let refreshPromise = null;
const queue = [];

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/auth/refresh')
      .then(({ data }) => {
        setAccess(data.token);
        return data.token;
      })
      .catch((e) => {
        setAccess(null);
        throw e;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;
    const url = config?.url || '';

    if (status !== 401) throw error;

    // Don’t recurse on these
    if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh')) {
      throw error;
    }

    // Queue this request while we refresh
    const replay = new Promise((resolve, reject) => queue.push({ resolve, reject, config }));

    try {
      await refreshAccessToken();

      // Retry all queued requests with fresh token
      while (queue.length) {
        const { resolve, config: cfg } = queue.shift();
        const retryCfg = {
          ...cfg,
          headers: { ...(cfg.headers || {}), Authorization: `Bearer ${accessToken}` },
        };
        resolve(api.request(retryCfg));
      }
      return replay;
    } catch (e) {
      // Flush the queue with errors
      while (queue.length) {
        const { reject } = queue.shift();
        reject(error);
      }
      // If this wasn’t /auth/me, navigate to login preserving destination
      if (!url.includes('/api/auth/me')) {
        const to = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?from=${to}`);
      }
      throw error;
    }
  }
);

