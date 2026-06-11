import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import { initAnalytics } from "../lib/analytics";

export default function App() {
  useEffect(() => { void initAnalytics(); }, []);
  return (
    <AuthProvider>
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0A1A3A',
        color: 'white',
      }}>
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}
