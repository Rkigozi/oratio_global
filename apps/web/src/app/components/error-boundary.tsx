import { Component } from "react";
import type { ReactNode } from "react";
import { logError } from "../../lib/logger";
import {
  isModuleScriptLoadError,
  recoverFromModuleScriptLoadError,
  shouldWaitForConnectionBeforeRecovery,
} from "../../lib/pwa-recovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError("ErrorBoundary", error, { componentStack: errorInfo.componentStack });
    if (isModuleScriptLoadError(error) && !shouldWaitForConnectionBeforeRecovery()) {
      void recoverFromModuleScriptLoadError(error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isUpdateError = this.state.error && isModuleScriptLoadError(this.state.error);
      const isOfflineUpdateError = isUpdateError && shouldWaitForConnectionBeforeRecovery();
      const title = isOfflineUpdateError
        ? "You're offline"
        : isUpdateError
          ? "Updating Oratio"
          : "Something went wrong";
      const message = isOfflineUpdateError
        ? "Reconnect to the internet, then reload to open this screen."
        : isUpdateError
          ? "The app found an older cached version. Reload to open the latest version."
          : "An unexpected error occurred. Please try refreshing the page.";

      return (
        <div
          className="flex flex-col items-center justify-center w-full h-dvh gap-4 px-6"
          style={{ background: "rgb(var(--rgb-bg))" }}
        >
          <p className="text-text-muted text-sm">{title}</p>
          <p className="text-text-dim text-xs text-center max-w-xs">
            {message}
          </p>
          <button
            onClick={isUpdateError ? () => window.location.reload() : this.handleReset}
            className="px-5 py-2 rounded-full text-xs text-accent border border-accent/20 hover:border-accent/40 transition-colors cursor-pointer"
          >
            {isUpdateError ? "Reload app" : "Try again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
