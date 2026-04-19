import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export function Header({ showBack = false, title }: HeaderProps) {
  const navigate = useNavigate();
  
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between py-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      style={{
        background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.95) 20%, rgba(10, 26, 58, 0))",
      }}
    >
      {/* Left side: Back button or empty spacer */}
      <div className="w-10">
        {showBack ? (
          <button
            onClick={() => void navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-[rgba(124,143,255,0.1)] active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-[#c5cbe2]" />
          </button>
        ) : null}
      </div>
      
      {/* Center: Title or ORATIO logo */}
      <div className="flex-1 flex justify-center">
        {title ? (
          <h2 className="font-heading text-[#c5cbe2] text-sm font-medium truncate max-w-[200px]">
            {title}
          </h2>
        ) : (
          <h1
            className="font-heading tracking-[0.25em] text-[#c5cbe2]"
            style={{
              fontSize: "0.95rem",
              fontWeight: 300,
              textShadow: "0 0 30px rgba(124, 143, 255, 0.2)",
            }}
          >
            ORATIO
          </h1>
        )}
      </div>
      
      {/* Right side: spacer for symmetry */}
      <div className="w-10" />
    </header>
  );
}