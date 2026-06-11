import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { mockFeedPrayers } from "../data/prayer-data";
import { getInitialAvatarUrl } from "../../lib/upload";

export function UserFollowing() {
  return <UserList type="following" />;
}

export function UserFollowers() {
  return <UserList type="followers" />;
}

function UserList({ type }: { type: "following" | "followers" }) {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const username = name ? decodeURIComponent(name) : "";

  const users = useMemo(() => {
    if (type === "following") {
      try {
        const ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
        return ids.map((u: string) => {
          const prayer = mockFeedPrayers.find(p => p.username === u);
          return {
            username: u,
            displayName: prayer?.displayName || u,
            prayerCount: mockFeedPrayers.filter(p => p.username === u).length,
          };
        });
      } catch { return []; }
    }
    // For followers, we'd need a proper backend. For now show empty.
    return [];
  }, [type, username]);

  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "#0A1A3A" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.98), rgba(10, 26, 58, 0))" }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-[#6b7499] hover:text-[#8890b5] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h2 className="text-[#e2e4f0] font-heading text-sm font-light capitalize">
            {type}
          </h2>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {users.length > 0 ? (
            <div className="space-y-1.5">
              {users.map((u) => (
                <div
                  key={u.username}
                  onClick={() => void navigate(`/user/${encodeURIComponent(u.username)}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[rgba(124,143,255,0.04)] transition-colors"
                >
                  <img
                    src={getInitialAvatarUrl(u.username)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e2e4f0] text-sm font-medium truncate">{u.displayName}</p>
                    <p className="text-[#5a6080] text-xs">@{u.username} · {u.prayerCount} prayers</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              {type === "following" ? (
                <>
                  <UserPlus size={24} className="text-[#4e5573] mx-auto mb-3" />
                  <p className="text-[#6b7499] text-sm mb-1">Not following anyone</p>
                  <p className="text-[#4e5573] text-xs">Follow people from their prayer pages</p>
                </>
              ) : (
                <>
                  <Users size={24} className="text-[#4e5573] mx-auto mb-3" />
                  <p className="text-[#6b7499] text-sm mb-1">No followers yet</p>
                  <p className="text-[#4e5573] text-xs">Share your prayers to grow your community</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
