import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies } from '../theme';

export function ScreenHeaderTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.copy}>
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  title: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 16,
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
