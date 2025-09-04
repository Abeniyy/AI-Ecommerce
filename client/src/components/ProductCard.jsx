import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product, onAdded }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function addToCart() {
    try {
      if (!user) return navigate('/login');
      await api.post('/api/cart/items', { 
        product_id: product.id, 
        quantity: 1 
      });
      onAdded?.(product.id);
      alert('Added to cart successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add item to cart');
    }
  }

  function viewDetails() {
    navigate(`/product/${product.id}`);
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Product Image */}
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-500">No Image</span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {product.category || '—'}
        </p>
        
        <div className="flex justify-between items-center mt-3">
          <span className="text-lg font-bold text-green-600">
            ${Number(product.price).toFixed(2)}
          </span>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={viewDetails}
              className="px-3 py-1 rounded border border-gray-300 hover:border-green-600 transition-colors text-sm"
            >
              Details
            </button>
            <button 
              onClick={addToCart}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}