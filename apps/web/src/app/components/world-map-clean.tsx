import { useEffect, useRef, useCallback, useState } from "react";
import type { PrayerRequest } from '../services/prayer-data';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from '../hooks/theme-context';

interface NearbyPrayerArea {
   lat: number;
   lng: number;
   city: string;
   country: string;
   markerId?: string;
 }

// ── Main component ──────────────────────────────────────────────────
interface WorldMapCleanProps {
   prayers: PrayerRequest[];
   onPrayerTap: (prayer: PrayerRequest) => void;
   centerTrigger?: number;
   prayedId?: string | null;
   newPrayerId?: string | null;
   flyTo?: { lat: number; lng: number } | null;
   nearbyArea?: NearbyPrayerArea | null;
   showCityLabels?: boolean;
 }

export function WorldMapClean({
   prayers,
   onPrayerTap,
   centerTrigger,
   prayedId,
   newPrayerId,
   flyTo,
   nearbyArea,
   showCityLabels = false,
 }: WorldMapCleanProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const mapRef = useRef<L.Map | null>(null);
   const layerGroupRef = useRef<L.LayerGroup | null>(null);
   const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const onPrayerTapRef = useRef(onPrayerTap);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(4);
  const { theme } = useTheme();

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
        center: [51.5, -0.1], // Approximate London coordinates for privacy
        zoom: 4,
        minZoom: 2,
        maxZoom: 10, // Moderate increase for better tap accuracy (was 7)
        zoomControl: false,
        attributionControl: false,
        maxBounds: L.latLngBounds([-85, -200], [85, 200]),
        maxBoundsViscosity: 0.8,
      });

      // Esri attribution is required for their free basemaps.
      L.control.attribution({ prefix: false }).addTo(map);

      // Theme-aware tile layers. Both themes use Esri Canvas (no API key).
      const isDark = theme === "dark";
      const baseTiles = isDark
        ? "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        : "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

      const refTiles = isDark
        ? "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        : "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

      const esriAttribution = '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

      L.tileLayer(baseTiles, {
        attribution: esriAttribution,
        maxZoom: 10,
        crossOrigin: true,
      }).addTo(map);

      L.tileLayer(refTiles, {
        attribution: esriAttribution,
        maxZoom: 10,
        crossOrigin: true,
      }).addTo(map);

      // Canvas renderer
      layerGroupRef.current = L.layerGroup().addTo(map);
      labelLayerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        map.on('zoomend', () => {
          setZoom(map.getZoom());
        });
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
         labelLayerRef.current = null;
      }
    };
  }, [theme]);

  // ── Render markers ──────────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

     group.clearLayers();
     const labelLayer = labelLayerRef.current;
     if (labelLayer) labelLayer.clearLayers();
     const zoom = map.getZoom();

    // Use a single renderer for all circles
    const renderer = L.canvas({ padding: 0.5 });

    if (nearbyArea) {
      const areaRadius = zoom <= 4 ? 18 : zoom <= 7 ? 24 : 30;

      L.circleMarker([nearbyArea.lat, nearbyArea.lng], {
        renderer,
        radius: areaRadius,
        color: "rgba(124,143,255,0.42)",
        fillColor: "rgba(124,143,255,0.08)",
        fillOpacity: 1,
        weight: 1.5,
        interactive: false,
      }).addTo(group);

      if (zoom >= 5) {
        const labelAnchor = L.circleMarker([nearbyArea.lat, nearbyArea.lng], {
          renderer,
          radius: 0,
          opacity: 0,
          fillOpacity: 0,
          interactive: false,
        }).addTo(group);

        labelAnchor.bindTooltip("Near you", {
          permanent: true,
          direction: 'top',
          className: 'nearby-area-tooltip',
          offset: [0, -areaRadius],
          opacity: 1,
        }).openTooltip();
      }
    }

    for (const prayer of prayers) {
      // Prayer intensity (0-1 scale)
      const activityScore = Math.max(prayer.prayerCount, (prayer.requestCount ?? 1) * 8);
      const intensity = Math.min(activityScore / 250, 1);
      const isNearbyArea = nearbyArea?.markerId === prayer.id;
      
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

      // ── Clean single circle marker ──
      // Inner core: warm gold
      const innerColor = `hsl(42, 85%, ${55 + intensity * 15}%)`;
      // Outer border: white for contrast
      const markerColor = "rgba(255,255,255,0.4)";

      // Outer glow only visible at higher zoom levels
      if (zoom >= 6) {
        L.circleMarker([prayer.lat, prayer.lng], {
          renderer,
          radius: innerRadius + 6,
          color: "rgba(255,255,255,0.08)",
          fillColor: "rgba(255,255,255,0.04)",
          fillOpacity: 1,
          weight: 0,
          interactive: false,
        }).addTo(group);
      }

      if (isNearbyArea) {
        L.circleMarker([prayer.lat, prayer.lng], {
          renderer,
          radius: outerRadius + 8,
          color: "rgba(124,143,255,0.34)",
          fillColor: "rgba(124,143,255,0.08)",
          fillOpacity: 1,
          weight: 1.5,
          interactive: false,
        }).addTo(group);
      }

      const innerCore = L.circleMarker(
        [prayer.lat, prayer.lng],
        {
          renderer,
          radius: innerRadius,
          color: markerColor,
          fillColor: innerColor,
          fillOpacity: 1,
          weight: outerRadius > 20 ? 2.5 : 2,
          interactive: true,
          bubblingMouseEvents: false,
        }
      );

       innerCore.on("click", () => onPrayerTapRef.current(prayer));
       
       // Add city label tooltip when enabled and zoomed in
       if (showCityLabels && zoom >= 7) {
         innerCore.bindTooltip(prayer.city, {
           permanent: true,
           direction: 'top',
           className: 'city-label-tooltip',
           offset: [0, -10],
           opacity: 0.9
         }).openTooltip();
       }
       
        innerCore.addTo(group);
    }
   }, [nearbyArea, prayers, showCityLabels]);

   // Update markers when prayers, ready, or zoom changes
   useEffect(() => {
     if (ready) {
       updateMarkers();
     }
   }, [prayers, ready, updateMarkers, zoom]);

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
          color: '#7c8fff',
          fillColor: '#7c8fff',
          fillOpacity: 0.5,
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
      className="world-map-clean h-full w-full overflow-hidden"
      style={{
        background: "#0A1A3A",
        minHeight: "250px",
        border: "1px solid rgba(124,143,255,0.1)",
      }}
    />
  );
}
