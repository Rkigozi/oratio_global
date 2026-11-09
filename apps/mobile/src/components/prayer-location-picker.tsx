import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, RefreshCw, X } from 'lucide-react-native';
import { searchPrayerPlaces, type PrayerPlace } from '@oratio/shared/queries';
import { Field } from './ui';
import { asNativeIcon } from './icon';
import { colors, fontFamilies } from '../theme';

const PinIcon = asNativeIcon(MapPin);
const ClearIcon = asNativeIcon(X);
const RetryIcon = asNativeIcon(RefreshCw);

export function PrayerLocationPicker({
  value,
  query,
  onChange,
  onQueryChange,
  disabled,
}: {
  value: PrayerPlace | null;
  query: string;
  onChange: (value: PrayerPlace | null) => void;
  onQueryChange: (query: string) => void;
  disabled: boolean;
}) {
  const [results, setResults] = useState<PrayerPlace[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResults([]);
    if (value || query.trim().length < 2 || disabled) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const timer = setTimeout(() => {
      void searchPrayerPlaces(query)
        .then((places) => {
          if (!active) return;
          setResults(places);
          setStatus('ready');
        })
        .catch(() => {
          if (active) setStatus('error');
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, value, disabled, retry]);

  return (
    <View>
      {value ? (
        <View style={styles.selected}>
          <PinIcon color={colors.accent} size={20} />
          <View style={styles.copy}>
            <Text style={styles.title}>{value.city}</Text>
            <Text style={styles.subtitle}>
              {[value.region, value.country].filter(Boolean).join(', ')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear location"
            disabled={disabled}
            onPress={() => onChange(null)}
            style={styles.iconButton}
          >
            <ClearIcon color={colors.textMuted} size={20} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.search}>
          <View style={styles.copy}>
            <Field
              label="Location (optional)"
              accessibilityLabel="Search for a city"
              placeholder="Search for a city"
              value={query}
              maxLength={80}
              autoCorrect={false}
              editable={!disabled}
              onChangeText={onQueryChange}
            />
          </View>
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear location"
              disabled={disabled}
              onPress={() => onQueryChange('')}
              style={styles.clearSearch}
            >
              <ClearIcon color={colors.textMuted} size={20} />
            </Pressable>
          ) : null}
        </View>
      )}
      {status === 'loading' ? (
        <ActivityIndicator accessibilityLabel="Searching cities" color={colors.accent} />
      ) : null}
      {status === 'error' ? (
        <View>
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            City search is unavailable. Your prayer draft is still here.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry city search"
            onPress={() => setRetry((n) => n + 1)}
            style={styles.retry}
          >
            <RetryIcon color={colors.accent} size={18} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'ready' && results.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          No cities found.
        </Text>
      ) : null}
      {results.map((place) => (
        <Pressable
          key={place.id}
          accessibilityRole="button"
          accessibilityLabel={`Select ${[place.city, place.region, place.country].filter(Boolean).join(', ')}`}
          disabled={disabled}
          onPress={() => onChange(place)}
          style={styles.result}
        >
          <View style={styles.copy}>
            <Text style={styles.title}>{place.city}</Text>
            <Text style={styles.subtitle}>
              {[place.region, place.country].filter(Boolean).join(', ')}
            </Text>
          </View>
          <PinIcon color={colors.textMuted} size={18} />
        </Pressable>
      ))}
      <View style={styles.attribution}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="GeoNames location data"
          style={styles.creditLink}
          onPress={() => {
            void Linking.openURL('https://www.geonames.org/').catch(() => {});
          }}
        >
          <Text style={styles.credit}>GeoNames</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="GeoNames CC BY 4.0 license"
          style={styles.creditLink}
          onPress={() => {
            void Linking.openURL('https://creativecommons.org/licenses/by/4.0/').catch(() => {});
          }}
        >
          <Text style={styles.credit}>CC BY 4.0</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selected: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  title: { color: colors.text, fontSize: 15, fontFamily: fontFamilies.bodyMedium },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilies.body,
    marginTop: 3,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  clearSearch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  result: {
    minHeight: 60,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamilies.body,
    paddingVertical: 8,
  },
  retry: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: { color: colors.accent, fontSize: 14, fontFamily: fontFamilies.bodyMedium },
  attribution: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  credit: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontFamilies.body,
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
  creditLink: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
});
