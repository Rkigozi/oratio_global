import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Search, UserMinus, UsersRound, X } from 'lucide-react-native';
import {
  cancelPrayerCircleInvite,
  getPrayerCircle,
  getPrayerCircleInvites,
  getProfileByUsername,
  removeFromPrayerCircle,
  respondToPrayerCircleInvite,
  searchUsers,
  sendPrayerCircleInvite,
  type PrayerCircleInvite,
  type PrayerCircleUser,
} from '@oratio/shared/queries';
import { timeAgo } from '@oratio/shared/prayer-data';
import { useAuth } from '../hooks/auth-context';
import { Avatar } from '../components/avatar';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const PRAYER_CIRCLE_LIMIT = 12;
const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const CheckIcon = asNativeIcon(Check);
const SearchIcon = asNativeIcon(Search);
const UserMinusIcon = asNativeIcon(UserMinus);
const UsersIcon = asNativeIcon(UsersRound);
const XIcon = asNativeIcon(X);

type SearchResult = {
  username: string;
  display_name: string | null;
};

export function PrayerCircleManagementScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PrayerCircleManagement'>) {
  const { profile } = useAuth();
  const [circle, setCircle] = useState<PrayerCircleUser[]>([]);
  const [incoming, setIncoming] = useState<PrayerCircleInvite[]>([]);
  const [outgoing, setOutgoing] = useState<PrayerCircleInvite[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const circleIsFull = circle.length >= PRAYER_CIRCLE_LIMIT;

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [members, invites] = await Promise.all([getPrayerCircle(), getPrayerCircleInvites()]);
      setCircle(members);
      setIncoming(invites.incoming);
      setOutgoing(invites.outgoing);
    } catch {
      setError("We couldn't load your Prayer Circle. Try again.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    const normalized = query.trim().replace(/^@/, '');
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchUsers(normalized)
        .then((users) => {
          if (!active) return;
          setResults(users.filter((user) => user.username !== profile?.username));
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [profile?.username, query]);

  const memberNames = useMemo(() => new Set(circle.map((person) => person.username)), [circle]);
  const incomingNames = useMemo(
    () => new Set(incoming.map((invite) => invite.requester.username)),
    [incoming]
  );
  const outgoingNames = useMemo(
    () => new Set(outgoing.map((invite) => invite.recipient.username)),
    [outgoing]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const completeAction = async (
    key: string,
    operation: () => Promise<boolean>,
    failureMessage: string,
    successMessage?: string
  ) => {
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      const ok = await operation();
      if (!ok) {
        setError(failureMessage);
        return;
      }
      if (successMessage) setNotice(successMessage);
      await load(false);
    } catch {
      setError(failureMessage);
    } finally {
      setBusyId(null);
    }
  };

  const invite = async (result: SearchResult) => {
    const key = `search:${result.username}`;
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      const recipient = await getProfileByUsername(result.username);
      const ok = recipient ? await sendPrayerCircleInvite(recipient.id) : false;
      if (!ok) {
        setError(
          "We couldn't send that invite. They may already have a pending invite or a full Circle."
        );
        return;
      }
      setNotice(`Invite sent to @${result.username}.`);
      setQuery('');
      setResults([]);
      await load(false);
    } catch {
      setError("We couldn't send that invite. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = (person: PrayerCircleUser) => {
    Alert.alert(
      'Remove from Prayer Circle?',
      `You and @${person.username} will no longer see each other's Prayer Circle prayers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            void completeAction(
              person.id,
              () => removeFromPrayerCircle(person.id),
              "We couldn't remove this person. Try again."
            ),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to Prayer Circle prayers"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <ArrowLeftIcon color={colors.textMuted} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ScreenHeaderTitle subtitle="Manage your circle" title="Prayer Circle" />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <UsersIcon color={colors.accent} size={19} strokeWidth={1.7} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Your Prayer Circle</Text>
              <Text style={styles.summaryText}>Mutual connections, with 12 spaces.</Text>
            </View>
            <Text accessibilityLabel={`${circle.length} of 12 spaces filled`} style={styles.count}>
              {circle.length}/{PRAYER_CIRCLE_LIMIT}
            </Text>
          </View>

          <SectionTitle label="Invite someone" />
          <View style={styles.searchShell}>
            <SearchIcon color={colors.textDim} size={17} strokeWidth={1.7} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => {
                setQuery(value);
                setError('');
                setNotice('');
              }}
              placeholder="Search by @username"
              placeholderTextColor={colors.textDim}
              style={styles.searchInput}
              value={query}
            />
            {searching ? <ActivityIndicator color={colors.accent} size="small" /> : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

          {query.trim().replace(/^@/, '').length >= 2 && !searching && results.length === 0 ? (
            <Text style={styles.searchEmpty}>No matching usernames.</Text>
          ) : null}

          {results.length > 0 ? (
            <View style={styles.searchResults}>
              {results.map((result) => {
                const status = memberNames.has(result.username)
                  ? 'In your Circle'
                  : outgoingNames.has(result.username)
                    ? 'Invite sent'
                    : incomingNames.has(result.username)
                      ? 'Invited you'
                      : null;
                const busy = busyId === `search:${result.username}`;

                return (
                  <PersonRow
                    key={result.username}
                    person={result}
                    subtitle={`@${result.username}`}
                    action={
                      status ? (
                        <Text style={styles.rowStatus}>{status}</Text>
                      ) : (
                        <Pressable
                          accessibilityLabel={`Invite @${result.username} to your Prayer Circle`}
                          accessibilityRole="button"
                          disabled={busy || circleIsFull}
                          onPress={() => void invite(result)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.buttonPressed,
                            (busy || circleIsFull) && styles.disabled,
                          ]}
                        >
                          {busy ? (
                            <ActivityIndicator color={colors.accent} size="small" />
                          ) : (
                            <Text style={styles.secondaryButtonText}>
                              {circleIsFull ? 'Full' : 'Invite'}
                            </Text>
                          )}
                        </Pressable>
                      )
                    }
                  />
                );
              })}
            </View>
          ) : null}

          {incoming.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle label="Invites to respond to" />
              {incoming.map((circleInvite) => {
                const busy = busyId === circleInvite.id;
                return (
                  <PersonRow
                    key={circleInvite.id}
                    person={circleInvite.requester}
                    subtitle={`@${circleInvite.requester.username} invited you - ${timeAgo(circleInvite.created_at)}`}
                    action={
                      <View style={styles.actions}>
                        <Pressable
                          accessibilityLabel={`Accept invite from @${circleInvite.requester.username}`}
                          accessibilityRole="button"
                          disabled={busy || circleIsFull}
                          onPress={() =>
                            void completeAction(
                              circleInvite.id,
                              () => respondToPrayerCircleInvite(circleInvite.id, 'accepted'),
                              "We couldn't accept that invite. Try again.",
                              `@${circleInvite.requester.username} is now in your Prayer Circle.`
                            )
                          }
                          style={[styles.acceptButton, (busy || circleIsFull) && styles.disabled]}
                        >
                          {busy ? (
                            <ActivityIndicator color={colors.white} size="small" />
                          ) : circleIsFull ? (
                            <Text style={styles.acceptFullText}>Full</Text>
                          ) : (
                            <CheckIcon color={colors.white} size={17} strokeWidth={2} />
                          )}
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Decline invite from @${circleInvite.requester.username}`}
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() =>
                            void completeAction(
                              circleInvite.id,
                              () => respondToPrayerCircleInvite(circleInvite.id, 'declined'),
                              "We couldn't decline that invite. Try again."
                            )
                          }
                          style={[styles.roundButton, busy && styles.disabled]}
                        >
                          <XIcon color={colors.textMuted} size={17} strokeWidth={1.8} />
                        </Pressable>
                      </View>
                    }
                  />
                );
              })}
            </View>
          ) : null}

          {outgoing.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle label="Invites sent" />
              {outgoing.map((circleInvite) => {
                const busy = busyId === circleInvite.id;
                return (
                  <PersonRow
                    key={circleInvite.id}
                    person={circleInvite.recipient}
                    subtitle={`Waiting for @${circleInvite.recipient.username}`}
                    action={
                      <Pressable
                        accessibilityLabel={`Cancel invite to @${circleInvite.recipient.username}`}
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() =>
                          void completeAction(
                            circleInvite.id,
                            () => cancelPrayerCircleInvite(circleInvite.id),
                            "We couldn't cancel that invite. Try again."
                          )
                        }
                        style={[styles.secondaryButton, busy && styles.disabled]}
                      >
                        {busy ? (
                          <ActivityIndicator color={colors.accent} size="small" />
                        ) : (
                          <Text style={styles.secondaryButtonText}>Cancel</Text>
                        )}
                      </Pressable>
                    }
                  />
                );
              })}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle label="People in your Prayer Circle" />
            {circle.length > 0 ? (
              circle.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  subtitle={`@${person.username}${
                    person.connected_at ? ` - joined ${timeAgo(person.connected_at)}` : ''
                  }`}
                  action={
                    <Pressable
                      accessibilityLabel={`Remove @${person.username} from Prayer Circle`}
                      accessibilityRole="button"
                      disabled={busyId === person.id}
                      onPress={() => confirmRemove(person)}
                      style={[styles.roundButton, busyId === person.id && styles.disabled]}
                    >
                      {busyId === person.id ? (
                        <ActivityIndicator color={colors.textMuted} size="small" />
                      ) : (
                        <UserMinusIcon color={colors.textMuted} size={17} strokeWidth={1.7} />
                      )}
                    </Pressable>
                  }
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <UsersIcon color={colors.textDim} size={24} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>Your Prayer Circle is empty</Text>
                <Text style={styles.emptyText}>
                  Search for someone above to send your first invite.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function PersonRow({
  person,
  subtitle,
  action,
}: {
  person: Pick<PrayerCircleUser, 'username' | 'display_name'> &
    Partial<Pick<PrayerCircleUser, 'avatar_url'>>;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <View style={styles.personRow}>
      <Avatar name={person.display_name || person.username} size={40} uri={person.avatar_url} />
      <View style={styles.personCopy}>
        <Text numberOfLines={1} style={styles.personName}>
          {person.display_name || person.username}
        </Text>
        <Text numberOfLines={1} style={styles.personSubtitle}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.rowAction}>{action}</View>
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
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 44,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 22,
    marginBottom: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 15,
  },
  summaryText: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 3,
  },
  count: {
    color: colors.accent,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  searchShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  searchResults: {
    marginTop: 8,
  },
  searchEmpty: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    paddingVertical: 16,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  noticeText: {
    color: colors.success,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    marginTop: 10,
  },
  personRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  personCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  personName: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  personSubtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 3,
  },
  rowAction: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  rowStatus: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDark,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryButton: {
    minWidth: 68,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  acceptFullText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
  },
  buttonPressed: {
    backgroundColor: colors.surfaceHover,
  },
  disabled: {
    opacity: 0.55,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 14,
    marginTop: 12,
  },
  emptyText: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
  },
});
