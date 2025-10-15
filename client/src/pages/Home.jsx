import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { track } from '../lib/track';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function ToastNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">×</button>
      </div>
    </div>
  );
}

function VerifyEmailBanner() {
  const { user, isVerified, resendVerificationEmail } = useAuth();
  if (!user || isVerified) return null;

  return (
    <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-900 flex items-center justify-between">
      <span>Please verify your email to unlock all features.</span>
      <button
        onClick={resendVerificationEmail}
        className="px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700"
      >
        Resend link
      </button>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [addingToCart, setAddingToCart] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const images = ["src/images/et_bg.jpg", "src/images/et_bg1.jpg", "src/images/et_bg2.jpg"];
  const [current, setCurrent] = useState(0);

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
  }
  function hideNotification() {
    setNotification({ show: false, message: '', type: '' });
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/products', { params: { search } });
      setProducts(data.products || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      products.slice(0, 12).forEach((p) => p?.id && track('view', p.id));
    }
  }, [products]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  async function addToCart(productId, productName) {
    try {
      if (!user) return navigate('/login');
      setAddingToCart((prev) => ({ ...prev, [productId]: true }));
      await api.post('/api/cart/items', { product_id: Number(productId), quantity: 1 });
      track('add_to_cart', Number(productId));
      showNotification(`"${productName}" added to cart!`);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  }

  function viewDetails(productId) {
    navigate(`/product/${productId}`);
  }

  return (
    <div className="min-h-screen">
      <VerifyEmailBanner />

      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}

      <section className="relative w-full overflow-hidden">
        <div
          className="w-full h-[65vh] bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${images[current]})` }}
        >
          <div className="max-w-6xl mx-auto px-4 h-full flex items-center">
            <div className="flex flex-col justify-between h-full text-center md:text-left py-12 max-w-md">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold text-green-800">Ethiopian Cultural Products</h1>
                <p className="text-xl py-0.5 text-gray-600">Curated recommendations just for you</p>
              </div>
              <div className="flex justify-center md:justify-start gap-4">
                <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg">
                  Shop Now
                </button>
                <button className="bg-gray-200 hover:bg-gray-300 text-green-600 font-semibold py-3 px-6 rounded-lg shadow-lg">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex gap-2 mb-8 mt-8">
          <input
            className="border rounded-lg p-3 flex-1 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
          />
          <button
            className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            onClick={loadProducts}
          >
            Search
          </button>
        </div>

        {loading && (
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
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">Error: {error}</p>
            <button onClick={loadProducts} className="text-red-600 underline mt-2">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  {search ? 'No products found. Try a different search.' : 'No products available yet.'}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {search ? `Search Results (${products.length})` : 'Featured Products'}
                </h2>
                <p className="text-gray-600 mb-8">Discover our curated collection of Ethiopian cultural products</p>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 overflow-hidden group"
                    >
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

                      <div className="p-4">
                        <h3
                          className="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-green-600 cursor-pointer transition-colors"
                          onClick={() => viewDetails(product.id)}
                          title={product.name}
                        >
                          {product.name}
                        </h3>

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

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex justify-between text-xs text-gray-500">
                            {product.category && <span className="bg-gray-100 px-2 py-1 rounded">{product.category}</span>}
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
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
