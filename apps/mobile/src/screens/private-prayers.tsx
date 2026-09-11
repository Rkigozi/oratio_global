import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { getMyPrayers } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { PrayerCard } from '../components/prayer-card';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const PlusIcon = asNativeIcon(Plus);

export function PrivatePrayersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPrayers(await getMyPrayers('private'));
    } catch {
      setError("We couldn't load your private prayers.");
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View style={styles.headerCopy}>
          <ScreenHeaderTitle subtitle="Only visible to you" title="Private Prayers" />
        </View>
        <Pressable
          accessibilityLabel="Write a private prayer"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Submit')}
          style={styles.addButton}
        >
          <PlusIcon color={colors.accent} size={20} strokeWidth={1.8} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Loading private prayers...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
          <Pressable onPress={() => void refresh()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PrayerCard
              prayer={item}
              onPress={() => navigation.navigate('PrayerDetail', { prayerId: item.id })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>A quiet place for your prayers</Text>
              <Text style={styles.dim}>
                Private prayers and notes will stay here, just for you.
              </Text>
            </View>
          }
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 70,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerSide: {
    width: 44,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
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
});
