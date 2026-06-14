import { motion } from "motion/react";

export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        className="w-8 h-8 rounded-full border-2 border-accent/15 border-t-accent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-text-muted text-xs mt-3">{text}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div
        className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle, rgba(var(--rgb-danger), 0.08), transparent)",
        }}
      >
        <span className="text-xl">⚠️</span>
      </div>
      <p className="text-text-muted text-sm mb-1 text-center">{message}</p>
      <p className="text-text-dim text-xs mb-4 text-center">Please try again later</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full text-xs text-accent bg-accent/8 border border-accent/12 cursor-pointer hover:bg-accent/12 transition-all"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
