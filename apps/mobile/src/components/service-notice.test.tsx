import { useEffect, useState } from 'react';
import { expect, it, jest } from '@jest/globals';
import { TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useServiceNotice } from '../hooks/use-service-notice';
import { ServiceNoticeShell } from './service-notice';
import { formatNoticeWindow } from '@oratio/shared/service-notice';

jest.mock('../hooks/use-service-notice', () => ({ useServiceNotice: jest.fn() }));
jest.mock('lucide-react-native', () => ({ Info: () => null, X: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});
const mockNotice = jest.mocked(useServiceNotice);
const dismiss = jest.fn();
const notice = {
  id: 'one',
  title: 'Maintenance',
  message: 'Brief interruption.',
  startsAt: '',
  endsAt: '',
};

it('renders maintenance dates in the device timezone alongside the title and details', () => {
  const maintenance = {
    startsAt: '2026-10-07T00:30:00.000Z',
    endsAt: '2026-10-07T02:30:00.000Z',
  };
  mockNotice.mockReturnValue({ notice: { ...notice, maintenance }, dismiss });
  render(<ServiceNoticeShell>{null}</ServiceNoticeShell>);
  expect(screen.getByText(notice.title)).toBeTruthy();
  expect(screen.getByText(notice.message)).toBeTruthy();
  expect(screen.getByText(`Maintenance: ${formatNoticeWindow(maintenance)}`)).toBeTruthy();
});

it('does not present the banner display period as maintenance dates on a text-only notice', () => {
  mockNotice.mockReturnValue({ notice, dismiss });
  render(<ServiceNoticeShell>{null}</ServiceNoticeShell>);
  expect(screen.queryByText(/^Maintenance:/)).toBeNull();
  expect(screen.getByText(notice.message)).toBeTruthy();
});

it('keeps the prayer draft mounted while a notice appears and disappears', () => {
  const mounts = jest.fn();
  function Draft() {
    const [text, setText] = useState('');
    useEffect(() => {
      mounts();
    }, []);
    return <TextInput accessibilityLabel="Prayer draft" value={text} onChangeText={setText} />;
  }
  mockNotice.mockReturnValue({ notice: null, dismiss });
  const { rerender } = render(
    <ServiceNoticeShell>
      <Draft />
    </ServiceNoticeShell>
  );
  fireEvent.changeText(screen.getByLabelText('Prayer draft'), 'Keep my prayer');
  mockNotice.mockReturnValue({ notice, dismiss });
  rerender(
    <ServiceNoticeShell>
      <Draft />
    </ServiceNoticeShell>
  );
  expect(screen.getByText('Maintenance')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Dismiss service notice'));
  expect(dismiss).toHaveBeenCalled();
  mockNotice.mockReturnValue({ notice: null, dismiss });
  rerender(
    <ServiceNoticeShell>
      <Draft />
    </ServiceNoticeShell>
  );
  expect(screen.getByLabelText('Prayer draft').props.value).toBe('Keep my prayer');
  expect(mounts).toHaveBeenCalledTimes(1);
});
