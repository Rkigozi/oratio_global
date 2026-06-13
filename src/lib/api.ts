import {
  createComment as supabaseCreateComment,
  deleteComment as supabaseDeleteComment,
  getComments as supabaseGetComments,
  createReport as supabaseCreateReport,
  getPendingReports as supabaseGetPendingReports,
  resolveReport as supabaseResolveReport,
  followUser as supabaseFollow,
  unfollowUser as supabaseUnfollow,
  getFollowingIds as supabaseGetFollowingIds,
  getFollowers as supabaseGetFollowers,
} from "./supabase-queries";

// ─── Comments (Supabase) ───────────────────────────────────────────────

export async function createComment(input: { prayer_id: string; body: string; parent_id?: string }) {
  const data = await supabaseCreateComment(input);
  return { data, error: data ? null : new Error("Failed to create comment") } as const;
}

export async function deleteComment(id: string) {
  const ok = await supabaseDeleteComment(id);
  return { error: ok ? null : new Error("Failed to delete comment") } as const;
}

export async function getCommentsByPrayer(prayerId: string) {
  const data = await supabaseGetComments(prayerId);
  return { data, error: null } as const;
}

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

// ─── Follows (Supabase) ────────────────────────────────────────────────

export async function followUser(userId: string) {
  const ok = await supabaseFollow(userId);
  return { error: ok ? null : new Error("Failed to follow user") } as const;
}

export async function unfollowUser(userId: string) {
  const ok = await supabaseUnfollow(userId);
  return { error: ok ? null : new Error("Failed to unfollow") } as const;
}

export async function getFollowingUserIds(): Promise<string[]> {
  return supabaseGetFollowingIds();
}

export async function getFollowersUserIds(userId: string): Promise<string[]> {
  return supabaseGetFollowers(userId);
}
