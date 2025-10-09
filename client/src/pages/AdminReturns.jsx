import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StatusPill({ status }) {
  const map = {
    requested: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    canceled: 'bg-gray-100 text-gray-700 border-gray-200',
    received: 'bg-purple-100 text-purple-800 border-purple-200',
    refunded: 'bg-green-100 text-green-800 border-green-200',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs border ${cls}`}>{status}</span>;
}

export default function AdminReturns() {
  const { user } = useAuth(); // assume ProtectedRoute(minRole='admin') wraps this page
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const page = Math.max(parseInt(params.get('page') || '1', 10), 1);
  const pageSize = 20;
  const status = params.get('status') || '';
  const q = params.get('q') || '';

  const fetchList = async () => {
    try {
      setBusy(true);
      setErr('');
      const { data } = await api.get('/api/admin/returns', {
        params: {
          page,
          page_size: pageSize,
          ...(status ? { status } : {}),
          ...(q ? { q } : {}),
        },
      });
      setRows(data.returns);
      setTotal(data.total);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load return requests');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [page, status, q]);

  function setFilter(next) {
    const nxt = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') nxt.delete(k);
      else nxt.set(k, String(v));
    });
    if (!next.page) nxt.set('page', '1'); // reset page on filter change
    setParams(nxt, { replace: true });
  }

  async function changeStatus(id, nextStatus) {
    const label = nextStatus[0].toUpperCase() + nextStatus.slice(1);
    if (!confirm(`Set this return request to "${label}"?`)) return;
    try {
      setBusy(true);
      await api.patch(`/api/admin/returns/${id}`, { status: nextStatus });
      await fetchList();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  }

  const totalPages = useMemo(() => Math.max(Math.ceil(total / pageSize), 1), [total]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-purple-600 text-white p-6">
          <h1 className="text-2xl font-bold">Return Requests</h1>
          <p className="opacity-90">Review and manage customer-initiated returns.</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
          <select
            className="input-field"
            value={status}
            onChange={(e) => setFilter({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="canceled">Canceled</option>
            <option value="received">Received</option>
            <option value="refunded">Refunded</option>
          </select>

          <input
            className="input-field"
            placeholder="Search by order id or email"
            value={q}
            onChange={(e) => setFilter({ q: e.target.value })}
          />

          <div className="ml-auto text-sm text-gray-600">
            {busy ? 'Loading…' : `${total} result${total === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Errors */}
        {err && <div className="p-4 text-red-600">{err}</div>}

        {/* Table */}
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Updated</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.id}</td>
                  <td className="p-3">
                    <Link className="underline" to={`/orders/${r.order_id}`} target="_blank" rel="noreferrer">
                      #{r.order_id}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="leading-tight">
                      <div className="font-medium">{r.full_name || r.email}</div>
                      <div className="text-gray-500 text-xs">{r.email}</div>
                    </div>
                  </td>
                  <td className="p-3">${Number(r.refund_amount || 0).toFixed(2)}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{new Date(r.updated_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {r.status === 'requested' && (
                        <>
                          <button className="btn-primary" onClick={() => changeStatus(r.id, 'approved')}>Approve</button>
                          <button className="px-3 py-2 rounded border" onClick={() => changeStatus(r.id, 'rejected')}>Reject</button>
                          <button className="px-3 py-2 rounded border" onClick={() => changeStatus(r.id, 'canceled')}>Cancel</button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <button className="btn-primary" onClick={() => changeStatus(r.id, 'received')}>Mark Received</button>
                          <button className="px-3 py-2 rounded border" onClick={() => changeStatus(r.id, 'canceled')}>Cancel</button>
                        </>
                      )}
                      {r.status === 'received' && (
                        <button className="btn-primary" onClick={() => changeStatus(r.id, 'refunded')}>Mark Refunded</button>
                      )}
                      {(r.status === 'rejected' || r.status === 'canceled' || r.status === 'refunded') && (
                        <span className="text-gray-500 text-xs">No actions available</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !busy && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">No return requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            className="px-3 py-2 rounded border disabled:opacity-50"
            onClick={() => setFilter({ page: Math.max(page - 1, 1) })}
            disabled={page <= 1}
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
          <button
            className="px-3 py-2 rounded border disabled:opacity-50"
            onClick={() => setFilter({ page: Math.min(page + 1, totalPages) })}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
