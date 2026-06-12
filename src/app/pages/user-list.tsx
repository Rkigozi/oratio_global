import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { mockFeedPrayers } from "../data/prayer-data";
import { getInitialAvatarUrl } from "../../lib/upload";

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return Math.abs(hash);
}

function generateMockFollowers(allUsernames: string[], target: string): string[] {
  const hash = hashString(target);
  const count = 3 + (hash % 3);
  const others = allUsernames.filter(u => u !== target);
  const followers: string[] = [];
  for (let i = 0; i < count && i < others.length; i++) {
    followers.push(others[(hash + i * 7) % others.length]);
  }
  return [...new Set(followers)];
}

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

  const allUsernames = useMemo(() =>
    [...new Set(mockFeedPrayers.map(p => p.username).filter(Boolean) as string[])],
  []);

  const users = useMemo(() => {
    let ids: string[];
    if (type === "following") {
      // Read from localStorage (real following data)
      try {
        ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      } catch { ids = []; }
    } else {
      // Generate mock followers for this user
      ids = generateMockFollowers(allUsernames, username);
    }

    return ids.map((u: string) => {
      const prayer = mockFeedPrayers.find(p => p.username === u);
      return {
        username: u,
        displayName: prayer?.displayName || u,
        prayerCount: mockFeedPrayers.filter(p => p.username === u).length,
      };
    });
  }, [type, username, allUsernames]);

  // Check which of these users you also follow (mutuals)
  const mutuals = useMemo(() => {
    try {
      const myFollowing = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      return users.filter(u => myFollowing.includes(u.username)).map(u => u.username);
    } catch { return []; }
  }, [users]);

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
          <h2 className="text-[#e2e4f0] font-heading text-sm font-light capitalize">{type}</h2>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {type === "followers" && (
            <div className="mb-3 px-3 py-2 rounded-lg text-center"
              style={{ background: "rgba(124,143,255,0.06)", border: "1px solid rgba(124,143,255,0.1)" }}
            >
              <p className="text-[#7c8fff] text-[10px]">Sample data — real followers coming with accounts</p>
            </div>
          )}
          {users.length > 0 ? (
            <div className="space-y-1.5">
              {users.map((u) => {
                const isMutual = mutuals.includes(u.username);
                return (
                  <div key={u.username}
                    onClick={() => void navigate(`/user/${encodeURIComponent(u.username)}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[rgba(124,143,255,0.04)] transition-colors"
                  >
                    <img src={getInitialAvatarUrl(u.username)} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#e2e4f0] text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-[#5a6080] text-xs">
                        @{u.username} · {u.prayerCount} {u.prayerCount === 1 ? "prayer" : "prayers"}
                        {isMutual && <span className="text-[#7c8fff]"> · Mutual</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                  <p className="text-[#4e5573] text-xs">Growing your community takes time</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
