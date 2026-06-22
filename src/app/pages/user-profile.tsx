import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { timeAgo } from "../data/prayer-data";
import type { PrayerRequest } from "../data/prayer-data";
import { getInitialAvatarUrl } from "../../lib/upload";
import { useAuth } from "../../lib/auth-context";
import { getProfileByUsername, getUserPrayers, followUser, unfollowUser, isFollowing, getFollowCounts, togglePray } from "../../lib/supabase-queries";

export function UserProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const username = name ? decodeURIComponent(name) : "";
  const [following, setFollowing] = useState(false);
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string } | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  const isOwnProfile = currentUser?.user_metadata?.username === username;

  useEffect(() => {
    if (!username) return;
    Promise.all([
      getProfileByUsername(username),
      getUserPrayers(username),
    ]).then(([prof, userPrayers]) => {
      if (prof) {
        setProfile(prof);
        getFollowCounts(prof.id).then(setFollowCounts);
        isFollowing(prof.id).then(setFollowing);
      }
      setPrayers(userPrayers);
    });
  }, [username]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    if (following) {
      const ok = await unfollowUser(profile.id);
      if (ok) {
        setFollowing(false);
        setFollowCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      }
    } else {
      const ok = await followUser(profile.id);
      if (ok) {
        setFollowing(true);
        setFollowCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    }
  };

  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh" style={{ background: "rgb(var(--rgb-bg))" }}>
        <p className="text-text-muted text-sm">User not found</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))" }}
      >
        <button onClick={() => void navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer mt-12"
        >
          <ArrowLeft size={16} />
          <span className="text-xs">Back</span>
        </button>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {/* Profile header */}
          <div className="flex items-start gap-4 mb-6 mt-4">
            <img src={profile?.avatar_url || getInitialAvatarUrl(profile?.display_name || username)} alt={profile?.display_name || username || "User"} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-text font-heading text-base font-medium mb-0.5">{profile?.display_name || username}</h1>
              <p className="text-text-dim text-xs mb-1">@{username}</p>
              {!isOwnProfile && (
                <button onClick={handleFollowToggle}
                  className="px-5 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                  style={{
                    background: following ? "rgba(var(--rgb-accent), 0.1)" : "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
                    border: following ? "1px solid rgba(var(--rgb-accent), 0.2)" : "none",
                    color: following ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text))",
                  }}
                >
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-around mb-6 py-3 rounded-xl"
            style={{ background: "rgba(var(--rgb-surface), 0.4)", border: "1px solid rgba(var(--rgb-accent), 0.06)" }}
          >
            <div className="text-center">
              <p className="text-text text-sm font-medium">{prayers.length}</p>
              <p className="text-text-dim text-[10px]">Prayers</p>
            </div>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/followers`)} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{followCounts.followers}</p>
              <p className="text-text-dim text-[10px]">Followers</p>
            </button>
            <button onClick={() => void navigate(`/user/${encodeURIComponent(username)}/following`)} className="text-center cursor-pointer">
              <p className="text-text text-sm font-medium">{followCounts.following}</p>
              <p className="text-text-dim text-[10px]">Following</p>
            </button>
          </div>

          {/* Prayers header */}
          <div className="flex items-center gap-2 mb-3">
            <Send size={12} className="text-text-dim" />
            <span className="text-text-muted text-[10px] uppercase tracking-[0.15em]">Prayers</span>
          </div>

          {/* Prayer list */}
          <div className="space-y-2">
            {prayers.length > 0 ? prayers.map((prayer) => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            )) : (
              <p className="text-center text-text-dim text-xs py-8">No prayers from this user</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrayerCard({ prayer }: { prayer: PrayerRequest }) {
  const navigate = useNavigate();
  const [prayed, setPrayed] = useState(false);
  const [count, setCount] = useState(prayer.prayerCount);

  const handlePray = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !prayed;
    setPrayed(newState);
    setCount(c => c + (newState ? 1 : -1));
    void togglePray(prayer.id, newState);
  }, [prayed, prayer.id]);

  return (
    <div onClick={() => void navigate(`/prayer/${prayer.id}`)}
      className="rounded-xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
      style={{
        background: "linear-gradient(160deg, rgba(var(--rgb-surface), 0.5), rgba(var(--rgb-surface), 0.3))",
        border: "1px solid rgba(var(--rgb-accent), 0.05)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-text-muted text-[10px]">{prayer.city || "Unknown"}</span>
        <span className="text-text-faint text-[10px]">·</span>
        <span className="text-text-dim text-[10px]">{prayer.createdAt ? timeAgo(prayer.createdAt) : ""}</span>
      </div>
      <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed mb-2">{prayer.text}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handlePray}
            className="flex items-center gap-1 text-xs transition-colors cursor-pointer"
            style={{ color: prayed ? "rgb(var(--rgb-accent))" : "rgb(var(--rgb-text-dim))" }}
          >
            <span>🙏</span>
            <span>{count}</span>
          </button>

        </div>
      </div>
    </div>
  );
}


