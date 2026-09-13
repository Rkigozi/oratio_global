import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Flag, Info, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createReport, type CreateReportResult } from '@oratio/shared/queries';
import { asNativeIcon } from './icon';
import { colors, fontFamilies, radii } from '../theme';

const REPORT_REASONS = [
  'Spam or fake',
  'Upsetting or graphic',
  'Harmful or unsafe',
  'Something else',
] as const;

const CheckIcon = asNativeIcon(CheckCircle2);
const FlagIcon = asNativeIcon(Flag);
const InfoIcon = asNativeIcon(Info);
const XIcon = asNativeIcon(X);

type ReportOutcome = Exclude<CreateReportResult, 'failed'> | 'failed' | null;

export function ContentReportSheet({
  onClose,
  reportableId,
  reportableType,
  visible,
}: {
  onClose: () => void;
  reportableId: string;
  reportableType: 'prayer' | 'comment';
  visible: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ReportOutcome>(null);

  useEffect(() => {
    if (!visible) return;
    setSubmitting(false);
    setSelectedReason(null);
    setOutcome(null);
  }, [reportableId, reportableType, visible]);

  const submit = async (reason: string) => {
    if (!reportableId || submitting || outcome === 'created' || outcome === 'already_reported') {
      return;
    }

    setSubmitting(true);
    setSelectedReason(reason);
    setOutcome(null);
    try {
      const result = await createReport({
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason,
      });
      setOutcome(result);
    } catch {
      setOutcome('failed');
    } finally {
      setSubmitting(false);
    }
  };

  const complete = outcome === 'created' || outcome === 'already_reported';

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => !submitting && onClose()}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={`Close report ${reportableType}`}
          accessibilityRole="button"
          disabled={submitting}
          onPress={onClose}
          style={styles.backdrop}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <FlagIcon color={colors.warning} size={18} strokeWidth={1.7} />
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>Report {reportableType}</Text>
                  <Text style={styles.subtitle}>Why are you reporting this?</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel={`Close report ${reportableType}`}
                accessibilityRole="button"
                disabled={submitting}
                onPress={onClose}
                style={styles.closeButton}
              >
                <XIcon color={colors.textMuted} size={19} strokeWidth={1.7} />
              </Pressable>
            </View>

            {outcome ? <ReportNotice outcome={outcome} reportableType={reportableType} /> : null}

            {!complete ? (
              <View style={styles.reasons}>
                {REPORT_REASONS.map((reason) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting}
                    key={reason}
                    onPress={() => void submit(reason)}
                    style={({ pressed }) => [
                      styles.reason,
                      pressed && styles.reasonPressed,
                      submitting && styles.disabled,
                    ]}
                  >
                    <Text style={styles.reasonText}>{reason}</Text>
                    {submitting && selectedReason === reason ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ReportNotice({
  outcome,
  reportableType,
}: {
  outcome: NonNullable<ReportOutcome>;
  reportableType: 'prayer' | 'comment';
}) {
  const noun = reportableType;
  const content = {
    created: {
      message: 'Report sent for review. Thank you for helping keep Oratio safe.',
      tone: 'success' as const,
    },
    already_reported: {
      message: `You've already reported this ${noun}. It is still saved for moderation.`,
      tone: 'info' as const,
    },
    unauthenticated: {
      message: 'Your session has ended. Sign in again before sending this report.',
      tone: 'error' as const,
    },
    failed: {
      message: "We couldn't send this report. Check your connection and try again.",
      tone: 'error' as const,
    },
  }[outcome];
  const NoticeIcon = content.tone === 'success' ? CheckIcon : InfoIcon;

  return (
    <View
      accessibilityRole={content.tone === 'error' ? 'alert' : 'summary'}
      style={[
        styles.notice,
        content.tone === 'success' && styles.noticeSuccess,
        content.tone === 'error' && styles.noticeError,
      ]}
    >
      <NoticeIcon
        color={content.tone === 'error' ? colors.danger : colors.accent}
        size={17}
        strokeWidth={1.8}
      />
      <Text style={[styles.noticeText, content.tone === 'error' && styles.noticeTextError]}>
        {content.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
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
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingTop: 2,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 17,
    textTransform: 'capitalize',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasons: {
    paddingBottom: 4,
  },
  reason: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  reasonPressed: {
    backgroundColor: colors.accentTintSoft,
  },
  reasonText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  notice: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    marginBottom: 10,
    backgroundColor: colors.accentTintSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radii.control,
  },
  noticeSuccess: {
    backgroundColor: colors.accentTint,
  },
  noticeError: {
    borderColor: colors.danger,
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
  },
  noticeTextError: {
    color: colors.danger,
  },
  doneButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.accentDark,
    borderRadius: radii.control,
  },
  doneButtonText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.55,
  },
});
