import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { MockAuthProvider } from "./auth-context";

interface TestWrapperProps {
  children: ReactNode;
  initialEntries?: string[];
  authOverrides?: Record<string, unknown>;
}

export function TestWrapper({ children, initialEntries = ["/"] }: TestWrapperProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </MemoryRouter>
  );
}
