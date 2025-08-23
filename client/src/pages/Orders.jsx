import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const { data } = await api.get('/api/orders');
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  function viewOrderDetails(orderId) {
    navigate(`/orders/${orderId}`);
  }

  function getStatusColor(status) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-indigo-100 text-indigo-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse bg-gray-200 rounded-xl p-6 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={loadOrders}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">My Orders</h1>
        <div className="bg-gray-50 rounded-xl p-8">
          <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      
      <div className="space-y-4">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => viewOrderDetails(order.id)}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Order Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-gray-800">
                    Order #{order.id}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  Placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
                  {new Date(order.created_at).toLocaleTimeString()}
                </p>
                {order.currency && (
                  <p className="text-sm text-gray-500 mt-1">
                    Currency: {order.currency}
                  </p>
                )}
              </div>

              {/* Order Total */}
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">
                  ${Number(order.total_amount).toFixed(2)}
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    viewOrderDetails(order.id);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Orders:</span>
          <span className="text-xl font-bold text-indigo-600">{orders.length}</span>
        </div>
      </div>
    </div>
  );
}