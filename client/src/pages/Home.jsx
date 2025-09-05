import { useEffect, useState } from 'react';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';
import { track } from '../lib/track';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const images = [
    "src/images/et_bg.jpg",
    "src/images/et_1.jpg",
  ];

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
      if (products.length > 0) {
        // Fire-and-forget; don't await
        products.slice(0, 12).forEach(p => track('view', p.id));
      }
    }, [products]);

  const [current, setCurrent] = useState(0);

  useEffect(() => { 
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000); // change every 5 seconds
    return () => clearInterval(interval);
  }, [images.length]); 


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full grid grid-cols-1 md:grid-cols-2 items-center px-8 bg-cover bg-center
      transition-all duration-1000 fade-in-out min-h-[65vh]"
      style={{ backgroundImage: `url(${images[current]})` }}>

        {/* Left side text */}
        <div className="flex flex-col justify-between h-full text-center md:text-left py-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-bold text-green-800" >
              Ethiopian Cultural Products
            </h1>
            <p className="text-xl py=12 text-gray-600">
              Curated recommendations just for you
            </p>
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

        {/* Right side image */}
        <div className="mt-8 md:mt-0">
          {/* <img 
            src="src/images/BaaruuMart Logo.png" 
            alt="img" 
            className="w-full rounded-2xl shadow-lg"
          /> */}
        </div>
      </section>


      {/* Search & Products Section */}
      <section className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Search Bar */}
        <div className="flex gap-2 mb-8 mt-8">
          <input 
            className="border rounded-lg p-3 flex-1 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadProducts()}
          />
          <button 
            className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
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