import { useState, useRef } from 'react';
import { Link, Routes, Route, NavLink, useLocation } from 'react-router-dom';

import Home from './pages/Home';
import Recommendations from './pages/Recommendations';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/VerifyEmail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import ProductDetail from './pages/ProductDetail';

import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminUsers from './pages/AdminUsers';
import AdminReturns from './pages/AdminReturns';

import AuthProvider, { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Success from './pages/Success';
import Cancel from './pages/Cancel';

import OrderDetail from './pages/OrderDetail';


function AdminMenu({ isActiveClass, isAdminRoute }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1 ${
          isAdminRoute ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Admin <span className="text-xs">▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl bg-white shadow-lg border p-2"
          role="menu"
        >
          <NavLink to="/admin" className={isActiveClass} role="menuitem">
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={isActiveClass} role="menuitem">
            Products
          </NavLink>
          <NavLink to="/admin/orders" className={isActiveClass} role="menuitem">
            Orders
          </NavLink>
          <NavLink to="/admin/users" className={isActiveClass} role="menuitem">
            Users
          </NavLink>
          <NavLink
            to="/admin/returns"
            className={isActiveClass} role="menuitem"
          >
             Returns
          </NavLink>
        </div>
      )}
    </div>
  );
}

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
              <NavLink to="/" className={navLink}>
                Home
              </NavLink>
              <NavLink to="/recommendations" className={navLink}>
                For You
              </NavLink>
              <NavLink to="/cart" className={navLink}>
                Cart
              </NavLink>

              {/* Admin Dropdown (stable) */}
              {user?.role === 'admin' && (
                <AdminMenu
                  isActiveClass={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50 hover:text-green-600'
                    }`
                  }
                  isAdminRoute={isAdminRoute}
                />
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
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Make Stripe return pages PUBLIC */}
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />
            <Route path="/verifyemail" element={<Verify />} />

            {/* Protected */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route path="/verifyemail" element={
              <ProtectedRoute>
                <Verify />
              </ProtectedRoute>
            } />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute minRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute minRole="admin">
                  <AdminProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute minRole="admin">
                  <AdminOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute minRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/returns"
              element={
                <ProtectedRoute minRole="admin">
                  <AdminReturns />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="bg-[url('/src/images/footerBg1.png')] bg-cover bg-center relative mt-auto w-fit">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-white text-sm">
            <p>© {new Date().getFullYear()} AI-Ecommerce. All rights reserved.</p>
            <p className="mt-1">Built by ABE web technologies.</p>
          </div>
        </div>
      </footer> */}
      {/* <footer
        className="
          relative w-full bg-cover bg-center bg-no-repeat mt-auto
          flex items-center justify-center text-center
        "
        style={{ backgroundImage: "url('/footerBg1.png')" }} // move image to /public
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-white text-sm">
            <p>© {new Date().getFullYear()} AI-Ecommerce. All rights reserved.</p>
            <p className="mt-1">Built by ABE web technologies.</p>
          </div>
        </div>
      </footer> */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <footer
          className=" relative bg-cover bg-center bg-no-repeat flex items-center justify-center text-center mt-auto"
          style={{ backgroundImage: "url('/footerBg2.png')" }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-white text-sm">
              <p>© {new Date().getFullYear()} AI-Ecommerce. All rights reserved.</p>
              <p className="mt-1">Built by ABE web technologies.</p>
            </div>
          </div>
        </footer>
      </div>

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
