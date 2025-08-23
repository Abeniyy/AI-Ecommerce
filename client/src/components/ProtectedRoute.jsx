import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, minRole = 'customer' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (minRole === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
