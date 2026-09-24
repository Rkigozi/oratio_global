import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Moderate } from './moderate';
import {
  getReports,
  getReportReview,
  isCurrentUserModerator,
  moderateReport,
} from '../services/supabase-queries';
import type { ReportRecord, ReportReview } from '../services/supabase-queries';

vi.mock('../services/supabase-queries', () => ({
  getReports: vi.fn(),
  getReportReview: vi.fn(),
  isCurrentUserModerator: vi.fn(),
  moderateReport: vi.fn(),
}));

const report: ReportRecord = {
  id: 'r1',
  reportable_type: 'prayer',
  reportable_id: 'p1',
  reason: 'Spam or fake',
  reporter_details: null,
  status: 'pending',
  created_at: new Date().toISOString(),
  resolved_at: null,
  resolved_by: null,
  moderator_note: null,
  reported_by: 'reporter',
  reporter_profile: { id: 'reporter', username: 'qa_reporter', display_name: 'QA Reporter' },
  resolver_profile: null,
};
const review: ReportReview = {
  status: 'pending',
  available: true,
  hidden: false,
  version: 'v1',
  target: { body: 'Reported prayer content', author: 'QA Author', created_at: report.created_at },
  prayer: { body: 'Reported prayer content', audience: 'public' },
  parent_comment: null,
  actions: [],
};

function mount() {
  render(
    <MemoryRouter>
      <Moderate />
    </MemoryRouter>
  );
}
async function openReview() {
  fireEvent.click(await screen.findByRole('button', { name: /Spam or fake/ }));
  await screen.findByText('Reported prayer content');
}
function enterNote() {
  fireEvent.change(screen.getByLabelText('Decision reason (moderators only)'), {
    target: { value: 'Reviewed test content' },
  });
}

