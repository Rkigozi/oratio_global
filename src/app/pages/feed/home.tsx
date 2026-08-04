import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { WorldMapClean } from '../../components/world-map-clean';
import {
  getPrayerLocationKey,
  hasMappablePrayerLocation,
  normalizePrayerLocation,
  type PrayerRequest,
} from '../../services/prayer-data';
import { Heart, ArrowRight, MapPin, Locate } from 'lucide-react';
import { Drawer } from 'vaul';
import { useGeolocation } from '../../hooks/use-geolocation';
import { getMapHotspots } from '../../services/supabase-queries';
import { logError } from '../../../lib/logger';

function getLocationMarkerId(city: string, country: string) {
  return `location:${getPrayerLocationKey(city, country)}`;
}

const NEARBY_AREA_BANNER_VISIBLE_MS = 6000;

function getPrivacyRoundedCoordinates(point: { lat: number; lng: number }) {
  return {
    lat: Math.round(point.lat * 10) / 10,
    lng: Math.round(point.lng * 10) / 10,
  };
}

function getPrayerRequestLabel(count: number) {
  return `${count} ${count === 1 ? 'prayer request' : 'prayer requests'}`;
}

function getPeoplePrayedLabel(count: number) {
  return `${count} ${count === 1 ? 'person has' : 'people have'} prayed`;
}

function getNearbyAreaSummary(area: { requestCount: number; prayerCount: number }) {
  if (area.requestCount > 0 && area.prayerCount > 0) {
    return `${getPrayerRequestLabel(area.requestCount)}, ${getPeoplePrayedLabel(area.prayerCount)}`;
  }

  if (area.requestCount > 0) {
    return `${getPrayerRequestLabel(area.requestCount)} in your area`;
  }

  return 'Your local prayer area';
}

function NearbyAreaBanner({
  area,
  onView,
}: {
  area: {
    city: string;
    country: string;
    requestCount: number;
    prayerCount: number;
  };
  onView: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: [0, 1, 1, 0.92], y: [-8, 0, 0, -120] }}
      exit={{ opacity: 0.92, y: -120 }}
      transition={{ duration: NEARBY_AREA_BANNER_VISIBLE_MS / 1000, times: [0, 0.12, 0.82, 1] }}
      onAnimationComplete={() => setIsVisible(false)}
      className="absolute top-20 left-4 right-4 z-[500] pointer-events-none"
      style={{ willChange: 'transform, opacity' }}
      aria-live="polite"
    >
      <div
        className="oratio-surface mx-auto max-w-sm rounded-full px-3 py-2 flex items-center gap-2 pointer-events-auto"
        style={{
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(var(--rgb-accent), 0.12)',
            color: 'rgb(var(--rgb-accent))',
          }}
        >
          <MapPin size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-text text-xs font-medium truncate">Prayers near {area.city}</p>
          <p className="text-text-muted text-[10px] truncate">{getNearbyAreaSummary(area)}</p>
        </div>
        {area.requestCount > 0 && (
          <button
            type="button"
            onClick={onView}
            className="oratio-pill-active px-3 py-1.5 rounded-full text-[10px] cursor-pointer flex-shrink-0"
            aria-label={`View prayers near ${area.city}`}
          >
            View
          </button>
        )}
      </div>
    </motion.div>
  );
}

