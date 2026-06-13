import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Flag, Check, X, MessageCircle, Loader } from "lucide-react";
import { getPendingReports, resolveReport } from "../../lib/api";

interface Report {
  id: string;
  reportable_type: "prayer" | "comment";
  reportable_id: string;
  reason: string;
  status: string;
  created_at: string;
  reported_by: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
    <div className="w-full min-h-dvh" style={{ background: "#0A1A3A" }}>
      <div className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.98), rgba(10, 26, 58, 0))" }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button onClick={() => void navigate(-1)} className="flex items-center gap-2 text-[#6b7499] hover:text-[#8890b5] transition-colors cursor-pointer">
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h1 className="text-[#c5cbe2] text-sm font-heading font-light">Moderation</h1>
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="flex items-center gap-2 mb-4 mt-2">
          <Flag size={14} className="text-[#fbbf24]" />
          <span className="text-[#8890b5] text-xs uppercase tracking-[0.15em]">
            Pending Reports ({reports.length})
          </span>
          <button onClick={() => void loadReports()} className="ml-auto text-[#4e5573] hover:text-[#6b7499] text-xs cursor-pointer">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader size={20} className="text-[#4e5573] animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Check size={24} className="text-[#4e5573] mx-auto mb-2" />
            <p className="text-[#6b7499] text-sm">No pending reports</p>
            <p className="text-[#4e5573] text-xs mt-1">All clear for now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: "linear-gradient(160deg, rgba(17, 26, 58, 0.6), rgba(12, 18, 48, 0.4))",
                  border: "1px solid rgba(251,191,36,0.1)",
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircle size={12} className="text-[#5a6080] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#c5cbe2] text-sm leading-relaxed line-clamp-2">
                      {report.reportable_type}: {report.reportable_id.slice(0, 8)}...
                    </p>
                    <p className="text-[#fbbf24] text-[10px] mt-1">
                      {report.reason}
                    </p>
                    <p className="text-[#4e5573] text-[10px] mt-1">
                      {timeAgo(report.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => void handleResolve(report.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#4e5573] hover:text-[#6ee7b7] hover:bg-[rgba(110,231,183,0.1)] transition-all cursor-pointer"
                      title="Resolve"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => void handleDismiss(report.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#4e5573] hover:text-[#ff6b6b] hover:bg-[rgba(255,107,107,0.1)] transition-all cursor-pointer"
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
