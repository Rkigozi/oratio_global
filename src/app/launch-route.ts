const DEFAULT_LOGIN_NEXT_PATHS = new Set(['/', '/feed', '/landing']);

export function getSafeNextPath(search: string) {
  const next = new URLSearchParams(search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function getLaunchRedirect({
  isStandalone,
  pathname,
  search,
  signedIn,
}: {
  isStandalone: boolean;
  pathname: string;
  search: string;
  signedIn: boolean;
}) {
  if (!isStandalone) return null;

  if (signedIn) {
    if (pathname === '/login') {
      return getSafeNextPath(search) ?? '/feed';
    }

    if (pathname === '/' || pathname === '/landing' || pathname === '/onboarding') {
      return '/feed';
    }

    return null;
  }

  if (pathname === '/' || pathname === '/onboarding') {
    return '/landing';
  }

  if (pathname !== '/login') {
    return null;
  }

  const nextPath = getSafeNextPath(search);
  return !nextPath || DEFAULT_LOGIN_NEXT_PATHS.has(nextPath) ? '/landing' : null;
}

export function isStandaloneLaunch() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true;
}
