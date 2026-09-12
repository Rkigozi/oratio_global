import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pencil, Share2, Trash2, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { asNativeIcon } from './icon';
import { colors, fontFamilies, radii } from '../theme';

const PencilIcon = asNativeIcon(Pencil);
const ShareIcon = asNativeIcon(Share2);
const TrashIcon = asNativeIcon(Trash2);
const XIcon = asNativeIcon(X);

export function PrayerActionsSheet({
  canShare,
  deleting,
  isOwner,
  onClose,
  onDelete,
  onEdit,
  onShare,
  visible,
}: {
  canShare: boolean;
  deleting: boolean;
  isOwner: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onShare: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close prayer options"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
          <View style={styles.sheet}>
            <SheetHeader
              onClose={onClose}
              subtitle={isOwner ? 'Manage or share your prayer' : 'Share this prayer'}
              title="Prayer actions"
            />

            {canShare ? (
              <PrayerAction
                icon={<ShareIcon color={colors.accent} size={19} strokeWidth={1.7} />}
                label="Share prayer"
                onPress={onShare}
              />
            ) : null}
            {isOwner ? (
              <>
                <PrayerAction
                  icon={<PencilIcon color={colors.textSecondary} size={19} strokeWidth={1.7} />}
                  label="Edit prayer"
                  onPress={onEdit}
                />
                <PrayerAction
                  destructive
                  disabled={deleting}
                  icon={<TrashIcon color={colors.danger} size={19} strokeWidth={1.7} />}
                  label={deleting ? 'Deleting prayer...' : 'Delete prayer'}
                  onPress={onDelete}
                />
              </>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function PrayerEditSheet({
  error,
  onChangeText,
  onClose,
  onSave,
  saving,
  text,
  visible,
}: {
  error: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  text: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => !saving && onClose()}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable
          accessibilityLabel="Close edit prayer"
          accessibilityRole="button"
          disabled={saving}
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
          <View style={styles.sheet}>
            <SheetHeader
              disabled={saving}
              onClose={onClose}
              subtitle="Keep the heart of your request clear"
              title="Edit prayer"
            />

            <TextInput
              accessibilityLabel="Prayer text"
              autoFocus
              maxLength={500}
              multiline
              onChangeText={onChangeText}
              placeholder="Share what's on your heart..."
              placeholderTextColor={colors.textDim}
              style={[styles.editInput, error ? styles.editInputError : null]}
              textAlignVertical="top"
              value={text}
            />
            <View style={styles.editMeta}>
              <Text style={styles.editError}>{error}</Text>
              <Text style={styles.editCounter}>{text.length}/500</Text>
            </View>
            <View style={styles.editActions}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={onClose}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={onSave}
                style={[styles.primaryButton, saving && styles.disabled]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetHeader({
  disabled = false,
  onClose,
  subtitle,
  title,
}: {
  disabled?: boolean;
  onClose: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.sheetHeader}>
      <View>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Text style={styles.sheetSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        accessibilityLabel={`Close ${title.toLowerCase()}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onClose}
        style={styles.sheetClose}
      >
        <XIcon color={colors.textMuted} size={19} strokeWidth={1.7} />
      </Pressable>
    </View>
  );
}

function PrayerAction({
  destructive = false,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={[styles.actionLabel, destructive && styles.actionLabelDestructive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  sheetSafeArea: {
    backgroundColor: colors.mapSheet,
  },
  sheet: {
    backgroundColor: colors.mapSheet,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sheetHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 17,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    marginTop: 4,
  },
  sheetClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  actionRowPressed: {
    backgroundColor: colors.accentTintSoft,
  },
  actionIcon: {
    width: 42,
    alignItems: 'flex-start',
  },
  actionLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
  },
  actionLabelDestructive: {
    color: colors.danger,
  },
  editInput: {
    minHeight: 150,
    maxHeight: 260,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
  },
  editInputError: {
    borderColor: colors.danger,
  },
  editMeta: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 7,
  },
  editError: {
    flex: 1,
    color: colors.danger,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 16,
  },
  editCounter: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.control,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDark,
    borderRadius: radii.control,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
});
