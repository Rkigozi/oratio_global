import { ArrowLeft } from "lucide-react";

type AuthBackButtonProps = {
  onClick: () => void;
};

export function AuthBackButton({ onClick }: AuthBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-4 z-20 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-text-muted transition-colors hover:bg-accent/8 hover:text-text-secondary active:scale-95"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      aria-label="Back"
    >
      <ArrowLeft size={16} />
      <span className="text-xs">Back</span>
    </button>
  );
}
