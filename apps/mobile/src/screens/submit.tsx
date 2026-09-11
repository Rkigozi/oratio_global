import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { createPrayerRequest } from '@oratio/shared/queries';
import { getApproximateCoordinates } from '@oratio/shared/prayer-data';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { useAuth } from '../hooks/auth-context';
import { Brand, ErrorText, Field, PrimaryButton, Screen } from '../components/ui';
import { asNativeIcon } from '../components/icon';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

type Audience = 'public' | 'circle' | 'private';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string; hint: string }> = [
  { value: 'public', label: 'Public', hint: 'Anyone can see and pray' },
  { value: 'circle', label: 'Prayer Circle', hint: 'Only your Circle sees it' },
  { value: 'private', label: 'Private', hint: 'Just for you' },
];

export function SubmitScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Submit'>) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [audience, setAudience] = useState<Audience>('public');
  const [anonymous, setAnonymous] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedPrayerId, setSubmittedPrayerId] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError('');
    const validation = validatePrayerSubmission({
      text,
      location: `${city}, ${country}`,
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

    const trimmedCity = city.trim() || 'Unknown';
    const trimmedCountry = country.trim() || 'Unknown';
    const coords = getApproximateCoordinates(trimmedCity, trimmedCountry);

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
      setError("We couldn't share your prayer. Please try again.");
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
            setAudience('public');
            setAnonymous(false);
            setCommentsEnabled(true);
            setSubmittedPrayerId(null);
          }}
          style={styles.againButton}
        >
          <Text style={styles.againText}>Share another prayer</Text>
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
        <Text style={styles.screenTitle}>SHARE A PRAYER</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Field
        label="Prayer"
        placeholder="Share what's on your heart…"
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

      <Field
        label="City"
        placeholder="e.g. London"
        value={city}
        onChangeText={(value) => {
          setCity(value);
          setError('');
        }}
        autoCorrect={false}
      />
      <Field
        label="Country"
        placeholder="e.g. United Kingdom"
        value={country}
        onChangeText={(value) => {
          setCountry(value);
          setError('');
        }}
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>Who can see this?</Text>
      <View style={styles.audienceRow}>
        {AUDIENCE_OPTIONS.map((option) => {
          const selected = audience === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setAudience(option.value);
                if (option.value !== 'public') setAnonymous(false);
              }}
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

      {audience === 'public' && (
        <View style={styles.publicPreferences}>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceText}>Share anonymously</Text>
            <Switch
              accessibilityLabel="Share anonymously"
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
        title="Submit Prayer"
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
  screenTitle: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.heading,
    fontSize: 15,
    letterSpacing: 2.4,
  },
  headerSpacer: {
    width: 44,
  },
  prayerInput: {
    minHeight: 120,
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
