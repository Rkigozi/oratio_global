import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { getProfile } from "../data/profile-data";

let globalChecked = false;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/" && !globalChecked) {
      globalChecked = true;
      try {
        const profile = getProfile();
        if (!profile.username || profile.username === "anonymous") {
          void navigate("/landing");
        }
      } catch {
        void navigate("/landing");
      }
    }
  }, [navigate, location]);

  return (
    <div className="w-full relative font-sans" style={{ height: "100dvh" }}>
      <Header />
      <main className="w-full h-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
