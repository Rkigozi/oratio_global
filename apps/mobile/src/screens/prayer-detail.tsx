import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getPrayerById, getMyPrayedIds, togglePray } from '@oratio/shared/queries';
import { getAttributionText, timeAgo, type PrayerRequest } from '@oratio/shared/prayer-data';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

export function PrayerDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>) {
  const { prayerId } = route.params;
  const [prayer, setPrayer] = useState<PrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prayed, setPrayed] = useState(false);
  const [prayBusy, setPrayBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [fetched, prayedIds] = await Promise.all([getPrayerById(prayerId), getMyPrayedIds()]);
    setPrayer(fetched);
    setPrayed(prayedIds.includes(prayerId));
    setLoading(false);
  }, [prayerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePray = async () => {
    if (!prayer || prayBusy) return;
    setPrayBusy(true);
    const next = !prayed;
    const ok = await togglePray(prayer.id, next);
    if (ok) {
      setPrayed(next);
      setPrayer((prev) =>
        prev ? { ...prev, prayerCount: (prev.prayerCount ?? 0) + (next ? 1 : -1) } : prev
      );
    }
    setPrayBusy(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !prayer) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Prayer unavailable. It may have been removed.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const count = (prayer.prayerCount ?? 0) + (prayed ? 1 : 0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.location}>
          {prayer.city !== 'Unknown' ? `${prayer.city}, ${prayer.country}` : prayer.country}
        </Text>
        <Text style={styles.time}>{prayer.createdAt ? timeAgo(prayer.createdAt) : ''}</Text>

        <Text style={styles.text}>{prayer.text}</Text>

        <Text style={styles.attribution}>— {getAttributionText(prayer)}</Text>

        <View style={styles.countRow}>
          <Text style={styles.count}>
            {count} {count === 1 ? 'person prayed' : 'people prayed'}
          </Text>
        </View>

        <Pressable
          onPress={() => void handlePray()}
          disabled={prayBusy}
          style={[styles.prayButton, prayed && styles.prayedButton]}
        >
          {prayBusy ? (
            <ActivityIndicator color={prayed ? colors.accent : colors.white} />
          ) : (
            <Text style={[styles.prayText, prayed && styles.prayedText]}>
              🙏 {prayed ? 'Prayed for this' : 'Pray for this'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
  },
  headerButtonText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  content: {
    padding: 24,
    paddingTop: 8,
  },
  location: {
    color: colors.accent,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  time: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  text: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '300',
    marginTop: 20,
  },
  attribution: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 16,
  },
  countRow: {
    marginTop: 24,
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
  },
  prayButton: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  prayedButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  prayedText: {
    color: colors.accent,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  backText: {
    color: colors.accent,
    fontSize: 13,
  },
  dim: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
