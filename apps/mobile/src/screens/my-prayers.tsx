import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { getMyPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { asNativeIcon } from '../components/icon';
import { PrayerCard } from '../components/prayer-card';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies, radii } from '../theme';
import type { RootStackParamList } from '../navigation';

export type MyPrayerAudience = NonNullable<PrayerRequest['audience']>;

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const PlusIcon = asNativeIcon(Plus);

const AUDIENCES: Array<{ label: string; value: MyPrayerAudience }> = [
  { label: 'Public', value: 'public' },
  { label: 'Circle', value: 'circle' },
  { label: 'Private', value: 'private' },
];

const EMPTY_COPY: Record<MyPrayerAudience, { title: string; detail: string }> = {
  public: {
    title: 'No public prayers yet',
    detail: 'Prayers you share publicly will appear here.',
  },
  circle: {
    title: 'No Circle prayers yet',
    detail: 'Prayers shared with your Prayer Circle will appear here.',
  },
  private: {
    title: 'A quiet place for your prayers',
    detail: 'Private prayers and notes will stay here, just for you.',
  },
};

const EMPTY_PRAYERS: Record<MyPrayerAudience, PrayerRequest[]> = {
  public: [],
  circle: [],
  private: [],
};

export function MyPrayersScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'MyPrayers'>) {
  const [audience, setAudience] = useState<MyPrayerAudience>(
    route.params?.initialAudience ?? 'public'
  );
  const [prayers, setPrayers] = useState(EMPTY_PRAYERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [publicPrayers, circlePrayers, privatePrayers] = await Promise.all([
        getMyPrayers('public'),
        getMyPrayers('circle'),
        getMyPrayers('private'),
      ]);
      setPrayers({
        public: publicPrayers,
        circle: circlePrayers,
        private: privatePrayers,
      });
    } catch {
      setError("We couldn't load your prayers. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const visiblePrayers = prayers[audience];
  const emptyCopy = EMPTY_COPY[audience];
  const total = useMemo(
    () => prayers.public.length + prayers.circle.length + prayers.private.length,
    [prayers]
  );

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
          <ScreenHeaderTitle
            subtitle={`${total} ${total === 1 ? 'prayer' : 'prayers'} across your spaces`}
            title="My Prayers"
          />
        </View>
        <Pressable
          accessibilityLabel="Write a prayer"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Submit')}
          style={styles.headerButton}
        >
          <PlusIcon color={colors.accent} size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {AUDIENCES.map((option) => {
          const selected = option.value === audience;
          return (
            <Pressable
              accessibilityLabel={`Show my ${option.label.toLowerCase()} prayers`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => setAudience(option.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.tabCount, selected && styles.tabCountSelected]}>
                {prayers[option.value].length}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Loading your prayers...</Text>
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
          contentContainerStyle={[styles.list, visiblePrayers.length === 0 && styles.emptyList]}
          data={visiblePrayers}
          key={audience}
          keyExtractor={(prayer) => prayer.id}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.dim}>{emptyCopy.detail}</Text>
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
  tabs: {
    minHeight: 66,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  tabSelected: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentTint,
  },
  tabPressed: {
    opacity: 0.78,
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  tabLabelSelected: {
    color: colors.accent,
  },
  tabCount: {
    color: colors.textDim,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
  },
  tabCountSelected: {
    color: colors.accent,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyList: {
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 16,
    textAlign: 'center',
  },
  dim: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 22,
  },
  retryText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
});
