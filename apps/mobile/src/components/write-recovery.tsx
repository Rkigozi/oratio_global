import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies } from '../theme';

export function WriteRecovery({ busy, onRetry }: { busy: boolean; onRetry: () => void }) {
  return (
    <View style={styles.notice}>
      <Text accessibilityRole="alert" style={styles.text}>
        We couldn't confirm whether your change was saved. Reconnect, then check and retry here. If
        you leave, check the saved result before trying again.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Check and retry"
        disabled={busy}
        onPress={onRetry}
        style={styles.button}
      >
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.action}>Check and retry</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { paddingVertical: 12, gap: 8 },
  text: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
  },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  action: { color: colors.accent, fontFamily: fontFamilies.bodySemiBold, fontSize: 14 },
});
