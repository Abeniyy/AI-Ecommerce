import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

  async function placeOrder() {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/api/orders/checkout');
      setOrderDetails(data.order);
      
      // Redirect to orders page after a brief success display
      setTimeout(() => {
        navigate('/orders');
      }, 2000);
      
    } catch (e) { 
      setError(e.response?.data?.error || 'Checkout failed. Please try again.');
    } finally { 
      setLoading(false); 
    }
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Please Sign In</h2>
        <p className="text-gray-600 mb-4">You need to be logged in to complete your purchase.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (orderDetails) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-6 text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Placed Successfully!</h2>
        <p className="text-gray-600 mb-4">
          Your order #{orderDetails.id} has been confirmed.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to your orders...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="opacity-90">Complete your purchase</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">
                This demo will convert your current cart into a confirmed order.
                In a real application, this would include payment processing and
                shipping information.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-gray-600">
                {user.full_name || 'Customer'}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/cart')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Cart
            </button>
            <button
              onClick={placeOrder}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Processing...
                </span>
              ) : (
                'Place Order'
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-lg">🔒</div>
              <div>
                <p className="text-sm text-blue-800 font-medium">Secure Checkout</p>
                <p className="text-xs text-blue-600">
                  This is a demo. No real payment information is required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}