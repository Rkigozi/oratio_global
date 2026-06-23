import {
  createReport as supabaseCreateReport,
  getPendingReports as supabaseGetPendingReports,
  resolveReport as supabaseResolveReport,
} from "./supabase-queries";

// ─── Reports (Supabase) ────────────────────────────────────────────────

export async function reportContent(report: { reportable_type: "prayer" | "comment"; reportable_id: string; reason: string }) {
  const ok = await supabaseCreateReport(report);
  return { error: ok ? null : new Error("Failed to create report") } as const;
}

export async function getPendingReports() {
  const data = await supabaseGetPendingReports();
  return { data, error: null } as const;
}

export async function resolveReport(reportId: string, status: string) {
  const ok = await supabaseResolveReport(reportId, status as "resolved" | "dismissed");
  return { error: ok ? null : new Error("Failed to resolve report") } as const;
}


