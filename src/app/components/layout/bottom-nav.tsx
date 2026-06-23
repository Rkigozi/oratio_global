import { Globe, Heart, PenLine, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

const navItems = [
  { path: "/", label: "Map", icon: Globe },
  { path: "/feed", label: "Feed", icon: Heart },
  { path: "/submit", label: "Submit", icon: PenLine },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bottom-nav-safe" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="max-w-lg mx-auto flex justify-around items-center border-t border-accent/8" style={{ height: "49px" }}>
        {navItems.map((item) => {
          const isActive = item.path === '/' 
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => void navigate(item.path)}
              className="relative flex flex-col items-center justify-center transition-all cursor-pointer"
              style={{ minHeight: "44px", minWidth: "44px" }}
            >
              <Icon
                size={20}
                className={isActive ? "text-accent" : "text-text-muted"}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={`text-[10px] leading-none mt-0.5 ${isActive ? "text-accent" : "text-text-muted"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-accent absolute -bottom-0.5" style={{ boxShadow: "0 0 6px rgba(var(--rgb-accent), 0.6)" }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
