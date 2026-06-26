
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout/layout";
import { AuthGuard } from "./components/auth/auth-guard";

const Home = lazy(() => import("./pages/feed/home").then(m => ({ default: m.Home })));
const Feed = lazy(() => import("./pages/feed/feed").then(m => ({ default: m.Feed })));
const Submit = lazy(() => import("./pages/prayer/submit").then(m => ({ default: m.Submit })));
const Profile = lazy(() => import("./pages/profile/profile").then(m => ({ default: m.Profile })));
const ProfileSubmitted = lazy(() => import("./pages/profile/profile-submitted").then(m => ({ default: m.ProfileSubmitted })));
const ProfilePrayed = lazy(() => import("./pages/profile/profile-prayed").then(m => ({ default: m.ProfilePrayed })));
const ProfileSaved = lazy(() => import("./pages/profile/profile-saved").then(m => ({ default: m.ProfileSaved })));
const ProfileSettings = lazy(() => import("./pages/profile/profile-settings").then(m => ({ default: m.ProfileSettings })));
const Landing = lazy(() => import("./pages/landing").then(m => ({ default: m.Landing })));
const Onboarding = lazy(() => import("./pages/auth/onboarding").then(m => ({ default: m.Onboarding })));
const Login = lazy(() => import("./pages/auth/login").then(m => ({ default: m.Login })));
const ResetPassword = lazy(() => import("./pages/auth/reset-password").then(m => ({ default: m.ResetPassword })));
const UpdatePassword = lazy(() => import("./pages/auth/update-password").then(m => ({ default: m.UpdatePassword })));
const Privacy = lazy(() => import("./pages/info/privacy").then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/info/terms").then(m => ({ default: m.Terms })));
const Info = lazy(() => import("./pages/info/info").then(m => ({ default: m.Info })));
const PrayerDetail = lazy(() => import("./pages/prayer/prayer-detail").then(m => ({ default: m.PrayerDetail })));
const Moderate = lazy(() => import("./pages/moderate").then(m => ({ default: m.Moderate })));
const UserProfile = lazy(() => import("./pages/profile/user-profile").then(m => ({ default: m.UserProfile })));
const PrayerCircle = lazy(() => import("./pages/profile/prayer-circle").then(m => ({ default: m.PrayerCircle })));
const NotFound = lazy(() => import("./pages/not-found").then(m => ({ default: m.NotFound })));

function SuspenseWrapper({ Component }: { Component: React.LazyExoticComponent<() => React.ReactNode> }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center w-full h-full" style={{ background: "rgb(var(--rgb-bg))" }}>
        <div className="w-6 h-6 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      </div>
    }>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/landing", element: <SuspenseWrapper Component={Landing} /> },
  { path: "/login", element: <SuspenseWrapper Component={Login} /> },
  { path: "/reset-password", element: <SuspenseWrapper Component={ResetPassword} /> },
  { path: "/update-password", element: <SuspenseWrapper Component={UpdatePassword} /> },
  { path: "/privacy", element: <SuspenseWrapper Component={Privacy} /> },
  { path: "/terms", element: <SuspenseWrapper Component={Terms} /> },
  { path: "/onboarding", element: <SuspenseWrapper Component={Onboarding} /> },

  {
    Component: AuthGuard,
    children: [
      { path: "/prayer/:id", element: <SuspenseWrapper Component={PrayerDetail} /> },
      { path: "/moderate", element: <SuspenseWrapper Component={Moderate} /> },
      { path: "/user/:name", element: <SuspenseWrapper Component={UserProfile} /> },

      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, element: <SuspenseWrapper Component={Home} /> },
          { path: "feed", element: <SuspenseWrapper Component={Feed} /> },
          { path: "submit", element: <SuspenseWrapper Component={Submit} /> },
          { path: "profile", element: <SuspenseWrapper Component={Profile} /> },
          { path: "profile/circle", element: <SuspenseWrapper Component={PrayerCircle} /> },
          { path: "profile/submitted", element: <SuspenseWrapper Component={ProfileSubmitted} /> },
          { path: "profile/prayed", element: <SuspenseWrapper Component={ProfilePrayed} /> },
          { path: "profile/saved", element: <SuspenseWrapper Component={ProfileSaved} /> },
          { path: "profile/settings", element: <SuspenseWrapper Component={ProfileSettings} /> },
          { path: "info", element: <SuspenseWrapper Component={Info} /> },
        ],
      },
    ],
  },

  { path: "*", element: <SuspenseWrapper Component={NotFound} /> },
]);
