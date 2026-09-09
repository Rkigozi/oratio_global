import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createPrayerRequest } from '@oratio/shared/queries';
import { getApproximateCoordinates } from '@oratio/shared/prayer-data';
import { sanitizePrayerText, validatePrayerSubmission } from '@oratio/shared/validation';
import { useAuth } from '../hooks/auth-context';
import { Brand, ErrorText, Field, PrimaryButton, Screen } from '../components/ui';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

type Audience = 'public' | 'circle' | 'private';

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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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

    const trimmedCity = city.trim() || 'Unknown';
    const trimmedCountry = country.trim() || 'Unknown';
    const coords = getApproximateCoordinates(trimmedCity, trimmedCountry);

    setSubmitting(true);
    const prayerId = await createPrayerRequest({
      text: sanitizePrayerText(validation.data?.text ?? text),
      city: trimmedCity,
      country: trimmedCountry,
      lat: coords.lat,
      lng: coords.lng,
      username: anonymous ? undefined : profile?.username || undefined,
      audience,
      commentsEnabled: true,
      prayerCount: 0,
    });
    setSubmitting(false);

    if (!prayerId) {
      setError("We couldn't share your prayer. Please try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <Screen>
        <Brand subtitle="Amen 🙏" />
        <Text style={styles.successText}>Your prayer is live.</Text>
        <PrimaryButton title="View in Feed" onPress={() => navigation.navigate('Feed')} />
        <Pressable
          onPress={() => {
            setDone(false);
            setText('');
            setCity('');
            setCountry('');
            setAudience('public');
            setAnonymous(false);
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
      <Brand subtitle="Share your prayer" />
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
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
              onPress={() => setAudience(option.value)}
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

      <View style={styles.anonymousRow}>
        <Text style={styles.anonymousText}>Share anonymously</Text>
        <Switch
          value={anonymous}
          onValueChange={setAnonymous}
          trackColor={{ false: colors.surfaceBorder, true: colors.accentDark }}
          thumbColor={anonymous ? colors.accent : colors.textDim}
        />
      </View>

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
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  prayerInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counter: {
    color: colors.textDim,
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
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  audiencePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  audiencePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  audienceText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  audienceTextSelected: {
    color: colors.white,
  },
  audienceHint: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  anonymousRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  anonymousText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  successText: {
    color: colors.textMuted,
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
    fontSize: 14,
  },
});
