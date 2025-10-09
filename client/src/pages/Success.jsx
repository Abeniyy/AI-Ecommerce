import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Success() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('confirming'); // confirming → pending → paid / unknown / error
  const [order, setOrder] = useState(null);

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id'); // present only if Stripe redirected you here

  // If you saved an order id before redirecting to Stripe, read it here (optional)
  const pendingId = Number(localStorage.getItem('pending_order_id') || 0);

  useEffect(() => {
    document.title = 'Completing payment';
    let cancelled = false;

    // If we didn't come from Stripe success, redirect to /cancel.
    if (!sessionId) {
      navigate('/cancel', { replace: true });
      return;
    }

    // If the user is already authenticated and payment is confirmed, take them to their Orders after a moment.
    if (!loading && user && status === 'paid') {
      const t = setTimeout(() => navigate('/orders', { replace: true }), 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, status, navigate, sessionId]);

  useEffect(() => {
    // If no session_id, you didn't come back from Stripe success — user likely hit Back.
    if (!sessionId) {
      setStatus('unknown');
      return;
    }

    if (loading || !user) {
      setStatus('unknown');
      return; // public page — don't block on auth
    }

    let cancelled = false;

    async function pollOrder() {
      // Try up to ~20s while webhook processes
      for (let i = 0; i < 10 && !cancelled; i++) {
        try {
          if (pendingId) {
            // Prefer a direct fetch if you have the id
            const { data } = await api.get(`/api/orders/${pendingId}`);
            setOrder(data.order);
            if (data.order?.status === 'paid') {
              setStatus('paid');
              localStorage.removeItem('pending_order_id');
              return;
            }
            setStatus('pending');
          } else {
            // Fallback: get latest orders and assume the most recent is ours
            const { data } = await api.get('/api/orders');
            const o = (data.orders || [])[0];
            if (o) {
              setOrder(o);
              setStatus(o.status === 'paid' ? 'paid' : 'pending');
            } else {
              setStatus('unknown');
            }
          }
        } catch {
          setStatus('error');
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // If we exit the loop without confirming payment
      if (!cancelled && status !== 'paid') {
        setStatus('unknown');
      }
    }

    pollOrder();
    return () => { cancelled = true; };
  }, [user, loading, pendingId, sessionId, status]);

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">
        {status === 'paid' ? 'Payment successful 🎉' : 
         status === 'confirming' || status === 'pending' ? 'Completing payment…' : 
         'Payment Status'}
      </h1>

      {status === 'confirming' && (
        <p className="text-gray-600">Finalizing your order… This may take a few seconds while we receive confirmation.</p>
      )}
      
      {status === 'pending' && (
        <p className="text-gray-600">Payment received. Waiting for confirmation…</p>
      )}
      
      {status === 'paid' && (
        <>
          <p className="text-gray-700">
            Order <span className="font-medium">#{order?.id}</span> is <span className="font-medium">paid</span>.
          </p>
          {'total_amount' in (order || {}) && (
            <p className="text-gray-600 mt-1">Total: ${Number(order.total_amount).toFixed(2)}</p>
          )}
          <p className="text-green-600 mt-2">We're taking you to your orders...</p>
        </>
      )}
      
      {status === 'unknown' && (
        <p className="text-gray-600">
          {sessionId 
            ? "Thanks! If your order isn't visible yet, it should appear in 'My Orders' shortly."
            : "Looks like you returned before completing payment. You can resume from your cart or review your orders."
          }
        </p>
      )}
      
      {status === 'error' && (
        <p className="text-red-600">We couldn't confirm the order. Please check "My Orders".</p>
      )}

      <div className="mt-6 flex gap-3 justify-center">
        <Link to="/orders" className="px-4 py-2 rounded bg-black text-white">
          View My Orders
        </Link>
        {status !== 'paid' && (
          <Link to="/cart" className="px-4 py-2 rounded border">
            {status === 'unknown' && !sessionId ? 'Back to Cart' : 'Continue Shopping'}
          </Link>
        )}
      </div>

      {/* Show login options for non-authenticated users */}
      {!loading && !user && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-gray-600 mb-3">Log in to view your orders</p>
          <Link to="/login" className="px-4 py-2 rounded bg-blue-600 text-white">
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}
