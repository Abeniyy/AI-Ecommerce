import { useEffect, useState } from 'react';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/products', { params: { search } });
      setProducts(data.products || []);
    } catch (e) { 
      setError(e.response?.data?.error || 'Failed to load products'); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    loadProducts(); 
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover AI-Powered Products</h1>
          <p className="text-xl mb-8">Curated recommendations just for you</p>
        </div>
      </section>

      {/* Search & Products Section */}
      <section className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Search Bar */}
        <div className="flex gap-2 mb-8 mt-8">
          <input 
            className="border rounded-lg p-3 flex-1 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadProducts()}
          />
          <button 
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            onClick={loadProducts}
          >
            Search
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Loading products…</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={loadProducts}
              className="text-red-600 underline mt-2"
            >
              Try again
            </button>
          </div>
        )}

        {/* Products Grid */}
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
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  {search ? `Search Results (${products.length})` : 'Featured Products'}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAdded={() => {
                        // Optional: Add toast notification or cart update logic
                        console.log('Product added:', product.id);
                      }} 
                    />
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