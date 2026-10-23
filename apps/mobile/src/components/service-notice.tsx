import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info, X } from 'lucide-react-native';
import { formatNoticeWindow } from '@oratio/shared/service-notice';
import { useServiceNotice } from '../hooks/use-service-notice';
import { useTheme } from '../hooks/theme-context';
import { darkColors, lightColors, fontFamilies } from '../theme';
import { asNativeIcon } from './icon';

const InfoIcon = asNativeIcon(Info);
const CloseIcon = asNativeIcon(X);

export function ServiceNoticeShell({ children }: { children: ReactNode }) {
  const { notice, dismiss } = useServiceNotice();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { theme } = useTheme();
  const palette = theme === 'light' ? lightColors : darkColors;
  return (
    <View style={[styles.fill, { backgroundColor: palette.bg }]}>
      {notice && (
        <View
          style={{
            paddingTop: insets.top,
            backgroundColor: palette.surface,
            borderBottomWidth: 1,
            borderColor: palette.accentBorder,
          }}
        >
          <View style={styles.row}>
            <View style={styles.icon}>
              <InfoIcon size={20} color={palette.accentDark} />
            </View>
            <ScrollView
              style={{ flex: 1, maxHeight: height * 0.3 }}
              contentContainerStyle={styles.copy}
            >
              <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
                {notice.title}
              </Text>
              {notice.maintenance && (
                <Text style={[styles.timing, { color: palette.textSecondary }]}>
                  Maintenance: {formatNoticeWindow(notice.maintenance)}
                </Text>
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.message, { color: palette.textSecondary }]}
              >
                {notice.message}
              </Text>
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss service notice"
              onPress={dismiss}
              style={styles.close}
            >
              <CloseIcon size={20} color={palette.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}
      {/* The provider stays mounted: screen state and drafts survive banner changes.
          Its measured frame also avoids adding the top safe area twice. */}
      <SafeAreaProvider style={styles.fill}>{children}</SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 16, paddingRight: 4 },
  icon: { marginTop: 14, marginRight: 10 },
  copy: { paddingVertical: 12 },
  title: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, marginBottom: 3 },
  timing: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  message: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 20 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
});
