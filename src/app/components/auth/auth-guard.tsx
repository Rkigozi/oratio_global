import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/auth-context';
import { FullPageLoadingSpinner } from '../loading-spinner';

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoadingSpinner />;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
