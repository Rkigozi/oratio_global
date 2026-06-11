import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { mockFeedPrayers, timeAgo, getAttributionText } from "../data/prayer-data";
import { getInitialAvatarUrl } from "../../lib/upload";

export function UserProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const username = name ? decodeURIComponent(name) : "";
  const [following, setFollowing] = useState(false);

  const prayers = useMemo(() => {
    return mockFeedPrayers.filter((p) => {
      const att = getAttributionText(p);
      return att.toLowerCase() === username.toLowerCase();
    });
  }, [username]);

  const followerCount = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      return list.length;
    } catch { return 0; }
  }, []);

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
      if (newState) {
        if (!ids.includes(username)) ids.push(username);
      } else {
        const idx = ids.indexOf(username);
        if (idx > -1) ids.splice(idx, 1);
      }
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
          {/* Profile header — like Instagram */}
          <div className="flex items-start gap-4 mb-6 mt-4">
            <img
              src={getInitialAvatarUrl(username)}
              alt=""
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[#e2e4f0] font-heading text-base font-medium mb-0.5">
                {username}
              </h1>
              <p className="text-[#5a6080] text-xs mb-3">@{username}</p>
              <button
                onClick={handleFollowToggle}
                className="px-5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                style={{
                  background: following ? "rgba(124,143,255,0.1)" : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
                  border: following ? "1px solid rgba(124,143,255,0.2)" : "none",
                  color: following ? "#7c8fff" : "#ffffff",
                }}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
          </div>

          {/* Stats row — like Instagram */}
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
              <p className="text-[#e2e4f0] text-sm font-medium">0</p>
              <p className="text-[#5a6080] text-[10px]">Following</p>
            </button>
          </div>

          {/* Prayers header */}
          <div className="flex items-center gap-2 mb-3">
            <Send size={12} className="text-[#5a6080]" />
            <span className="text-[#8890b5] text-[10px] uppercase tracking-[0.15em]">
              Prayers
            </span>
          </div>

          {/* Prayer list */}
          <div className="space-y-2">
            {prayers.map((prayer) => (
              <div
                key={prayer.id}
                onClick={() => void navigate(`/prayer/${prayer.id}`)}
                className="rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  background: "linear-gradient(160deg, rgba(17, 26, 58, 0.5), rgba(12, 18, 48, 0.3))",
                  border: "1px solid rgba(124,143,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[#8890b5] text-[10px]">{prayer.city}</span>
                  <span className="text-[#3e4460] text-[10px]">·</span>
                  <span className="text-[#4e5573] text-[10px]">
                    {prayer.createdAt ? timeAgo(prayer.createdAt) : ""}
                  </span>
                </div>
                <p className="text-[#d0d4e8] text-sm line-clamp-2 leading-relaxed mb-2">
                  {prayer.text}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#5a6080]">🙏 {prayer.prayerCount}</span>
                </div>
              </div>
            ))}
            {prayers.length === 0 && (
              <p className="text-center text-[#4e5573] text-xs py-8">No prayers from this user</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
