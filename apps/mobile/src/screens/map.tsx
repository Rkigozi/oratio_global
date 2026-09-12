import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, {
  Marker,
  type MapPressEvent,
  type MapStyleElement,
  type MarkerPressEvent,
} from 'react-native-maps';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, LocateFixed, RefreshCw } from 'lucide-react-native';
import { getMapHotspots, getPublicPrayersAtLocation } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';
import { PrayerCard } from '../components/prayer-card';
import { asNativeIcon } from '../components/icon';
import { BrandLockup } from '../components/brand-lockup';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { useTheme } from '../hooks/theme-context';
import { colors, fontFamilies } from '../theme';
import type { RootStackParamList } from '../navigation';

const ArrowLeftIcon = asNativeIcon(ArrowLeft);
const ArrowRightIcon = asNativeIcon(ArrowRight);
const LocateFixedIcon = asNativeIcon(LocateFixed);
const RefreshIcon = asNativeIcon(RefreshCw);

const WORLD_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 110,
  longitudeDelta: 180,
};

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#132344' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E9BC4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1A3A' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#33446B' }],
  },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#10203F' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07142E' }] },
];

const LIGHT_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#E6EAF1' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5D6882' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F7FB' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#B8C1D1' }],
  },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#ECEFF4' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFDAE9' }] },
];

function requestLabel(count: number) {
  return `${count} ${count === 1 ? 'prayer request' : 'prayer requests'}`;
}

function prayedLabel(count: number) {
  return `${count} ${count === 1 ? 'person has' : 'people have'} prayed`;
}

