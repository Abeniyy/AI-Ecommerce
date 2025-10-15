import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      setBusy(true);
      await forgotPassword(email.trim());
      setMsg('If that email exists, a reset link has been sent.');
    } catch (e) {
      setErr(e.message || 'Failed to send reset email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Reset your password</h1>
      {msg && <p className="text-green-600">{msg}</p>}
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border p-2 rounded"
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />
        <button className="w-full bg-black text-white rounded p-2" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-sm mt-3"><Link className="underline" to="/login">Back to sign in</Link></p>
    </div>
  );
}
