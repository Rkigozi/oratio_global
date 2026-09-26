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
    expect(createReport).not.toHaveBeenCalled();
    fireEvent.changeText(
      screen.getByLabelText('Additional details (optional)'),
      '  Repeated unsafe advice  '
    );
    fireEvent.press(screen.getByText('Submit report'));

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        reportable_type: 'prayer',
        reportable_id: 'prayer-1',
        reason: 'Harmful or unsafe',
        details: 'Repeated unsafe advice',
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
    fireEvent.press(screen.getByText('Submit report'));

    expect(await screen.findByText(/already reported this comment/)).toBeTruthy();
  });

  it.each(['prayer', 'comment'] as const)(
    'keeps oversized %s report details and enables submission after shortening to the limit',
    async (reportableType) => {
      render(
        <ContentReportSheet
          onClose={jest.fn()}
          reportableId="target-1"
          reportableType={reportableType}
          visible
        />
      );
      const details = screen.getByLabelText('Additional details (optional)');
      const submit = () => screen.getByLabelText('Submit report');
      fireEvent.press(screen.getByText('Something else'));
      expect(details.props.maxLength).toBeUndefined();

      fireEvent.changeText(details, 'x'.repeat(999));
      expect(screen.getByText('999/1000')).toBeTruthy();
      expect(submit().props.accessibilityState.disabled).toBe(false);
      fireEvent.changeText(details, 'x'.repeat(1000));
      expect(screen.getByText('Character limit reached (1000 characters).')).toBeTruthy();
      expect(submit().props.accessibilityState.disabled).toBe(false);

      fireEvent.changeText(details, 'x'.repeat(1001));
      expect(screen.getByText('1001/1000')).toBeTruthy();
      expect(screen.getByRole('alert').props.children).toBe(
        '1 character over the 1000-character limit. Shorten your details to submit.'
      );
      expect(details.props.value).toBe('x'.repeat(1001));
      expect(submit().props.accessibilityState.disabled).toBe(true);
      fireEvent.press(submit());
      expect(createReport).not.toHaveBeenCalled();

      fireEvent.changeText(details, 'x'.repeat(1005));
      expect(screen.getByText(/5 characters over the 1000-character limit/)).toBeTruthy();
      fireEvent.changeText(details, 'x'.repeat(999));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Maximum 1000 characters.')).toBeTruthy();
      expect(submit().props.accessibilityState.disabled).toBe(false);

      fireEvent.changeText(details, 'x'.repeat(1000));
      fireEvent.press(submit());
      await waitFor(() =>
        expect(createReport).toHaveBeenCalledWith({
          reportable_type: reportableType,
          reportable_id: 'target-1',
          reason: 'Something else',
          details: 'x'.repeat(1000),
        })
      );
      expect(createReport).toHaveBeenCalledTimes(1);
    }
  );

  it('counts Unicode characters consistently with the database', async () => {
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="prayer-1"
        reportableType="prayer"
        visible
      />
    );
    const details = screen.getByLabelText('Additional details (optional)');
    const text = '\u{1F64F}'.repeat(1000);
    fireEvent.press(screen.getByText('Something else'));
    fireEvent.changeText(details, `${text}x`);
    expect(screen.getByText('1001/1000')).toBeTruthy();
    expect(screen.getByLabelText('Submit report').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(details, text);
    expect(screen.getByText('1000/1000')).toBeTruthy();
    fireEvent.press(screen.getByText('Submit report'));
    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith(expect.objectContaining({ details: text }))
    );
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
    fireEvent.press(screen.getByText('Submit report'));

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
    fireEvent.changeText(screen.getByLabelText('Additional details (optional)'), 'Keep this draft');
    fireEvent.press(screen.getByText('Submit report'));

    expect(await screen.findByText(/Check your connection/)).toBeTruthy();
    expect(screen.getByText('Upsetting or graphic')).toBeTruthy();
    expect(screen.getByLabelText('Additional details (optional)').props.value).toBe(
      'Keep this draft'
    );
  });

  it('requires a reason and clears the draft when a different target opens', () => {
    const props = {
      onClose: jest.fn(),
      reportableId: 'prayer-1',
      reportableType: 'prayer' as const,
      visible: true,
    };
    const { rerender } = render(<ContentReportSheet {...props} />);
    fireEvent.press(screen.getByText('Submit report'));
    expect(createReport).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Additional details (optional)'), 'x'.repeat(1001));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.press(screen.getByText('Spam or fake'));
    rerender(<ContentReportSheet {...props} reportableId="prayer-2" />);
    expect(screen.getByLabelText('Additional details (optional)').props.value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Submit report').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the draft when the backend lacks the details update', async () => {
    jest.mocked(createReport).mockResolvedValue('setup_required' as never);
    render(
      <ContentReportSheet
        onClose={jest.fn()}
        reportableId="prayer-1"
        reportableType="prayer"
        visible
      />
    );
    fireEvent.press(screen.getByText('Something else'));
    fireEvent.changeText(screen.getByLabelText('Additional details (optional)'), 'Useful context');
    fireEvent.press(screen.getByText('Submit report'));
    expect(await screen.findByText(/Your draft has been kept/)).toBeTruthy();
    expect(screen.getByLabelText('Additional details (optional)').props.value).toBe(
      'Useful context'
    );
  });
});
