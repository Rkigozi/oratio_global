import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
  });

  it('defers passive pageview capture so PostHog does not load during first paint', async () => {
    const posthog = (await import('posthog-js')).default;
    const { capturePageView } = await import('./analytics');

    capturePageView('/landing');

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(6000);

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://eu.i.posthog.com',
        capture_pageview: false,
      })
    );
    expect(posthog.capture).toHaveBeenCalledWith(
      '$pageview',
      expect.objectContaining({ path: '/landing' })
    );
  });

  it('flushes queued passive captures when a user action needs immediate capture', async () => {
    const posthog = (await import('posthog-js')).default;
    const { captureEvent, capturePageView } = await import('./analytics');

    capturePageView('/landing');
    captureEvent('user_signed_in', { method: 'email' });

    await vi.runAllTimersAsync();

    expect(posthog.capture).toHaveBeenNthCalledWith(
      1,
      '$pageview',
      expect.objectContaining({ path: '/landing' })
    );
    expect(posthog.capture).toHaveBeenNthCalledWith(
      2,
      'user_signed_in',
      expect.objectContaining({ method: 'email' })
    );
  });
});
