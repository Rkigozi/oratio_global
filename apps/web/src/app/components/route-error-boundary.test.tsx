import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouteErrorBoundary } from './route-error-boundary';

const recoveryMock = vi.hoisted(() => ({
  recoverFromModuleScriptLoadError: vi.fn(),
}));
const routeErrorMock = vi.hoisted(() => ({ error: null as unknown }));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useRouteError: () => routeErrorMock.error,
  };
});

vi.mock('../../lib/pwa-recovery', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/pwa-recovery')>('../../lib/pwa-recovery');

  return {
    ...actual,
    recoverFromModuleScriptLoadError: recoveryMock.recoverFromModuleScriptLoadError,
  };
});

function renderRouteError(error: Error) {
  routeErrorMock.error = error;
  render(<RouteErrorBoundary />);
}

describe('RouteErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    recoveryMock.recoverFromModuleScriptLoadError.mockResolvedValue(true);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  it('shows update recovery UI for module script import failures', async () => {
    renderRouteError(new Error('Importing a module script failed.'));

    expect(await screen.findByText('Updating Oratio')).toBeTruthy();
    expect(screen.getByText('Reload app')).toBeTruthy();
    await waitFor(() => {
      expect(recoveryMock.recoverFromModuleScriptLoadError).toHaveBeenCalled();
    });
  });

  it('shows offline recovery UI without clearing caches when chunk loading fails offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    renderRouteError(new Error('Importing a module script failed.'));

    expect(await screen.findByText("You're offline")).toBeTruthy();
    expect(
      screen.getByText('Reconnect to the internet, then reload to open this screen.')
    ).toBeTruthy();
    expect(recoveryMock.recoverFromModuleScriptLoadError).not.toHaveBeenCalled();
  });

  it('shows generic UI for other route errors', async () => {
    renderRouteError(new Error('Profile route failed.'));

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(
      screen.getByText("We couldn't load this screen. Please reload the app and try again.")
    ).toBeTruthy();
    expect(recoveryMock.recoverFromModuleScriptLoadError).not.toHaveBeenCalled();
  });
});