function aggregateMapPrayers(prayers: PrayerRequest[]): PrayerRequest[] {
  const groups = new Map<
    string,
    {
      marker: PrayerRequest;
      latTotal: number;
      lngTotal: number;
      latestCreatedAt: string;
    }
  >();

  for (const prayer of prayers) {
    const location = normalizePrayerLocation(prayer.city, prayer.country);
    const markerId = getLocationMarkerId(location.city, location.country);
    const createdAt = prayer.createdAt || '';
    const incomingRequestCount = Math.max(1, prayer.requestCount ?? 1);
    const existing = groups.get(markerId);

    if (!existing) {
      groups.set(markerId, {
        marker: {
          ...prayer,
          id: markerId,
          city: location.city,
          country: location.country,
          text: '',
          prayerCount: Math.max(0, prayer.prayerCount || 0),
          requestCount: incomingRequestCount,
        },
        latTotal: prayer.lat * incomingRequestCount,
        lngTotal: prayer.lng * incomingRequestCount,
        latestCreatedAt: createdAt,
      });
      continue;
    }

    const nextRequestCount = (existing.marker.requestCount || 1) + incomingRequestCount;
    existing.latTotal += prayer.lat * incomingRequestCount;
    existing.lngTotal += prayer.lng * incomingRequestCount;
    existing.marker = {
      ...existing.marker,
      prayerCount: existing.marker.prayerCount + Math.max(0, prayer.prayerCount || 0),
      requestCount: nextRequestCount,
      lat: existing.latTotal / nextRequestCount,
      lng: existing.lngTotal / nextRequestCount,
      createdAt: createdAt > existing.latestCreatedAt ? createdAt : existing.marker.createdAt,
    };
    if (createdAt > existing.latestCreatedAt) existing.latestCreatedAt = createdAt;
  }

  return Array.from(groups.values())
    .map((group) => group.marker)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function Home() {
  const navigate = useNavigate();
  const {
    location: geoLocation,
    loading: geoLoading,
    denied: geoDenied,
    error: geoError,
    requestLocation,
    resetDenied,
  } = useGeolocation();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);

  // Load real prayers from Supabase for map hotspots
  useEffect(() => {
    let mounted = true;

    void getMapHotspots()
      .then((hotspots) => {
        if (mounted) setPrayers(hotspots);
      })
      .catch((error: unknown) => {
        logError('load map hotspots', error);
        if (mounted) setPrayers([]);
      });

    return () => {
      mounted = false;
    };
  }, []);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const mapPrayers = useMemo(() => aggregateMapPrayers(prayers), [prayers]);
  const selectedPrayerDetails = selectedPrayer
    ? mapPrayers.find((prayer) => prayer.id === selectedPrayer.id) || selectedPrayer
    : null;
  const nearbyArea = useMemo(() => {
    if (!geoLocation) return null;

    const location = normalizePrayerLocation(geoLocation.city, geoLocation.country);
    const markerId = getLocationMarkerId(location.city, location.country);
    const localMarker = mapPrayers.find((prayer) => prayer.id === markerId);
    const roundedCoordinates = getPrivacyRoundedCoordinates(geoLocation);

    return {
      city: location.city,
      country: location.country,
      markerId: localMarker?.id,
      lat: localMarker?.lat ?? roundedCoordinates.lat,
      lng: localMarker?.lng ?? roundedCoordinates.lng,
      prayerCount: localMarker?.prayerCount ?? 0,
      requestCount: localMarker?.requestCount ?? 0,
    };
  }, [geoLocation, mapPrayers]);
  const selectedRequestCount = selectedPrayerDetails?.requestCount ?? 1;
  const selectedPrayerActivity = selectedPrayerDetails?.prayerCount ?? 0;
  const [newPrayerId, setNewPrayerId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [showGeoPrompt, setShowGeoPrompt] = useState(true);
  const [nearbyAreaBannerToken, setNearbyAreaBannerToken] = useState(0);
  const [hintDone] = useState(() => {
    try {
      return !!localStorage.getItem('oratio_hint_shown');
    } catch {
      return false;
    }
  });
  const nearbyAreaKey = nearbyArea
    ? `${nearbyArea.city}:${nearbyArea.country}`
    : '';

  // Fly to user location when it's resolved
  useEffect(() => {
    const updateFlyTo = () => {
      if (!geoLocation) return;
      setFlyTo(getPrivacyRoundedCoordinates(geoLocation));
    };

    updateFlyTo();
  }, [geoLocation]);

  const handlePrayerTap = useCallback((prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
  }, []);

  // Listen for new prayer submissions (via custom event from Submit page)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAdd = (e: Event) => {
      const prayer = (e as CustomEvent).detail as PrayerRequest;
      if (prayer.audience === 'circle' || !hasMappablePrayerLocation(prayer)) return;

      const location = normalizePrayerLocation(prayer.city, prayer.country);
      const normalizedPrayer = { ...prayer, city: location.city, country: location.country };
      setPrayers((prev) => [normalizedPrayer, ...prev]);
      setNewPrayerId(getLocationMarkerId(normalizedPrayer.city, normalizedPrayer.country));
      setFlyTo({ lat: prayer.lat, lng: prayer.lng });
      setTimeout(() => setNewPrayerId(null), 2000);
    };

    const handleRemove = (e: Event) => {
      const prayerId = (e as CustomEvent).detail as string;
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
    };

    const handleUpdate = (e: Event) => {
      const update = (e as CustomEvent).detail as {
        prayerId: string;
        text: string;
        editedAt: string;
      };
      setPrayers((prev) =>
        prev.map((prayer) =>
          prayer.id === update.prayerId
            ? { ...prayer, text: update.text, editedAt: update.editedAt }
            : prayer
        )
      );
      setSelectedPrayer((prev) =>
        prev?.id === update.prayerId
          ? { ...prev, text: update.text, editedAt: update.editedAt }
          : prev
      );
    };

    window.addEventListener('oratio-prayer-added', handleAdd);
    window.addEventListener('oratio-prayer-removed', handleRemove);
    window.addEventListener('oratio-prayer-updated', handleUpdate);

    return () => {
      window.removeEventListener('oratio-prayer-added', handleAdd);
      window.removeEventListener('oratio-prayer-removed', handleRemove);
      window.removeEventListener('oratio-prayer-updated', handleUpdate);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: 'rgb(var(--rgb-bg))' }}
    >
      {/* Header hint — shows once */}
      {!hintDone && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          className="absolute top-16 left-0 right-0 z-[500] text-center pointer-events-none flex flex-col items-center"
        >
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.5, 1] }}
            onAnimationComplete={() => {
              try {
                localStorage.setItem('oratio_hint_shown', '1');
              } catch {}
            }}
            className="text-text text-xs tracking-widest uppercase px-4 py-1.5 rounded-full max-w-xs mx-auto"
            style={{
              background: 'rgba(var(--rgb-bg), 0.85)',
              border: '1px solid rgba(var(--rgb-accent), 0.15)',
            }}
          >
            Tap a location to pray
          </motion.p>
        </motion.div>
      )}

      {/* Map area */}
      <div className="absolute inset-0 z-0">
        <WorldMapClean
          prayers={mapPrayers}
          onPrayerTap={handlePrayerTap}
          newPrayerId={newPrayerId}
          flyTo={flyTo}
          nearbyArea={nearbyArea}
        />
      </div>

      {/* Nearby area state */}
      <AnimatePresence>
        {nearbyArea && (
          <NearbyAreaBanner
            key={`${nearbyAreaKey}:${nearbyAreaBannerToken}`}
            area={nearbyArea}
            onView={() => {
              void navigate(
                `/feed?city=${encodeURIComponent(nearbyArea.city)}&country=${encodeURIComponent(nearbyArea.country)}`
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Locate / re-centre button — always visible */}
      <button
        onClick={() => {
          if (geoLocation) {
            setFlyTo(getPrivacyRoundedCoordinates(geoLocation));
            setNearbyAreaBannerToken((current) => current + 1);
          } else {
            if (geoDenied) resetDenied();
            void requestLocation();
          }
        }}
        className="absolute bottom-16 right-4 z-[500] w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'rgba(var(--rgb-bg), 0.8)',
          border: geoDenied
            ? '1px solid rgba(var(--rgb-danger), 0.3)'
            : '1px solid rgba(var(--rgb-accent), 0.12)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {geoLoading ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        ) : (
          <Locate
            size={15}
            className={geoLocation ? 'text-accent' : geoDenied ? 'text-danger' : 'text-text-dim'}
          />
        )}
      </button>

      {/* Geolocation request prompt */}
      <AnimatePresence>
        {showGeoPrompt && !geoLocation && !geoDenied && !geoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 z-[500] max-w-sm mx-auto"
          >
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: 'rgba(var(--rgb-bg), 0.92)',
                border: '1px solid rgba(var(--rgb-accent), 0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <MapPin size={16} className="text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-text text-sm font-medium mb-0.5">See prayers near you?</p>
                <p className="text-text-muted text-xs">Find prayers from your area</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowGeoPrompt(false)}
                  className="text-text-dim hover:text-text-muted text-xs transition-colors cursor-pointer"
                >
                  Not now
                </button>
                <button
                  onClick={() => {
                    void requestLocation();
                  }}
                  className="px-3 py-1.5 rounded-full text-xs text-white cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                  }}
                >
                  Allow
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location error banner */}
      <AnimatePresence>
        {geoDenied && !geoLocation && !geoLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 z-[500] max-w-sm mx-auto"
          >
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(var(--rgb-bg), 0.92)',
                border: '1px solid rgba(var(--rgb-danger), 0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-text text-sm font-medium mb-1">Location unavailable</p>
                  {geoError === 'permission' ? (
                    <p className="text-text-muted text-xs leading-relaxed">
                      {/iPad|iPhone|iPod/.test(navigator.userAgent)
                        ? "Go to Settings > Safari > Location and set to 'While Using', then reload."
                        : /Android/.test(navigator.userAgent)
                          ? 'Tap the lock icon next to the URL, enable Location, then reload.'
                          : 'Enable location access in your browser settings, then reload.'}
                    </p>
                  ) : geoError === 'timeout' ? (
                    <p className="text-text-muted text-xs">
                      Location request timed out. Try again in a better signal area.
                    </p>
                  ) : (
                    <p className="text-text-muted text-xs">
                      Could not get your location. Check that location services are enabled and try
                      again.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    resetDenied();
                    void requestLocation();
                  }}
                  className="px-3 py-1.5 rounded-full text-xs text-white cursor-pointer flex-shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prayer Card Drawer */}
      <Drawer.Root
        open={!!selectedPrayerDetails}
        onOpenChange={(o) => !o && setSelectedPrayer(null)}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
          <Drawer.Content
            className="flex flex-col rounded-t-[1.5rem] fixed bottom-0 left-0 right-0 z-[600] max-h-[75vh] focus:outline-none"
            style={{
              background: 'rgb(var(--rgb-surface))',
              borderTop: '1px solid rgba(var(--rgb-text-faint), 0.18)',
            }}
          >
            <Drawer.Title className="sr-only">Hotspot Details</Drawer.Title>
            <Drawer.Description className="sr-only">
              Prayer activity details for this location
            </Drawer.Description>
            {/* Drag handle — subtle pill indicator */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-accent/20" />
            </div>
            <div className="max-w-md w-full mx-auto p-6 pt-2 flex-1 overflow-auto">
              {selectedPrayerDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Location */}
                  <p className="oratio-section-label mb-4">
                    {selectedPrayerDetails.city || 'Unknown'},{' '}
                    {selectedPrayerDetails.country || 'Unknown'}
                  </p>

                  {/* Activity level */}
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(255,220,160,0.12), rgba(255,200,120,0.03))',
                      boxShadow: '0 0 40px rgba(255, 210, 140, 0.08)',
                    }}
                  >
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: 'rgb(255, 225, 170)',
                        boxShadow: '0 0 12px rgba(255,220,160,0.6)',
                      }}
                    />
                  </div>

                  <p
                    className="text-text text-center font-heading mb-2"
                    style={{ fontSize: '1.15rem', fontWeight: 300 }}
                  >
                    {selectedRequestCount}{' '}
                    {selectedRequestCount === 1 ? 'prayer request' : 'prayer requests'} near{' '}
                    {selectedPrayerDetails.city || 'Unknown'}
                  </p>
                  <p className="text-text-muted text-sm text-center mb-6 max-w-[260px]">
                    {selectedPrayerActivity > 0
                      ? `${selectedPrayerActivity} ${selectedPrayerActivity === 1 ? 'person has' : 'people have'} prayed here`
                      : `People around ${selectedPrayerDetails.city || 'Unknown'} can lift this up now`}
                  </p>

                  {/* CTA to feed */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const city = selectedPrayerDetails?.city;
                      const country = selectedPrayerDetails?.country;
                      setSelectedPrayer(null);
                      void navigate(
                        city
                          ? `/feed?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || '')}`
                          : '/feed'
                      );
                    }}
                    className="oratio-primary-pill flex items-center gap-2.5 px-7 py-3 rounded-full text-sm cursor-pointer"
                  >
                    <Heart size={15} />
                    View {selectedPrayerDetails.city || 'Location'} Prayers
                    <ArrowRight size={14} />
                  </motion.button>

                  <button
                    onClick={() => setSelectedPrayer(null)}
                    className="mt-3 px-6 py-2 text-xs text-text-dim hover:text-text-muted transition-colors cursor-pointer"
                  >
                    Back to Map
                  </button>
                </motion.div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
