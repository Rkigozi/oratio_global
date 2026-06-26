import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Check, Clock, Send, UserPlus, Users, X } from "lucide-react";
import { timeAgo } from '../../services/prayer-data';
import type { PrayerRequest } from '../../services/prayer-data';
import { getInitialAvatarUrl } from '../../services/upload';
import { useAuth } from '../../hooks/auth-context';
import {
  getProfileByUsername,
  getUserPrayers,
  getPrayerCircleStatus,
  respondToPrayerCircleInvite,
  sendPrayerCircleInvite,
  cancelPrayerCircleInvite,
  togglePray,
  type PrayerCircleStatus,
} from '../../services/supabase-queries';

export function UserProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { profile: currentProfile } = useAuth();
  const username = name ? decodeURIComponent(name) : "";
  const [circleStatus, setCircleStatus] = useState<PrayerCircleStatus>({ state: "none" });
  const [circleBusy, setCircleBusy] = useState(false);
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string } | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);

  const isOwnProfile = currentProfile?.username === username;

  useEffect(() => {
    if (!username) return;
    let active = true;

    const loadUserProfile = async () => {
      const [prof, userPrayers] = await Promise.all([
        getProfileByUsername(username),
        getUserPrayers(username),
      ]);

      if (!active) return;
      if (prof) {
        setProfile(prof);
        const status = await getPrayerCircleStatus(prof.id);
        if (!active) return;
        setCircleStatus(status);
      }
      setPrayers(userPrayers);
    };

    void loadUserProfile();

    return () => {
      active = false;
    };
  }, [username]);

  const handleInvite = async () => {
    if (!profile) return;
    setCircleBusy(true);
    const ok = await sendPrayerCircleInvite(profile.id);
    if (ok) {
      const status = await getPrayerCircleStatus(profile.id);
      setCircleStatus(status);
    }
    setCircleBusy(false);
  };

  const handleCancelInvite = async () => {
    if (!profile || !circleStatus.inviteId) return;
    setCircleBusy(true);
    const ok = await cancelPrayerCircleInvite(circleStatus.inviteId);
    if (ok) setCircleStatus({ state: "none" });
    setCircleBusy(false);
  };

  const handleRespond = async (response: "accepted" | "declined") => {
    if (!profile || !circleStatus.inviteId) return;
    setCircleBusy(true);
    const ok = await respondToPrayerCircleInvite(circleStatus.inviteId, response);
    if (ok) {
      setCircleStatus(response === "accepted" ? { state: "connected" } : { state: "none" });
    }
    setCircleBusy(false);
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
                <CircleAction
                  username={username}
                  status={circleStatus}
                  busy={circleBusy}
                  onInvite={() => void handleInvite()}
                  onCancel={() => void handleCancelInvite()}
                  onAccept={() => void handleRespond("accepted")}
                  onDecline={() => void handleRespond("declined")}
                />
              )}
            </div>
          </div>

          {/* Prayer presence row */}
          <div className="flex items-center gap-4 mb-6 py-3 px-4 rounded-xl"
            style={{ background: "rgba(var(--rgb-surface), 0.4)", border: "1px solid rgba(var(--rgb-accent), 0.06)" }}
          >
            <div className="text-center">
              <p className="text-text text-sm font-medium">{prayers.length}</p>
              <p className="text-text-dim text-[10px]">Shared prayers</p>
            </div>
            <div className="w-px self-stretch bg-accent/10" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <Users size={12} />
                <span>Prayer Circle is mutual</span>
              </div>
              <p className="text-text-dim text-[10px] mt-1 leading-relaxed">
                Pray for anyone. Keep praying with a few.
              </p>
            </div>
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

function CircleAction({
  username,
  status,
  busy,
  onInvite,
  onCancel,
  onAccept,
  onDecline,
}: {
  username: string;
  status: PrayerCircleStatus;
  busy: boolean;
  onInvite: () => void;
  onCancel: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (status.state === "connected") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-accent bg-accent/10 border border-accent/15">
        <Check size={12} />
        <span>In Prayer Circle</span>
      </div>
    );
  }

  if (status.state === "pending_sent") {
    return (
      <button
        onClick={onCancel}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer disabled:opacity-60"
        style={{
          background: "rgba(var(--rgb-accent), 0.08)",
          border: "1px solid rgba(var(--rgb-accent), 0.16)",
          color: "rgb(var(--rgb-accent))",
        }}
        aria-label={`Cancel Prayer Circle invite to @${username}`}
      >
        <Clock size={12} />
        <span>Invite sent</span>
      </button>
    );
  }

  if (status.state === "pending_received") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAccept}
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-text cursor-pointer disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
        >
          <Check size={12} />
          <span>Accept</span>
        </button>
        <button
          onClick={onDecline}
          disabled={busy}
          className="w-7 h-7 rounded-full flex items-center justify-center text-text-dim bg-accent/6 border border-accent/10 cursor-pointer disabled:opacity-60"
          aria-label={`Decline Prayer Circle invite from @${username}`}
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onInvite}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))",
        color: "rgb(var(--rgb-text))",
      }}
    >
      <UserPlus size={12} />
      <span>Invite to Prayer Circle</span>
    </button>
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
