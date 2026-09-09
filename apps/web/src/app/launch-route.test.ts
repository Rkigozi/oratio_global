import { describe, expect, it } from 'vitest';
import { getLaunchRedirect, getSafeNextPath } from './launch-route';

describe('getSafeNextPath', () => {
  it('returns a relative app path from login next params', () => {
    expect(getSafeNextPath('?next=%2Fprayer%2Fp1')).toBe('/prayer/p1');
  });

  it('rejects external-looking next params', () => {
    expect(getSafeNextPath('?next=https%3A%2F%2Fevil.example')).toBeNull();
    expect(getSafeNextPath('?next=%2F%2Fevil.example')).toBeNull();
  });
});

describe('getLaunchRedirect', () => {
  it('does nothing outside the installed app launch context', () => {
    expect(
      getLaunchRedirect({
        isStandalone: false,
        pathname: '/login',
        search: '',
        signedIn: false,
      })
    ).toBeNull();
  });

  it('sends signed-out standalone launches from root to landing', () => {
    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/',
        search: '',
        signedIn: false,
      })
    ).toBe('/landing');
  });

  it('sends signed-out stale login launches back to landing', () => {
    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/login',
        search: '',
        signedIn: false,
      })
    ).toBe('/landing');

    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/login',
        search: '?next=%2F',
        signedIn: false,
      })
    ).toBe('/landing');
  });

  it('preserves signed-out protected deep-link login routes', () => {
    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/login',
        search: '?next=%2Fprayer%2Fp1',
        signedIn: false,
      })
    ).toBeNull();
  });

  it('sends signed-in standalone launches to the feed', () => {
    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/landing',
        search: '',
        signedIn: true,
      })
    ).toBe('/feed');
  });

  it('sends signed-in login launches to their safe next path', () => {
    expect(
      getLaunchRedirect({
        isStandalone: true,
        pathname: '/login',
        search: '?next=%2Fprayer%2Fp1',
        signedIn: true,
      })
    ).toBe('/prayer/p1');
  });
});
