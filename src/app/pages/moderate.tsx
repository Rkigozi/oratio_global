import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Flag, Check, X, MessageCircle, Loader } from "lucide-react";
import { getPendingReports, resolveReport } from "../../lib/api";
import { mockFeedPrayers, timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";

interface Report {
  id: string;
  reportable_type: "prayer" | "comment";
  reportable_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { username: string; display_name: string } | null;
}

function findPrayerText(id: string): string {
  try {
    const submitted = JSON.parse(localStorage.getItem("oratio_submitted_prayers") || "[]") as PrayerRequest[];
    const all = [...submitted, ...mockFeedPrayers];
    const p = all.find((p) => p.id === id);
    return p?.text || "[deleted or mock data]";
  } catch {
    return "[unknown]";
  }
}

function findCommentText(id: string): string {
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith("oratio_comments_")) {
        const comments = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; body: string }>;
        const c = comments.find((c) => c.id === id);
        if (c) return c.body;
      }
    }
  } catch {
    // ignore
  }
  // Try Supabase — for now return placeholder
  return "[from database — view in dashboard]";
}

export function Moderate() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getPendingReports();
        if (!cancelled && data) setReports(data as unknown as Report[]);
      } catch {
        // fallback: localStorage reports (for demo mode)
        const local = loadLocalReports();
        if (!cancelled) setReports(local);
      }
      if (!cancelled) setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleResolve = async (reportId: string, status: "resolved" | "dismissed") => {
    setResolving(reportId);
    try {
      await resolveReport(reportId, status);
    } catch {
      // ignore
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setResolving(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "#0A1A3A" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4">
        <button
          onClick={() => void navigate(-1)}
          className="flex items-center gap-2 text-[#6b7499] hover:text-[#8890b5] transition-colors cursor-pointer mt-12"
        >
          <ArrowLeft size={16} />
          <span className="text-xs">Back</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Flag size={16} className="text-[#fbbf24]" />
            <h1 className="text-[#e2e4f0] font-heading text-lg font-light">Moderation Inbox</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size={20} className="text-[#4e5573] animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Check size={24} className="text-[#4e5573] mx-auto mb-3" />
              <p className="text-[#6b7499] text-sm">No pending reports</p>
              <p className="text-[#4e5573] text-xs mt-1">Everything's looking good</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const content = report.reportable_type === "prayer"
                  ? findPrayerText(report.reportable_id)
                  : findCommentText(report.reportable_id);
                return (
                  <div
                    key={report.id}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(17, 26, 58, 0.4)",
                      border: "1px solid rgba(124,143,255,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {report.reportable_type === "comment" ? (
                          <MessageCircle size={12} className="text-[#5a6080]" />
                        ) : (
                          <Flag size={12} className="text-[#5a6080]" />
                        )}
                        <span className="text-[#8890b5] text-[10px] uppercase">
                          {report.reportable_type}
                        </span>
                      </div>
                      <span className="text-[#4e5573] text-[9px]">
                        {timeAgo(report.created_at)}
                      </span>
                    </div>

                    <p className="text-[#c5cbe2] text-xs leading-relaxed mb-2 line-clamp-3">
                      {content}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[#fbbf24] text-[10px]">
                        Reason: {report.reason}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#4e5573] text-[9px]">
                          by @{report.reporter?.username || "?"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleResolve(report.id, "dismissed")}
                        disabled={resolving === report.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] text-[#6b7499] bg-[rgba(124,143,255,0.04)] border border-[rgba(124,143,255,0.08)] hover:bg-[rgba(124,143,255,0.08)] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X size={10} />
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolve(report.id, "resolved")}
                        disabled={resolving === report.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] text-[#6b7499] bg-[rgba(124,143,255,0.04)] border border-[rgba(124,143,255,0.08)] hover:bg-[rgba(124,143,255,0.08)] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check size={10} />
                        Resolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── localStorage fallback ─────────────────────────────────────────────

function loadLocalReports(): Report[] {
  try {
    const raw = localStorage.getItem("oratio_reports");
    if (!raw) return [];
    const reports = JSON.parse(raw) as Array<{ prayerId: string; reason: string; timestamp: number }>;
    return reports.map((r, i) => ({
      id: `local-${i}`,
      reportable_type: "prayer" as const,
      reportable_id: r.prayerId,
      reason: r.reason,
      status: "pending",
      created_at: new Date(r.timestamp).toISOString(),
      reporter: null,
    }));
  } catch {
    return [];
  }
}
