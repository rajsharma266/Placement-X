import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import Loader from '../components/ui/Loader';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Loader fullScreen />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};

export default ProtectedRoute;
