import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ban, X } from 'lucide-react-native';
import { asNativeIcon } from './icon';
import { colors, fontFamilies } from '../theme';

const BanIcon = asNativeIcon(Ban);
const CloseIcon = asNativeIcon(X);

export function ProfileActionsSheet({
  visible,
  busy,
  onClose,
  onBlock,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onBlock: () => void;
}) {
  const pendingAction = useRef<(() => void) | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (visible) setClosing(false);
  }, [visible]);

  useEffect(
    () => () => {
      pendingAction.current = null;
    },
    []
  );

  const finishClosing = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };

  const selectBlock = () => {
    if (busy || closing || pendingAction.current) return;
    pendingAction.current = onBlock;
    setClosing(true);
    onClose();
    // Match prayer options: iOS must dismiss the sheet before presenting the confirmation.
    if (Platform.OS !== 'ios') finishClosing();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onDismiss={finishClosing}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss profile options"
          onPress={onClose}
          style={styles.backdrop}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerButton} />
            <Text accessibilityRole="header" style={styles.title}>
              Profile options
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close profile options"
              onPress={onClose}
              style={styles.headerButton}
            >
              <CloseIcon color={colors.textMuted} size={19} strokeWidth={1.7} />
            </Pressable>
          </View>
          <ScrollView bounces={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Block user"
              disabled={busy || closing}
              onPress={selectBlock}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <BanIcon color={colors.danger} size={20} strokeWidth={1.7} />
              <Text style={styles.actionLabel}>Block user</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.mapSheet,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 17,
    textAlign: 'center',
  },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  actionLabel: { flex: 1, color: colors.danger, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
  pressed: { backgroundColor: colors.accentTintSoft },
});
