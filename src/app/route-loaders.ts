import type { ReactNode } from "react";

type RouteComponent = () => ReactNode;
type RouteLoader = () => Promise<{ default: RouteComponent }>;

export const loadHome: RouteLoader = () =>
  import("./pages/feed/home").then((m) => ({ default: m.Home }));

export const loadFeed: RouteLoader = () =>
  import("./pages/feed/feed").then((m) => ({ default: m.Feed }));

export const loadSubmit: RouteLoader = () =>
  import("./pages/prayer/submit").then((m) => ({ default: m.Submit }));

export const loadProfile: RouteLoader = () =>
  import("./pages/profile/profile").then((m) => ({ default: m.Profile }));

export const loadProfileSubmitted: RouteLoader = () =>
  import("./pages/profile/profile-submitted").then((m) => ({ default: m.ProfileSubmitted }));

export const loadProfilePrayed: RouteLoader = () =>
  import("./pages/profile/profile-prayed").then((m) => ({ default: m.ProfilePrayed }));

export const loadProfileSaved: RouteLoader = () =>
  import("./pages/profile/profile-saved").then((m) => ({ default: m.ProfileSaved }));

export const loadProfileSettings: RouteLoader = () =>
  import("./pages/profile/profile-settings").then((m) => ({ default: m.ProfileSettings }));

export const loadLanding: RouteLoader = () =>
  import("./pages/landing").then((m) => ({ default: m.Landing }));

export const loadOnboarding: RouteLoader = () =>
  import("./pages/auth/onboarding").then((m) => ({ default: m.Onboarding }));

export const loadLogin: RouteLoader = () =>
  import("./pages/auth/login").then((m) => ({ default: m.Login }));

export const loadResetPassword: RouteLoader = () =>
  import("./pages/auth/reset-password").then((m) => ({ default: m.ResetPassword }));

export const loadUpdatePassword: RouteLoader = () =>
  import("./pages/auth/update-password").then((m) => ({ default: m.UpdatePassword }));

export const loadPrivacy: RouteLoader = () =>
  import("./pages/info/privacy").then((m) => ({ default: m.Privacy }));

export const loadTerms: RouteLoader = () =>
  import("./pages/info/terms").then((m) => ({ default: m.Terms }));

export const loadInfo: RouteLoader = () =>
  import("./pages/info/info").then((m) => ({ default: m.Info }));

export const loadPrayerDetail: RouteLoader = () =>
  import("./pages/prayer/prayer-detail").then((m) => ({ default: m.PrayerDetail }));

export const loadModerate: RouteLoader = () =>
  import("./pages/moderate").then((m) => ({ default: m.Moderate }));

export const loadUserProfile: RouteLoader = () =>
  import("./pages/profile/user-profile").then((m) => ({ default: m.UserProfile }));

export const loadPrayerCircle: RouteLoader = () =>
  import("./pages/profile/prayer-circle").then((m) => ({ default: m.PrayerCircle }));

export const loadNotFound: RouteLoader = () =>
  import("./pages/not-found").then((m) => ({ default: m.NotFound }));

const preloadCache = new Map<RouteLoader, Promise<unknown>>();

const routeLoadersByPath = new Map<string, RouteLoader>([
  ["/", loadHome],
  ["/feed", loadFeed],
  ["/submit", loadSubmit],
  ["/profile", loadProfile],
  ["/profile/circle", loadPrayerCircle],
  ["/profile/submitted", loadProfileSubmitted],
  ["/profile/prayed", loadProfilePrayed],
  ["/profile/saved", loadProfileSaved],
  ["/profile/settings", loadProfileSettings],
  ["/info", loadInfo],
  ["/landing", loadLanding],
  ["/login", loadLogin],
  ["/reset-password", loadResetPassword],
  ["/update-password", loadUpdatePassword],
  ["/privacy", loadPrivacy],
  ["/terms", loadTerms],
  ["/onboarding", loadOnboarding],
]);

const authenticatedPreloadLoaders = [loadHome, loadFeed, loadSubmit, loadProfile];
const publicPreloadLoaders = [loadLanding, loadLogin, loadOnboarding, loadResetPassword];

function preloadRouteLoader(loader: RouteLoader) {
  const cached = preloadCache.get(loader);
  if (cached) return cached;

  const request = loader().catch((error: unknown) => {
    preloadCache.delete(loader);
    throw error;
  });
  preloadCache.set(loader, request);
  return request;
}

export function preloadRoutePath(path: string) {
  const pathname = path.split("?")[0].split("#")[0] || "/";
  const loader = routeLoadersByPath.get(pathname);
  if (!loader) return;

  void preloadRouteLoader(loader);
}

export function preloadAuthenticatedRoutes() {
  authenticatedPreloadLoaders.forEach((loader) => {
    void preloadRouteLoader(loader);
  });
}

export function preloadPublicRoutes() {
  publicPreloadLoaders.forEach((loader) => {
    void preloadRouteLoader(loader);
  });
}
