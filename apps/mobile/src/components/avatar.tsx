import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies } from '../theme';

export function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        accessibilityLabel={`${name}'s profile photo`}
        onError={() => setFailed(true)}
        source={{ uri }}
        style={[styles.image, dimensions]}
      />
    );
  }

  return (
    <View accessibilityLabel={`${name}'s profile photo`} style={[styles.fallback, dimensions]}>
      <Text style={[styles.initial, { fontSize: Math.max(9, size * 0.35) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  initial: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
  },
});
