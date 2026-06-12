import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { mockFeedPrayers, timeAgo, getAttributionText } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { getInitialAvatarUrl } from "../../lib/upload";

const mockBios: Record<string, string> = {
  "marcus_t": "Trusting God through the storm. Praying for healing and breakthrough.",
  "jess_w": "Mother of two. Finding strength in prayer. 🙏",
  "david kim": "Walking with Jesus. Learning to surrender every day.",
  "tolu_a": "Faithful servant. Believing in miracles.",
  "sarah chen": "Praying for my family and yours. God is faithful.",
  "andre_m": "New to faith. Learning to pray. Grateful for this community.",
};

const mockLocations: Record<string, string> = {
  "marcus_t": "London, UK",
  "jess_w": "Manchester, UK",
  "david kim": "Seoul, South Korea",
  "tolu_a": "Lagos, Nigeria",
  "sarah chen": "New York, USA",
  "andre_m": "Nairobi, Kenya",
};

function generateMockFollowers(usernames: string[], target: string): string[] {
  // Deterministic: 3-5 random followers based on username hash
  let hash = 0;
  for (let i = 0; i < target.length; i++) hash = ((hash << 5) - hash) + target.charCodeAt(i);
  hash = Math.abs(hash);
  const count = 3 + (hash % 3);
  const followers: string[] = [];
  const others = usernames.filter(u => u !== target);
  for (let i = 0; i < count && i < others.length; i++) {
    const idx = (hash + i * 7) % others.length;
    followers.push(others[idx]);
  }
  return followers;
}

