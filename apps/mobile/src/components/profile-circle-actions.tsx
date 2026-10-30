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
import { useRecoverableWrite } from '../hooks/use-recoverable-write';
import { withRequestTimeout } from '../services/request-timeout';
import { WriteRecovery } from './write-recovery';

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
  const active = useRef(false);
  const currentTarget = useRef('');
  const target = `${viewerId}:${recipientId}`;
  currentTarget.current = target;
  const full = count >= CIRCLE_LIMIT;
  type ActionIntent = { action: Action; inviteId?: string };
  const writes = useRecoverableWrite<ActionIntent, { action: Action; ok: boolean }>(
    recipientId,
    viewerId,
    async (intent, attempt) => ({
      action: intent.action,
      ok:
        intent.action === 'invite'
          ? await sendPrayerCircleInvite(recipientId, undefined, attempt)
          : intent.action === 'cancel'
            ? await cancelPrayerCircleInvite(intent.inviteId!, attempt)
            : await respondToPrayerCircleInvite(
                intent.inviteId!,
                intent.action === 'accept' ? 'accepted' : 'declined',
                attempt
              ),
    })
  );

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [nextStatus, nextCount] = await withRequestTimeout(
        Promise.all([
          getPrayerCircleStatus(recipientId, { throwOnError: true }),
          getPrayerCircleCount(viewerId, { throwOnError: true }),
        ])
      );
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
      if (!writes.isLocked()) setBusy(null);
      setNotice('');
      void load();
      return () => {
        active.current = false;
        requestId.current += 1;
      };
    }, [load])
  );

  useEffect(() => {
    if (refreshing && !writes.isLocked()) void load();
  }, [refreshing, load]);

  const finish = async (
    result: Awaited<ReturnType<typeof writes.run>>,
    failureMessage = "We couldn't update your Prayer Circle. Please try again."
  ) => {
    if (!active.current || currentTarget.current !== target || result.status === 'ignored') return;
    setBusy(null);
    if (result.status === 'failed') {
      setError(failureMessage);
      return;
    }
    if (result.status !== 'saved') return;
    const { action, ok } = result.value;
    if (!ok) {
      await load();
      if (!active.current || currentTarget.current !== target) return;
      setError(
        `We couldn't ${action === 'invite' ? 'send' : action} the invite. It may have changed; your Prayer Circle has been refreshed.`
      );
      return;
    }
    const messages: Record<Action, string> = {
      invite: `Invite sent to @${username}.`,
      cancel: 'Invite cancelled.',
      accept: `@${username} is now in your Prayer Circle.`,
      decline: 'Invite declined.',
    };
    setNotice(messages[action]);
    await load();
    if (action === 'accept' && active.current && currentTarget.current === target) {
      try {
        await withRequestTimeout(onAccepted());
      } catch {
        if (active.current && currentTarget.current === target)
          setError(
            "Your Prayer Circle was updated, but we couldn't refresh prayers. Please refresh this profile."
          );
      }
    }
  };

  const perform = async (action: Action) => {
    if (writes.isLocked() || loading || !status || recipientId === viewerId) return;
    if (action === 'invite' && (status.state !== 'none' || full)) return;
    if (action === 'cancel' && (status.state !== 'pending_sent' || !status.inviteId)) return;
    if (
      (action === 'accept' || action === 'decline') &&
      (status.state !== 'pending_received' || !status.inviteId || (action === 'accept' && full))
    )
      return;

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
    await finish(await writes.run({ action, inviteId: status.inviteId }), failures[action]);
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
          disabled={full || writes.locked}
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
            disabled={writes.locked}
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
              disabled={full || writes.locked}
              onPress={() => void perform('accept')}
              style={[styles.button, styles.response, full && styles.disabled]}
            >
              <CheckIcon color={colors.accent} size={18} />
              <Text style={styles.buttonText}>Accept invite</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={writes.locked}
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
      {writes.uncertain ? (
        <WriteRecovery
          busy={writes.busy}
          onRetry={() => void writes.retry().then((result) => finish(result))}
        />
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
