import {
  createReport as supabaseCreateReport,
  getReports as supabaseGetReports,
  getPendingReports as supabaseGetPendingReports,
  isCurrentUserModerator as supabaseIsCurrentUserModerator,
  resolveReport as supabaseResolveReport,
  type ReportStatusFilter,
} from './supabase-queries';

// ─── Reports (Supabase) ────────────────────────────────────────────────

export async function reportContent(report: {
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
}) {
  const result = await supabaseCreateReport(report);
  return {
    error: result === 'failed' ? new Error('Failed to create report') : null,
    alreadyReported: result === 'already_reported',
  } as const;
}

export async function getPendingReports() {
  const data = await supabaseGetPendingReports();
  return { data, error: null } as const;
}

export async function getReports(status: ReportStatusFilter = 'pending') {
  const data = await supabaseGetReports(status);
  return { data, error: null } as const;
}

export async function resolveReport(reportId: string, status: string, moderatorNote?: string) {
  const ok = await supabaseResolveReport(
    reportId,
    status as 'resolved' | 'dismissed',
    moderatorNote
  );
  return { error: ok ? null : new Error('Failed to resolve report') } as const;
}

export async function isCurrentUserModerator() {
  const data = await supabaseIsCurrentUserModerator();
  return { data, error: null } as const;
}
