import { createContext, useContext, useEffect, useState } from 'react';
import { api, setInitialAccessFromStorage } from '../services/api';
import { useNavigate } from 'react-router-dom';

import { fbAuth } from '../lib/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

const AUTH_PROVIDER = (import.meta.env.VITE_AUTH_PROVIDER || 'password').trim();
const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const apiWithAuth = {
    ...api,
    get: (url, config = {}) => api.get(url, { ...config, withCredentials: true }),
    post: (url, data, config = {}) => api.post(url, data, { ...config, withCredentials: true }),
    put: (url, data, config = {}) => api.put(url, data, { ...config, withCredentials: true }),
    delete: (url, config = {}) => api.delete(url, { ...config, withCredentials: true }),
  };

  // ----- Password auth -----
  async function loginPassword(email, password) {
    const { data } = await apiWithAuth.post('/api/auth/login', { email, password });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setInitialAccessFromStorage();
    }
    setUser(data.user);
    return data.user;
  }

  async function registerPassword(payload) {
    if (!payload?.password || payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    const { data } = await apiWithAuth.post('/api/auth/register', payload);
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setInitialAccessFromStorage();
    }
    setUser(data.user);
    return data.user;
  }

  // ----- Firebase auth  -----
  async function loginFirebase(email, password) {
    const { user: fbUser } = await signInWithEmailAndPassword(fbAuth, email, password);
    const idToken = await fbUser.getIdToken();
    const { data } = await apiWithAuth.post('/api/auth/firebase-login', { idToken });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setInitialAccessFromStorage();
    }
    setUser({ ...data.user, email_verified: fbUser.emailVerified });
    return data.user;
  }

  async function registerFirebase({ email, password, full_name }) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    const { user: fbUser } = await createUserWithEmailAndPassword(fbAuth, email, password);
    try { await sendEmailVerification(fbUser); } catch {}
    const idToken = await fbUser.getIdToken();
    const { data } = await apiWithAuth.post('/api/auth/firebase-login', { idToken, full_name });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      setInitialAccessFromStorage();
    }
    setUser({ ...data.user, email_verified: fbUser.emailVerified });
    return data.user;
  }

  const login = AUTH_PROVIDER === 'firebase' ? loginFirebase : loginPassword;
  const register = AUTH_PROVIDER === 'firebase' ? registerFirebase : registerPassword;

  async function verify(email) {
    if (!email || !email.includes('@')) throw new Error('Valid email is required');
    await apiWithAuth.post('/api/auth/verifyemail', { email });
  }

  async function logout() {
    try { await apiWithAuth.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('token');
    setInitialAccessFromStorage();
    setUser(null);
    navigate('/');
  }

  // Bootstrap session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setInitialAccessFromStorage();
      setLoading(true);
      try {
        const { data } = await apiWithAuth.get('/api/auth/me');
        setUser(data.user);
      } catch {
        // not authenticated
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      register,
      verify,
      loginPassword,
      registerPassword,
      loginFirebase,
      registerFirebase,
      authProvider: AUTH_PROVIDER,
      isAuthenticated: !!user,
      isVerified: !!user?.isverified,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
