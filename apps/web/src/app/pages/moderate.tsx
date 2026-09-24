import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader, RefreshCw, ShieldCheck } from 'lucide-react';
import { getReports, isCurrentUserModerator } from '../services/supabase-queries';
import type {
  ModerationAction,
  ReportRecord,
  ReportSortOrder,
  ReportStatusFilter,
} from '../services/supabase-queries';
import { timeAgo } from '../services/prayer-data';
import { ReportReviewPanel } from './moderation/report-review-panel';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30_000;
const filters: ReportStatusFilter[] = ['pending', 'resolved', 'dismissed', 'all'];
const iconButton =
  'w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-surface disabled:opacity-40';

export function Moderate() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<ReportStatusFilter>('pending');
  const [sort, setSort] = useState<ReportSortOrder>('oldest');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const requestId = useRef(0);
  const inFlight = useRef<number | null>(null);

  const loadReports = useCallback(
    async (background = false) => {
      if (background && inFlight.current !== null) return;
      const request = ++requestId.current;
      inFlight.current = request;
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setRefreshing(false);
        setError(null);
        setRefreshError(null);
        setLastUpdated(null);
        setReports([]);
      }
      try {
        const allowed = await isCurrentUserModerator({ throwOnError: true });
        if (request !== requestId.current) return;
        setAuthorized(allowed);
        if (!allowed) {
          setReports([]);
          setHasMore(false);
          setError(null);
          setRefreshError(null);
          setLastUpdated(null);
          return;
        }
        const data = await getReports(filter, {
          throwOnError: true,
          limit: PAGE_SIZE + 1,
          offset: page * PAGE_SIZE,
          sort,
        });
        if (request !== requestId.current) return;
        setReports(data.slice(0, PAGE_SIZE));
        setHasMore(data.length > PAGE_SIZE);
        setLastUpdated(new Date());
        setError(null);
        setRefreshError(null);
      } catch {
        if (request === requestId.current) {
          if (background) setRefreshError('Could not refresh. Showing the last loaded reports.');
          else setError('The moderation queue could not be loaded.');
        }
      } finally {
        if (inFlight.current === request) inFlight.current = null;
        if (request === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filter, page, sort]
  );

  useEffect(() => {
    void loadReports();
    return () => {
      requestId.current += 1;
    };
  }, [loadReports]);

  useEffect(() => {
    if (!authorized || selected || !lastUpdated) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadReports(true);
    };
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [authorized, lastUpdated, loadReports, selected]);

  const onDecision = (action: ModerationAction) => {
    setSavingDecision(false);
    setSelected(null);
    setNotice(
      action === 'hide'
        ? 'Content hidden. Related pending reports have been resolved.'
        : action === 'restore'
          ? 'Moderation restriction removed. Original audience rules still apply.'
          : 'Report dismissed. Content visibility has not changed.'
    );
    void loadReports();
  };

  return (
    <main className="min-h-dvh bg-bg text-text-primary px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="max-w-3xl mx-auto">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 mb-6">
          <button
            className={iconButton}
            aria-label={selected ? 'Back to reports' : 'Back'}
            title="Back"
            disabled={savingDecision}
            onClick={() => {
              if (selected) {
                setSelected(null);
                void loadReports();
              } else void navigate(-1);
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-heading text-center">Moderation</h1>
          {!selected && (
            <button
              className={iconButton}
              aria-label="Refresh reports"
              title="Refresh reports"
              disabled={loading || refreshing}
              onClick={() => void loadReports(lastUpdated !== null)}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : undefined} />
            </button>
          )}
        </header>
        {notice && (
          <p role="status" className="border-l-2 border-success pl-3 py-2 mb-5 text-sm">
            {notice}
          </p>
        )}
        {selected ? (
          <ReportReviewPanel
            key={selected.id}
            report={selected}
            onDecision={onDecision}
            onSavingChange={setSavingDecision}
          />
        ) : (
          <>
            {authorized && (
              <nav
                aria-label="Report status"
                className="grid grid-cols-4 border-b border-border mb-4"
              >
                {filters.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-current={filter === value ? 'page' : undefined}
                    className={`min-h-11 text-sm capitalize border-b-2 ${filter === value ? 'border-accent text-accent' : 'border-transparent text-text-muted'}`}
                    onClick={() => {
                      setFilter(value);
                      setSort(value === 'pending' ? 'oldest' : 'newest');
                      setPage(0);
                      setNotice(null);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </nav>
            )}
            {authorized && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                <label className="flex items-center gap-2 text-xs text-text-muted">
                  Sort by
                  <select
                    aria-label="Sort reports"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as ReportSortOrder);
                      setPage(0);
                    }}
                    className="min-h-11 max-w-full rounded-lg border border-border bg-surface px-2 text-sm text-text-primary"
                  >
                    <option value="oldest">Oldest reports</option>
                    <option value="newest">Newest reports</option>
                  </select>
                </label>
                <span className="text-xs text-text-muted">
                  {refreshing
                    ? 'Updating reports'
                    : lastUpdated && (
                        <>
                          Updated{' '}
                          <time dateTime={lastUpdated.toISOString()}>
                            {lastUpdated.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </time>
                        </>
                      )}
                </span>
              </div>
            )}
            {refreshError && (
              <p role="alert" className="text-sm text-danger mb-3">
                {refreshError}
              </p>
            )}
            {loading ? (
              <div role="status" className="flex justify-center gap-2 py-12">
                <Loader size={20} className="animate-spin" />
                Loading reports
              </div>
            ) : error ? (
              <div role="alert" className="py-8 text-center">
                <p>{error}</p>
                <button className="min-h-11 text-accent mt-2" onClick={() => void loadReports()}>
                  Try again
                </button>
              </div>
            ) : authorized === false ? (
              <div className="text-center py-12">
                <ShieldCheck className="mx-auto mb-3" />
                <p>Moderator access required</p>
              </div>
            ) : (
              <>
                {reports.length === 0 ? (
                  <p className="py-12 text-center text-text-muted">
                    {page ? 'No more reports' : `No ${filter === 'all' ? '' : `${filter} `}reports`}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {reports.map((report) => (
                      <li key={report.id}>
                        <button
                          className="w-full text-left py-4 flex items-center gap-3 hover:bg-surface/40"
                          onClick={() => {
                            setSelected(report);
                            setNotice(null);
                          }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-text-muted capitalize">
                              {report.reportable_type} · {report.status} ·{' '}
                              {timeAgo(report.created_at)}
                            </span>
                            <span className="block text-sm mt-1 break-words [overflow-wrap:anywhere]">
                              {report.reason}
                            </span>
                            <span className="block text-xs text-text-muted mt-1 break-words">
                              Reported by{' '}
                              {report.reporter_profile?.display_name ||
                                report.reporter_profile?.username ||
                                'Former user'}
                            </span>
                          </span>
                          <ChevronRight size={18} className="shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <footer className="flex items-center justify-between border-t border-border pt-3 mt-3">
                  <button
                    className={iconButton}
                    aria-label="Previous page"
                    title="Previous page"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs text-text-muted">Page {page + 1}</span>
                  <button
                    className={iconButton}
                    aria-label="Next page"
                    title="Next page"
                    disabled={!hasMore}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </footer>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
