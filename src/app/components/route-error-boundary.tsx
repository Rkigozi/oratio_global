import { useEffect, useState } from "react";
import { useRouteError } from "react-router";
import {
  isModuleScriptLoadError,
  recoverFromModuleScriptLoadError,
  shouldWaitForConnectionBeforeRecovery,
} from "../../lib/pwa-recovery";
import { logError } from "../../lib/logger";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const isUpdateError = isModuleScriptLoadError(error);
  const [isOffline, setIsOffline] = useState(() => shouldWaitForConnectionBeforeRecovery());

  useEffect(() => {
    logError("RouteErrorBoundary", error);

    if (isUpdateError && !isOffline) {
      void recoverFromModuleScriptLoadError(error);
    }
  }, [error, isOffline, isUpdateError]);

  useEffect(() => {
    const updateConnectionState = () => {
      setIsOffline(shouldWaitForConnectionBeforeRecovery());
    };

    window.addEventListener("online", updateConnectionState);
    window.addEventListener("offline", updateConnectionState);

    return () => {
      window.removeEventListener("online", updateConnectionState);
      window.removeEventListener("offline", updateConnectionState);
    };
  }, []);

  const title = isUpdateError && isOffline
    ? "You're offline"
    : isUpdateError
      ? "Updating Oratio"
      : "Something went wrong";

  const message = isUpdateError && isOffline
    ? "Reconnect to the internet, then reload to open this screen."
    : isUpdateError
      ? "The app found an older cached version. Reload to open the latest version."
      : "We couldn't load this screen. Please reload the app and try again.";

  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        background: "rgb(var(--rgb-bg))",
        color: "rgb(var(--rgb-text))",
      }}
    >
      <p className="text-text-muted text-sm">{title}</p>
      <p className="text-text-dim max-w-xs text-xs">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="cursor-pointer rounded-full border border-accent/20 px-5 py-2 text-xs text-accent transition-colors hover:border-accent/40"
      >
        Reload app
      </button>
    </div>
  );
}
