import React from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/layout";
import { DetailLayout } from "./components/detail-layout";
import { Home } from "./pages/home";
import { Feed } from "./pages/feed";
import { Submit } from "./pages/submit";
import { Profile } from "./pages/profile";
import { SubmittedPage } from "./pages/submitted-page";
import { PrayedForPage } from "./pages/prayed-for-page";
import { AnsweredPage } from "./pages/answered-page";
import { FollowingPage } from "./pages/following-page";
import { Splash } from "./pages/splash";
import { Onboarding } from "./pages/onboarding";

const SubmittedRoute = (props: any) => <DetailLayout {...props} title="Submitted Prayers" />;
const PrayedForRoute = (props: any) => <DetailLayout {...props} title="Prayed For" />;
const AnsweredRoute = (props: any) => <DetailLayout {...props} title="Answered Prayers" />;
const FollowingRoute = (props: any) => <DetailLayout {...props} title="Following" />;

export const router = createBrowserRouter([
  { path: "/splash", Component: Splash },
  { path: "/onboarding", Component: Onboarding },

  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "feed", Component: Feed },
      { path: "submit", Component: Submit },
      { path: "profile", Component: Profile },
    ],
  },
  
  // Profile detail pages (no bottom nav)
  { 
    path: "/profile/submitted", 
    Component: SubmittedRoute,
    children: [{ index: true, Component: SubmittedPage }] 
  },
  { 
    path: "/profile/prayed", 
    Component: PrayedForRoute,
    children: [{ index: true, Component: PrayedForPage }] 
  },
  { 
    path: "/profile/answered", 
    Component: AnsweredRoute,
    children: [{ index: true, Component: AnsweredPage }] 
  },
  { 
    path: "/profile/following", 
    Component: FollowingRoute,
    children: [{ index: true, Component: FollowingPage }] 
  },
  
  { path: "*", loader: () => redirect("/") },
]);