import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bookmark,
  Languages,
  MapPin,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react-native';
import {
  deletePrayerRequest,
  getProfilePreferences,
  getPrayerById,
  getMyPrayedIds,
  getMySavedIds,
  togglePray,
  toggleSavePrayer,
  updatePrayerRequest,
  renewPublicPrayer,
} from '@oratio/shared/queries';
import {
  getAttributionText,
  isPrayerArchived,
  timeAgo,
  type PrayerRequest,
} from '@oratio/shared/prayer-data';
import {
  detectLanguage,
  getLanguageName,
  needsTranslation,
  resolveTranslationLanguage,
} from '@oratio/shared/translation';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { asNativeIcon } from '../components/icon';
import { PrayerComments } from '../components/prayer-comments';
import { ContentReportSheet } from '../components/content-report-sheet';
import { PrayerActionsSheet, PrayerEditSheet } from '../components/prayer-owner-actions';
import { useAuth } from '../hooks/auth-context';
import { useBlockUser } from '../hooks/use-block-user';
import { usePrayerClock } from '../hooks/use-prayer-clock';
import { copyPrayerLink, sharePrayer } from '../services/prayer-sharing';
import { withRequestTimeout } from '../services/request-timeout';
import { translatePrayerText, type PrayerTranslation } from '../services/prayer-translation';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';
import { useRecoverableWrite } from '../hooks/use-recoverable-write';
import { WriteOutcomeError } from '@oratio/shared/write-outcome';
import { WriteRecovery } from '../components/write-recovery';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const BookmarkIcon = asNativeIcon(Bookmark);
const LanguagesIcon = asNativeIcon(Languages);
const MapPinIcon = asNativeIcon(MapPin);
const MoreIcon = asNativeIcon(MoreHorizontal);
const RenewIcon = asNativeIcon(RotateCcw);

function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

