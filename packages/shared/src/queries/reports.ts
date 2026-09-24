import { getSupabaseClient } from '../client';
import { logError } from '../logger';

const supabase = getSupabaseClient();

export type CreateReportResult =
  | 'created'
  | 'already_reported'
  | 'unauthenticated'
  | 'setup_required'
  | 'failed';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportStatusFilter = ReportStatus | 'all';
export type ReportSortOrder = 'oldest' | 'newest';

export type ModerationAction = 'hide' | 'dismiss' | 'restore';

export interface ReportReview {
  status: ReportStatus;
  available: boolean;
  hidden: boolean;
  version: string | null;
  target: { body: string; author: string; created_at: string } | null;
  prayer: { body: string; audience: 'public' | 'circle' } | null;
  parent_comment: string | null;
  actions: Array<{
    id: string;
    action: ModerationAction;
    note: string;
    moderator: string;
    created_at: string;
  }>;
}

export interface ReportProfile {
  id: string;
  username: string | null;
  display_name: string | null;
}

export interface ReportRecord {
  id: string;
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  reporter_details: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  moderator_note: string | null;
  reported_by: string;
  reporter_profile: ReportProfile | null;
  resolver_profile: ReportProfile | null;
}

type ReportRow = {
  id: string;
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  reporter_details?: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  moderator_note?: string | null;
  reported_by: string;
};

function mapReportProfile(row: Record<string, unknown>): ReportProfile {
  return {
    id: row.id as string,
    username: (row.username as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
  };
}

export async function createReport(input: {
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  details?: string;
}): Promise<CreateReportResult> {
  const details = input.details?.trim() || null;
  if (details && details.length > 1000) return 'failed';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'unauthenticated';

  const { data: existingReport, error: existingReportError } = await supabase
    .from('reports')
    .select('id')
    .eq('reportable_type', input.reportable_type)
    .eq('reportable_id', input.reportable_id)
    .eq('reported_by', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingReportError) {
    logError('check existing report', existingReportError);
    return 'failed';
  }

  if (existingReport) return 'already_reported';

  const { error } = await supabase.from('reports').insert({
    reportable_type: input.reportable_type,
    reportable_id: input.reportable_id,
    reported_by: user.id,
    reason: input.reason,
    ...(details ? { reporter_details: details } : {}),
  });

  if (error) {
    if ('code' in error && error.code === '23505') {
      return 'already_reported';
    }
    // Database error details can contain the rejected row, including reporter text.
    logError('create report', new Error(`Report insert failed (${error.code || 'unknown'})`));
    if (
      (error.code === 'PGRST204' || error.code === '42703') &&
      error.message.includes('reporter_details')
    ) {
      return 'setup_required';
    }
    return 'failed';
  }
  return 'created';
}

export async function reportContent(report: {
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  details?: string;
}) {
  let result: CreateReportResult;
  try {
    result = await createReport(report);
  } catch {
    result = 'failed';
  }
  return {
    error:
      result === 'setup_required'
        ? new Error('Reporting with extra details is not available yet. Your draft has been kept.')
        : result === 'unauthenticated'
          ? new Error('Your session has ended. Sign in again before sending this report.')
          : result === 'failed'
            ? new Error("We couldn't send that report. Please try again.")
            : null,
    alreadyReported: result === 'already_reported',
  } as const;
}

export async function getReports(
  status: ReportStatusFilter = 'pending',
  options: { throwOnError?: boolean; limit?: number; offset?: number; sort?: ReportSortOrder } = {}
): Promise<ReportRecord[]> {
  const ascending = options.sort ? options.sort === 'oldest' : status === 'pending';
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending })
    .order('id', { ascending });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (options.limit !== undefined) {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    logError('fetch reports', error);
    if (options.throwOnError) throw error;
    return [];
  }

  const reports = (data as ReportRow[] | null) || [];
  const profileIds = Array.from(
    new Set(
      reports
        .flatMap((report) => [report.reported_by, report.resolved_by])
        .filter((id): id is string => Boolean(id))
    )
  );

  const profilesById = new Map<string, ReportProfile>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', profileIds);

    if (profilesError) {
      logError('fetch report profiles', profilesError);
    } else {
      (profiles as Array<Record<string, unknown>> | null)?.forEach((profile) => {
        const mapped = mapReportProfile(profile);
        profilesById.set(mapped.id, mapped);
      });
    }
  }

  return reports.map((report) => ({
    ...report,
    reporter_details: report.reporter_details ?? null,
    resolved_at: report.resolved_at ?? null,
    resolved_by: report.resolved_by ?? null,
    moderator_note: report.moderator_note ?? null,
    reporter_profile: profilesById.get(report.reported_by) ?? null,
    resolver_profile: report.resolved_by ? (profilesById.get(report.resolved_by) ?? null) : null,
  }));
}

export async function getPendingReports(): Promise<ReportRecord[]> {
  return getReports('pending');
}

export async function getReportReview(reportId: string): Promise<ReportReview> {
  const { data, error } = await supabase.rpc('get_report_review', { p_report_id: reportId });
  if (error || !data) {
    logError('fetch report review', error);
    if (error?.code === 'PGRST202' || error?.code === '42883') {
      throw new Error(
        'Moderation setup is incomplete. The required database update has not been applied.'
      );
    }
    if (error?.code === '42501') {
      throw new Error(
        'Moderator access is required. Check your account permissions and sign in again.'
      );
    }
    if (error?.code === 'P0002') {
      throw new Error('This report no longer exists. Return to the queue and refresh.');
    }
    throw new Error('The report could not be loaded. Please try again.');
  }
  return data as ReportReview;
}

export async function moderateReport(
  reportId: string,
  action: ModerationAction,
  note: string,
  expectedVersion: string | null
): Promise<void> {
  const trimmedNote = note.trim();
  if (trimmedNote.length < 3 || trimmedNote.length > 1000) {
    throw new Error('Enter a decision reason between 3 and 1000 characters.');
  }
  const { error } = await supabase.rpc('moderate_report', {
    p_report_id: reportId,
    p_action: action,
    p_note: trimmedNote,
    p_expected_version: expectedVersion,
  });
  if (error) {
    logError('moderate report', error);
    throw new Error(
      error.code === '40001'
        ? 'This review has changed. Reload it before deciding.'
        : 'The decision could not be saved. Reload the review before trying again.'
    );
  }
}

export async function isCurrentUserModerator(
  options: { throwOnError?: boolean } = {}
): Promise<boolean> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError && options.throwOnError) throw authError;
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('check moderator access', error);
    if (error && options.throwOnError) throw error;
    return false;
  }

  return (data as { is_moderator?: boolean }).is_moderator === true;
}
