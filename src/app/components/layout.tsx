import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { supabase } from "../../lib/supabase";
import type { PrayerRequest } from "../data/prayer-data";

let globalHasRedirected = false;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (location.pathname === "/" && !globalHasRedirected) {
      globalHasRedirected = true;
      const check = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) { setShowContent(true); return; }
        } catch {
          // supabase not available
        }
        void navigate("/landing");
        return;
      };
      void check();
    } else {
      setShowContent(true);
    }
  }, [navigate, location]);

  // Register window bridges once (shared across all routes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as typeof window & {
      __oratio_addPrayer?: (prayer: PrayerRequest) => void;
      __oratio_removePrayer?: (prayerId: string) => void;
    }).__oratio_addPrayer = (prayer: PrayerRequest) => {
      window.dispatchEvent(new CustomEvent("oratio-prayer-added", { detail: prayer }));
    };

    (window as typeof window & {
      __oratio_addPrayer?: (prayer: PrayerRequest) => void;
      __oratio_removePrayer?: (prayerId: string) => void;
    }).__oratio_removePrayer = (prayerId: string) => {
      window.dispatchEvent(new CustomEvent("oratio-prayer-removed", { detail: prayerId }));
    };

    return () => {
      (window as typeof window & {
        __oratio_addPrayer?: (prayer: PrayerRequest) => void;
        __oratio_removePrayer?: (prayerId: string) => void;
      }).__oratio_addPrayer = undefined;
      (window as typeof window & {
        __oratio_addPrayer?: (prayer: PrayerRequest) => void;
        __oratio_removePrayer?: (prayerId: string) => void;
      }).__oratio_removePrayer = undefined;
    };
  }, []);

  if (!showContent) return null;

  return (
    <div
      className="w-full relative font-sans"
      style={{ height: "100dvh" }}
    >
      <Header />
      <main className="w-full h-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
