import { ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { BetaBadge } from '../beta-badge';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export function Header({ showBack: propShowBack = false, title }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we should show back button
  const showBack = propShowBack || (location.pathname !== '/' && 
    !['/feed', '/submit', '/profile'].includes(location.pathname));
  
  // Determine title based on route if not provided
  const routeTitle = title || (() => {
    if (location.pathname === '/profile/submitted') return 'Submitted Prayers';
    if (location.pathname === '/profile/prayed') return 'Prayed For';
    if (location.pathname === '/profile/saved') return 'Saved Prayers';
    return undefined;
  })();
  
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between py-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      style={{
        minHeight: "calc(3.5rem + env(safe-area-inset-top))",
        background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.97) 40%, rgba(var(--rgb-bg), 0))",
      }}
    >
      {/* Left side: Back button or empty spacer */}
      <div className="w-11">
        {showBack ? (
          <button
            onClick={() => void navigate(-1)}
            className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-accent/10 active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
        ) : null}
      </div>
      
      {/* Center: Title or ORATIO logo */}
      <div className="flex-1 flex justify-center">
        {routeTitle ? (
          <h2 className="font-heading text-text-secondary text-sm font-medium truncate max-w-[200px]">
            {routeTitle}
          </h2>
        ) : (
          <div className="flex items-center gap-2">
            <h1
              className="font-heading tracking-[0.25em] text-text-secondary"
              style={{
                fontSize: "0.95rem",
                fontWeight: 300,
                textShadow: "0 0 30px rgba(var(--rgb-accent), 0.2)",
              }}
            >
              ORATIO
            </h1>
            <BetaBadge />
          </div>
        )}
      </div>
      
      {/* Right side: spacer for symmetry */}
      <div className="w-11" />
    </header>
  );
}