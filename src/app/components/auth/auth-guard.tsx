import { Navigate, Outlet } from "react-router";
import { useAuth } from '../../hooks/auth-context';
import { FullPageLoadingSpinner } from "../loading-spinner";

export function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <Outlet />;
}
