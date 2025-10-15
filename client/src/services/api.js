import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Send cookies (for /auth/refresh and HttpOnly token cookies)
export const api = axios.create({
  baseURL,
  withCredentials: true, // enable cookie sending for HttpOnly tokens
});

// ---- Access token in memory (for backward compatibility during transition) ----
let accessToken = localStorage.getItem('token') || null;

export function setInitialAccessFromStorage() {
  accessToken = localStorage.getItem('token') || null;
  // Set Authorization header for backward compatibility during transition
  if (accessToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

function setAccess(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}

// Request interceptor - handles both cookie and header token approaches
api.interceptors.request.use((config) => {
  // If we have an accessToken in memory, use it (backward compatibility)
  if (accessToken && !config.url?.includes('/api/auth/refresh')) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- One-flight refresh with request queue (Enhanced for cookie support) ----
let refreshPromise = null;
const queue = [];

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/auth/refresh')
      .then(({ data }) => {
        // New format: token in HttpOnly cookie; Old format: { token }
        if (data.token) {
          setAccess(data.token); // header-based (legacy)
        } else {
          setAccess(null);       // cookie-based (no header)
        }
        return data.token || 'cookie-based';
      })
      .catch((e) => {
        setAccess(null);
        throw e;
      })
      .finally(() => { 
        refreshPromise = null; 
      });
  }
  return refreshPromise;
}

// response interceptor with smart token refresh and security
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;
    const url = config?.url || '';

    // Don't intercept non-401 errors or auth endpoint errors
    if (status !== 401) throw error;
    if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/logout')) {
      throw error;
    }

    // Cookie-based mode: no header token; redirect to login
    const isUsingCookies = !accessToken || accessToken === 'cookie-based';
    if (isUsingCookies) {
      if (!url.includes('/api/auth/me')) {
        const to = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?from=${to}`);
      }
      throw error;
    }

    // ---- Legacy token refresh logic (header-based) ----
    const replay = new Promise((resolve, reject) => {
      if (config) {
        queue.push({ resolve, reject, config });
      }
    });

    try {
      await refreshAccessToken();

      const currentTokenState = accessToken === 'cookie-based' ? 'cookie' : 'header';
      while (queue.length) {
        const { resolve, config: cfg } = queue.shift();
        if (currentTokenState === 'header' && accessToken && accessToken !== 'cookie-based') {
          const retryCfg = {
            ...cfg,
            headers: { 
              ...(cfg.headers || {}), 
              Authorization: `Bearer ${accessToken}` 
            },
          };
          resolve(api.request(retryCfg));
        } else {
          resolve(api.request(cfg)); // cookie-based
        }
      }
      return replay;
    } catch (e) {
      while (queue.length) {
        const { reject } = queue.shift();
        reject(error);
      }
      if (!url.includes('/api/auth/me')) {
        const to = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?from=${to}`);
      }
      throw error;
    }
  }
);

// Initialize on module load
setInitialAccessFromStorage();
