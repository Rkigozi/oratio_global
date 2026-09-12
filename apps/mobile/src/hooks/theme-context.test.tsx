import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { useTheme } from './theme-context';
import { ThemeProvider } from './theme-provider';

let mockUser: { id: string } | null = null;
const mockSingle = jest.fn<
  () => Promise<{
    data: { preferences: Record<string, unknown> } | null;
    error: unknown;
  }>
>();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('./auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
    }),
  },
}));

describe('ThemeProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = null;
    mockSingle.mockResolvedValue({ data: null, error: null });
    await AsyncStorage.clear();
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores a persisted appearance and applies it natively', async () => {
    await AsyncStorage.setItem('oratio_theme', 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    await waitFor(() => expect(result.current.themeMode).toBe('dark'));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('switches modes immediately and persists the selection', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    await waitFor(() => expect(Appearance.setColorScheme).toHaveBeenCalledWith('unspecified'));

    act(() => result.current.setThemeMode('light'));

    expect(result.current.themeMode).toBe('light');
    expect(result.current.theme).toBe('light');
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('light');
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('oratio_theme', 'light'));
  });

  it('uses a valid signed-in profile preference after local hydration', async () => {
    mockUser = { id: 'user-1' };
    mockSingle.mockResolvedValue({ data: { preferences: { theme: 'dark' } }, error: null });

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    await waitFor(() => expect(result.current.themeMode).toBe('dark'));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
    expect(mockSingle).toHaveBeenCalled();
  });
});
