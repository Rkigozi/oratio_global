import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, Clock, UserMinus, Users, X } from "lucide-react";
import { timeAgo } from "../../services/prayer-data";
import { getInitialAvatarUrl } from "../../services/upload";
import {
  cancelPrayerCircleInvite,
  getPrayerCircle,
  getPrayerCircleInvites,
  removeFromPrayerCircle,
  respondToPrayerCircleInvite,
  type PrayerCircleInvite,
  type PrayerCircleUser,
} from "../../services/supabase-queries";

export function PrayerCircle() {
  const navigate = useNavigate();
  const [circle, setCircle] = useState<PrayerCircleUser[]>([]);
  const [incoming, setIncoming] = useState<PrayerCircleInvite[]>([]);
  const [outgoing, setOutgoing] = useState<PrayerCircleInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCircle = async () => {
    setLoading(true);
    const [users, invites] = await Promise.all([
      getPrayerCircle(),
      getPrayerCircleInvites(),
    ]);
    setCircle(users);
    setIncoming(invites.incoming);
    setOutgoing(invites.outgoing);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialCircle = async () => {
      const [users, invites] = await Promise.all([
        getPrayerCircle(),
        getPrayerCircleInvites(),
      ]);

      if (!isMounted) return;
      setCircle(users);
      setIncoming(invites.incoming);
      setOutgoing(invites.outgoing);
      setLoading(false);
    };

    void loadInitialCircle();

    return () => {
      isMounted = false;
    };
  }, []);

  const respond = async (inviteId: string, response: "accepted" | "declined") => {
    setBusyId(inviteId);
    await respondToPrayerCircleInvite(inviteId, response);
    await loadCircle();
    setBusyId(null);
  };

  const cancel = async (inviteId: string) => {
    setBusyId(inviteId);
    await cancelPrayerCircleInvite(inviteId);
    await loadCircle();
    setBusyId(null);
  };

  const remove = async (userId: string) => {
    setBusyId(userId);
    await removeFromPrayerCircle(userId);
    await loadCircle();
    setBusyId(null);
  };

  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div
        className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))" }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button
            onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h2 className="text-text font-heading text-sm font-light">Prayer Circle</h2>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <div
            className="rounded-xl px-4 py-4 mb-5"
            style={{ background: "rgba(var(--rgb-surface), 0.4)", border: "1px solid rgba(var(--rgb-accent), 0.06)" }}
          >
            <div className="flex items-center gap-2 text-text text-sm font-medium">
              <Users size={16} className="text-accent" />
              <span>Pray for anyone. Keep praying with a few.</span>
            </div>
            <p className="text-text-dim text-xs mt-2 leading-relaxed">
              Prayer Circle is mutual. People only appear here after an invite is accepted.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-text-dim text-xs py-12">Loading...</p>
          ) : (
            <div className="space-y-6">
              {incoming.length > 0 && (
                <section>
                  <SectionTitle label="Invites to respond to" />
                  <div className="space-y-2">
                    {incoming.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        invite={invite}
                        person={invite.requester}
                        detail={`@${invite.requester.username} invited you to their Prayer Circle`}
                        busy={busyId === invite.id}
                        actions={
                          <>
                            <button
                              onClick={() => void respond(invite.id, "accepted")}
                              disabled={busyId === invite.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-text cursor-pointer disabled:opacity-60"
                              style={{ background: "linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))" }}
                            >
                              <Check size={12} />
                              Accept
                            </button>
                            <button
                              onClick={() => void respond(invite.id, "declined")}
                              disabled={busyId === invite.id}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim bg-accent/6 border border-accent/10 cursor-pointer disabled:opacity-60"
                              aria-label={`Decline invite from @${invite.requester.username}`}
                            >
                              <X size={13} />
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {outgoing.length > 0 && (
                <section>
                  <SectionTitle label="Invites sent" />
                  <div className="space-y-2">
                    {outgoing.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        invite={invite}
                        person={invite.recipient}
                        detail={`Waiting for @${invite.recipient.username} to accept`}
                        busy={busyId === invite.id}
                        actions={
                          <button
                            onClick={() => void cancel(invite.id)}
                            disabled={busyId === invite.id}
                            className="text-xs px-3 py-1.5 rounded-full text-text-dim bg-accent/6 border border-accent/10 cursor-pointer disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle label="In your Prayer Circle" />
                {circle.length > 0 ? (
                  <div className="space-y-2">
                    {circle.map((person) => (
                      <div
                        key={person.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/4 transition-colors"
                      >
                        <button
                          onClick={() => void navigate(`/user/${encodeURIComponent(person.username)}`)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                        >
                          <img
                            src={person.avatar_url || getInitialAvatarUrl(person.display_name || person.username)}
                            alt={person.display_name || person.username || "User"}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-text text-sm font-medium truncate">{person.display_name || person.username}</span>
                            <span className="block text-text-dim text-xs truncate">
                              @{person.username}
                              {person.connected_at ? ` · joined ${timeAgo(person.connected_at)}` : ""}
                            </span>
                          </span>
                        </button>
                        <button
                          onClick={() => void remove(person.id)}
                          disabled={busyId === person.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim bg-accent/6 border border-accent/10 cursor-pointer disabled:opacity-60"
                          aria-label={`Remove @${person.username} from Prayer Circle`}
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users size={24} className="text-text-dim mx-auto mb-3" />
                    <p className="text-text-muted text-sm mb-1">Your Prayer Circle is quiet for now</p>
                    <p className="text-text-dim text-xs leading-relaxed max-w-xs mx-auto">
                      Invite someone from a prayer or profile when you want to keep praying with them over time.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-text-muted text-[10px] uppercase tracking-[0.15em]">{label}</span>
    </div>
  );
}

function InviteRow({
  person,
  invite,
  detail,
  busy,
  actions,
}: {
  person: PrayerCircleUser;
  invite: PrayerCircleInvite;
  detail: string;
  busy: boolean;
  actions: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(var(--rgb-surface), 0.32)", border: "1px solid rgba(var(--rgb-accent), 0.06)" }}
    >
      <img
        src={person.avatar_url || getInitialAvatarUrl(person.display_name || person.username)}
        alt={person.display_name || person.username || "User"}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-text text-sm font-medium truncate">{person.display_name || person.username}</p>
        <p className="text-text-dim text-xs truncate">{detail}</p>
        <p className="text-text-faint text-[10px] mt-0.5">
          <Clock size={10} className="inline mr-1" />
          {timeAgo(invite.created_at)}
        </p>
      </div>
      <div className={`flex items-center gap-1.5 ${busy ? "opacity-60" : ""}`}>
        {actions}
      </div>
    </div>
  );
}
