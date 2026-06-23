import { Navigate, Outlet } from "react-router";
import { useAuth } from '../../hooks/auth-context';

export function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-dvh" style={{ background: "rgb(var(--rgb-bg))" }}>
        <div className="w-6 h-6 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <Outlet />;
}
