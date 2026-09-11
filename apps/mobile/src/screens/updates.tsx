import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react-native';
import {
  deleteActivityEvent,
  getActivityEvents,
  markActivityEventsRead,
  type ActivityEvent,
  type ActivityEventType,
} from '@oratio/shared/queries';
import { timeAgo } from '@oratio/shared/prayer-data';
import { Avatar } from '../components/avatar';
import { asNativeIcon, type NativeIcon } from '../components/icon';
import { useActivityUpdates } from '../hooks/activity-updates-context';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const BellIcon = asNativeIcon(Bell);
const HeartIcon = asNativeIcon(Heart);
const MessageIcon = asNativeIcon(MessageCircle);
const ShieldIcon = asNativeIcon(ShieldCheck);
const TrashIcon = asNativeIcon(Trash2);
const UsersIcon = asNativeIcon(UsersRound);

const activityIcons: Record<ActivityEventType, NativeIcon> = {
  comment_on_prayer: MessageIcon,
  reply_to_comment: MessageIcon,
  prayer_prayed: HeartIcon,
  prayer_circle_invite: UsersIcon,
  prayer_circle_accepted: UsersIcon,
  report_reviewed: ShieldIcon,
};

type ActivityDestination =
  | { screen: 'PrayerDetail'; params: { prayerId: string } }
  | { screen: 'PrayerCircleManagement' };

