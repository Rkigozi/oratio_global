import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ArrowRight, LocateFixed, RefreshCw, UsersRound } from 'lucide-react-native';
import * as Location from 'expo-location';
import {
  createPrayerRequest,
  PrayerSubmissionError,
  findPrayerPlace,
  getPrayerCircleCount,
  type PrayerPlace,
} from '@oratio/shared/queries';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { useAuth } from '../hooks/auth-context';
import {
  REQUEST_TIMEOUT_MS,
  RequestTimeoutError,
  withRequestTimeout,
} from '../services/request-timeout';
import { createSubmissionId } from '../services/submission-id';
import { Brand, ErrorText, Field, PrimaryButton, Screen } from '../components/ui';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { PrayerLocationPicker } from '../components/prayer-location-picker';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

type Audience = 'public' | 'circle' | 'private';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const ArrowRightIcon = asNativeIcon(ArrowRight);
const LocateFixedIcon = asNativeIcon(LocateFixed);
const RefreshIcon = asNativeIcon(RefreshCw);
const UsersIcon = asNativeIcon(UsersRound);

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; hint: string }> = [
  { value: 'public', label: 'Public', hint: 'Public for 14 days, then kept in My Prayers' },
  { value: 'circle', label: 'Prayer Circle', hint: 'Only your Circle sees it' },
  { value: 'private', label: 'Private', hint: 'Just for you' },
];

