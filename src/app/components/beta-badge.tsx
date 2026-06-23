import { cn } from "../../lib/utils";
import { BETA } from "../config";

export function BetaBadge({ className }: { className?: string }) {
  if (!BETA.isBeta) return null;
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-full",
        className
      )}
      style={{
        background: "rgba(var(--rgb-accent), 0.1)",
        color: "rgb(var(--rgb-accent))",
      }}
    >
      {BETA.label}
    </span>
  );
}
