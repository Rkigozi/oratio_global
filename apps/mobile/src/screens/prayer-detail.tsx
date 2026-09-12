import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, MapPin, MoreHorizontal } from 'lucide-react-native';
import {
  deletePrayerRequest,
  getPrayerById,
  getMyPrayedIds,
  getMySavedIds,
  togglePray,
  toggleSavePrayer,
  updatePrayerRequest,
} from '@oratio/shared/queries';
import { getAttributionText, timeAgo, type PrayerRequest } from '@oratio/shared/prayer-data';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { asNativeIcon } from '../components/icon';
import { PrayerComments } from '../components/prayer-comments';
import { PrayerActionsSheet, PrayerEditSheet } from '../components/prayer-owner-actions';
import { useAuth } from '../hooks/auth-context';
import { sharePrayer } from '../services/prayer-sharing';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const BookmarkIcon = asNativeIcon(Bookmark);
const MapPinIcon = asNativeIcon(MapPin);
const MoreIcon = asNativeIcon(MoreHorizontal);

export function PrayerDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>) {
  const { prayerId } = route.params;
  const { profile: authProfile, user } = useAuth();
  const [prayer, setPrayer] = useState<PrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prayed, setPrayed] = useState(false);
  const [prayBusy, setPrayBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetched, prayedIds, savedIds] = await Promise.all([
        getPrayerById(prayerId),
        getMyPrayedIds(),
        getMySavedIds(),
      ]);
      setPrayer(fetched);
      setPrayed(prayedIds.includes(prayerId));
      setSaved(savedIds.includes(prayerId));
    } catch {
      setError("We couldn't load this prayer. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [prayerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePray = async () => {
    if (!prayer || prayBusy) return;
    setPrayBusy(true);
    const next = !prayed;
    try {
      const ok = await togglePray(prayer.id, next);
      if (ok) {
        setPrayed(next);
        setPrayer((prev) =>
          prev
            ? { ...prev, prayerCount: Math.max(0, (prev.prayerCount ?? 0) + (next ? 1 : -1)) }
            : prev
        );
      }
    } finally {
      setPrayBusy(false);
    }
  };

  const handleSave = async () => {
    if (!prayer || saveBusy) return;
    setSaveBusy(true);
    const next = !saved;
    try {
      const ok = await toggleSavePrayer(prayer.id, next);
      if (ok) setSaved(next);
    } finally {
      setSaveBusy(false);
    }
  };

  const isOwner = prayer
    ? prayer.authorId
      ? prayer.authorId === user?.id
      : Boolean(prayer.username && prayer.username === authProfile?.username)
    : false;
  const canShare = Boolean(prayer && prayer.audience !== 'private');

  const openEdit = () => {
    if (!prayer || !isOwner) return;
    setActionsOpen(false);
    setEditText(prayer.text);
    setEditError('');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!prayer || !isOwner || editBusy) return;

    const validation = validatePrayerSubmission({
      text: editText,
      location: '',
      category: prayer.category,
      anonymous: !prayer.username,
    });
    if (!validation.success) {
      setEditError(validation.errors?.text || 'Check your prayer and try again.');
      return;
    }

    const text = sanitizePrayerText(validation.data?.text ?? editText);
    if (text === prayer.text) {
      setEditOpen(false);
      return;
    }

    setEditBusy(true);
    setEditError('');
    try {
      const updated = await updatePrayerRequest(prayer.id, text);
      if (!updated) {
        setEditError("We couldn't save your update. Please try again.");
        return;
      }

      setPrayer((current) =>
        current ? { ...current, text: updated.text, editedAt: updated.editedAt } : current
      );
      setEditOpen(false);
    } catch {
      setEditError("We couldn't save your update. Please try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const handleShare = async () => {
    if (!prayer || !canShare) return;
    setActionsOpen(false);
    try {
      await sharePrayer(prayer);
    } catch {
      Alert.alert('Unable to share', "We couldn't open the share sheet. Please try again.");
    }
  };

  const deletePrayer = async () => {
    if (!prayer || !isOwner || deleteBusy) return;
    setDeleteBusy(true);
    try {
      const deleted = await deletePrayerRequest(prayer.id);
      if (!deleted) {
        Alert.alert('Prayer not deleted', "We couldn't delete this prayer. Please try again.");
        return;
      }

      setActionsOpen(false);
      navigation.goBack();
    } catch {
      Alert.alert('Prayer not deleted', "We couldn't delete this prayer. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!prayer || !isOwner) return;
    setActionsOpen(false);
    const detail =
      prayer.audience === 'private'
        ? 'This private prayer and all of its notes will be removed permanently.'
        : 'This prayer and all of its comments will be removed permanently.';
    Alert.alert('Delete prayer?', detail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deletePrayer() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (error || !prayer) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.dim}>{error || 'Prayer unavailable. It may have been removed.'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const count = prayer.prayerCount ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <ArrowLeftIcon color={colors.textMuted} size={20} strokeWidth={1.7} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={saved ? 'Remove saved prayer' : 'Save prayer'}
              accessibilityRole="button"
              disabled={saveBusy}
              onPress={() => void handleSave()}
              style={[styles.headerButton, saveBusy && styles.headerButtonDisabled]}
            >
              <BookmarkIcon
                color={saved ? colors.accent : colors.textMuted}
                fill={saved ? colors.accent : 'none'}
                size={20}
                strokeWidth={1.7}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="More prayer options"
              accessibilityRole="button"
              onPress={() => setActionsOpen(true)}
              style={styles.headerButton}
            >
              <MoreIcon color={colors.textMuted} size={21} strokeWidth={1.7} />
            </Pressable>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.locationRow}>
            <MapPinIcon color={colors.textMuted} size={14} strokeWidth={1.7} />
            <Text style={styles.location}>
              {prayer.city !== 'Unknown' ? `${prayer.city}, ${prayer.country}` : prayer.country}
            </Text>
          </View>
          <Text style={styles.time}>
            {prayer.createdAt ? timeAgo(prayer.createdAt) : ''}
            {prayer.editedAt ? ' - Edited' : ''}
          </Text>

          <Text style={styles.text}>{prayer.text}</Text>

          <Text style={styles.attribution}>{getAttributionText(prayer)}</Text>

          <View style={styles.countRow}>
            <Text style={styles.count}>
              {count} {count === 1 ? 'person prayed' : 'people prayed'}
            </Text>
          </View>

          <Pressable
            onPress={() => void handlePray()}
            disabled={prayBusy}
            style={[styles.prayButton, prayed && styles.prayedButton]}
          >
            {prayBusy ? (
              <ActivityIndicator color={prayed ? colors.accent : colors.white} />
            ) : (
              <Text style={[styles.prayText, prayed && styles.prayedText]}>
                🙏 {prayed ? 'Prayed for this' : 'Pray for this'}
              </Text>
            )}
          </Pressable>

          <PrayerComments prayer={prayer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <PrayerActionsSheet
        canShare={canShare}
        deleting={deleteBusy}
        isOwner={isOwner}
        onClose={() => setActionsOpen(false)}
        onDelete={confirmDelete}
        onEdit={openEdit}
        onShare={() => void handleShare()}
        visible={actionsOpen}
      />
      <PrayerEditSheet
        error={editError}
        onChangeText={(value) => {
          setEditText(value);
          setEditError('');
        }}
        onClose={() => setEditOpen(false)}
        onSave={() => void handleEdit()}
        saving={editBusy}
        text={editText}
        visible={editOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    minHeight: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  location: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  time: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 4,
  },
  text: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 20,
    lineHeight: 31,
    marginTop: 20,
  },
  attribution: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    marginTop: 16,
  },
  countRow: {
    marginTop: 24,
  },
  count: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
  },
  prayButton: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  prayedButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  prayText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 15,
  },
  prayedText: {
    color: colors.accent,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  backText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  dim: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
