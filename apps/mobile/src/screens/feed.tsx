import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/auth-context';
import { useFeed } from '../hooks/use-feed';
import { PrayerCard } from '../components/prayer-card';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

export function FeedScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Feed'>) {
  const { profile, signOut } = useAuth();
  const { prayers, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, load } =
    useFeed();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = profile?.display_name || profile?.username || 'friend';

  // Reload whenever the feed regains focus so prayers submitted elsewhere
  // (submit screen, another device) show up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ORATIO</Text>
          <Text style={styles.headerSubtitle}>Prayer feed</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('Submit')} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>+</Text>
          </Pressable>
          <Pressable onPress={() => setMenuOpen((v) => !v)} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>{displayName.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
        {menuOpen && (
          <View style={styles.menu}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void signOut();
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuItemText}>Sign Out</Text>
            </Pressable>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Loading prayers…</Text>
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
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.dim}>No prayers yet. Be the first to share one.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <Text style={styles.footer}>Loading more…</Text> : hasMore ? null : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 5,
  },
  headerSubtitle: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    position: 'absolute',
    top: 58,
    right: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuItemText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  dim: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  retryText: {
    color: colors.accent,
    fontSize: 13,
  },
  footer: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
