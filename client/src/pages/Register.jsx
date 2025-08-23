import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const n = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [full_name, setFull] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    try { await register({ email, password, full_name }); n('/'); }
    catch (e) { setErr(e.response?.data?.error || 'Registration failed'); }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Full name" value={full_name} onChange={e=>setFull(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-black text-white rounded p-2">Register</button>
      </form>
      <p className="text-sm mt-3">Have an account? <Link className="underline" to="/login">Sign in</Link></p>
    </div>
  );
}
