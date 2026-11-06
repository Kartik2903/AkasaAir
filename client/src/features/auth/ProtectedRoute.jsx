import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ roles }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8"><Skeleton className="h-6 w-48" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
