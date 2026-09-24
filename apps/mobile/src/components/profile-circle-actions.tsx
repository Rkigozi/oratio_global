import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, Clock, UserPlus, UsersRound, X } from 'lucide-react-native';
import {
  cancelPrayerCircleInvite,
  getPrayerCircleCount,
  getPrayerCircleStatus,
  respondToPrayerCircleInvite,
  sendPrayerCircleInvite,
  type PrayerCircleStatus,
} from '@oratio/shared/queries';
import { asNativeIcon } from './icon';
import { colors, fontFamilies } from '../theme';

const CheckIcon = asNativeIcon(Check);
const ClockIcon = asNativeIcon(Clock);
const UserPlusIcon = asNativeIcon(UserPlus);
const UsersIcon = asNativeIcon(UsersRound);
const XIcon = asNativeIcon(X);
const CIRCLE_LIMIT = 12;

type Action = 'invite' | 'cancel' | 'accept' | 'decline';
type Props = {
  recipientId: string;
  username: string;
  viewerId: string;
  refreshing: boolean;
  onAccepted: () => Promise<void>;
  onManage: () => void;
};

export function ProfileCircleActions({
  recipientId,
  username,
  viewerId,
  refreshing,
  onAccepted,
  onManage,
}: Props) {
  const [status, setStatus] = useState<PrayerCircleStatus | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);
  const pending = useRef(false);
  const active = useRef(false);
  const full = count >= CIRCLE_LIMIT;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [nextStatus, nextCount] = await Promise.all([
        getPrayerCircleStatus(recipientId, { throwOnError: true }),
        getPrayerCircleCount(viewerId, { throwOnError: true }),
      ]);
      if (request !== requestId.current) return;
      setStatus(nextStatus);
      setCount(nextCount);
    } catch {
      if (request !== requestId.current) return;
      setStatus(null);
      setError("We couldn't check your Prayer Circle. Please try again.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [recipientId, viewerId]);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      if (!pending.current) setBusy(null);
      setNotice('');
      void load();
      return () => {
        active.current = false;
        requestId.current += 1;
      };
    }, [load])
  );

  useEffect(() => {
    if (refreshing && !pending.current) void load();
  }, [refreshing, load]);

  const perform = async (action: Action) => {
    if (pending.current || loading || !status || recipientId === viewerId) return;
    if (action === 'invite' && (status.state !== 'none' || full)) return;
    if (action === 'cancel' && (status.state !== 'pending_sent' || !status.inviteId)) return;
    if (
      (action === 'accept' || action === 'decline') &&
      (status.state !== 'pending_received' || !status.inviteId || (action === 'accept' && full))
    )
      return;

    pending.current = true;
    const request = ++requestId.current;
    setBusy(action);
    setError('');
    setNotice('');
    const failures: Record<Action, string> = {
      invite:
        "We couldn't send the invite. Try again; an invite may already exist or a Circle may be full.",
      cancel: "We couldn't cancel the invite. Please try again.",
      accept:
        "We couldn't accept the invite. Try again; it may have changed or a Circle may be full.",
      decline: "We couldn't decline the invite. Please try again.",
    };
    try {
      const ok =
        action === 'invite'
          ? await sendPrayerCircleInvite(recipientId)
          : action === 'cancel'
            ? await cancelPrayerCircleInvite(status.inviteId!)
            : await respondToPrayerCircleInvite(
                status.inviteId!,
                action === 'accept' ? 'accepted' : 'declined'
              );
      if (request !== requestId.current) return;
      if (!ok) {
        setError(failures[action]);
        return;
      }
      const messages: Record<Action, string> = {
        invite: `Invite sent to @${username}.`,
        cancel: 'Invite cancelled.',
        accept: `@${username} is now in your Prayer Circle.`,
        decline: 'Invite declined.',
      };
      setNotice(messages[action]);
      if (action === 'accept') await onAccepted();
      if (request === requestId.current) await load();
    } catch {
      if (request === requestId.current) setError(failures[action]);
    } finally {
      pending.current = false;
      if (active.current) setBusy(null);
    }
  };

  if (recipientId === viewerId || status?.state === 'self') return null;

  return (
    <View style={styles.container}>
      {loading || busy ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Updating Prayer Circle"
          style={styles.status}
        >
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.secondary}>
            {busy ? 'Updating Prayer Circle...' : 'Checking Prayer Circle...'}
          </Text>
        </View>
      ) : status?.state === 'none' ? (
        <Pressable
          accessibilityRole="button"
          disabled={full}
          onPress={() => void perform('invite')}
          style={[styles.button, full && styles.disabled]}
        >
          <UserPlusIcon color={colors.accent} size={18} />
          <Text style={styles.buttonText}>
            {full ? 'Prayer Circle full (12/12)' : 'Invite to Prayer Circle'}
          </Text>
        </Pressable>
      ) : status?.state === 'pending_sent' ? (
        <>
          <View style={styles.status}>
            <ClockIcon color={colors.textMuted} size={18} />
            <Text style={styles.secondary}>Invite sent</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void perform('cancel')}
            style={styles.button}
          >
            <XIcon color={colors.accent} size={18} />
            <Text style={styles.buttonText}>Cancel invite</Text>
          </Pressable>
        </>
      ) : status?.state === 'pending_received' ? (
        <>
          <Text style={styles.secondary}>@{username} invited you</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={full}
              onPress={() => void perform('accept')}
              style={[styles.button, styles.response, full && styles.disabled]}
            >
              <CheckIcon color={colors.accent} size={18} />
              <Text style={styles.buttonText}>Accept invite</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void perform('decline')}
              style={[styles.button, styles.response]}
            >
              <XIcon color={colors.accent} size={18} />
              <Text style={styles.buttonText}>Decline</Text>
            </Pressable>
          </View>
          {full ? <Text style={styles.secondary}>Prayer Circle full (12/12)</Text> : null}
        </>
      ) : status?.state === 'connected' ? (
        <View style={styles.status}>
          <CheckIcon color={colors.accent} size={18} />
          <Text style={styles.buttonText}>In your Prayer Circle</Text>
        </View>
      ) : null}
      {!busy && !loading && (full || status?.state === 'connected') ? (
        <Pressable accessibilityRole="button" onPress={onManage} style={styles.button}>
          <UsersIcon color={colors.accent} size={18} />
          <Text style={styles.buttonText}>Manage Prayer Circle</Text>
        </Pressable>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.secondary}>
          {notice}
        </Text>
      ) : null}
      {error ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(busy) || loading}
            onPress={() => void load()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Refresh Prayer Circle</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', alignItems: 'center', gap: 8, marginTop: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  button: {
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 6,
    backgroundColor: colors.accentTintSoft,
  },
  response: { flexGrow: 1 },
  buttonText: {
    flexShrink: 1,
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  secondary: {
    flexShrink: 1,
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  status: {
    minHeight: 44,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { opacity: 0.6 },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
