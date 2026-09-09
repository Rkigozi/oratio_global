import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';

export type CreateReportResult = 'created' | 'already_reported' | 'failed';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportStatusFilter = ReportStatus | 'all';

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
}): Promise<CreateReportResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'failed';

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
  });

  if (error) {
    if ('code' in error && error.code === '23505') {
      return 'already_reported';
    }
    logError('create report', error);
    return 'failed';
  }
  return 'created';
}

export async function reportContent(report: {
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
}) {
  const result = await createReport(report);
  return {
    error: result === 'failed' ? new Error('Failed to create report') : null,
    alreadyReported: result === 'already_reported',
  } as const;
}

export async function getReports(status: ReportStatusFilter = 'pending'): Promise<ReportRecord[]> {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logError('fetch reports', error);
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

export async function resolveReport(
  reportId: string,
  status: Exclude<ReportStatus, 'pending'>,
  moderatorNote?: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      moderator_note: moderatorNote ?? null,
    })
    .eq('id', reportId);

  if (error) {
    logError('resolve report', error);
    return false;
  }
  return true;
}

export async function isCurrentUserModerator(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('check moderator access', error);
    return false;
  }

  return (data as { is_moderator?: boolean }).is_moderator === true;
}
