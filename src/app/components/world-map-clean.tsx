import { useEffect, useRef, useCallback, useState } from "react";
import type { PrayerRequest } from "../data/prayer-data";
import L from "leaflet";
// Leaflet CSS is imported in src/styles/index.css

// ── Main component ──────────────────────────────────────────────────
interface WorldMapCleanProps {
  prayers: PrayerRequest[];
  onPrayerTap: (prayer: PrayerRequest) => void;
  centerTrigger?: number;
  prayedId?: string | null;
  newPrayerId?: string | null;
  flyTo?: { lat: number; lng: number } | null;
}

export function WorldMapClean({
  prayers,
  onPrayerTap,
  centerTrigger,
  prayedId,
  newPrayerId,
  flyTo,
}: WorldMapCleanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onPrayerTapRef = useRef(onPrayerTap);
  onPrayerTapRef.current = onPrayerTap;
  const [ready, setReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // Small delay to ensure container is rendered
    setTimeout(() => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [51.5, -0.1], // Approximate London coordinates for privacy
        zoom: 4,
        minZoom: 2,
        maxZoom: 10, // Moderate increase for better tap accuracy (was 7)
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds([-85, -200], [85, 200]),
        maxBoundsViscosity: 0.8,
      });

      // CartoDB Dark Matter - Dark map without brightness filter (test continent colors)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 10,
        }
      ).addTo(map);

      // Canvas renderer — most reliable
      const renderer = L.canvas({ padding: 0.5 });
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
      }
    };
  }, []);

  // ── Render markers ──────────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const zoom = map.getZoom();

    // Use a single renderer for all circles
    const renderer = L.canvas({ padding: 0.5 });

    for (const prayer of prayers) {
      // Prayer intensity (0-1 scale)
      const intensity = Math.min(prayer.prayerCount / 250, 1);
      
      // Size scaling with zoom - larger sizes for better tap accuracy at higher zooms
      let innerRadius: number;
      let outerRadius: number;
      
      if (zoom <= 4) {
        innerRadius = 4 + intensity * 2;    // Small bright core
        outerRadius = 12 + intensity * 6;   // Larger gentle glow
      } else if (zoom <= 5) {
        innerRadius = 6 + intensity * 3;
        outerRadius = 16 + intensity * 8;
      } else if (zoom <= 7) {
        innerRadius = 8 + intensity * 4;
        outerRadius = 20 + intensity * 10;
      } else if (zoom <= 9) {
        innerRadius = 10 + intensity * 5;   // Larger for better tapping
        outerRadius = 24 + intensity * 12;
      } else {
        // Max zoom (10) - largest for best tap accuracy
        innerRadius = 12 + intensity * 6;
        outerRadius = 28 + intensity * 14;
      }

      // ── Angelic Color Scheme ──
      // Inner core: White-gold (pure light from prayers)
      const innerHue = 60; // Gold/Yellow tone
      const innerSaturation = 80;
      const innerLightness = 85 + intensity * 10; // 85-95% (very bright)
      const innerColor = `hsl(${innerHue}, ${innerSaturation}%, ${innerLightness}%)`;
      
      // Outer glow: Heavenly blue halo (God's grace)
      const outerHue = 220; // Heavenly blue
      const outerSaturation = 50;
      const outerLightness = 70 + intensity * 10; // 70-80%
      // Outer glow has transparency for ethereal appearance
      const outerColor = `hsla(${outerHue}, ${outerSaturation}%, ${outerLightness}%, ${0.3 + intensity * 0.2})`;

      // ── Create Outer Glow (Halo) ──
      const outerGlow = L.circleMarker(
        [prayer.lat, prayer.lng],
        {
          renderer,
          radius: outerRadius,
          color: outerColor,
          fillColor: outerColor,
          fillOpacity: 1,
          weight: 0,
          interactive: false, // Not clickable - just visual
          bubblingMouseEvents: false,
        }
      );

      // ── Create Inner Core (Prayer Light) ──
      const innerCore = L.circleMarker(
        [prayer.lat, prayer.lng],
        {
          renderer,
          radius: innerRadius,
          color: innerColor,
          fillColor: innerColor,
          fillOpacity: 1,
          weight: 0,
          interactive: true,
          bubblingMouseEvents: false,
        }
      );

      // Make inner core clickable
      innerCore.on("click", () => onPrayerTapRef.current(prayer));
      
      // Add to map - outer first (background), inner on top
      outerGlow.addTo(group);
      innerCore.addTo(group);
    }
  }, [prayers]);

  // Update markers when prayers or ready state changes
  useEffect(() => {
    if (ready) {
      updateMarkers();
    }
  }, [prayers, ready, updateMarkers]);

  // Center map trigger - use approximate coordinates for privacy
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

  // "I Prayed" effect - simplified
  useEffect(() => {
    if (mapRef.current && prayedId) {
      const prayer = prayers.find((p) => p.id === prayedId);
      if (prayer && layerGroupRef.current) {
        // Create a simple pulse effect
        const pulse = L.circleMarker([prayer.lat, prayer.lng], {
          radius: 20,
          color: '#FFF5E0',
          fillColor: '#FFF5E0',
          fillOpacity: 0.7,
          weight: 0,
          interactive: false,
        }).addTo(layerGroupRef.current);
        
        setTimeout(() => {
          if (layerGroupRef.current && mapRef.current) {
            layerGroupRef.current.removeLayer(pulse);
          }
        }, 1000);
      }
    }
  }, [prayedId, prayers]);

  // New prayer effect - simplified
  useEffect(() => {
    if (mapRef.current && newPrayerId) {
      const prayer = prayers.find((p) => p.id === newPrayerId);
      if (prayer && layerGroupRef.current) {
        // Create a simple blue pulse for new prayer
        const pulse = L.circleMarker([prayer.lat, prayer.lng], {
          radius: 15,
          color: '#7c8fff',
          fillColor: '#7c8fff',
          fillOpacity: 0.7,
          weight: 0,
          interactive: false,
        }).addTo(layerGroupRef.current);
        
        setTimeout(() => {
          if (layerGroupRef.current && mapRef.current) {
            layerGroupRef.current.removeLayer(pulse);
          }
        }, 1000);
      }
    }
  }, [newPrayerId, prayers]);

  return (
    <div
      ref={containerRef}
      className="world-map-clean h-full w-full rounded-2xl overflow-hidden"
      style={{
        background: "#0A1A3A",
        minHeight: "400px",
      }}
    />
  );
}