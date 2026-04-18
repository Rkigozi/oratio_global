import { useEffect, useRef, useCallback, useState } from "react";
import type { PrayerRequest } from "../data/prayer-data";
import L from "leaflet";
// Leaflet CSS is imported in src/styles/index.css

// ── Burst animation for "I Prayed" (temporary DivIcon overlay) ────
function spawnPrayedBurst(map: L.Map, lat: number, lng: number): void {
  const burstIcon = L.divIcon({
    className: "prayer-burst-marker",
    iconSize: [120, 120],
    iconAnchor: [60, 60],
    html: `<div class="prayer-burst">
      <div class="prayer-burst__ring prayer-burst__ring--1"></div>
      <div class="prayer-burst__ring prayer-burst__ring--2"></div>
      <div class="prayer-burst__flash"></div>
    </div>`,
  });

  const marker = L.marker([lat, lng], { icon: burstIcon, interactive: false });
  marker.addTo(map);
  setTimeout(() => map.removeLayer(marker), 1800);
}

// ── Circle pulse animation for new prayer ────────────────────────
function spawnNewPrayerEffect(map: L.Map, lat: number, lng: number): void {
  const circleIcon = L.divIcon({
    className: "prayer-burst-marker",
    iconSize: [80, 80],
    iconAnchor: [40, 40],
    html: `<div class="prayer-circle-arrive">
      <div class="prayer-circle-arrive__pulse prayer-circle-arrive__pulse--1"></div>
      <div class="prayer-circle-arrive__pulse prayer-circle-arrive__pulse--2"></div>
      <div class="prayer-circle-arrive__core"></div>
    </div>`,
  });

  const marker = L.marker([lat, lng], { icon: circleIcon, interactive: false });
  marker.addTo(map);
  setTimeout(() => map.removeLayer(marker), 1500);
}

// ── Main component ──────────────────────────────────────────────────
interface WorldMapProps {
  prayers: PrayerRequest[];
  onPrayerTap: (prayer: PrayerRequest) => void;
  centerTrigger?: number;
  prayedId?: string | null;
  newPrayerId?: string | null;
  flyTo?: { lat: number; lng: number } | null;
}

export function WorldMap({
  prayers,
  onPrayerTap,
  centerTrigger,
  prayedId,
  newPrayerId,
  flyTo,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const canvasRendererRef = useRef<L.Renderer | null>(null);
  const onPrayerTapRef = useRef(onPrayerTap);
  const [ready, setReady] = useState(false);

  // Keep ref updated with latest callback
  useEffect(() => {
    onPrayerTapRef.current = onPrayerTap;
  }, [onPrayerTap]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // Small delay to ensure container is rendered
    setTimeout(() => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [51.5074, -0.1278],
        zoom: 4,
        minZoom: 2,
        maxZoom: 7,
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds([-85, -200], [85, 200]),
        maxBoundsViscosity: 0.8,
      });

      // ESRI Dark Gray Canvas - Dark grey ocean, light grey continents, matches app theme
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community',
          maxZoom: 10,
          crossOrigin: true,
        }
      ).addTo(map);

      // Labels layer (optional - using same tile layer for simplicity)
      // Note: OpenStreetMap labels are integrated into the tile layer

      // Canvas renderer — more reliable for solid circles, no SVG star artifacts
      canvasRendererRef.current = L.canvas({ padding: 0.5 });
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);

      // Fix map sizing
      setTimeout(() => {
        if (mapRef.current) {
          map.invalidateSize();
        }
      }, 100);
    }, 100);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
        canvasRendererRef.current = null;
      }
    };
  }, []);

  // ── Render markers ──────────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    const renderer = canvasRendererRef.current;
    if (!map || !group || !renderer) return;

    group.clearLayers();
    const zoom = map.getZoom();

    for (const prayer of prayers) {
      // ── Brightness: prayerCount drives intensity (hotspot activity) ──
      const brightness = Math.min(prayer.prayerCount / 250, 1);

      // ── Size scales with zoom level ──
      let radius: number;

      // Large solid circles for perfect appearance at all zoom levels
      if (zoom <= 4) {
        radius = 16 + brightness * 5; // Solid circle, no glow
      } else if (zoom <= 5) {
        radius = 22 + brightness * 7;
      } else {
        // Max zoom (7) - largest for perfect circles
        radius = 28 + brightness * 9;
      }

      // ── Color intensity ──
      // Solid RGB colors - no transparency, brighter for visibility
      const hue = 220 + brightness * 40; // blue → cyan gradient
      const saturation = 70 + brightness * 25;
      const lightness = 60 + brightness * 20; // Brighter based on prayer count

      // Use HSL without alpha for solid colors
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      // Single solid circle marker - no glow layer
      const marker = L.circleMarker(
        [prayer.lat, prayer.lng],
        {
          renderer,
          radius,
          color,
          fillColor: color,
          fillOpacity: 1, // Solid fill
          weight: 0,
          interactive: true,
          bubblingMouseEvents: false,
          // No CSS class needed - Canvas renderer doesn't use CSS
        }
      );

      marker.on("click", () => onPrayerTapRef.current(prayer));
      marker.addTo(group);
    }
  }, [prayers]);

  // Update markers when prayers or ready state changes
  useEffect(() => {
    if (ready) {
      updateMarkers();
    }
  }, [prayers, ready, updateMarkers]);

  // Center map trigger - use approximate London coordinates for privacy
  useEffect(() => {
    if (mapRef.current && centerTrigger !== undefined) {
      mapRef.current.setView([51.5, -0.1], 4); // Approximate London coordinates
    }
  }, [centerTrigger]);

  // Fly to location
  useEffect(() => {
    if (mapRef.current && flyTo) {
      mapRef.current.flyTo([flyTo.lat, flyTo.lng], 5, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [flyTo]);

  // "I Prayed" burst effect
  useEffect(() => {
    if (mapRef.current && prayedId) {
      const prayer = prayers.find((p) => p.id === prayedId);
      if (prayer) {
        spawnPrayedBurst(mapRef.current, prayer.lat, prayer.lng);
      }
    }
  }, [prayedId, prayers]);

  // New prayer shooting star effect
  useEffect(() => {
    if (mapRef.current && newPrayerId) {
      const prayer = prayers.find((p) => p.id === newPrayerId);
      if (prayer) {
        spawnNewPrayerEffect(mapRef.current, prayer.lat, prayer.lng);
      }
    }
  }, [newPrayerId, prayers]);

  return (
    <div
      ref={containerRef}
      className="world-map h-full w-full rounded-2xl overflow-hidden bg-background"
      style={{
        minHeight: "400px",
      }}
    />
  );
}