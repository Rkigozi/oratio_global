import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("oratio_visited");
    if (!hasVisited && location.pathname === "/") {
      sessionStorage.setItem("oratio_visited", "true");
      navigate("/splash");
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setChecked(true), 0);
    }
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
