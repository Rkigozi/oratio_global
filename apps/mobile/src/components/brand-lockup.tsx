import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies } from '../theme';

type BrandLockupProps = {
  align?: 'left' | 'center';
  size?: 'header' | 'hero';
  subtitle?: string;
};

export function BrandLockup({ align = 'left', size = 'header', subtitle }: BrandLockupProps) {
  const centered = align === 'center';
  const hero = size === 'hero';

  return (
    <View style={[styles.lockup, centered && styles.lockupCentered]}>
      <View style={styles.brandRow}>
        <Text style={[styles.wordmark, hero && styles.wordmarkHero]}>ORATIO</Text>
        <View accessibilityLabel="Beta" style={[styles.badge, hero && styles.badgeHero]}>
          <Text style={styles.badgeText}>Beta</Text>
        </View>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, hero && styles.subtitleHero]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'flex-start',
  },
  lockupCentered: {
    alignItems: 'center',
  },
  brandRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.heading,
    fontSize: 15,
    letterSpacing: 3.5,
    textShadowColor: 'rgba(124, 143, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  wordmarkHero: {
    fontSize: 30,
    letterSpacing: 8,
  },
  badge: {
    minHeight: 18,
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(124, 143, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 143, 255, 0.18)',
  },
  badgeHero: {
    marginTop: 2,
  },
  badgeText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 8,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 1,
  },
  subtitleHero: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
});
