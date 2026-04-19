import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

let globalHasRedirected = false; // Module-level, resets on page load

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (location.pathname === "/" && !globalHasRedirected) {
      globalHasRedirected = true; // Persists across component remounts
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
