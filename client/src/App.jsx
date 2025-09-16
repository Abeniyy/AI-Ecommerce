import { Link, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import('tailwindcss').Config
import Home from './pages/Home';
import Recommendations from './pages/Recommendations';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import ProductDetail from './pages/ProductDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminUsers from './pages/AdminUsers';
import AuthProvider, { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const navLink = ({ isActive }) => 
    `px-3 py-2 rounded-xl transition-colors ${
      isActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
    }`;

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
          <Link to="/" className="flex items-center space-x-3">
          {/* Logo */}
          <img 
            src="/src/images/LogoWoName.png" 
            alt="Baaruu Mart Logo" 
            className="h-12 w-auto"
          />

          <span className="text-xl font-bold">
            <span className="text-logoGreen">BAA</span>
            <span className="text-logoYellow">RUU</span>
            <span className="text-logoRed"> MART</span>
          </span>
          </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <NavLink to="/" className={navLink}>Home</NavLink>
              <NavLink to="/recommendations" className={navLink}>For You</NavLink>
              <NavLink to="/cart" className={navLink}>Cart</NavLink>
              
              {/* Admin Dropdown */}
              {user?.role === 'admin' && (
                <div className="admin-group relative">
                  <NavLink 
                    to="/admin" 
                    className={({ isActive }) => 
                      `${navLink({ isActive })} flex items-center gap-1`
                    }
                  >
                    Admin
                    <span className="text-xs">▼</span>
                  </NavLink>
                  <div className="admin-dropdown absolute right-0 mt-2 bg-white rounded-xl shadow-lg border p-2 min-w-[160px] z-50">
                    <NavLink 
                      to="/admin" 
                      className="block px-4 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors"
                    >
                      Dashboard
                    </NavLink>
                    <NavLink 
                      to="/admin/products" 
                      className="block px-4 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors"
                    >
                      Products
                    </NavLink>
                    <NavLink 
                      to="/admin/orders" 
                      className="block px-4 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors"
                    >
                      Orders
                    </NavLink>
                    <NavLink 
                      to="/admin/users" 
                      className="block px-4 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-600 transition-colors"
                    >
                      Users
                    </NavLink>
                  </div>
                  
                  {/* Invisible extension to prevent accidental dropdown closure */}
                  <style>
                    {`
                      .admin-dropdown {
                        opacity: 0;
                        visibility: hidden;
                        transform: translateY(10px);
                        transition: all 0.3s ease;
                      }
                      
                      .admin-group:hover .admin-dropdown {
                        opacity: 1;
                        visibility: visible;
                        transform: translateY(0);
                      }
                      
                      /* Add an invisible extension to the trigger area */
                      .admin-group::after {
                        content: '';
                        position: absolute;
                        bottom: -10px;
                        left: 0;
                        width: 100%;
                        height: 20px;
                        background: transparent;
                      }
                    `}
                  </style>
                </div>
              )}

              {/* User Section */}
              {user ? (
                <div className="flex items-center gap-3 ml-2">
                  <span className="text-sm text-gray-600">
                    Hi, {user.full_name || user.email.split('@')[0]}
                  </span>
                  <div className="flex items-center gap-2">
                    <NavLink 
                      to="/orders" 
                      className="text-sm text-gray-600 hover:text-green-600 transition-colors"
                    >
                      Orders
                    </NavLink>
                    <button 
                      onClick={logout}
                      className="text-sm bg-gray-600 text-white px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <NavLink 
                    to="/login" 
                    className="px-3 py-2 text-gray-700 hover:text-green-600 transition-colors"
                  >
                    Login
                  </NavLink>
                  <NavLink 
                    to="/register" 
                    className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Register
                  </NavLink>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${isAdminRoute ? 'bg-gray-50' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute minRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/products" element={
              <ProtectedRoute minRole="admin">
                <AdminProducts />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute minRole="admin">
                <AdminOrders />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute minRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} AI-Ecommerce. All rights reserved.</p>
            <p className="mt-1">Built by ABE web technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}