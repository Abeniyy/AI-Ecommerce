import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }
  async function register(payload) {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }
  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/api/auth/me').then(({ data }) => setUser(data.user)).catch(() => logout());
  }, []);

  return <AuthCtx.Provider value={{ user, login, logout, register }}>{children}</AuthCtx.Provider>;
}
