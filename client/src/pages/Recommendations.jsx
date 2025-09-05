// client/src/pages/Recommendations.jsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getSessionId } from '../lib/session';

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [src, setSrc] = useState('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    const sid = getSessionId();
    api.get('/api/recommendations', { params: { session_id: sid } })
      .then(({ data }) => {
        setSrc(data.source || 'unknown');
        setRecs(data.recommendations || []);
      })
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Recommended for you</h1>
      <p className="text-sm text-gray-500 mb-4">source: {src}</p>
      <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {recs.map(r => (
          <li key={r.id} className="p-4 bg-white rounded-2xl shadow">
            <div className="h-24 bg-gray-200 rounded mb-2" />
            <div className="font-medium">{r.name}</div>
            {'price' in r && <div className="text-sm text-gray-600">${Number(r.price).toFixed(2)}</div>}
            {'score' in r && <div className="text-xs text-gray-500 mt-1">score: {Number(r.score).toFixed(3)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
