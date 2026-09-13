import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { ArrowLeft } from 'lucide-react-native';
import { getProfileByUsername, getUserPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { Avatar } from '../components/avatar';
import { asNativeIcon } from '../components/icon';
import { PrayerCard } from '../components/prayer-card';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

type UserProfile = NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;

const ArrowLeftIcon = asNativeIcon(ArrowLeft);

export function UserProfileScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'UserProfile'>) {
  const username = route.params.username.trim().replace(/^@/, '').toLowerCase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextProfile, nextPrayers] = await Promise.all([
        getProfileByUsername(username),
        getUserPrayers(username),
      ]);

      if (!nextProfile) {
        setProfile(null);
        setPrayers([]);
        setError('This profile is unavailable.');
        return;
      }

      setProfile(nextProfile);
      setPrayers(nextPrayers);
    } catch {
      setError("We couldn't load this profile. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const resolvedUsername = profile?.username || username;
  const name = profile?.display_name || resolvedUsername || 'Oratio member';
  const joined = formatMonthYear(profile?.created_at);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <ArrowLeftIcon color={colors.textSecondary} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.headerCopy}>
          <ScreenHeaderTitle subtitle={`@${resolvedUsername}`} title="Profile" />
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.dim}>Loading profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.content, prayers.length === 0 && styles.emptyContent]}
          data={prayers}
          keyExtractor={(prayer) => prayer.id}
          ListHeaderComponent={
            <View>
              <View style={styles.identity}>
                <Avatar name={name} size={88} uri={profile?.avatar_url} />
                <Text style={styles.displayName}>{name}</Text>
                <Text style={styles.username}>@{resolvedUsername}</Text>
                {joined ? <Text style={styles.joined}>Joined {joined}</Text> : null}
              </View>

              <View style={styles.presenceRow}>
                <Text style={styles.presenceCount}>{prayers.length}</Text>
                <View style={styles.presenceCopy}>
                  <Text style={styles.presenceTitle}>Shared prayers</Text>
                  <Text style={styles.presenceHint}>Prayers visible to you from this person</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Prayers</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No shared prayers yet</Text>
              <Text style={styles.dim}>There are no prayers from this person visible to you.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => void refresh()}
              refreshing={refreshing}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <PrayerCard
              onPress={() => navigation.navigate('PrayerDetail', { prayerId: item.id })}
              prayer={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function formatMonthYear(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
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
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  emptyContent: {
    flexGrow: 1,
  },
  identity: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
  },
  displayName: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 20,
    marginTop: 14,
  },
  username: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    marginTop: 4,
  },
  joined: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 8,
  },
  presenceRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  presenceCount: {
    minWidth: 48,
    color: colors.accent,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 22,
    textAlign: 'center',
  },
  presenceCopy: {
    flex: 1,
    paddingLeft: 16,
  },
  presenceTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  presenceHint: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 3,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 15,
    marginBottom: 6,
  },
  dim: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  retryText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
});
