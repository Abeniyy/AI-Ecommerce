import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Cancel() {
  useEffect(() => {
    document.title = 'Payment canceled';
    // If we stored a pending order id for this attempt, drop it
    localStorage.removeItem('pending_order_id');
  }, []);

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">Payment canceled</h1>
      <p className="text-gray-600">
        Your payment was not completed. You can review your cart and try again.
      </p>

      <div className="mt-6 flex gap-3 justify-center">
        <Link to="/cart" className="px-4 py-2 rounded border">
          Back to Cart
        </Link>
        <Link to="/" className="px-4 py-2 rounded bg-black text-white">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
