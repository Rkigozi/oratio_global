import { Check, Clock, UserPlus } from 'lucide-react';
import type { PrayerCircleStatus } from '../../services/supabase-queries';

type Props = {
  username: string;
  status: PrayerCircleStatus;
  busy: boolean;
  onInvite: () => void;
  onCancel: () => void;
  onAccept: () => void;
};

export function PrayerCircleMiniButton({ username, status, busy, onInvite, onCancel, onAccept }: Props) {
  if (status.state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-accent bg-accent/10 border border-accent/15">
        <Check size={11} />
        In Prayer Circle
      </span>
    );
  }

  if (status.state === 'pending_sent') {
    return (
      <button
        onClick={onCancel}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
        style={{
          background: 'rgba(var(--rgb-accent), 0.08)',
          border: '1px solid rgba(var(--rgb-accent), 0.16)',
          color: 'rgb(var(--rgb-accent))',
        }}
        aria-label={`Cancel Prayer Circle invite to @${username}`}
      >
        <Clock size={11} />
        Invite sent
      </button>
    );
  }

  if (status.state === 'pending_received') {
    return (
      <button
        onClick={onAccept}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
        style={{
          background:
            'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
          color: 'rgb(var(--rgb-text))',
        }}
      >
        <Check size={11} />
        Accept invite
      </button>
    );
  }

  return (
    <button
      onClick={onInvite}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-60"
      style={{
        background: 'rgba(var(--rgb-accent), 0.04)',
        border: '1px solid rgba(var(--rgb-accent), 0.08)',
        color: 'rgb(var(--rgb-text-dim))',
      }}
    >
      <UserPlus size={11} />
      Invite @{username}
    </button>
  );
}
