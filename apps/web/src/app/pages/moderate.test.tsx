import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Moderate } from './moderate';

vi.mock('../services/supabase-queries', () => ({
  getReports: vi.fn(),
  isCurrentUserModerator: vi.fn(),
  resolveReport: vi.fn(),
}));

import {
  getReports,
  isCurrentUserModerator,
  resolveReport,
  type ReportRecord,
} from '../services/supabase-queries';

const pendingReport: ReportRecord = {
  id: 'report-1',
  reportable_type: 'prayer',
  reportable_id: 'prayer-1',
  reason: 'Upsetting or harmful',
  status: 'pending',
  created_at: new Date().toISOString(),
  resolved_at: null,
  resolved_by: null,
  moderator_note: null,
  reported_by: 'user-a',
  reporter_profile: { id: 'user-a', username: 'reporter', display_name: 'Reporter' },
  resolver_profile: null,
};

const resolvedReport: ReportRecord = {
  ...pendingReport,
  id: 'report-2',
  reason: 'Spam or fake',
  status: 'resolved',
  resolved_at: new Date().toISOString(),
  resolved_by: 'mod-1',
  moderator_note: 'Reviewed and resolved from the moderation queue.',
  resolver_profile: { id: 'mod-1', username: 'mod', display_name: 'Mod' },
};

describe('Moderate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks non-moderators', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(false);
    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Moderator access required')).toBeInTheDocument();
    });
    expect(getReports).not.toHaveBeenCalled();
  });

  it('shows an empty state when there are no reports', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No pending reports')).toBeInTheDocument();
    });
  });

  it('lists reports with status, reason, and reporter', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([pendingReport]);
    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upsetting or harmful')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(
      screen.getByText((content) => content.includes('Reported by') && content.includes('Reporter'))
    ).toBeTruthy();
  });

  it('resolves a pending report', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([pendingReport]);
    vi.mocked(resolveReport).mockResolvedValue(true);

    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upsetting or harmful')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    });

    await waitFor(() => {
      expect(resolveReport).toHaveBeenCalledWith(
        'report-1',
        'resolved',
        'Reviewed and resolved from the moderation queue.'
      );
    });
  });

  it('dismisses a pending report', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([pendingReport]);
    vi.mocked(resolveReport).mockResolvedValue(true);

    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upsetting or harmful')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    });

    await waitFor(() => {
      expect(resolveReport).toHaveBeenCalledWith(
        'report-1',
        'dismissed',
        'Reviewed and dismissed from the moderation queue.'
      );
    });
  });

  it('shows an error notice when resolving fails', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([pendingReport]);
    vi.mocked(resolveReport).mockResolvedValue(false);

    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upsetting or harmful')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    });

    await waitFor(() => {
      expect(
        screen.getByText('Sorry, that report could not be updated. Please refresh and try again.')
      ).toBeInTheDocument();
    });
  });

  it('filters reports by status', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([pendingReport, resolvedReport]);

    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upsetting or harmful')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resolved/ }));
    });

    expect(screen.queryByText('Upsetting or harmful')).toBeNull();
    expect(screen.getByText('Spam or fake')).toBeInTheDocument();
    expect(
      screen.getByText('Reviewed and resolved from the moderation queue.')
    ).toBeInTheDocument();
  });

  it('shows the moderator note on resolved reports', async () => {
    vi.mocked(isCurrentUserModerator).mockResolvedValue(true);
    vi.mocked(getReports).mockResolvedValue([resolvedReport]);

    render(
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resolved/ })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resolved/ }));
    });

    await waitFor(() => {
      expect(screen.getByText('Reviewed and resolved from the moderation queue.')).toBeInTheDocument();
    });
  });
});
