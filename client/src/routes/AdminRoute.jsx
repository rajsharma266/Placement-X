import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import Loader from '../components/ui/Loader';
const AdminRoute = () => { const { user, isLoading } = useAuth(); if (isLoading) return <Loader fullScreen />; if (!user) return <Navigate to="/login" replace />; return user.role === 'admin' ? <Outlet /> : <Navigate to="/forbidden" replace />; };
export default AdminRoute;