type ActivityCopy = {
  title: string;
  body: string;
  destination?: ActivityDestination;
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

export function getActivityCopy(event: ActivityEvent): ActivityCopy {
  const actor = actorLabel(event);
  const preview = metadataText(event, 'comment_preview');
  const reportStatus = metadataText(event, 'status');
  const prayerDestination = event.prayer_id
    ? ({ screen: 'PrayerDetail', params: { prayerId: event.prayer_id } } as const)
    : undefined;

  if (event.event_type === 'comment_on_prayer') {
    return {
      title: `${actor} commented on your prayer`,
      body: preview || 'Open the prayer to read the encouragement.',
      destination: prayerDestination,
    };
  }

  if (event.event_type === 'reply_to_comment') {
    return {
      title: `${actor} replied to your comment`,
      body: preview || 'Open the prayer to continue the conversation.',
      destination: prayerDestination,
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
      body: 'Open the prayer to see the support.',
      destination: prayerDestination,
    };
  }

  if (event.event_type === 'prayer_circle_invite') {
    return {
      title: `${actor} invited you to their Prayer Circle`,
      body: 'Accept or decline whenever you are ready.',
      destination: { screen: 'PrayerCircleManagement' },
    };
  }

  if (event.event_type === 'prayer_circle_accepted') {
    return {
      title: `${actor} accepted your Prayer Circle invite`,
      body: 'You can now share Prayer Circle prayers with each other.',
      destination: { screen: 'PrayerCircleManagement' },
    };
  }

  return {
    title: 'Your report was reviewed',
    body:
      reportStatus === 'dismissed'
        ? 'A moderator reviewed your report. Thank you for helping keep Oratio safe.'
        : 'A moderator has addressed your report. Thank you for helping keep Oratio safe.',
  };
}

export function UpdatesScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Updates'>) {
  const { liveVersion, refreshUnreadCount } = useActivityUpdates();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const unreadIds = useMemo(
    () => events.filter((event) => !event.read_at).map((event) => event.id),
    [events]
  );

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      setEvents(await getActivityEvents());
    } catch {
      setError("We couldn't load your updates. Try again.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load])
  );

  useEffect(() => {
    if (liveVersion === 0) return;
    void load(false);
  }, [liveVersion, load]);

  useEffect(() => {
    if (loading || unreadIds.length === 0) return;

    const timer = setTimeout(() => {
      const markRead = async () => {
        try {
          const ok = await markActivityEventsRead(unreadIds);
          if (!ok) return;
          const readAt = new Date().toISOString();
          setEvents((current) =>
            current.map((event) =>
              unreadIds.includes(event.id) ? { ...event, read_at: readAt } : event
            )
          );
          void refreshUnreadCount();
        } catch {
          // The next focus, foreground, or polling refresh retries read state.
        }
      };

      void markRead();
    }, 900);

    return () => clearTimeout(timer);
  }, [loading, refreshUnreadCount, unreadIds]);

  const refresh = async () => {
    setRefreshing(true);
    await load(false);
    await refreshUnreadCount();
    setRefreshing(false);
  };

  const openEvent = (event: ActivityEvent) => {
    const destination = getActivityCopy(event).destination;
    if (!destination) return;
    if (destination.screen === 'PrayerDetail') {
      navigation.navigate('PrayerDetail', destination.params);
    } else {
      navigation.navigate('PrayerCircleManagement');
    }
  };

  const removeEvent = async (eventId: string) => {
    setDeletingId(eventId);
    setDeleteErrorId(null);
    try {
      const ok = await deleteActivityEvent(eventId);
      if (!ok) {
        setDeleteErrorId(eventId);
        return;
      }
      setEvents((current) => current.filter((event) => event.id !== eventId));
      void refreshUnreadCount();
    } catch {
      setDeleteErrorId(eventId);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (event: ActivityEvent) => {
    Alert.alert('Delete update?', 'This update will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void removeEvent(event.id),
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <ArrowLeftIcon color={colors.textMuted} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>UPDATES</Text>
          <Text style={styles.subtitle}>Prayer and Circle activity</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyCopy}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load(true)}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, events.length === 0 && styles.emptyList]}
          data={events}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(event) => event.id}
          refreshControl={
            <RefreshControl
              onRefresh={() => void refresh()}
              refreshing={refreshing}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <ActivityRow
              deleting={deletingId === item.id}
              deleteFailed={deleteErrorId === item.id}
              event={item}
              onDelete={() => confirmDelete(item)}
              onOpen={() => openEvent(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <BellIcon color={colors.textDim} size={24} strokeWidth={1.6} />
              <Text style={styles.emptyTitle}>No updates yet</Text>
              <Text style={styles.emptyCopy}>
                Prayer support, comments and Circle activity will appear here.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityRow({
  event,
  deleting,
  deleteFailed,
  onOpen,
  onDelete,
}: {
  event: ActivityEvent;
  deleting: boolean;
  deleteFailed: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const copy = getActivityCopy(event);
  const Icon = activityIcons[event.event_type] || BellIcon;
  const name = event.actor?.display_name || event.actor?.username || 'Oratio';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={copy.destination ? 'button' : undefined}
        disabled={!copy.destination}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && copy.destination && styles.rowPressed]}
      >
        {event.actor ? (
          <Avatar name={name} size={36} uri={event.actor.avatar_url} />
        ) : (
          <View style={styles.eventIcon}>
            <Icon color={colors.textDim} size={15} strokeWidth={1.7} />
          </View>
        )}
        <View style={styles.rowCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{copy.title}</Text>
            {!event.read_at ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.eventBody}>{copy.body}</Text>
          <Text style={styles.time}>{timeAgo(event.created_at)}</Text>
          {deleteFailed ? (
            <Text style={styles.deleteError}>We couldn't delete that update.</Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Delete update: ${copy.title}`}
        accessibilityRole="button"
        disabled={deleting}
        hitSlop={6}
        onPress={onDelete}
        style={[styles.deleteButton, deleting && styles.disabled]}
      >
        {deleting ? (
          <ActivityIndicator color={colors.textDim} size="small" />
        ) : (
          <TrashIcon color={colors.textFaint} size={15} strokeWidth={1.7} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    letterSpacing: 4,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  emptyList: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 16,
  },
  emptyCopy: {
    maxWidth: 290,
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 92,
    paddingVertical: 15,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 6,
  },
  rowPressed: {
    opacity: 0.72,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: colors.accent,
  },
  eventBody: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  time: {
    color: colors.textFaint,
    fontFamily: fontFamilies.body,
    fontSize: 9,
    marginTop: 7,
  },
  deleteError: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 9,
    marginTop: 5,
  },
  deleteButton: {
    width: 44,
    height: 44,
    marginTop: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  retryText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.45,
  },
});
