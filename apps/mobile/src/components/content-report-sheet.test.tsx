import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ContentReportSheet } from './content-report-sheet';

jest.mock('lucide-react-native', () => ({
  CheckCircle2: () => null,
  Flag: () => null,
  Info: () => null,
  X: () => null,
}));

jest.mock('@oratio/shared/queries', () => ({
  createReport: jest.fn(),
}));

import { createReport } from '@oratio/shared/queries';

describe('ContentReportSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createReport).mockResolvedValue('created' as never);
  });

  it('submits the selected reason and confirms review', async () => {
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="prayer-1"
        reportableType="prayer"
        visible
      />
    );

    fireEvent.press(screen.getByText('Harmful or unsafe'));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        reportable_type: 'prayer',
        reportable_id: 'prayer-1',
        reason: 'Harmful or unsafe',
      })
    );
    expect(await screen.findByText(/Report sent for review/)).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('explains that a duplicate report is still pending', async () => {
    jest.mocked(createReport).mockResolvedValue('already_reported' as never);
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="comment-1"
        reportableType="comment"
        visible
      />
    );

    fireEvent.press(screen.getByText('Spam or fake'));

    expect(await screen.findByText(/already reported this comment/)).toBeTruthy();
  });

  it('asks for a fresh sign-in when the session has ended', async () => {
    jest.mocked(createReport).mockResolvedValue('unauthenticated' as never);
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="prayer-1"
        reportableType="prayer"
        visible
      />
    );

    fireEvent.press(screen.getByText('Something else'));

    expect(await screen.findByText(/session has ended/)).toBeTruthy();
    expect(screen.getByText('Something else')).toBeTruthy();
  });

  it('keeps the reasons available after a network failure', async () => {
    jest.mocked(createReport).mockResolvedValue('failed' as never);
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="comment-1"
        reportableType="comment"
        visible
      />
    );

    fireEvent.press(screen.getByText('Upsetting or graphic'));

    expect(await screen.findByText(/Check your connection/)).toBeTruthy();
    expect(screen.getByText('Upsetting or graphic')).toBeTruthy();
  });
});
