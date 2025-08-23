import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      setLoading(true);
      const { data } = await api.get('/api/admin/metrics');
      setMetrics(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function navigateTo(section) {
    navigate(`/admin/${section}`);
  }

  const MetricCard = ({ title, value, subtitle, icon, color = 'indigo', onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-${color}-500 ${
        onClick ? 'hover:scale-105 transition-transform' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`text-2xl text-${color}-500`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="animate-pulse bg-gray-200 rounded-xl p-6 h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={loadMetrics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your store's performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Products"
          value={metrics.products}
          icon="📦"
          color="blue"
          onClick={() => navigateTo('products')}
        />
        <MetricCard
          title="Total Users"
          value={metrics.users}
          icon="👥"
          color="green"
          onClick={() => navigateTo('users')}
        />
        <MetricCard
          title="Total Orders"
          value={metrics.orders}
          icon="📋"
          color="purple"
          onClick={() => navigateTo('orders')}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${Number(metrics.revenue).toFixed(2)}`}
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-md p-6 md:col-span-2 lg:col-span-1">
          <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigateTo('products/new')}
              className="w-full text-left p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              + Add New Product
            </button>
            <button 
              onClick={() => navigateTo('orders')}
              className="w-full text-left p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              View Recent Orders
            </button>
            <button 
              onClick={() => navigateTo('users')}
              className="w-full text-left p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              Manage Users
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Store Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Products</span>
              <span className="font-semibold">{metrics.active_products || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Orders</span>
              <span className="font-semibold">{metrics.pending_orders || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">New Users (7d)</span>
              <span className="font-semibold">{metrics.recent_users || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-lg mb-4">Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg. Order Value</span>
              <span className="font-semibold">
                ${metrics.avg_order_value ? Number(metrics.avg_order_value).toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-semibold">
                {metrics.conversion_rate ? `${Number(metrics.conversion_rate).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Inventory Value</span>
              <span className="font-semibold">
                {metrics.inventory_value ? `$${Number(metrics.inventory_value).toFixed(2)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}