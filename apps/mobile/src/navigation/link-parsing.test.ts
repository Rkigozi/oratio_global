import { describe, expect, it } from '@jest/globals';
import { getPathFromState, getStateFromPath } from '@react-navigation/native';

const config = {
  screens: {
    PrayerDetail: 'prayer/:prayerId',
    UserProfile: 'profile/:username',
  },
};

describe('navigation parser security upgrade', () => {
  it('preserves prayer identifiers and encoded query text', () => {
    const state = getStateFromPath('/prayer/abc-123?note=hope%20%26%20peace', config);
    expect(state?.routes[0]).toMatchObject({
      name: 'PrayerDetail',
      params: { prayerId: 'abc-123', note: 'hope & peace' },
    });
  });

  it('round-trips profile route parameters', () => {
    const state = { routes: [{ name: 'UserProfile', params: { username: 'test_user' } }] };
    const path = getPathFromState(state, config);
    expect(getStateFromPath(path, config)?.routes[0]).toMatchObject(state.routes[0]);
  });

  it.each(['%', '%ZZ', '%E0%A4%A', '%FE%FF'.repeat(1000)])(
    'handles malformed query encoding without crashing (%#)',
    (query) => {
      const state = getStateFromPath(`/prayer/abc-123?note=${query}`, config);
      expect(state?.routes[0]).toMatchObject({
        name: 'PrayerDetail',
        params: { prayerId: 'abc-123' },
      });
    }
  );

  it('does not match unknown routes', () => {
    expect(getStateFromPath('/not-a-route', config)).toBeUndefined();
  });
});
