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
    expect(screen.getByLabelText('Additional details (optional)')).toHaveAttribute(
      'maxlength',
      '1000'
    );
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
