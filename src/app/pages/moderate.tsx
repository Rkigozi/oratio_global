import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Flag,
  Check,
  X,
  MessageCircle,
  Loader,
  ShieldAlert,
  ExternalLink,
  Clock,
  UserCheck,
} from 'lucide-react';
import { getReports, isCurrentUserModerator, resolveReport } from '../services/supabase-queries';
import { timeAgo } from '../services/prayer-data';
import type {
  ReportProfile,
  ReportRecord,
  ReportStatus,
  ReportStatusFilter,
} from '../services/supabase-queries';

type FilterOption = {
  value: ReportStatusFilter;
  label: string;
};

const filterOptions: FilterOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

const statusMeta: Record<ReportStatus, { label: string; className: string; description: string }> =
  {
    pending: {
      label: 'Pending',
      className: 'text-warning bg-warning/10 border-warning/20',
      description: 'Needs review',
    },
    resolved: {
      label: 'Resolved',
      className: 'text-success bg-success/10 border-success/20',
      description: 'Action completed',
    },
    dismissed: {
      label: 'Dismissed',
      className: 'text-text-muted bg-surface/80 border-border',
      description: 'No action needed',
    },
  };

function getProfileLabel(profile: ReportProfile | null, fallbackId: string | null) {
  if (profile?.display_name) return profile.display_name;
  if (profile?.username) return `@${profile.username}`;
  if (fallbackId) return `${fallbackId.slice(0, 8)}...`;
  return 'Unknown';
}

export function Moderate() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<ReportStatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [actioningReportId, setActioningReportId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const canModerate = await isCurrentUserModerator();
    setAuthorized(canModerate);

    if (!canModerate) {
      setReports([]);
      setLoading(false);
      return;
    }

    const data = await getReports('all');
    if (data) setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      await loadReports();
    };

    void load();
  }, [loadReports]);

  const filteredReports = reports.filter((report) => filter === 'all' || report.status === filter);

  const getCount = (status: ReportStatusFilter) => {
    if (status === 'all') return reports.length;
    return reports.filter((report) => report.status === status).length;
  };

  const handleModerationAction = async (
    reportId: string,
    status: Exclude<ReportStatus, 'pending'>
  ) => {
    setActioningReportId(reportId);
    setNotice(null);
    const moderatorNote =
      status === 'resolved'
        ? 'Reviewed and resolved from the moderation queue.'
        : 'Reviewed and dismissed from the moderation queue.';
    const ok = await resolveReport(reportId, status, moderatorNote);

    if (!ok) {
      setNotice('Sorry, that report could not be updated. Please refresh and try again.');
      setActioningReportId(null);
      return;
    }

    setNotice(`Report marked as ${status}.`);
    await loadReports();
    setActioningReportId(null);
  };

  const emptyCopy =
    filter === 'pending'
      ? { title: 'No pending reports', body: 'All clear for now.' }
      : { title: `No ${filter} reports`, body: 'Nothing to show in this view yet.' };

  const openReportTarget = (report: ReportRecord) => {
    if (report.reportable_type !== 'prayer') return;
    void navigate(`/prayer/${report.reportable_id}`);
  };

  return (
    <div className="w-full min-h-dvh" style={{ background: 'rgb(var(--rgb-bg))' }}>
      <div
        className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{
          background:
            'linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))',
        }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h1 className="text-text-secondary text-sm font-heading font-light">Moderation</h1>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-4 mt-2">
          <Flag size={14} className="text-warning" />
          <span className="text-text-muted text-xs uppercase tracking-[0.15em]">Report Review</span>
          <button
            onClick={() => void loadReports()}
            className="ml-auto text-text-dim hover:text-text-muted text-xs cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {authorized && (
          <>
            <div
              className="grid grid-cols-4 gap-1 rounded-full p-1 mb-3"
              style={{
                background: 'rgba(var(--rgb-surface), 0.68)',
                border: '1px solid rgba(var(--rgb-border), 0.7)',
              }}
            >
              {filterOptions.map((option) => {
                const isSelected = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={`min-w-0 rounded-full px-2.5 py-2 text-[11px] transition-colors cursor-pointer ${isSelected ? 'text-text-primary' : 'text-text-dim hover:text-text-muted'}`}
                    style={{
                      background: isSelected ? 'rgba(var(--rgb-bg), 0.95)' : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(var(--rgb-border), 0.9)'
                        : '1px solid transparent',
                    }}
                  >
                    <span className="block truncate">{option.label}</span>
                    <span className="block text-[10px] opacity-70">{getCount(option.value)}</span>
                  </button>
                );
              })}
            </div>

            {notice && (
              <div
                role="status"
                className="mb-3 rounded-lg px-3 py-2 text-xs text-text-muted"
                style={{
                  background: 'rgba(var(--rgb-surface), 0.6)',
                  border: '1px solid rgba(var(--rgb-border), 0.7)',
                }}
              >
                {notice}
              </div>
            )}
          </>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size={20} className="text-text-dim animate-spin" />
          </div>
        ) : authorized === false ? (
          <div className="text-center py-12">
            <ShieldAlert size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm">Moderator access required</p>
            <p className="text-text-dim text-xs mt-1">
              This area is restricted to trusted moderators.
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Check size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm">{emptyCopy.title}</p>
            <p className="text-text-dim text-xs mt-1">{emptyCopy.body}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const meta = statusMeta[report.status];
              const isActioning = actioningReportId === report.id;
              return (
                <div
                  key={report.id}
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    background:
                      'linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))',
                    border: '1px solid rgba(var(--rgb-border), 0.75)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle size={12} className="text-text-dim mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-text-dim text-[10px] uppercase tracking-[0.14em]">
                          {report.reportable_type}
                        </span>
                        <span className="text-text-dim text-[10px]">
                          {timeAgo(report.created_at)}
                        </span>
                      </div>

                      <p className="text-text-secondary text-sm leading-relaxed mt-2">
                        {report.reason}
                      </p>

                      <p className="text-text-dim text-[10px] mt-2">
                        Reported by {getProfileLabel(report.reporter_profile, report.reported_by)} ·
                        Target {report.reportable_id.slice(0, 8)}...
                      </p>

                      {report.status !== 'pending' && (
                        <div className="mt-3 rounded-lg px-3 py-2 bg-bg/45 border border-border/60">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-dim">
                            <span className="inline-flex items-center gap-1">
                              <UserCheck size={11} />
                              {getProfileLabel(report.resolver_profile, report.resolved_by)}
                            </span>
                            {report.resolved_at && (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={11} />
                                {timeAgo(report.resolved_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-text-muted text-[11px] mt-1">
                            {report.moderator_note || meta.description}
                          </p>
                        </div>
                      )}
                    </div>
                    {report.reportable_type === 'prayer' && (
                      <button
                        onClick={() => openReportTarget(report)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-accent hover:bg-accent/10 transition-all cursor-pointer flex-shrink-0"
                        title="Open reported prayer"
                        aria-label="Open reported prayer"
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/60">
                      <button
                        onClick={() => void handleModerationAction(report.id, 'dismissed')}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isActioning ? (
                          <Loader size={13} className="animate-spin" />
                        ) : (
                          <X size={13} />
                        )}
                        Dismiss
                      </button>
                      <button
                        onClick={() => void handleModerationAction(report.id, 'resolved')}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-success bg-success/10 hover:bg-success/15 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isActioning ? (
                          <Loader size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
