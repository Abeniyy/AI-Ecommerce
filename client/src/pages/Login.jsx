import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setBusy(true);
      setErr('');
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      setErr(error.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input 
          className="w-full border p-2 rounded placeholder-gray-400"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input 
          className="w-full border p-2 rounded placeholder-gray-400"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button 
          className="w-full bg-black text-white rounded p-2 disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <p className="text-sm mt-3">
        <Link className="underline" to="/forgot-password">Forgot your password?</Link>
      </p>

      <p className="text-sm mt-3">No account? <Link className="underline" to="/register">Register</Link></p>
    </div>
  );
}
