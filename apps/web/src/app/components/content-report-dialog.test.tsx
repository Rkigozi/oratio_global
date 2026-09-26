import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ContentReportDialog } from './content-report-dialog';

describe('ContentReportDialog', () => {
  it('requires a reason and submits trimmed optional context explicitly', async () => {
    const onReport = vi.fn().mockResolvedValue(undefined);
    render(<ContentReportDialog submitting={false} onClose={vi.fn()} onReport={onReport} />);
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Something else'));
    expect(onReport).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: '  Context for moderators  ' },
    });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Submit report' })));
    expect(onReport).toHaveBeenCalledWith('Something else', 'Context for moderators');
    expect(screen.getByLabelText('Additional details (optional)')).not.toHaveAttribute('maxlength');
  });

  it.each(['prayer', 'comment'] as const)(
    'preserves oversized %s details, explains the limit and accepts exactly 1000 characters',
    async (reportableType) => {
      const onReport = vi.fn().mockResolvedValue(undefined);
      render(
        <ContentReportDialog
          submitting={false}
          onClose={vi.fn()}
          onReport={onReport}
          reportableType={reportableType}
        />
      );
      const details = screen.getByLabelText('Additional details (optional)');
      const submit = screen.getByRole('button', { name: 'Submit report' });
      fireEvent.click(screen.getByLabelText('Something else'));
      fireEvent.change(details, { target: { value: 'x'.repeat(999) } });
      expect(screen.getByText('999/1000')).toBeInTheDocument();
      expect(submit).toBeEnabled();
      fireEvent.change(details, { target: { value: 'x'.repeat(1000) } });
      expect(screen.getByText('Character limit reached (1000 characters).')).toBeInTheDocument();
      expect(submit).toBeEnabled();

      fireEvent.change(details, { target: { value: 'x'.repeat(1001) } });
      expect(details).toHaveValue('x'.repeat(1001));
      expect(screen.getByText('1001/1000')).toBeInTheDocument();
      expect(details).toHaveAttribute('aria-invalid', 'true');
      expect(details).toHaveAccessibleDescription(
        '1 character over the 1000-character limit. Shorten your details to submit.'
      );
      expect(screen.getByRole('alert')).toHaveTextContent('1 character over');
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      fireEvent.submit(screen.getByRole('dialog'));
      expect(onReport).not.toHaveBeenCalled();

      fireEvent.change(details, { target: { value: 'x'.repeat(1005) } });
      expect(screen.getByRole('alert')).toHaveTextContent('5 characters over');
      fireEvent.change(details, { target: { value: 'x'.repeat(999) } });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(details).not.toHaveAttribute('aria-invalid');
      expect(submit).toBeEnabled();

      fireEvent.change(details, { target: { value: 'x'.repeat(1000) } });
      await act(async () => fireEvent.click(submit));
      expect(onReport).toHaveBeenCalledExactlyOnceWith('Something else', 'x'.repeat(1000));
    }
  );

  it('counts Unicode characters consistently with the database', async () => {
    const onReport = vi.fn().mockResolvedValue(undefined);
    render(<ContentReportDialog submitting={false} onClose={vi.fn()} onReport={onReport} />);
    const details = screen.getByLabelText('Additional details (optional)');
    const text = '\u{1F64F}'.repeat(1000);
    fireEvent.click(screen.getByLabelText('Something else'));
    fireEvent.change(details, { target: { value: `${text}x` } });
    expect(screen.getByText('1001/1000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeDisabled();
    fireEvent.change(details, { target: { value: text } });
    expect(screen.getByText('1000/1000')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Submit report' })));
    expect(onReport).toHaveBeenCalledWith('Something else', text);
  });

  it('supports a reason without extra details and guards duplicate submissions', async () => {
    let finish!: () => void;
    const onReport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    render(<ContentReportDialog submitting={false} onClose={vi.fn()} onReport={onReport} />);
    fireEvent.click(screen.getByLabelText('Spam or fake'));
    const submit = screen.getByRole('button', { name: 'Submit report' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledWith('Spam or fake', undefined);
    await act(async () => finish());
  });

  it('preserves the draft on failure and disables editing or dismissal during submission', () => {
    const props = { submitting: false, onClose: vi.fn(), onReport: vi.fn() };
    const { rerender } = render(<ContentReportDialog {...props} reportableType="comment" />);
    fireEvent.click(screen.getByLabelText('Harmful or unsafe'));
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: 'Keep my draft' },
    });
    rerender(<ContentReportDialog {...props} submitting reportableType="comment" />);
    expect(screen.getByLabelText('Additional details (optional)')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close report' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
    rerender(<ContentReportDialog {...props} error="Please try again" reportableType="comment" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again');
    expect(screen.getByLabelText('Additional details (optional)')).toHaveValue('Keep my draft');
    expect(screen.getByLabelText('Harmful or unsafe')).toBeChecked();
  });
});
