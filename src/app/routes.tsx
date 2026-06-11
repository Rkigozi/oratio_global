
import { lazy, Suspense } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/layout";

const Home = lazy(() => import("./pages/home").then(m => ({ default: m.Home })));
const Feed = lazy(() => import("./pages/feed").then(m => ({ default: m.Feed })));
const Submit = lazy(() => import("./pages/submit").then(m => ({ default: m.Submit })));
const Profile = lazy(() => import("./pages/profile").then(m => ({ default: m.Profile })));
const ProfileSubmitted = lazy(() => import("./pages/profile-submitted").then(m => ({ default: m.ProfileSubmitted })));
const ProfilePrayed = lazy(() => import("./pages/profile-prayed").then(m => ({ default: m.ProfilePrayed })));
const ProfileSaved = lazy(() => import("./pages/profile-saved").then(m => ({ default: m.ProfileSaved })));
const Landing = lazy(() => import("./pages/landing").then(m => ({ default: m.Landing })));
const Onboarding = lazy(() => import("./pages/onboarding").then(m => ({ default: m.Onboarding })));
const Login = lazy(() => import("./pages/login").then(m => ({ default: m.Login })));
const Info = lazy(() => import("./pages/info").then(m => ({ default: m.Info })));
const PrayerDetail = lazy(() => import("./pages/prayer-detail").then(m => ({ default: m.PrayerDetail })));
const Moderate = lazy(() => import("./pages/moderate").then(m => ({ default: m.Moderate })));

function SuspenseWrapper({ Component }: { Component: React.LazyExoticComponent<() => React.ReactNode> }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center w-full h-full" style={{ background: "#0A1A3A" }}>
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(124,143,255,0.2)] border-t-[#7c8fff] animate-spin" />
      </div>
    }>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/landing", element: <SuspenseWrapper Component={Landing} /> },
  { path: "/onboarding", element: <SuspenseWrapper Component={Onboarding} /> },
  { path: "/login", element: <SuspenseWrapper Component={Login} /> },
  { path: "/prayer/:id", element: <SuspenseWrapper Component={PrayerDetail} /> },
  { path: "/moderate", element: <SuspenseWrapper Component={Moderate} /> },

  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <SuspenseWrapper Component={Home} /> },
      { path: "feed", element: <SuspenseWrapper Component={Feed} /> },
      { path: "submit", element: <SuspenseWrapper Component={Submit} /> },
      { path: "profile", element: <SuspenseWrapper Component={Profile} /> },
      { path: "profile/submitted", element: <SuspenseWrapper Component={ProfileSubmitted} /> },
      { path: "profile/prayed", element: <SuspenseWrapper Component={ProfilePrayed} /> },
      { path: "profile/saved", element: <SuspenseWrapper Component={ProfileSaved} /> },
      { path: "info", element: <SuspenseWrapper Component={Info} /> },
    ],
  },

  { path: "*", loader: () => redirect("/") },
]);
