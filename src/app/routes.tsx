
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/layout";

import { Home } from "./pages/home";
import { Feed } from "./pages/feed";
import { Submit } from "./pages/submit";
import { Profile } from "./pages/profile";
import { ProfileSubmitted } from "./pages/profile-submitted";
import { ProfilePrayed } from "./pages/profile-prayed";

import { Splash } from "./pages/splash";
import { Onboarding } from "./pages/onboarding";



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
      { path: "profile/submitted", Component: ProfileSubmitted },
      { path: "profile/prayed", Component: ProfilePrayed },
    ],
  },
  

  
  { path: "*", loader: () => redirect("/") },
]);