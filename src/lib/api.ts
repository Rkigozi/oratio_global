// ─── Comments (localStorage) ───────────────────────────────────────────

// Handled entirely in comment-section.tsx via saveLocalComment
export async function createComment(_input: { prayer_id: string; body: string; parent_id?: string }) {
  return { data: null, error: null } as const;
}

export async function deleteComment(_id: string) {
  return { error: null } as const;
}

export async function getCommentsByPrayer(_prayerId: string) {
  return { data: null, error: null } as const;
}

// ─── Reports (localStorage) ────────────────────────────────────────────

export async function reportContent(report: { reportable_type: string; reportable_id: string; reason: string }) {
  try {
    const reports = JSON.parse(localStorage.getItem("oratio_reports") || "[]") as Array<Record<string, unknown>>;
    reports.push({ ...report, timestamp: Date.now() });
    localStorage.setItem("oratio_reports", JSON.stringify(reports));
  } catch { /* ignore */ }
  return { error: null } as const;
}

// ─── Follows (localStorage) ────────────────────────────────────────────

export async function followUser(_userId: string) {
  return { error: null } as const;
}

export async function unfollowUser(_userId: string) {
  return { error: null } as const;
}

export async function getFollowingUserIds(): Promise<string[]> {
  try {
    return JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
  } catch { return []; }
}

// ─── Moderation (localStorage) ─────────────────────────────────────────

export async function getPendingReports() {
  try {
    const raw = localStorage.getItem("oratio_reports");
    return { data: raw ? JSON.parse(raw) : [], error: null };
  } catch {
    return { data: [], error: null };
  }
}

export async function resolveReport(_reportId: string, _status: string) {
  return { error: null } as const;
}
