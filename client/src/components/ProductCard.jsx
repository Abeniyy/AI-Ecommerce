import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/track';
import { useState } from 'react';

export default function ProductCard({ product, onAdded }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  async function addToCart() {
    try {
      if (!user) return navigate('/login');
      
      setIsAdding(true);
      await api.post('/api/cart/items', { 
        product_id: product.id, 
        quantity: 1 
      });
      
      track('add_to_cart', product.id);
      onAdded?.(product.id);
      
      // Optional: Show a more elegant notification instead of alert
      // You could implement a toast notification system here
      alert('Added to cart successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add item to cart');
    } finally {
      setIsAdding(false);
    }
  }

  function viewDetails() {
    navigate(`/product/${product.id}`);
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Product Image with clickable area for details */}
      <div 
        className="w-full h-48 bg-gray-200 flex items-center justify-center cursor-pointer"
        onClick={viewDetails}
      >
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
        <h3 
          className="text-lg font-semibold text-gray-800 truncate cursor-pointer hover:text-green-600 transition-colors"
          onClick={viewDetails}
        >
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
              className="px-3 py-1 rounded border border-gray-300 hover:border-green-600 hover:text-green-600 transition-colors text-sm"
            >
              Details
            </button>
            <button 
              onClick={addToCart}
              disabled={isAdding}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}