import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

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

  async function addToCart() {
    try {
      if (!user) return navigate('/login');
      setAddingToCart(true);
      await api.post('/api/cart/items', { 
        product_id: Number(id), 
        quantity: Number(quantity) 
      });
      alert('Added to cart successfully!');
    } catch (e) { 
      alert(e.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded-2xl h-64 mb-6"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="bg-gray-100 rounded-2xl h-80 md:h-96 flex items-center justify-center">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover rounded-2xl"
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
              <p className="text-indigo-600 font-medium mt-2">{product.category}</p>
            )}
          </div>

          {product.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="text-2xl font-bold text-indigo-600">
            ${Number(product.price).toFixed(2)}
          </div>

          {/* Add to Cart Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-medium">Quantity:</label>
              <input 
                type="number" 
                min="1" 
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 border border-gray-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button 
              onClick={addToCart}
              disabled={addingToCart}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
            </button>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p>SKU: {product.sku || 'N/A'}</p>
              {product.stock !== undefined && (
                <p className="mt-1">
                  Status: {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}