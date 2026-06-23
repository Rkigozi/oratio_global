import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Flag, Check, X, MessageCircle, Loader } from "lucide-react";
import { getPendingReports, resolveReport } from '../services/api';
import { timeAgo } from '../services/prayer-data';

interface Report {
  id: string;
  reportable_type: "prayer" | "comment";
  reportable_id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_by: string;
}

export function Moderate() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await getPendingReports();
    if (data) setReports(data as unknown as Report[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const handleResolve = async (reportId: string) => {
    await resolveReport(reportId, "resolved");
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleDismiss = async (reportId: string) => {
    await resolveReport(reportId, "dismissed");
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  return (
    <div className="w-full min-h-dvh" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))" }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button onClick={() => void navigate(-1)} className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer">
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h1 className="text-text-secondary text-sm font-heading font-light">Moderation</h1>
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="flex items-center gap-2 mb-4 mt-2">
          <Flag size={14} className="text-warning" />
          <span className="text-text-muted text-xs uppercase tracking-[0.15em]">
            Pending Reports ({reports.length})
          </span>
          <button onClick={() => void loadReports()} className="ml-auto text-text-dim hover:text-text-muted text-xs cursor-pointer">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size={20} className="text-text-dim animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Check size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-muted text-sm">No pending reports</p>
            <p className="text-text-dim text-xs mt-1">All clear for now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.6), rgba(var(--rgb-surface), 0.4))",
                  border: "1px solid rgba(var(--rgb-warning), 0.1)",
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircle size={12} className="text-text-dim mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
                      {report.reportable_type}: {report.reportable_id.slice(0, 8)}...
                    </p>
                    <p className="text-warning text-[10px] mt-1">
                      {report.reason}
                    </p>
                    <p className="text-text-dim text-[10px] mt-1">
                      {timeAgo(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => void handleResolve(report.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-success hover:bg-success/10 transition-all cursor-pointer"
                      title="Resolve"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => void handleDismiss(report.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
