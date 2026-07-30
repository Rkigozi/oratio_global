import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isCurrentUserModerator, reportContent } from './api';

vi.mock('./supabase-queries', () => ({
  createReport: vi.fn(),
  getReports: vi.fn(),
  getPendingReports: vi.fn(),
  isCurrentUserModerator: vi.fn(),
  resolveReport: vi.fn(),
}));

import {
  createReport,
  isCurrentUserModerator as supabaseIsCurrentUserModerator,
} from './supabase-queries';

describe('reportContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error null on success', async () => {
    vi.mocked(createReport).mockResolvedValue('created');
    const result = await reportContent({
      reportable_type: 'prayer',
      reportable_id: 'prayer-1',
      reason: 'Inappropriate content',
    });
    expect(result.error).toBeNull();
    expect(result.alreadyReported).toBe(false);
    expect(createReport).toHaveBeenCalledWith({
      reportable_type: 'prayer',
      reportable_id: 'prayer-1',
      reason: 'Inappropriate content',
    });
  });

  it('marks duplicate pending reports without returning an error', async () => {
    vi.mocked(createReport).mockResolvedValue('already_reported');
    const result = await reportContent({
      reportable_type: 'prayer',
      reportable_id: 'prayer-1',
      reason: 'Spam',
    });
    expect(result.error).toBeNull();
    expect(result.alreadyReported).toBe(true);
  });

  it('returns error on failure', async () => {
    vi.mocked(createReport).mockResolvedValue('failed');
    const result = await reportContent({
      reportable_type: 'comment',
      reportable_id: 'comment-1',
      reason: 'Spam',
    });
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Failed to create report');
  });
});

describe('isCurrentUserModerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps moderator access checks', async () => {
    vi.mocked(supabaseIsCurrentUserModerator).mockResolvedValue(true);
    const result = await isCurrentUserModerator();
    expect(result).toEqual({ data: true, error: null });
  });
});
