import { Component } from "react";
import type { ReactNode } from "react";

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

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="flex flex-col items-center justify-center w-full h-dvh gap-4 px-6"
          style={{ background: "#0A1A3A" }}
        >
          <p className="text-[#6b7499] text-sm">Something went wrong</p>
          <p className="text-[#4e5573] text-xs text-center max-w-xs">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2 rounded-full text-xs text-[#7c8fff] border border-[rgba(124,143,255,0.2)] hover:border-[rgba(124,143,255,0.4)] transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
