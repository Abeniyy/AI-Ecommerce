import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Verify() {
  const n = useNavigate();
  const { verify } = useAuth();
  const [email, setEmail] = useState('shane.rogers@my.smsu.edu');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    try { await verify(email);}
    catch (e) { setErr(e.response?.data?.error || 'Verification failed'); }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Verify Your Email</h1>
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="w-full bg-black text-white rounded p-2">Send Link</button>
      </form>
    </div>
  );
}