export function UserProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const username = name ? decodeURIComponent(name) : "";
  const [following, setFollowing] = useState(false);

  const allUsernames = useMemo(() =>
    [...new Set(mockFeedPrayers.map(p => p.username).filter(Boolean) as string[])],
  []);

  const prayers = useMemo(() =>
    mockFeedPrayers.filter(p => getAttributionText(p).toLowerCase() === username.toLowerCase()),
  [username]);

  const mockFollowers = useMemo(() =>
    generateMockFollowers(allUsernames, username),
  [allUsernames, username]);

  const myUsername = (() => {
    try { return JSON.parse(localStorage.getItem("oratio_profile") || "{}")?.username || ""; }
    catch { return ""; }
  })();
  const isOwnProfile = username === myUsername;

  const followerCount = mockFollowers.length;
  const displayFollowingCount = isOwnProfile
    ? (() => { try { return (JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[]).length; } catch { return 0; } })()
    : 1 + (hashString(username) % 5);

  const mockBio = mockBios[username] || "Child of God. Praying without ceasing.";
  const mockLoc = mockLocations[username] || "";

  // Mutual followers
  const mutuals = useMemo(() => {
    try {
      const myFollowing = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      return mockFollowers.filter(f => myFollowing.includes(f));
    } catch { return []; }
  }, [mockFollowers]);

  useEffect(() => {
    if (!username) return;
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      setFollowing(ids.includes(username));
    } catch { setFollowing(false); }
  }, [username]);

  const handleFollowToggle = () => {
    const newState = !following;
    setFollowing(newState);
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      if (newState) { if (!ids.includes(username)) ids.push(username); }
      else { const idx = ids.indexOf(username); if (idx > -1) ids.splice(idx, 1); }
      localStorage.setItem("oratio_following", JSON.stringify(ids));
    } catch { /* ignore */ }
  };

  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh" style={{ background: "#0A1A3A" }}>
        <p className="text-[#6b7499] text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "#0A1A3A" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(10, 26, 58, 0.98), rgba(10, 26, 58, 0))" }}
      >
        <button onClick={() => void navigate(-1)}
          className="flex items-center gap-2 text-[#6b7499] hover:text-[#8890b5] transition-colors cursor-pointer mt-12"
        >
          <ArrowLeft size={16} />
          <span className="text-xs">Back</span>
        </button>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <div className="mb-4 px-3 py-2 rounded-lg text-center"
            style={{ background: "rgba(124,143,255,0.06)", border: "1px solid rgba(124,143,255,0.1)" }}
          >
            <p className="text-[#7c8fff] text-[10px]">Sample profile — real user data coming with accounts</p>
          </div>

          {/* Profile header */}
          <div className="flex items-start gap-4 mb-6 mt-4">
            <img src={getInitialAvatarUrl(username)} alt="" className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[#e2e4f0] font-heading text-base font-medium mb-0.5">{username}</h1>
              <p className="text-[#5a6080] text-xs mb-1">@{username}</p>
              <p className="text-[#c5cbe2] text-xs leading-relaxed mb-1.5">{mockBio}</p>
              {mockLoc && <p className="text-[#4e5573] text-[10px] mb-2">📍 {mockLoc}</p>}
              {!isOwnProfile && (
                <button onClick={handleFollowToggle}
                  className="px-5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                  style={{
                    background: following ? "rgba(124,143,255,0.1)" : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                    border: following ? "1px solid rgba(124,143,255,0.2)" : "none",
                    color: following ? "#7c8fff" : "#ffffff",
                  }}
                >
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Mutual followers */}
          {mutuals.length > 0 && (
            <div className="mb-4 px-1">
              <p className="text-[#4e5573] text-[10px]">
                Followed by <span className="text-[#7c8fff]">@{mutuals[0]}</span>
                {mutuals.length > 1 && <> and {mutuals.length - 1} other{mutuals.length > 2 ? "s" : ""} you follow</>}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="flex justify-around mb-6 py-3 rounded-xl"
            style={{ background: "rgba(17, 26, 58, 0.4)", border: "1px solid rgba(124,143,255,0.06)" }}
          >
            <div className="text-center">
              <p className="text-[#e2e4f0] text-sm font-medium">{prayers.length}</p>
              <p className="text-[#5a6080] text-[10px]">Prayers</p>
            </div>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/followers`)} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{followerCount}</p>
              <p className="text-[#5a6080] text-[10px]">Followers</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/following`)} className="text-center cursor-pointer">
              <p className="text-[#e2e4f0] text-sm font-medium">{displayFollowingCount}</p>
              <p className="text-[#5a6080] text-[10px]">Following</p>
            </button>
          </div>

          {/* Prayers header */}
          <div className="flex items-center gap-2 mb-3">
            <Send size={12} className="text-[#5a6080]" />
            <span className="text-[#8890b5] text-[10px] uppercase tracking-[0.15em]">Prayers</span>
          </div>

          {/* Prayer list */}
          <div className="space-y-2">
            {prayers.length > 0 ? prayers.map((prayer) => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            )) : (
              <p className="text-center text-[#4e5573] text-xs py-8">No prayers from this user</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCommentCount(prayerId: string): number {
  try {
    const raw = localStorage.getItem(`oratio_comments_${prayerId}`);
    if (raw) return (JSON.parse(raw) as Array<unknown>).length;
  } catch { /* ignore */ }
  return 0;
}

function PrayerCard({ prayer }: { prayer: PrayerRequest }) {
  const navigate = useNavigate();
  const [prayed, setPrayed] = useState(false);
  const [count, setCount] = useState(prayer.prayerCount);
  const [commentCount] = useState(() => getCommentCount(prayer.id));

  const handlePray = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !prayed;
    setPrayed(newState);
    setCount(c => c + (newState ? 1 : -1));
    try {
      const ids = JSON.parse(localStorage.getItem("oratio_prayed") || "[]") as string[];
      if (newState && !ids.includes(prayer.id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify([...ids, prayer.id]));
      } else if (!newState && ids.includes(prayer.id)) {
        localStorage.setItem("oratio_prayed", JSON.stringify(ids.filter(i => i !== prayer.id)));
      }
    } catch { /* ignore */ }
  }, [prayed, prayer.id]);

  return (
    <div onClick={() => void navigate(`/prayer/${prayer.id}`)}
      className="rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
      style={{
        background: "linear-gradient(160deg, rgba(17, 26, 58, 0.5), rgba(12, 18, 48, 0.3))",
        border: "1px solid rgba(124,143,255,0.05)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[#8890b5] text-[10px]">{prayer.city || "Unknown"}</span>
        <span className="text-[#3e4460] text-[10px]">·</span>
        <span className="text-[#4e5573] text-[10px]">{prayer.createdAt ? timeAgo(prayer.createdAt) : ""}</span>
      </div>
      <p className="text-[#d0d4e8] text-sm line-clamp-2 leading-relaxed mb-2">{prayer.text}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handlePray}
            className="flex items-center gap-1 text-xs transition-colors cursor-pointer"
            style={{ color: prayed ? "#7c8fff" : "#5a6080" }}
          >
            <span>🙏</span>
            <span>{count}</span>
          </button>
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-[#4e5573] text-xs">
              <MessageCircle size={11} />
              <span>{commentCount}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return Math.abs(hash);
}
