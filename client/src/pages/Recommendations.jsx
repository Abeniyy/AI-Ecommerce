// client/src/pages/Recommendations.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSessionId } from '../lib/session';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/track';

// Reuse the ToastNotification component from ProductDetail
function ToastNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
  
  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button 
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [src, setSrc] = useState('loading');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const sid = getSessionId();
    setLoading(true);
    api.get('/api/recommendations', { params: { session_id: sid } })
      .then(({ data }) => {
        setSrc(data.source || 'unknown');
        setRecs(data.recommendations || []);
      })
      .catch(e => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
  }

  function hideNotification() {
    setNotification({ show: false, message: '', type: '' });
  }

  async function addToCart(productId, productName) {
    try {
      if (!user) return navigate('/login');
      
      setAddingToCart(prev => ({ ...prev, [productId]: true }));
      await api.post('/api/cart/items', { 
        product_id: Number(productId), 
        quantity: 1
      });
      
      track('add_to_cart', Number(productId));
      showNotification(`"${productName}" added to cart!`);
    } catch (error) { 
      showNotification(error.response?.data?.error || 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  }

  function viewDetails(productId) {
    navigate(`/product/${productId}`);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg mb-4">{err}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {notification.show && (
        <ToastNotification 
          message={notification.message} 
          type={notification.type}
          onClose={hideNotification}
        />
      )}
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Recommended for You</h1>
          <p className="text-gray-600">Based on your browsing history and preferences</p>
          {/* <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Recommendation source:</span>
            <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              {src}
            </span>
          </div> */}
        </div>

        {recs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">No recommendations yet</h3>
            <p className="text-gray-500">Start browsing products to get personalized recommendations!</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recs.map(product => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 overflow-hidden group">
                {/* Product Image */}
                <div 
                  className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => viewDetails(product.id)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                      <span className="text-4xl mb-2">📦</span>
                      <span className="text-sm">No image</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 
                    className="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-green-600 cursor-pointer transition-colors"
                    onClick={() => viewDetails(product.id)}
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  
                  {/* Price */}
                  {'price' in product && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-green-600">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${Number(product.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Score */}
                  {'score' in product && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, product.score * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {Number(product.score).toFixed(3)}
                      </span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => viewDetails(product.id)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-lg hover:border-green-600 hover:text-green-600 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => addToCart(product.id, product.name)}
                      disabled={addingToCart[product.id]}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {addingToCart[product.id] ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding
                        </span>
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      {product.category && (
                        <span className="bg-gray-100 px-2 py-1 rounded">{product.category}</span>
                      )}
                      {product.stock !== undefined && (
                        <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}