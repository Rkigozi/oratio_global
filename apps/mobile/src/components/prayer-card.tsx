import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAttributionText, timeAgo, type PrayerRequest } from '@oratio/shared/prayer-data';
import { colors } from '../theme';

export function PrayerCard({ prayer, onPress }: { prayer: PrayerRequest; onPress: () => void }) {
  const count = prayer.prayerCount ?? 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.text} numberOfLines={4}>
        {prayer.text}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.attribution} numberOfLines={1}>
          {getAttributionText(prayer)}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {prayer.city !== 'Unknown' ? `${prayer.city}, ${prayer.country}` : prayer.country}
        </Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.time}>{prayer.createdAt ? timeAgo(prayer.createdAt) : ''}</Text>
        <Text style={styles.count}>
          🙏 {count} {count === 1 ? 'person prayed' : 'people prayed'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  attribution: {
    color: colors.textSecondary,
    fontSize: 12,
    flexShrink: 1,
  },
  location: {
    color: colors.textDim,
    fontSize: 11,
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: colors.textDim,
    fontSize: 11,
  },
  count: {
    color: colors.accent,
    fontSize: 11,
  },
});
