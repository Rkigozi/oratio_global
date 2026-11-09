import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../../App';
import { useAuth } from '../hooks/auth-context';

jest.mock('../services/supabase', () => ({}));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: never) => children,
}));
jest.mock('@react-navigation/native', () => ({
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
  NavigationContainer: ({ children }: never) => children,
}));
jest.mock('../hooks/auth-context', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: never) => children,
}));
jest.mock('../hooks/theme-context', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('../hooks/theme-provider', () => ({ ThemeProvider: ({ children }: never) => children }));
jest.mock('../hooks/activity-updates-context', () => ({
  ActivityUpdatesProvider: ({ children }: never) => children,
}));
jest.mock('../components/service-notice', () => ({
  ServiceNoticeShell: ({ children }: never) => children,
}));
jest.mock('./index', () => ({
  RootNavigator: () => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    const [draft, setDraft] = React.useState('No previous account draft');
    return (
      <View>
        <Text>{draft}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compose fixture draft"
          onPress={() => setDraft('Synthetic private draft')}
        />
      </View>
    );
  },
}));

describe('account-scoped app content', () => {
  const account = (id: string | null) =>
    jest.mocked(useAuth).mockReturnValue({ user: id ? { id } : null } as never);
  beforeEach(() => {
    account('account-a');
  });

  it('remounts navigation and local drafts on direct account change and sign-out', () => {
    const view = render(<App />);
    fireEvent.press(screen.getByLabelText('Compose fixture draft'));
    expect(screen.getByText('Synthetic private draft')).toBeTruthy();
    view.rerender(<App />);
    expect(screen.getByText('Synthetic private draft')).toBeTruthy();
    account('account-b');
    view.rerender(<App />);
    expect(screen.queryByText('Synthetic private draft')).toBeNull();
    expect(screen.getByText('No previous account draft')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Compose fixture draft'));
    account(null);
    view.rerender(<App />);
    expect(screen.queryByText('Synthetic private draft')).toBeNull();
  });
});
