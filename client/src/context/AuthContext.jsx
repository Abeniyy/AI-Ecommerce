import { createContext, useContext, useEffect, useState } from 'react';
import { api, setInitialAccessFromStorage } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  async function login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password });
    // server returns access token in JSON; refresh cookie is set server-side
    localStorage.setItem('token', data.token);
    setInitialAccessFromStorage();
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('token', data.token);
    setInitialAccessFromStorage();
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    setInitialAccessFromStorage();
    setUser(null);
    navigate("/");
  }
  async function verify(email) {
    await api.post('/api/auth/verifyemail', { email });
  }

  // on mount: bootstrap auth
  useEffect(() => {
    setInitialAccessFromStorage();
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/api/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setInitialAccessFromStorage();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, verify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