export function SubmitScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Submit'>) {
  const { profile, user } = useAuth();
  const [text, setText] = useState('');
  const [place, setPlace] = useState<PrayerPlace | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const city = place?.city ?? '';
  const country = place?.country ?? '';
  const [audience, setAudience] = useState<Audience>(route.params?.initialAudience ?? 'public');
  const [anonymous, setAnonymous] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedPrayerId, setSubmittedPrayerId] = useState<string | null>(null);
  const locationRequest = useRef(0);
  const circleRequest = useRef(0);
  const submitPending = useRef(false);
  const attemptId = useRef<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const frozen = submitting || uncertain;
  const [circleAvailability, setCircleAvailability] = useState<
    'checking' | 'ready' | 'empty' | 'unavailable'
  >('checking');
  const isPrivate = audience === 'private';

  const checkCircle = useCallback(async () => {
    const request = ++circleRequest.current;
    setCircleAvailability('checking');
    try {
      if (!user?.id) throw new Error('No signed-in user');
      const count = await withRequestTimeout(getPrayerCircleCount(user.id, { throwOnError: true }));
      if (request !== circleRequest.current) return null;
      setCircleAvailability(count > 0 ? 'ready' : 'empty');
      return count;
    } catch {
      if (request === circleRequest.current) setCircleAvailability('unavailable');
      return null;
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (audience === 'circle' && !done) void checkCircle();
      return () => {
        circleRequest.current += 1;
      };
    }, [audience, checkCircle, done])
  );

  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    []
  );

  const selectAudience = (next: Audience) => {
    if (frozen || submitPending.current || next === audience) return;
    circleRequest.current += 1;
    if (next === 'circle') setCircleAvailability('checking');
    setAudience(next);
    setError('');
    if (next !== 'public') setAnonymous(false);
    if (next === 'private') {
      locationRequest.current += 1;
      setLocating(false);
      setPlace(null);
      setLocationQuery('');
    }
  };

  const handleDetectLocation = async () => {
    if (locating || isPrivate || frozen) return;

    const request = ++locationRequest.current;
    const isCurrent = () => request === locationRequest.current;
    setLocating(true);
    setError('');
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!isCurrent()) return;
      if (!permission.granted && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
        if (!isCurrent()) return;
      }

      if (!permission.granted) {
        Alert.alert(
          'Location access is off',
          'Allow location access in Settings to add your current city, or search for it manually.'
        );
        return;
      }

      let position = await Location.getLastKnownPositionAsync({
        maxAge: 120_000,
        requiredAccuracy: 1_000,
      });
      if (!isCurrent()) return;
      if (!position) {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isCurrent()) return;
      }
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (!isCurrent()) return;
      const address = addresses[0];
      const detectedCity =
        address?.city || address?.district || address?.subregion || address?.region;
      const detectedCountry = address?.isoCountryCode || address?.country;

      if (!detectedCity || !detectedCountry) {
        throw new Error('Location did not resolve to a city and country');
      }

      const detectedPlace = await findPrayerPlace(detectedCity, detectedCountry);
      if (!isCurrent()) return;
      if (!detectedPlace) throw new Error('City is not uniquely recognized');
      setPlace(detectedPlace);
      setLocationQuery('');
    } catch {
      if (!isCurrent()) return;
      Alert.alert(
        'Location unavailable',
        "We couldn't find a matching city. Search for one or continue without a location."
      );
    } finally {
      if (isCurrent()) setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || submitPending.current) return;
    setError('');
    if (!isPrivate && !place && locationQuery.trim()) {
      setError('Select a city from the results or clear the location search.');
      return;
    }
    const validation = validatePrayerSubmission({
      text,
      location: '',
      anonymous,
    });
    if (!validation.success) {
      setError(
        validation.errors?.text || validation.errors?.location || 'Check your prayer and try again'
      );
      return;
    }

    const effectiveAnonymous = audience === 'public' && anonymous;
    if (!user) {
      setError('Please sign in again before submitting a prayer.');
      return;
    }
    const profileUsername = profile?.username;
    if (!effectiveAnonymous && !profileUsername) {
      setError("We couldn't load your profile. Please go back and try again.");
      return;
    }

    const trimmedCity = isPrivate ? '' : city.trim() || 'Unknown';
    const trimmedCountry = isPrivate ? '' : country.trim() || 'Unknown';
    const coords = isPrivate || !place ? { lat: 0, lng: 0 } : place;

    locationRequest.current += 1;
    setLocating(false);
    submitPending.current = true;
    const deadline = Date.now() + REQUEST_TIMEOUT_MS;
    setSubmitting(true);
    let prayerId: string | null = null;
    try {
      if (audience === 'circle' && !uncertain) {
        // Recheck at save time in case the last connection was removed elsewhere.
        const count = await checkCircle();
        if (count === null || count < 1) return;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new RequestTimeoutError();
      attemptId.current ??= createSubmissionId();
      prayerId = await withRequestTimeout(
        createPrayerRequest(
          {
            text: sanitizePrayerText(validation.data?.text ?? text),
            city: trimmedCity,
            country: trimmedCountry,
            lat: coords.lat,
            lng: coords.lng,
            ...(!isPrivate && place ? { placeId: place.id, countryCode: place.countryCode } : {}),
            username: effectiveAnonymous ? undefined : profileUsername,
            audience,
            commentsEnabled: audience === 'public' ? commentsEnabled : true,
            prayerCount: 0,
          },
          {
            requestId: attemptId.current,
            expectedUserId: user.id,
            verifyExisting: uncertain,
            throwOnError: true,
          }
        ),
        remaining
      );
      setUncertain(false);
    } catch (cause) {
      const unknownOutcome =
        Boolean(attemptId.current) &&
        (uncertain || !(cause instanceof PrayerSubmissionError) || cause.uncertain);
      setUncertain(unknownOutcome);
      if (!unknownOutcome) attemptId.current = null;
      if (unknownOutcome) {
        setError(
          "We couldn't confirm whether your prayer was saved. Your draft is still here. Check and retry this submission to avoid a duplicate."
        );
        return;
      }
      prayerId = null;
    } finally {
      submitPending.current = false;
      setSubmitting(false);
    }

    if (!prayerId) {
      setError(
        isPrivate
          ? "We couldn't save your prayer. Please try again."
          : "We couldn't share your prayer. Please try again."
      );
      return;
    }
    setSubmittedPrayerId(prayerId);
    setDone(true);
  };

  if (done) {
    const destination =
      audience === 'private' ? 'Private' : audience === 'circle' ? 'Circle' : 'Public';
    const returnTitle =
      audience === 'private'
        ? 'Back to Private prayers'
        : audience === 'circle'
          ? 'Back to Prayer Circle'
          : 'Back to Public prayers';
    const finishSubmission = (openPrayer = false) => {
      const prayerId = openPrayer ? submittedPrayerId : null;
      // Remove the completed composer so Back never reopens its success screen.
      navigation.reset({
        index: prayerId ? 1 : 0,
        routes: [
          { name: 'Main', params: { screen: destination } },
          ...(prayerId ? [{ name: 'PrayerDetail' as const, params: { prayerId } }] : []),
        ],
      });
    };

    return (
      <Screen>
        <Brand subtitle="Amen 🙏" />
        <Text style={styles.successText}>
          {audience === 'public'
            ? 'Your prayer is live.'
            : audience === 'circle'
              ? 'Shared with your Prayer Circle.'
              : 'Your private prayer is saved.'}
        </Text>
        <PrimaryButton title={returnTitle} onPress={() => finishSubmission()} />
        <Pressable
          accessibilityRole="button"
          onPress={() => finishSubmission(true)}
          style={styles.viewPrayerButton}
        >
          <Text style={styles.againText}>View Prayer</Text>
          <ArrowRightIcon color={colors.accent} size={18} strokeWidth={1.8} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDone(false);
            setText('');
            setPlace(null);
            setLocationQuery('');
            setAnonymous(false);
            setCommentsEnabled(true);
            setSubmittedPrayerId(null);
            attemptId.current = null;
            setUncertain(false);
          }}
          style={styles.againButton}
        >
          <Text style={styles.againText}>
            {isPrivate ? 'Write another prayer' : 'Share another prayer'}
          </Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeftIcon color={colors.textMuted} size={20} strokeWidth={1.7} />
        </Pressable>
        <ScreenHeaderTitle title={isPrivate ? 'Private Prayer' : 'Share a Prayer'} />
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.fieldLabel}>Who can see this?</Text>
      <View style={styles.audienceRow}>
        {AUDIENCE_OPTIONS.map((option) => {
          const selected = audience === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: frozen }}
              disabled={frozen}
              onPress={() => selectAudience(option.value)}
              style={[styles.audiencePill, selected && styles.audiencePillSelected]}
            >
              <Text style={[styles.audienceText, selected && styles.audienceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.audienceHint}>
        {AUDIENCE_OPTIONS.find((o) => o.value === audience)?.hint}
      </Text>

      {audience === 'circle' && circleAvailability !== 'ready' ? (
        <View style={styles.circleGate}>
          {circleAvailability === 'checking' ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : null}
          <Text accessibilityLiveRegion="polite" style={styles.circleMessage}>
            {circleAvailability === 'checking'
              ? 'Checking your Prayer Circle...'
              : circleAvailability === 'empty'
                ? 'You need at least one accepted Prayer Circle connection before sharing here.'
                : "We couldn't check your Prayer Circle. Your draft is still here. Please try again."}
          </Text>
          {circleAvailability === 'empty' ? (
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => navigation.navigate('PrayerCircleManagement')}
              style={styles.circleAction}
            >
              <UsersIcon color={colors.accent} size={18} strokeWidth={1.8} />
              <Text style={styles.circleActionText}>Manage Prayer Circle</Text>
            </Pressable>
          ) : null}
          {circleAvailability === 'empty' || circleAvailability === 'unavailable' ? (
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void checkCircle()}
              style={styles.circleAction}
            >
              <RefreshIcon color={colors.accent} size={18} strokeWidth={1.8} />
              <Text style={styles.circleActionText}>Check again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Field
        label="Prayer"
        accessibilityLabel="Prayer"
        placeholder={isPrivate ? "Write what's on your heart…" : "Share what's on your heart…"}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        editable={!frozen}
        value={text}
        onChangeText={(value) => {
          if (frozen) return;
          setText(value);
          setError('');
        }}
        multiline
        numberOfLines={5}
        style={styles.prayerInput}
        error={Boolean(error) && text.trim().length < 10}
      />
      <Text style={[styles.counter, text.length > 500 && styles.counterOver]}>
        {text.length}/500
      </Text>

      {!isPrivate && (
        <>
          <Pressable
            accessibilityLabel="Use my current location"
            accessibilityRole="button"
            disabled={locating || frozen}
            onPress={() => void handleDetectLocation()}
            style={({ pressed }) => [
              styles.locationButton,
              pressed && !locating && styles.locationButtonPressed,
              locating && styles.locationButtonDisabled,
            ]}
          >
            {locating ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <LocateFixedIcon color={colors.accent} size={18} strokeWidth={1.8} />
            )}
            <Text style={styles.locationButtonText}>
              {locating ? 'Finding your city...' : 'Use my current location'}
            </Text>
          </Pressable>

          <PrayerLocationPicker
            value={place}
            query={locationQuery}
            disabled={frozen}
            onChange={(value) => {
              if (frozen) return;
              locationRequest.current += 1;
              setLocating(false);
              setPlace(value);
              setLocationQuery('');
              setError('');
            }}
            onQueryChange={(value) => {
              if (frozen) return;
              locationRequest.current += 1;
              setLocating(false);
              setPlace(null);
              setLocationQuery(value);
              setError('');
            }}
          />
        </>
      )}

      {audience === 'public' && (
        <View style={styles.publicPreferences}>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceText}>Share anonymously</Text>
            <Switch
              accessibilityLabel="Share anonymously"
              disabled={frozen}
              value={anonymous}
              onValueChange={(value) => {
                if (!frozen) setAnonymous(value);
              }}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
              thumbColor={anonymous ? colors.accent : colors.textDim}
            />
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceText}>Let people encourage me</Text>
            <Switch
              accessibilityLabel="Let people encourage me"
              disabled={frozen}
              value={commentsEnabled}
              onValueChange={(value) => {
                if (!frozen) setCommentsEnabled(value);
              }}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
              thumbColor={commentsEnabled ? colors.accent : colors.textDim}
            />
          </View>
        </View>
      )}

      <ErrorText>{error}</ErrorText>
      <PrimaryButton
        title={
          uncertain ? 'Check and retry submission' : isPrivate ? 'Save Prayer' : 'Submit Prayer'
        }
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!uncertain && audience === 'circle' && circleAvailability !== 'ready'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewPrayerButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  circleGate: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  circleMessage: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  circleAction: {
    minHeight: 44,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  circleActionText: {
    flexShrink: 1,
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  prayerInput: {
    height: 180,
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    borderColor: colors.textDim,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  counter: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 16,
  },
  counterOver: {
    color: colors.danger,
  },
  locationButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentTintSoft,
  },
  locationButtonPressed: {
    backgroundColor: colors.accentTint,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  audiencePill: {
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 6,
    alignItems: 'center',
  },
  audiencePillSelected: {
    backgroundColor: colors.surfaceHover,
  },
  audienceText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  audienceTextSelected: {
    color: colors.accentLight,
  },
  audienceHint: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  publicPreferences: {
    gap: 2,
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 4,
  },
  preferenceText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  successText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  againButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  againText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
});
