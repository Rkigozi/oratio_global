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
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(124,143,255,0.12)]"
      style={{
        background: "#0A1A3A",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all cursor-pointer"
            >
              <Icon
                size={20}
                className={
                  isActive ? "text-[#7c8fff]" : "text-[#8890b5]"
                }
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] ${
                  isActive ? "text-[#7c8fff]" : "text-[#8890b5]"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className="w-1 h-1 rounded-full bg-[#7c8fff]"
                  style={{ boxShadow: "0 0 6px rgba(124, 143, 255, 0.6)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}