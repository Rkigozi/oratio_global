import { useCallback, useRef, useState } from 'react';
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
import { ArrowLeft, UserCheck } from 'lucide-react-native';
import {
  BLOCKED_ACCOUNTS_PAGE_SIZE,
  getBlockedAccounts,
  unblockUser,
  type BlockedAccount,
} from '@oratio/shared/queries';
import { Avatar } from '../components/avatar';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const UserCheckIcon = asNativeIcon(UserCheck);

export function BlockedAccountsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'BlockedAccounts'>) {
  const [accounts, setAccounts] = useState<BlockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const actionPending = useRef(false);

  const load = useCallback(async (offset = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    setError('');
    try {
      const rows = await getBlockedAccounts(offset);
      setAccounts((current) => (offset === 0 ? rows : [...current, ...rows]));
      setHasMore(rows.length === BLOCKED_ACCOUNTS_PAGE_SIZE);
    } catch {
      setError("We couldn't load blocked accounts. Please try again.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const confirmUnblock = (account: BlockedAccount) => {
    if (actionPending.current || loadingRef.current) return;
    actionPending.current = true;
    let submitted = false;
    const cancel = () => {
      if (!submitted) actionPending.current = false;
    };
    Alert.alert(
      `Unblock @${account.username}?`,
      'This does not restore your Prayer Circle connection or previous invitations.',
      [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        {
          text: 'Unblock',
          onPress: () => {
            if (submitted) return;
            submitted = true;
            setBusyId(account.id);
            setError('');
            void unblockUser(account.id)
              .then(async () => {
                setAccounts((current) => current.filter((row) => row.id !== account.id));
                await load();
              })
              .catch(() => {
                setError("We couldn't unblock this account. Please try again.");
              })
              .finally(() => {
                actionPending.current = false;
                setBusyId(null);
              });
          },
        },
      ],
      { cancelable: true, onDismiss: cancel }
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <ArrowLeftIcon color={colors.textSecondary} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.title}>
          <ScreenHeaderTitle title="Blocked accounts" />
        </View>
        <View style={styles.iconButton} />
      </View>
      {error ? (
        <View style={styles.feedback}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            disabled={refreshing || Boolean(busyId)}
            style={styles.retry}
          >
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading blocked accounts"
          color={colors.accent}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(account) => account.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              enabled={!busyId}
              refreshing={refreshing}
              onRefresh={() => {
                if (!actionPending.current) void load();
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={!error ? <Text style={styles.empty}>No blocked accounts</Text> : null}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={refreshing || Boolean(busyId)}
                onPress={() => void load(accounts.length)}
                style={styles.retry}
              >
                <Text style={styles.actionText}>{refreshing ? 'Loading...' : 'Load more'}</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar name={item.display_name || item.username} uri={item.avatar_url} size={40} />
              <View style={styles.identity}>
                <Text numberOfLines={2} style={styles.name}>
                  {item.display_name || item.username}
                </Text>
                <Text numberOfLines={1} style={styles.username}>
                  @{item.username}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Unblock @${item.username}`}
                accessibilityRole="button"
                disabled={Boolean(busyId) || refreshing}
                onPress={() => confirmUnblock(item)}
                style={styles.iconButton}
              >
                {busyId === item.id ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <UserCheckIcon size={20} color={colors.accent} strokeWidth={1.7} />
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  row: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamilies.bodyMedium, fontSize: 15, color: colors.text },
  username: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: {
    paddingVertical: 48,
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  feedback: { paddingHorizontal: 20, paddingTop: 16 },
  error: { color: colors.danger, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 20 },
  actionText: { color: colors.accent, fontFamily: fontFamilies.bodyMedium, fontSize: 14 },
  retry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  loader: { marginTop: 48 },
});
