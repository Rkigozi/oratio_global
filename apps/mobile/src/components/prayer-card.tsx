import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAttributionText, timeAgo, type PrayerRequest } from '@oratio/shared/prayer-data';
import { colors, fontFamilies } from '../theme';

export function PrayerCard({
  prayer,
  onPress,
  onAuthorPress,
}: {
  prayer: PrayerRequest;
  onPress: () => void;
  onAuthorPress?: () => void;
}) {
  const count = prayer.prayerCount ?? 0;
  const attribution = getAttributionText(prayer);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.text} numberOfLines={4}>
        {prayer.text}
      </Text>
      <View style={styles.metaRow}>
        {prayer.username && onAuthorPress ? (
          <Pressable
            accessibilityLabel={`View @${prayer.username}'s profile`}
            accessibilityRole="link"
            hitSlop={8}
            onPress={(event) => {
              event?.stopPropagation();
              onAuthorPress();
            }}
            style={styles.authorButton}
          >
            <Text style={[styles.attribution, styles.attributionLink]} numberOfLines={1}>
              {attribution}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.attribution} numberOfLines={1}>
            {attribution}
          </Text>
        )}
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
    minHeight: 132,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: 11,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  text: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 25,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  attribution: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    flexShrink: 1,
  },
  attributionLink: {
    color: colors.accent,
  },
  authorButton: {
    flexShrink: 1,
  },
  location: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
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
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  count: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },
});
