import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  Check,
  Heart,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AvatarImage } from '../components/avatar-image';
import { LoadingSpinner } from '../components/loading-spinner';
import { timeAgo } from '../services/prayer-data';
import {
  deleteActivityEvent,
  getActivityEvents,
  markActivityEventsRead,
  type ActivityEvent,
  type ActivityEventType,
} from '../services/supabase-queries';
import { useActivityUpdates } from '../hooks/activity-updates-context';

const activityIcons: Record<ActivityEventType, LucideIcon> = {
  comment_on_prayer: MessageCircle,
  reply_to_comment: MessageCircle,
  prayer_prayed: Heart,
  prayer_circle_invite: Users,
  prayer_circle_accepted: Users,
  report_reviewed: ShieldCheck,
};

function metadataText(event: ActivityEvent, key: string) {
  const value = event.metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function metadataNumber(event: ActivityEvent, key: string) {
  const value = event.metadata[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function actorLabel(event: ActivityEvent) {
  if (event.actor?.display_name) return event.actor.display_name;
  if (event.actor?.username) return `@${event.actor.username}`;
  return 'Someone';
}

function getActivityCopy(event: ActivityEvent): {
  title: string;
  body: string;
  actionLabel?: string;
  actionPath?: string;
} {
  const actor = actorLabel(event);
  const preview = metadataText(event, 'comment_preview');
  const reportStatus = metadataText(event, 'status');

  if (event.event_type === 'comment_on_prayer') {
    return {
      title: `${actor} commented on your prayer`,
      body: preview || 'Open the prayer to read the encouragement.',
      actionLabel: 'View prayer',
      actionPath: event.prayer_id ? `/prayer/${event.prayer_id}` : undefined,
    };
  }

  if (event.event_type === 'reply_to_comment') {
    return {
      title: `${actor} replied to your comment`,
      body: preview || 'Open the prayer to continue the conversation.',
      actionLabel: 'View reply',
      actionPath: event.prayer_id ? `/prayer/${event.prayer_id}` : undefined,
    };
  }

  if (event.event_type === 'prayer_prayed') {
    const actorCount = metadataNumber(event, 'actor_count');
    const otherCount = Math.max(actorCount - 1, 0);
    const title = event.actor
      ? otherCount > 1
        ? `${actor} and ${otherCount} others prayed with you`
        : otherCount === 1
          ? `${actor} and 1 other prayed with you`
          : `${actor} prayed with you`
      : actorCount > 1
        ? `${actorCount} people prayed with you`
        : 'Someone prayed with you';

    return {
      title,
      body: 'Open the prayer to see the encouragement.',
      actionLabel: 'View prayer',
      actionPath: event.prayer_id ? `/prayer/${event.prayer_id}` : undefined,
    };
  }

  if (event.event_type === 'prayer_circle_invite') {
    return {
      title: `${actor} invited you to their Prayer Circle`,
      body: 'You can accept or decline when you are ready.',
      actionLabel: 'Review invite',
      actionPath: '/profile/circle',
    };
  }

  if (event.event_type === 'prayer_circle_accepted') {
    return {
      title: `${actor} accepted your Prayer Circle invite`,
      body: 'You can now share Prayer Circle prayers with each other.',
      actionLabel: 'Open Prayer Circle',
      actionPath: '/profile/circle',
    };
  }

  return {
    title: 'Your report was reviewed',
    body:
      reportStatus === 'dismissed'
        ? 'Thank you for helping keep Oratio safe. A moderator reviewed your report.'
        : 'Thank you for helping keep Oratio safe. A moderator has addressed your report.',
  };
}

export function Updates() {
  const navigate = useNavigate();
  const { liveVersion, refreshUnreadCount } = useActivityUpdates();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const unreadIds = useMemo(
    () => events.filter((event) => !event.read_at).map((event) => event.id),
    [events]
  );

  const loadUpdates = useCallback(async () => {
    const updates = await getActivityEvents();
    setEvents(updates);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const updates = await getActivityEvents();
      if (!active) return;
      setEvents(updates);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (liveVersion === 0) return;

    const timer = window.setTimeout(() => {
      void loadUpdates();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [liveVersion, loadUpdates]);

  useEffect(() => {
    if (loading || unreadIds.length === 0) return;

    const timer = window.setTimeout(() => {
      const markRead = async () => {
        const ok = await markActivityEventsRead(unreadIds);
        if (!ok) return;
        const readAt = new Date().toISOString();
        setEvents((current) =>
          current.map((event) =>
            unreadIds.includes(event.id) ? { ...event, read_at: readAt } : event
          )
        );
        void refreshUnreadCount();
        window.dispatchEvent(new Event('oratio-activity-updated'));
      };

      void markRead();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [loading, refreshUnreadCount, unreadIds]);

  const refresh = async () => {
    setRefreshing(true);
    await loadUpdates();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    const ok = await markActivityEventsRead(unreadIds);
    if (!ok) return;
    const readAt = new Date().toISOString();
    setEvents((current) =>
      current.map((event) => ({ ...event, read_at: event.read_at ?? readAt }))
    );
    void refreshUnreadCount();
    window.dispatchEvent(new Event('oratio-activity-updated'));
  };

  const deleteUpdate = async (eventId: string) => {
    setDeletingId(eventId);
    setDeleteErrorId(null);

    const ok = await deleteActivityEvent(eventId);
    setDeletingId(null);

    if (!ok) {
      setDeleteErrorId(eventId);
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== eventId));
    void refreshUnreadCount();
    window.dispatchEvent(new Event('oratio-activity-updated'));
  };

  return (
    <div
      className="w-full h-full flex flex-col px-5 pb-28"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      <div className="flex-1 overflow-y-auto pt-24">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={15} className="text-accent" />
            <span className="text-text-muted text-xs uppercase tracking-[0.15em]">Updates</span>
            <button
              onClick={() => void refresh()}
              disabled={refreshing}
              className="ml-auto h-11 w-11 rounded-full flex items-center justify-center text-text-dim hover:text-text-muted bg-accent/6 border border-accent/10 transition-colors cursor-pointer disabled:opacity-60"
              aria-label="Refresh updates"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {unreadIds.length > 0 && !loading && (
            <button
              onClick={() => void markAllRead()}
              className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/15 bg-accent/6 px-4 py-2 text-xs text-accent transition-colors hover:bg-accent/10 cursor-pointer"
            >
              <Check size={13} />
              Mark all read
            </button>
          )}

          {loading ? (
            <LoadingSpinner text="Loading updates..." />
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Bell size={24} className="text-text-dim mx-auto mb-3" />
              <p className="text-text-muted text-sm mb-1">No updates yet</p>
              <p className="text-text-dim text-xs leading-relaxed max-w-xs mx-auto">
                Prayers, comments, Prayer Circle invites, and moderation updates will appear here.
              </p>
              <button
                onClick={() => void navigate('/feed')}
                className="mt-5 min-h-11 rounded-full border border-accent/15 bg-accent/6 px-5 py-2 text-xs text-accent transition-colors hover:bg-accent/10 cursor-pointer"
              >
                Open prayer feed
              </button>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {events.map((event, index) => {
                const copy = getActivityCopy(event);
                const Icon = activityIcons[event.event_type] || Bell;
                const unread = !event.read_at;
                const clickable = Boolean(copy.actionPath);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.035, 0.35), duration: 0.28 }}
                    className="w-full rounded-xl px-4 py-3.5 text-left transition-colors"
                    style={{
                      background: unread
                        ? 'linear-gradient(160deg, rgba(var(--rgb-accent), 0.1), rgba(var(--rgb-surface), 0.42))'
                        : 'linear-gradient(160deg, rgba(var(--rgb-surface), 0.58), rgba(var(--rgb-surface), 0.36))',
                      border: unread
                        ? '1px solid rgba(var(--rgb-accent), 0.16)'
                        : '1px solid rgba(var(--rgb-accent), 0.06)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => copy.actionPath && void navigate(copy.actionPath)}
                        disabled={!clickable}
                        className={`min-w-0 flex-1 text-left ${
                          clickable ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          {event.actor ? (
                            <AvatarImage
                              src={event.actor.avatar_url}
                              name={event.actor.display_name || event.actor.username}
                              alt={event.actor.display_name || event.actor.username}
                              className="h-9 w-9 flex-shrink-0 text-xs"
                            />
                          ) : (
                            <span className="h-9 w-9 rounded-full bg-accent/8 border border-accent/10 flex items-center justify-center flex-shrink-0">
                              <Icon size={15} className="text-text-dim" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span className="text-text text-sm font-medium leading-snug">
                                {copy.title}
                              </span>
                              {unread && (
                                <span
                                  className="mt-1.5 h-2 w-2 rounded-full bg-accent flex-shrink-0"
                                  aria-label="Unread"
                                />
                              )}
                            </span>
                            <span className="mt-1 block text-text-dim text-xs leading-relaxed">
                              {copy.body}
                            </span>
                            <span className="mt-2 flex items-center gap-2">
                              <span className="text-text-faint text-[10px]">
                                {timeAgo(event.created_at)}
                              </span>
                              {copy.actionLabel && (
                                <span className="text-accent text-[10px]">{copy.actionLabel}</span>
                              )}
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUpdate(event.id)}
                        disabled={deletingId === event.id}
                        aria-label={`Delete update: ${copy.title}`}
                        className="h-9 w-9 flex-shrink-0 rounded-full border border-accent/10 bg-accent/5 text-text-faint transition-colors hover:border-danger/20 hover:bg-danger/8 hover:text-danger cursor-pointer disabled:cursor-default disabled:opacity-50"
                      >
                        <Trash2 size={13} className="mx-auto" />
                      </button>
                    </div>
                    {deleteErrorId === event.id && (
                      <p className="mt-2 pl-12 text-[10px] text-danger">
                        {"We couldn't delete that update. Please try again."}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
