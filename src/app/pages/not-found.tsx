import { useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-dvh gap-4 px-6"
      style={{ background: "#0A1A3A" }}
    >
      <p className="text-[#7c8fff] text-4xl font-heading font-light">404</p>
      <p className="text-[#6b7499] text-sm">Page not found</p>
      <p className="text-[#4e5573] text-xs text-center max-w-xs">
        This page doesn't exist or has been moved.
      </p>
      <button
        onClick={() => void navigate("/")}
        className="px-5 py-2 rounded-full text-xs text-[#7c8fff] border border-[rgba(124,143,255,0.2)] hover:border-[rgba(124,143,255,0.4)] transition-colors cursor-pointer"
      >
        Go home
      </button>
    </div>
  );
}
