import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, LocateFixed } from 'lucide-react-native';
import * as Location from 'expo-location';
import { createPrayerRequest } from '@oratio/shared/queries';
import { getApproximateCoordinates } from '@oratio/shared/prayer-data';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { useAuth } from '../hooks/auth-context';
import { Brand, ErrorText, Field, PrimaryButton, Screen } from '../components/ui';
import { asNativeIcon } from '../components/icon';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

type Audience = 'public' | 'circle' | 'private';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const LocateFixedIcon = asNativeIcon(LocateFixed);

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; hint: string }> = [
  { value: 'public', label: 'Public', hint: 'Anyone can see and pray' },
  { value: 'circle', label: 'Prayer Circle', hint: 'Only your Circle sees it' },
  { value: 'private', label: 'Private', hint: 'Just for you' },
];

export function SubmitScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Submit'>) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [audience, setAudience] = useState<Audience>(route.params?.initialAudience ?? 'public');
  const [anonymous, setAnonymous] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedPrayerId, setSubmittedPrayerId] = useState<string | null>(null);
  const locationRequest = useRef(0);
  const isPrivate = audience === 'private';

  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    []
  );

  const selectAudience = (next: Audience) => {
    if (submitting) return;
    setAudience(next);
    setError('');
    if (next !== 'public') setAnonymous(false);
    if (next === 'private') {
      locationRequest.current += 1;
      setLocating(false);
      setCity('');
      setCountry('');
    }
  };

  const handleDetectLocation = async () => {
    if (locating || isPrivate || submitting) return;

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
          'Allow location access in Settings to add your current city, or enter it manually.'
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
      const detectedCountry = address?.country;

      if (!detectedCity || !detectedCountry) {
        throw new Error('Location did not resolve to a city and country');
      }

      setCity(detectedCity);
      setCountry(detectedCountry);
    } catch {
      if (!isCurrent()) return;
      Alert.alert(
        'Location unavailable',
        "We couldn't detect your city. You can still enter it manually."
      );
    } finally {
      if (isCurrent()) setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError('');
    const validation = validatePrayerSubmission({
      text,
      location: isPrivate ? '' : `${city}, ${country}`,
      anonymous,
    });
    if (!validation.success) {
      setError(
        validation.errors?.text || validation.errors?.location || 'Check your prayer and try again'
      );
      return;
    }

    const effectiveAnonymous = audience === 'public' && anonymous;
    const profileUsername = profile?.username;
    if (!effectiveAnonymous && !profileUsername) {
      setError("We couldn't load your profile. Please go back and try again.");
      return;
    }

    const trimmedCity = isPrivate ? '' : city.trim() || 'Unknown';
    const trimmedCountry = isPrivate ? '' : country.trim() || 'Unknown';
    const coords = isPrivate
      ? { lat: 0, lng: 0 }
      : getApproximateCoordinates(trimmedCity, trimmedCountry);

    locationRequest.current += 1;
    setLocating(false);
    setSubmitting(true);
    let prayerId: string | null = null;
    try {
      prayerId = await createPrayerRequest({
        text: sanitizePrayerText(validation.data?.text ?? text),
        city: trimmedCity,
        country: trimmedCountry,
        lat: coords.lat,
        lng: coords.lng,
        username: effectiveAnonymous ? undefined : profileUsername,
        audience,
        commentsEnabled: audience === 'public' ? commentsEnabled : true,
        prayerCount: 0,
      });
    } catch {
      prayerId = null;
    } finally {
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
        <PrimaryButton
          title="View Prayer"
          onPress={() =>
            submittedPrayerId
              ? navigation.navigate('PrayerDetail', { prayerId: submittedPrayerId })
              : navigation.navigate('Main')
          }
        />
        <Pressable
          onPress={() => {
            setDone(false);
            setText('');
            setCity('');
            setCountry('');
            setAnonymous(false);
            setCommentsEnabled(true);
            setSubmittedPrayerId(null);
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
              accessibilityState={{ checked: selected, disabled: submitting }}
              disabled={submitting}
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

      <Field
        label="Prayer"
        accessibilityLabel="Prayer"
        placeholder={isPrivate ? "Write what's on your heart…" : "Share what's on your heart…"}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        editable={!submitting}
        value={text}
        onChangeText={(value) => {
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
            disabled={locating || submitting}
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

          <Field
            label="City (optional)"
            editable={!submitting}
            placeholder="e.g. London"
            value={city}
            onChangeText={(value) => {
              setCity(value);
              setError('');
            }}
            autoCorrect={false}
          />
          <Field
            label="Country (optional)"
            editable={!submitting}
            placeholder="e.g. United Kingdom"
            value={country}
            onChangeText={(value) => {
              setCountry(value);
              setError('');
            }}
            autoCorrect={false}
          />
        </>
      )}

      {audience === 'public' && (
        <View style={styles.publicPreferences}>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceText}>Share anonymously</Text>
            <Switch
              accessibilityLabel="Share anonymously"
              disabled={submitting}
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
              thumbColor={anonymous ? colors.accent : colors.textDim}
            />
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceText}>Let people encourage me</Text>
            <Switch
              accessibilityLabel="Let people encourage me"
              disabled={submitting}
              value={commentsEnabled}
              onValueChange={setCommentsEnabled}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
              thumbColor={commentsEnabled ? colors.accent : colors.textDim}
            />
          </View>
        </View>
      )}

      <ErrorText>{error}</ErrorText>
      <PrimaryButton
        title={isPrivate ? 'Save Prayer' : 'Submit Prayer'}
        onPress={() => void handleSubmit()}
        loading={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
