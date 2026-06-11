import { lazy, Suspense } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/layout";

const Landing = lazy(() => import("./pages/landing").then(m => ({ default: m.Landing })));
const Info = lazy(() => import("./pages/info").then(m => ({ default: m.Info })));

function SuspenseWrapper({ Component }: { Component: React.LazyExoticComponent<() => React.ReactNode> }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center w-full h-dvh" style={{ background: "#0A1A3A" }}>
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(124,143,255,0.2)] border-t-[#7c8fff] animate-spin" />
      </div>
    }>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <SuspenseWrapper Component={Landing} /> },
      { path: "info", element: <SuspenseWrapper Component={Info} /> },
    ],
  },
  { path: "*", loader: () => redirect("/") },
]);
