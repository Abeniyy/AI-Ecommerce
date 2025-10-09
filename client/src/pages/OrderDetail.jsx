import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StatusPill({ status }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    canceled: 'bg-gray-100 text-gray-700 border-gray-200',
    refunded: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs border ${cls}`}>{status}</span>;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [order, setOrder] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState('');

  // Cancel
  const [canceling, setCanceling] = useState(false);

  // Return request
  const [openReturn, setOpenReturn] = useState(false);
  const [reason, setReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnOk, setReturnOk] = useState(false);

  const subtotal = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((s, it) => s + Number(it.unit_price) * Number(it.quantity), 0);
  }, [order]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFetching(true);
        setErr('');
        const { data } = await api.get(`/api/orders/${id}`);
        if (!alive) return;
        setOrder(data.order);
      } catch (e) {
        setErr(e?.response?.data?.error || 'Failed to load order');
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  async function cancelOrder() {
    if (!order || order.status !== 'pending') return;
    if (!confirm('Cancel this pending order?')) return;
    try {
      setCanceling(true);
      const { data } = await api.post(`/api/orders/${order.id}/cancel`);
      setOrder((o) => ({ ...o, status: data.order.status, updated_at: data.order.updated_at }));
    } catch (e) {
      alert(e?.response?.data?.error || 'Unable to cancel order');
    } finally {
      setCanceling(false);
    }
  }

  async function submitReturn() {
    if (!order || order.status !== 'paid') return;
    try {
      setSubmittingReturn(true);
      await api.post(`/api/orders/${order.id}/return-request`, { reason: reason.trim() || null });
      setReturnOk(true);
      setOpenReturn(false);
      setReason('');
    } catch (e) {
      alert(e?.response?.data?.error || 'Unable to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  }

  if (!user && !loading) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
        <p className="text-gray-600 mb-4">You need to be logged in to view order details.</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Order #{id}</h1>
              <p className="opacity-90">
                {fetching ? 'Loading…' : order ? new Date(order.created_at).toLocaleString() : ''}
              </p>
            </div>
            {!fetching && order && (
              <div className="mt-1">
                <StatusPill status={order.status} />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
              {err}
            </div>
          )}

          {fetching && (
            <div className="text-gray-600">Loading order…</div>
          )}

          {!fetching && order && (
            <>
              {/* Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Qty</th>
                        <th className="text-left p-3">Unit Price</th>
                        <th className="text-left p-3">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="p-3">{it.name}</td>
                          <td className="p-3">{it.quantity}</td>
                          <td className="p-3">${Number(it.unit_price).toFixed(2)}</td>
                          <td className="p-3">${(Number(it.unit_price) * Number(it.quantity)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Status</p>
                  <div className="mt-1"><StatusPill status={order.status} /></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Subtotal</p>
                  <p className="font-semibold">${subtotal.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">Total</p>
                  <p className="font-semibold">${Number(order.total_amount ?? subtotal).toFixed(2)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Link to="/orders" className="px-4 py-2 rounded border">Back to Orders</Link>

                {order.status === 'pending' && (
                  <button
                    onClick={cancelOrder}
                    disabled={canceling}
                    className="px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {canceling ? 'Canceling…' : 'Cancel Order'}
                  </button>
                )}

                {order.status === 'paid' && (
                  <>
                    <button
                      onClick={() => setOpenReturn((v) => !v)}
                      className="btn-primary"
                    >
                      {openReturn ? 'Close Return Form' : 'Request a Return'}
                    </button>
                  </>
                )}
              </div>

              {/* Return form */}
              {order.status === 'paid' && openReturn && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold mb-3">Return Request</h4>
                  <label className="block text-sm text-gray-700 mb-1">Reason</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-field w-full"
                    placeholder="Briefly describe the reason for your return (fit, damaged, changed mind, etc.)"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={submitReturn}
                      disabled={submittingReturn}
                      className="btn-primary"
                    >
                      {submittingReturn ? 'Submitting…' : 'Submit Return Request'}
                    </button>
                    <button onClick={() => setOpenReturn(false)} className="px-4 py-2 rounded border">
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    We’ll email you once your request is reviewed. For partial returns, we may contact you about item selection.
                  </p>
                </div>
              )}

              {returnOk && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3">
                  Return request submitted. We’ll follow up shortly.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
