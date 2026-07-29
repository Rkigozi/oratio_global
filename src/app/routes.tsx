
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout/layout";
import { AuthGuard } from "./components/auth/auth-guard";
import { RouteErrorBoundary } from "./components/route-error-boundary";
import { FullPageLoadingSpinner } from "./components/loading-spinner";
import {
  loadFeed,
  loadHome,
  loadInfo,
  loadLanding,
  loadLogin,
  loadModerate,
  loadNotFound,
  loadOnboarding,
  loadPrayerCircle,
  loadPrayerDetail,
  loadPrivacy,
  loadProfile,
  loadProfilePrayed,
  loadProfileSaved,
  loadProfileSettings,
  loadProfileSubmitted,
  loadResetPassword,
  loadSubmit,
  loadTerms,
  loadUpdatePassword,
  loadUserProfile,
} from "./route-loaders";

const Home = lazy(loadHome);
const Feed = lazy(loadFeed);
const Submit = lazy(loadSubmit);
const Profile = lazy(loadProfile);
const ProfileSubmitted = lazy(loadProfileSubmitted);
const ProfilePrayed = lazy(loadProfilePrayed);
const ProfileSaved = lazy(loadProfileSaved);
const ProfileSettings = lazy(loadProfileSettings);
const Landing = lazy(loadLanding);
const Onboarding = lazy(loadOnboarding);
const Login = lazy(loadLogin);
const ResetPassword = lazy(loadResetPassword);
const UpdatePassword = lazy(loadUpdatePassword);
const Privacy = lazy(loadPrivacy);
const Terms = lazy(loadTerms);
const Info = lazy(loadInfo);
const PrayerDetail = lazy(loadPrayerDetail);
const Moderate = lazy(loadModerate);
const UserProfile = lazy(loadUserProfile);
const PrayerCircle = lazy(loadPrayerCircle);
const NotFound = lazy(loadNotFound);

function SuspenseWrapper({ Component }: { Component: React.LazyExoticComponent<() => React.ReactNode> }) {
  return (
    <Suspense fallback={<FullPageLoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
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
    ],
  },
]);