describe('moderation workflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([report]);
    vi.mocked(getReportReview).mockResolvedValue(review);
    vi.mocked(moderateReport).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('blocks non-moderators without fetching reports', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(false);
    mount();
    expect(await screen.findByText('Moderator access required')).toBeInTheDocument();
    expect(getReports).not.toHaveBeenCalled();
  });

  it('does not confuse failed access checks with missing permissions', async () => {
    vi.mocked(isCurrentUserModerator).mockRejectedValue(new Error('Offline'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('Moderator access required')).not.toBeInTheDocument();
  });

  it('shows queue failure and supports retry instead of claiming all clear', async () => {
    vi.mocked(getReports).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([]);
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByText('No pending reports')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No pending reports')).toBeInTheDocument();
  });

  it('loads bounded server-side status pages', async () => {
    vi.mocked(getReports).mockResolvedValue(
      Array.from({ length: 26 }, (_, i) => ({ ...report, id: `r${i}` }))
    );
    mount();
    await screen.findAllByText('Spam or fake');
    expect(getReports).toHaveBeenCalledWith('pending', {
      throwOnError: true,
      limit: 26,
      offset: 0,
      sort: 'oldest',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(getReports).toHaveBeenLastCalledWith('pending', {
        throwOnError: true,
        limit: 26,
        offset: 25,
        sort: 'oldest',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'resolved' }));
    await waitFor(() =>
      expect(getReports).toHaveBeenLastCalledWith('resolved', {
        throwOnError: true,
        limit: 26,
        offset: 0,
        sort: 'newest',
      })
    );
  });

  it('offers newest reports and resets pagination when changing order', async () => {
    vi.mocked(getReports).mockResolvedValue(
      Array.from({ length: 26 }, (_, i) => ({ ...report, id: `r${i}` }))
    );
    mount();
    await screen.findAllByText('Spam or fake');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Page 2');
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort reports' }), {
      target: { value: 'newest' },
    });
    await waitFor(() =>
      expect(getReports).toHaveBeenLastCalledWith('pending', {
        throwOnError: true,
        limit: 26,
        offset: 0,
        sort: 'newest',
      })
    );
    expect(screen.getByRole('combobox', { name: 'Sort reports' })).toHaveValue('newest');
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('refreshes on returning to the tab and keeps rows visible while loading', async () => {
    mount();
    await screen.findByText('Spam or fake');
    let finish!: (reports: ReportRecord[]) => void;
    vi.mocked(getReports).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await act(async () => fireEvent.focus(window));
    expect(screen.getByText('Spam or fake')).toBeInTheDocument();
    expect(screen.getByText('Updating reports')).toBeInTheDocument();
    await act(async () => finish([{ ...report, id: 'new', reason: 'New report' }]));
    expect(screen.getByText('New report')).toBeInTheDocument();
    expect(screen.queryByText('Spam or fake')).not.toBeInTheDocument();
  });

  it('retains rows with a stale-data warning after refresh failure and retries on reconnect', async () => {
    mount();
    await screen.findByText('Spam or fake');
    vi.mocked(getReports).mockRejectedValueOnce(new Error('Offline'));
    await act(async () => fireEvent.focus(window));
    expect(await screen.findByRole('alert')).toHaveTextContent('last loaded reports');
    expect(screen.getByText('Spam or fake')).toBeInTheDocument();
    await act(async () => window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('polls only while visible, coalesces refreshes, and cleans up on unmount', async () => {
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    const { unmount } = render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );
    await act(async () => {});
    expect(getReports).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getReports).toHaveBeenCalledTimes(2);
    visibility = 'hidden';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getReports).toHaveBeenCalledTimes(2);
    visibility = 'visible';
    let finish!: (reports: ReportRecord[]) => void;
    vi.mocked(getReports).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      fireEvent.focus(window);
      window.dispatchEvent(new Event('online'));
    });
    expect(getReports).toHaveBeenCalledTimes(3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getReports).toHaveBeenCalledTimes(3);
    await act(async () => finish([report]));
    unmount();
    await act(async () => {
      fireEvent.focus(window);
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getReports).toHaveBeenCalledTimes(3);
  });

  it('leaves an open review draft alone and refreshes when returning to the queue', async () => {
    mount();
    await openReview();
    enterNote();
    await act(async () => {
      fireEvent.focus(window);
      window.dispatchEvent(new Event('online'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(getReports).toHaveBeenCalledTimes(1);
    expect(getReportReview).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Decision reason (moderators only)')).toHaveValue(
      'Reviewed test content'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to reports' }));
    await waitFor(() => expect(getReports).toHaveBeenCalledTimes(2));
  });

  it('ignores a stale refresh after changing status filters', async () => {
    mount();
    await screen.findByText('Spam or fake');
    let finish!: (reports: ReportRecord[]) => void;
    vi.mocked(getReports).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await act(async () => fireEvent.focus(window));
    vi.mocked(getReports).mockResolvedValue([
      { ...report, status: 'resolved', reason: 'Resolved test report' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'resolved' }));
    await screen.findByText('Resolved test report');
    await act(async () => finish([{ ...report, reason: 'Old pending response' }]));
    expect(screen.queryByText('Old pending response')).not.toBeInTheDocument();
    expect(screen.getByText('Resolved test report')).toBeInTheDocument();
  });

  it('shows prayer context and requires a note and confirmation before hiding', async () => {
    mount();
    await openReview();
    expect(getReportReview).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('button', { name: 'Hide content' })).toBeDisabled();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    expect(moderateReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hide' }));
    await waitFor(() =>
      expect(moderateReport).toHaveBeenCalledWith('r1', 'hide', 'Reviewed test content', 'v1')
    );
    expect(
      await screen.findByText('Content hidden. Related pending reports have been resolved.')
    ).toBeInTheDocument();
  });

  it('shows reporter details alongside the reviewed content', async () => {
    vi.mocked(getReports).mockResolvedValue([
      { ...report, reporter_details: 'Repeated promotional links' },
    ]);
    mount();
    await openReview();
    expect(screen.getByText('Reporter details')).toBeInTheDocument();
    expect(screen.getByText('Repeated promotional links')).toBeInTheDocument();
  });

  it('explains a missing database update without offering decision actions', async () => {
    vi.mocked(getReportReview).mockRejectedValue(
      new Error(
        'Moderation setup is incomplete. The required database update has not been applied.'
      )
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Spam or fake/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('required database update');
    expect(screen.queryByRole('button', { name: 'Hide content' })).not.toBeInTheDocument();
  });

  it('cancels a proposed decision without writing', async () => {
    mount();
    await openReview();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(moderateReport).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Decision reason (moderators only)')).toHaveValue(
      'Reviewed test content'
    );
  });

  it('dismisses without requesting a hide action', async () => {
    mount();
    await openReview();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dismiss' }));
    await waitFor(() =>
      expect(moderateReport).toHaveBeenCalledWith('r1', 'dismiss', 'Reviewed test content', 'v1')
    );
  });

  it('requires reloading after save failure and preserves the draft note', async () => {
    vi.mocked(moderateReport).mockRejectedValue(
      new Error('This review has changed. Reload it before deciding.')
    );
    mount();
    await openReview();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm hide' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reload');
    expect(screen.queryByRole('button', { name: 'Confirm hide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload review' }));
    expect(await screen.findByLabelText('Decision reason (moderators only)')).toHaveValue(
      'Reviewed test content'
    );
  });

  it('prevents duplicate submissions while a decision is saving', async () => {
    let finish!: () => void;
    vi.mocked(moderateReport).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    mount();
    await openReview();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Hide content' }));
    const confirm = screen.getByRole('button', { name: 'Confirm hide' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(moderateReport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Back to reports' })).toBeDisabled();
    await act(async () => finish());
  });

  it('allows restoring hidden content and displays its audit trail', async () => {
    vi.mocked(getReportReview).mockResolvedValue({
      ...review,
      status: 'resolved',
      hidden: true,
      actions: [
        {
          id: 'a1',
          action: 'hide',
          note: 'Verified spam',
          moderator: 'QA Moderator',
          created_at: report.created_at,
        },
      ],
    });
    mount();
    await openReview();
    expect(screen.getByText('Verified spam')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide content' })).not.toBeInTheDocument();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Restore content' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }));
    await waitFor(() =>
      expect(moderateReport).toHaveBeenCalledWith('r1', 'restore', 'Reviewed test content', 'v1')
    );
  });

  it('shows comment and parent prayer context', async () => {
    vi.mocked(getReports).mockResolvedValue([{ ...report, reportable_type: 'comment' }]);
    vi.mocked(getReportReview).mockResolvedValue({
      ...review,
      target: { ...review.target!, body: 'Reported comment content' },
      parent_comment: 'Original encouragement',
    });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Spam or fake/ }));
    expect(await screen.findByText('Reported comment content')).toBeInTheDocument();
    expect(screen.getByText('Parent prayer')).toBeInTheDocument();
    expect(screen.getByText('Original encouragement')).toBeInTheDocument();
    expect(screen.getByText('Reported prayer content')).toBeInTheDocument();
  });

  it('does not allow hiding unavailable or private content', async () => {
    vi.mocked(getReportReview).mockResolvedValue({
      ...review,
      available: false,
      version: null,
      target: null,
      prayer: null,
    });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Spam or fake/ }));
    await screen.findByText(/Content is no longer available/);
    expect(screen.queryByRole('button', { name: 'Hide content' })).not.toBeInTheDocument();
    enterNote();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm dismiss' }));
    await waitFor(() =>
      expect(moderateReport).toHaveBeenCalledWith('r1', 'dismiss', 'Reviewed test content', null)
    );
  });

  it('does not show an old review after navigating back', async () => {
    let finish!: (value: ReportReview) => void;
    vi.mocked(getReportReview).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Spam or fake/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to reports' }));
    await act(async () => finish(review));
    expect(screen.queryByText('Reported prayer content')).not.toBeInTheDocument();
  });
});