export function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [hotspots, setHotspots] = useState<PrayerRequest[]>([]);
  const [selected, setSelected] = useState<PrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    if (event.nativeEvent.action !== 'marker-press') setSelected(null);
  }, []);

  const handleMarkerPress = useCallback(
    (event: MarkerPressEvent | undefined, hotspot: PrayerRequest) => {
      event?.stopPropagation();
      setSelected(hotspot);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMapHotspots({ throwOnError: true });
      setHotspots(next);
      setSelected((current) => next.find((item) => item.id === current?.id) || null);
    } catch {
      setError("We couldn't load the prayer map. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLocate = useCallback(async () => {
    if (locating) return;

    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (!permission.granted) {
        Alert.alert(
          'Location access is off',
          'Allow location access in Settings to return the prayer map to your current area.'
        );
        return;
      }

      const position =
        (await Location.getLastKnownPositionAsync({
          maxAge: 120_000,
          requiredAccuracy: 1_000,
        })) ||
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      setSelected(null);
      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        },
        600
      );
    } catch {
      Alert.alert(
        'Location unavailable',
        "We couldn't find your current location. Check Location Services and try again."
      );
    } finally {
      setLocating(false);
    }
  }, [locating]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.mapScreen}>
      <MapView
        ref={mapRef}
        accessibilityLabel="Global prayer map"
        customMapStyle={theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        initialRegion={WORLD_REGION}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        maxZoomLevel={9}
        minZoomLevel={2}
        moveOnMarkerPress={false}
        onPress={handleMapPress}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled
        showsBuildings={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle={theme}
        zoomEnabled
      >
        {hotspots.map((hotspot) => {
          const activity = Math.max(hotspot.requestCount || 1, hotspot.prayerCount || 0);
          const markerSize = Math.min(30, 16 + Math.sqrt(activity) * 2);

          return (
            <Marker
              key={hotspot.id}
              accessibilityLabel={`View prayer activity in ${hotspot.city}`}
              coordinate={{ latitude: hotspot.lat, longitude: hotspot.lng }}
              onPress={(event) => handleMarkerPress(event, hotspot)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.markerHalo,
                  { width: markerSize, height: markerSize, borderRadius: markerSize / 2 },
                ]}
              >
                <View style={styles.markerCore} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.mapHeaderSafeArea}>
        <View style={styles.mapHeader} pointerEvents="box-none">
          <View style={styles.mapHeaderSide} />
          <View style={styles.mapHeaderBrand}>
            <BrandLockup align="center" subtitle="Prayer across the world" />
          </View>
          <Pressable
            accessibilityLabel="Refresh prayer map"
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void load()}
            style={styles.mapIconButton}
          >
            {loading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <RefreshIcon color={colors.textSecondary} size={18} strokeWidth={1.7} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <Pressable
        accessibilityLabel="Go to my location"
        accessibilityRole="button"
        accessibilityState={{ busy: locating, disabled: locating }}
        disabled={locating}
        onPress={() => void handleLocate()}
        style={styles.mapLocationButton}
      >
        {locating ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <LocateFixedIcon color={colors.textSecondary} size={19} strokeWidth={1.8} />
        )}
      </Pressable>

      {!loading && hotspots.length === 0 && !error && (
        <View style={styles.mapMessage}>
          <Text style={styles.mapMessageTitle}>The map is quiet for now</Text>
          <Text style={styles.mapMessageText}>
            Public prayers with a location will appear here.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.mapMessage}>
          <Text style={styles.mapMessageText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {selected && (
        <View accessibilityRole="summary" style={styles.locationSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.locationName}>{selected.city}</Text>
          <Text style={styles.countryName}>{selected.country}</Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{selected.requestCount || 1}</Text>
              <Text style={styles.totalLabel}>
                {(selected.requestCount || 1) === 1 ? 'prayer request' : 'prayer requests'}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{selected.prayerCount || 0}</Text>
              <Text style={styles.totalLabel}>
                {(selected.prayerCount || 0) === 1 ? 'person prayed' : 'people prayed'}
              </Text>
            </View>
          </View>
          <Text style={styles.sheetSummary}>
            {requestLabel(selected.requestCount || 1)}. {prayedLabel(selected.prayerCount || 0)}.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('LocationPrayers', {
                city: selected.city,
                country: selected.country,
              })
            }
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>View {selected.city} prayers</Text>
            <ArrowRightIcon color={colors.white} size={17} strokeWidth={1.8} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function LocationPrayersScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'LocationPrayers'>) {
  const { city, country } = route.params;
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setPrayers(await getPublicPrayersAtLocation(city, country, 50, { throwOnError: true }));
      } catch {
        setError("We couldn't load prayers from this location. Try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [city, country]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView edges={['top']} style={styles.listScreen}>
      <View style={styles.listHeader}>
        <Pressable
          accessibilityLabel="Back to map"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeftIcon color={colors.textMuted} size={20} strokeWidth={1.7} />
        </Pressable>
        <View style={styles.listHeading}>
          <ScreenHeaderTitle subtitle={`Public prayers in ${country}`} title={city} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.prayerList}
          data={prayers}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateText}>No public prayers are available here right now.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <PrayerCard
              prayer={item}
              onPress={() => navigation.navigate('PrayerDetail', { prayerId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mapScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mapHeaderSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  mapHeader: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mapHeader,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  mapHeaderSide: {
    width: 44,
  },
  mapHeaderBrand: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  mapIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTintSoft,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  mapLocationButton: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mapControl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  markerHalo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.markerHalo,
    borderWidth: 1,
    borderColor: colors.markerHaloBorder,
  },
  markerCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.markerCore,
    shadowColor: colors.markerCore,
    shadowOpacity: 0.8,
    shadowRadius: 7,
  },
  mapMessage: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.mapMessage,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    gap: 8,
  },
  mapMessageTitle: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 14,
  },
  mapMessageText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
  },
  locationSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderRadius: 8,
    backgroundColor: colors.mapSheet,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sheetHandle: {
    width: 34,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: colors.surfaceBorder,
  },
  locationName: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 20,
    textAlign: 'center',
  },
  countryName: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.surfaceBorder,
  },
  totalValue: {
    color: colors.warning,
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 18,
  },
  totalLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 10,
    marginTop: 2,
  },
  sheetSummary: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  locationButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.accentDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  locationButtonText: {
    color: colors.white,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 14,
  },
  listScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeading: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 44,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  stateText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  prayerList: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
