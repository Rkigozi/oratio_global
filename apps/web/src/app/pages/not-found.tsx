import { useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-dvh gap-4 px-6"
      style={{ background: "rgb(var(--rgb-bg))" }}
    >
      <p className="text-accent text-4xl font-heading font-light">404</p>
      <p className="text-text-muted text-sm">Page not found</p>
      <p className="text-text-dim text-xs text-center max-w-xs">
        This page doesn&apos;t exist or has been moved.
      </p>
      <button
        onClick={() => void navigate("/")}
        className="px-5 py-2 rounded-full text-xs text-accent border border-accent/20 hover:border-accent/40 transition-colors cursor-pointer"
      >
        Go home
      </button>
    </div>
  );
}
