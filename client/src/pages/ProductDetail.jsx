import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/track';

// Inline ToastNotification component
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

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/products/${id}`);
        setProduct(data.product);
      } catch (e) { 
        setError(e.response?.data?.error || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // Track product view once product is loaded
  useEffect(() => {
    if (product?.id) {
      track('view', product.id);
    }
  }, [product?.id]);

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
  }

  function hideNotification() {
    setNotification({ show: false, message: '', type: '' });
  }

  async function addToCart() {
    try {
      if (!user) return navigate('/login');
      
      setAddingToCart(true);
      await api.post('/api/cart/items', { 
        product_id: Number(id), 
        quantity: Number(quantity) 
      });
      
      track('add_to_cart', Number(id));
      showNotification('Added to cart successfully!');
    } catch (e) { 
      showNotification(e.response?.data?.error || 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="animate-pulse">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image skeleton */}
            <div className="bg-gray-200 rounded-2xl h-80 md:h-96"></div>
            
            {/* Content skeleton */}
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
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
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <p className="text-gray-600">Product not found</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Back to Products
        </button>
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
      
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-green-600 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-gray-100 rounded-2xl h-80 md:h-96 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400">No image available</span>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{product.name}</h1>
              {product.category && (
                <p className="text-green-600 font-medium mt-2">{product.category}</p>
              )}
            </div>

            {/* Price */}
            <div className="text-2xl font-bold text-green-600">
              ${Number(product.price).toFixed(2)}
              {product.originalPrice && (
                <span className="ml-2 text-sm text-gray-500 line-through">
                  ${Number(product.originalPrice).toFixed(2)}
                </span>
              )}
            </div>

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Stock Status */}
            {product.stock !== undefined && (
              <div className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </div>
            )}

            {/* Add to Cart Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <label className="font-medium">Quantity:</label>
                <input 
                  type="number" 
                  min="1" 
                  max={product.stock || 10}
                  value={quantity}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    const max = product.stock || 10;
                    setQuantity(value > max ? max : value);
                  }}
                  className="w-20 border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button 
                onClick={addToCart}
                disabled={addingToCart || (product.stock !== undefined && product.stock === 0)}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToCart ? 'Adding to Cart...' : 
                 (product.stock === 0 ? 'Out of Stock' : 'Add to Cart')}
              </button>
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 space-y-2">
                {product.sku && <p><span className="font-medium">SKU:</span> {product.sku}</p>}
                {product.brand && <p><span className="font-medium">Brand:</span> {product.brand}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}