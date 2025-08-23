import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const n = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    try { await login(email, password); n('/'); }
    catch (e) { setErr(e.response?.data?.error || 'Login failed'); }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-black text-white rounded p-2">Login</button>
      </form>
      <p className="text-sm mt-3">No account? <Link className="underline" to="/register">Register</Link></p>
    </div>
  );
}
