import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, minRole = 'customer' }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (minRole === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