export function PrayerDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>) {
  const { prayerId } = route.params;
  const { profile: authProfile, user } = useAuth();
  const returnAfterBlock = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Public' } }],
    });
  const { blocking, confirmBlock } = useBlockUser(returnAfterBlock);
  const [prayer, setPrayer] = useState<PrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prayed, setPrayed] = useState(false);
  const [prayBusy, setPrayBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const sharePending = useRef(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);
  const [renewMessage, setRenewMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [languagePreference, setLanguagePreference] = useState('auto');
  const [translation, setTranslation] = useState<PrayerTranslation | null>(null);
  const now = usePrayerClock(prayer ? [prayer] : []);
  const archived = Boolean(prayer && isPrayerArchived(prayer, now));
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationMessage, setTranslationMessage] = useState('');
  const loadRequest = useRef(0);
  const screenActive = useRef(false);
  const [interactionError, setInteractionError] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const editOriginal = useRef<{ text: string; editedAt?: string | null } | null>(null);
  type OwnerIntent =
    | { kind: 'edit'; text: string; expectedText: string; expectedEditedAt?: string | null }
    | { kind: 'delete'; audience: string }
    | { kind: 'renew'; expectedExpiresAt: string };
  type OwnerValue =
    | { kind: 'edit'; updated: { text: string; editedAt: string } }
    | { kind: 'delete'; deleted: boolean; audience: string }
    | { kind: 'renew'; expiresAt: string };
  const ownership = useRecoverableWrite<OwnerIntent, OwnerValue>(
    prayerId,
    user?.id,
    async (intent, attempt) => {
      if (intent.kind === 'delete')
        return {
          kind: 'delete',
          deleted: await deletePrayerRequest(prayerId, attempt),
          audience: intent.audience,
        };
      if (intent.kind === 'renew') {
        const expiresAt = await renewPublicPrayer(prayerId, {
          ...attempt,
          expectedExpiresAt: intent.expectedExpiresAt,
        });
        if (!expiresAt) throw new WriteOutcomeError(false);
        return { kind: 'renew', expiresAt };
      }
      const updated = await updatePrayerRequest(prayerId, intent.text, {
        ...attempt,
        expectedText: intent.expectedText,
        expectedEditedAt: intent.expectedEditedAt,
      });
      if (!updated) throw new WriteOutcomeError(false);
      return { kind: 'edit', updated };
    }
  );
  useEffect(() => {
    setActionsOpen(false);
    setEditOpen(false);
    setEditText('');
    setEditError('');
    setEditBusy(false);
    setDeleteBusy(false);
    setRenewBusy(false);
    setOwnerError('');
    setRenewMessage('');
    setInteractionError('');
    setPrayBusy(false);
    setSaveBusy(false);
    editOriginal.current = null;
  }, [prayerId, user?.id]);
  type InteractionIntent = { kind: 'pray' | 'save'; desired: boolean };
  const interactions = useRecoverableWrite<
    InteractionIntent,
    { intent: InteractionIntent; refreshed: PrayerRequest | null }
  >(prayerId, user?.id, async (intent, attempt) => {
    const ok =
      intent.kind === 'pray'
        ? await togglePray(prayerId, intent.desired, attempt)
        : await toggleSavePrayer(prayerId, intent.desired, attempt);
    if (!ok) throw new WriteOutcomeError(false);
    const refreshed =
      intent.kind === 'pray' ? await getPrayerById(prayerId, { throwOnError: true }) : null;
    if (intent.kind === 'pray' && !refreshed) throw new WriteOutcomeError(true);
    return { intent, refreshed };
  });

  const targetLanguage = resolveTranslationLanguage(languagePreference, getDeviceLocale());

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError(null);
    setPrayer(null);
    try {
      const [fetched, prayedIds, savedIds, preferences] = await withRequestTimeout(
        Promise.all([
          getPrayerById(prayerId, { throwOnError: true }),
          getMyPrayedIds({ throwOnError: true }),
          getMySavedIds({ throwOnError: true }),
          getProfilePreferences(),
        ])
      );
      if (request !== loadRequest.current) return;
      setPrayer(fetched);
      setPrayed(prayedIds.includes(prayerId));
      setSaved(savedIds.includes(prayerId));
      setLanguagePreference(preferences.language);
      setTranslation(null);
      setShowingOriginal(false);
      setTranslationMessage('');
    } catch {
      if (request !== loadRequest.current) return;
      setError("We couldn't load this prayer. Check your connection and try again.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [prayerId]);

  useFocusEffect(
    useCallback(() => {
      screenActive.current = true;
      if (!ownership.isLocked()) {
        setEditBusy(false);
        setDeleteBusy(false);
        setRenewBusy(false);
      }
      void load();
      return () => {
        screenActive.current = false;
        loadRequest.current += 1;
        setPrayer(null);
      };
    }, [load])
  );

  const completeInteraction = (result: Awaited<ReturnType<typeof interactions.run>>) => {
    if (result.status === 'ignored' || !screenActive.current) return;
    setPrayBusy(false);
    setSaveBusy(false);
    if (result.status === 'failed') {
      setInteractionError("We couldn't save that change. Please try again.");
      return;
    }
    if (result.status !== 'saved') return;
    if (result.value.intent.kind === 'pray') {
      setPrayed(result.value.intent.desired);
      setPrayer((current) => (current?.id === prayerId ? result.value.refreshed : current));
    } else setSaved(result.value.intent.desired);
  };
  const handlePray = async () => {
    if (
      !prayer ||
      prayer.audience === 'private' ||
      isPrayerArchived(prayer) ||
      interactions.isLocked()
    )
      return;
    setPrayBusy(true);
    setInteractionError('');
    completeInteraction(await interactions.run({ kind: 'pray', desired: !prayed }));
  };

  const handleSave = async () => {
    if (!prayer || isPrayerArchived(prayer) || interactions.isLocked()) return;
    setSaveBusy(true);
    setInteractionError('');
    completeInteraction(await interactions.run({ kind: 'save', desired: !saved }));
  };

  const handleTranslate = async () => {
    if (!prayer || translating) return;

    if (translation?.status === 'translated') {
      setShowingOriginal((current) => !current);
      setTranslationMessage('');
      return;
    }

    setTranslating(true);
    setTranslationMessage('');
    try {
      const result = await translatePrayerText({
        prayerId: prayer.id,
        text: prayer.text,
        targetLanguage,
      });
      if (!result) {
        setTranslationMessage("We couldn't translate this prayer. Please try again.");
        return;
      }
      if (result.status === 'not-needed') {
        setTranslation(result);
        setTranslationMessage(`This prayer is already in ${getLanguageName(targetLanguage)}.`);
        return;
      }

      setTranslation(result);
      setShowingOriginal(false);
    } finally {
      setTranslating(false);
    }
  };

  const isOwner = prayer
    ? prayer.authorId
      ? prayer.authorId === user?.id
      : Boolean(prayer.username && prayer.username === authProfile?.username)
    : false;
  const canShare = Boolean(prayer && prayer.audience !== 'private' && !archived);
  const canReport = Boolean(prayer && !isOwner && prayer.audience !== 'private' && !archived);
  const isPrivate = prayer?.audience === 'private';

  const completeOwnerWrite = (result: Awaited<ReturnType<typeof ownership.run>>) => {
    if (result.status === 'ignored' || !screenActive.current) return;
    setEditBusy(false);
    setDeleteBusy(false);
    setRenewBusy(false);
    if (result.status === 'failed') {
      const message =
        "We couldn't save this change. It may have changed elsewhere. Refresh and try again.";
      setEditError(message);
      setOwnerError(message);
      return;
    }
    if (result.status !== 'saved') return;
    const value = result.value;
    setOwnerError('');
    if (value.kind === 'edit') {
      setPrayer((current) =>
        current?.id === prayerId ? { ...current, ...value.updated } : current
      );
      setTranslation(null);
      setShowingOriginal(false);
      setTranslationMessage('');
      setEditOpen(false);
    } else if (value.kind === 'renew') {
      setPrayer((current) =>
        current?.id === prayerId ? { ...current, expiresAt: value.expiresAt } : current
      );
      setRenewMessage('Your prayer is public again for 14 days.');
    } else {
      if (!value.deleted)
        Alert.alert(
          'Prayer unavailable',
          'This prayer is no longer available. Return to My Prayers to check your history.'
        );
      setActionsOpen(false);
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: 'MyPrayers',
            params: { initialAudience: value.audience as 'public' | 'circle' | 'private' },
          },
        ],
      });
    }
  };

  const handleRenew = async () => {
    if (
      !prayer ||
      !isOwner ||
      !isPrayerArchived(prayer) ||
      ownership.isLocked() ||
      !prayer.expiresAt
    )
      return;
    setRenewBusy(true);
    setRenewMessage('');
    setOwnerError('');
    completeOwnerWrite(await ownership.run({ kind: 'renew', expectedExpiresAt: prayer.expiresAt }));
  };

  const openAuthorProfile = () => {
    if (!prayer?.username) return;
    if (prayer.username === authProfile?.username) {
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate('UserProfile', { username: prayer.username });
  };

  const openEdit = () => {
    if (!prayer || !isOwner || ownership.isLocked()) return;
    editOriginal.current = { text: prayer.text, editedAt: prayer.editedAt };
    setActionsOpen(false);
    setEditText(prayer.text);
    setEditError('');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!prayer || !isOwner || ownership.isLocked() || !editOriginal.current) return;

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
    setOwnerError('');
    completeOwnerWrite(
      await ownership.run({
        kind: 'edit',
        text,
        expectedText: editOriginal.current.text,
        expectedEditedAt: editOriginal.current.editedAt,
      })
    );
  };

  const handleShare = async () => {
    if (!prayer || !canShare || sharePending.current) return;
    sharePending.current = true;
    setShareBusy(true);
    setShareFeedback('Opening share options...');
    try {
      const result = await sharePrayer(prayer);
      const messages = {
        copied: 'Link copied to clipboard.',
        shared: 'Prayer shared.',
        dismissed: 'Sharing cancelled.',
        opened: 'Share options opened.',
        unavailable: 'This prayer cannot be shared.',
      };
      setShareFeedback(messages[result]);
    } catch {
      setShareFeedback("We couldn't open sharing. Try again or choose Copy link.");
    } finally {
      sharePending.current = false;
      setShareBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!prayer || !canShare || sharePending.current) return;
    sharePending.current = true;
    setShareBusy(true);
    setShareFeedback('Copying link...');
    try {
      const copied = await copyPrayerLink(prayer);
      setShareFeedback(
        copied ? 'Link copied to clipboard.' : "We couldn't copy the link. Please try again."
      );
    } catch {
      setShareFeedback("We couldn't copy the link. Please try again.");
    } finally {
      sharePending.current = false;
      setShareBusy(false);
    }
  };

  const deletePrayer = async () => {
    if (!prayer || !isOwner || ownership.isLocked()) return;
    setDeleteBusy(true);
    setOwnerError('');
    completeOwnerWrite(
      await ownership.run({ kind: 'delete', audience: prayer.audience || 'public' })
    );
  };

  const confirmDelete = () => {
    if (!prayer || !isOwner || ownership.isLocked()) return;
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

  if (error || !prayer || (archived && !isOwner)) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.dim}>
          {error ||
            'Prayer unavailable. It may have expired, been removed, or no longer be shared with you.'}
        </Text>
        {error && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Try again</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const count = prayer.prayerCount ?? 0;
  const translated = translation?.status === 'translated' ? translation : null;
  const showingTranslation = Boolean(translated && !showingOriginal);
  const sourceLanguage = translated?.sourceLanguage || detectLanguage(prayer.text);
  const canTranslate = needsTranslation(prayer.text, targetLanguage);
  const targetLanguageName = getLanguageName(targetLanguage);
  const translationAction = translating
    ? 'Translating...'
    : translated
      ? showingOriginal
        ? `View ${targetLanguageName} translation`
        : 'Original'
      : `Translate to ${targetLanguageName}`;

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
              disabled={saveBusy || archived || interactions.locked}
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
              disabled={shareBusy}
              onPress={() => {
                setShareFeedback('');
                setActionsOpen(true);
              }}
              style={[styles.headerButton, shareBusy && styles.headerButtonDisabled]}
            >
              <MoreIcon color={colors.textMuted} size={21} strokeWidth={1.7} />
            </Pressable>
          </View>
        </View>
        {shareFeedback ? (
          <View style={styles.shareFeedback}>
            {shareBusy ? <ActivityIndicator color={colors.accent} size="small" /> : null}
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={styles.shareFeedbackText}
            >
              {shareFeedback}
            </Text>
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {isPrivate ? (
            <Text style={styles.privateLabel}>Private prayer</Text>
          ) : (
            <View style={styles.locationRow}>
              <MapPinIcon color={colors.textMuted} size={14} strokeWidth={1.7} />
              <Text style={styles.location}>
                {prayer.city !== 'Unknown' ? `${prayer.city}, ${prayer.country}` : prayer.country}
              </Text>
            </View>
          )}
          <Text style={styles.time}>
            {prayer.createdAt ? timeAgo(prayer.createdAt) : ''}
            {prayer.editedAt ? ' - Edited' : ''}
          </Text>

          {archived ? (
            <View style={styles.archiveStatus}>
              <Text style={styles.archiveTitle}>Archived prayer</Text>
              <Text style={styles.archiveText}>
                No longer public. Your prayer and its history are kept here.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={ownership.locked}
                onPress={() => void handleRenew()}
                style={[styles.renewButton, renewBusy && styles.headerButtonDisabled]}
              >
                {renewBusy ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <RenewIcon color={colors.accent} size={17} />
                )}
                <Text style={styles.renewText}>
                  {renewBusy ? 'Renewing...' : 'Renew for 14 days'}
                </Text>
              </Pressable>
            </View>
          ) : prayer.audience === 'public' && prayer.expiresAt ? (
            <Text style={styles.time}>
              Public until{' '}
              {new Date(prayer.expiresAt).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </Text>
          ) : null}
          {renewMessage ? (
            <Text accessibilityRole="alert" style={styles.archiveText}>
              {renewMessage}
            </Text>
          ) : null}

          <Text style={styles.text}>{showingTranslation ? translated?.text : prayer.text}</Text>

          {canTranslate ? (
            <View style={styles.translationArea}>
              <Pressable
                accessibilityLabel={translationAction}
                accessibilityRole="button"
                disabled={translating}
                onPress={() => void handleTranslate()}
                style={({ pressed }) => [
                  styles.translationButton,
                  pressed && styles.translationButtonPressed,
                  translating && styles.translationButtonDisabled,
                ]}
              >
                {translating ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <LanguagesIcon color={colors.accent} size={17} strokeWidth={1.7} />
                )}
                <Text style={styles.translationButtonText}>{translationAction}</Text>
              </Pressable>
              {showingTranslation ? (
                <Text style={styles.translationContext}>
                  Translated from {getLanguageName(sourceLanguage)} to {targetLanguageName}
                </Text>
              ) : null}
              {translationMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.translationMessage}>
                  {translationMessage}
                </Text>
              ) : null}
            </View>
          ) : null}

          {!isPrivate && (
            <>
              {prayer.username ? (
                <Pressable
                  accessibilityLabel={`View @${prayer.username}'s profile`}
                  accessibilityRole="link"
                  hitSlop={8}
                  onPress={openAuthorProfile}
                  style={styles.attributionButton}
                >
                  <Text style={[styles.attribution, styles.attributionLink]}>
                    {getAttributionText(prayer)}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.attribution}>{getAttributionText(prayer)}</Text>
              )}

              <View style={styles.countRow}>
                <Text style={styles.count}>
                  {count} {count === 1 ? 'person prayed' : 'people prayed'}
                </Text>
              </View>

              {!archived && (
                <Pressable
                  onPress={() => void handlePray()}
                  disabled={prayBusy || interactions.locked}
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
              )}
            </>
          )}

          {ownerError ? (
            <Text accessibilityRole="alert" style={styles.archiveText}>
              {ownerError}
            </Text>
          ) : null}
          {ownership.uncertain && !editOpen ? (
            <WriteRecovery
              busy={ownership.busy}
              onRetry={() => void ownership.retry().then(completeOwnerWrite)}
            />
          ) : null}
          {interactionError ? (
            <Text accessibilityRole="alert" style={styles.archiveText}>
              {interactionError}
            </Text>
          ) : null}
          {interactions.uncertain ? (
            <WriteRecovery
              busy={interactions.busy}
              onRetry={() => void interactions.retry().then(completeInteraction)}
            />
          ) : null}
          <PrayerComments prayer={prayer} onBlocked={returnAfterBlock} readOnly={archived} />
        </ScrollView>
      </KeyboardAvoidingView>

      <PrayerActionsSheet
        busy={shareBusy || blocking || ownership.locked}
        onBlock={
          canReport && prayer?.username && prayer.authorId
            ? () => confirmBlock(prayer.authorId!, prayer.username)
            : undefined
        }
        canReport={canReport}
        canShare={canShare}
        deleting={deleteBusy}
        isOwner={isOwner}
        onClose={() => setActionsOpen(false)}
        onCopyLink={() => void handleCopyLink()}
        onDelete={confirmDelete}
        onEdit={openEdit}
        onReport={() => {
          setActionsOpen(false);
          setReportOpen(true);
        }}
        onShare={() => void handleShare()}
        visible={actionsOpen}
      />
      <ContentReportSheet
        onClose={() => setReportOpen(false)}
        reportableId={prayer.id}
        reportableType="prayer"
        visible={reportOpen}
      />
      <PrayerEditSheet
        error={editError}
        locked={ownership.locked}
        recovery={
          ownership.uncertain ? (
            <WriteRecovery
              busy={ownership.busy}
              onRetry={() => void ownership.retry().then(completeOwnerWrite)}
            />
          ) : undefined
        }
        onChangeText={(value) => {
          if (ownership.isLocked()) return;
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
  archiveStatus: {
    marginTop: 16,
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  archiveTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  archiveText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 20,
  },
  renewButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  renewText: { color: colors.accent, fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
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
  shareFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accentTintSoft,
  },
  shareFeedbackText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
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
  privateLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
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
  translationArea: {
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
  },
  translationButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  translationButtonPressed: {
    backgroundColor: colors.surfaceHover,
  },
  translationButtonDisabled: {
    opacity: 0.65,
  },
  translationButtonText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
  },
  translationContext: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
  },
  translationMessage: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
  },
  attribution: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    marginTop: 16,
  },
  attributionButton: {
    alignSelf: 'flex-start',
  },
  attributionLink: {
    color: colors.accent,
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
