import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState, useRef } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (location.pathname === "/" && !hasRedirected.current) {
      hasRedirected.current = true;
      void navigate("/splash");
    }
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setChecked(true), 0);
  }, [navigate, location]);

  if (!checked) return null;

  return (
    <div className="w-full h-full relative font-sans">
      <Header />
      <main className="w-full h-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
