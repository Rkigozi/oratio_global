import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/auth-context';
import { FullPageLoadingSpinner } from '../loading-spinner';
import { Landing } from '../../pages/landing';

function hasStoredAuthSession() {
  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
  } catch {
    return false;
  }
}

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    if (location.pathname === '/' && !hasStoredAuthSession()) {
      return <Landing />;
    }

    return <FullPageLoadingSpinner />;
  }

  if (!user) {
    if (location.pathname === '/') {
      return <Navigate to="/landing" replace />;
    }

    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
