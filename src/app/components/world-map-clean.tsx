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
   showCityLabels?: boolean;
 }

export function WorldMapClean({
   prayers,
   onPrayerTap,
   centerTrigger,
   prayedId,
   newPrayerId,
   flyTo,
   showCityLabels = false,
 }: WorldMapCleanProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const mapRef = useRef<L.Map | null>(null);
   const layerGroupRef = useRef<L.LayerGroup | null>(null);
   const labelLayerRef = useRef<L.LayerGroup | null>(null);
   const onPrayerTapRef = useRef(onPrayerTap);
   const [ready, setReady] = useState(false);
   const [zoom, setZoom] = useState(4);

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

      // ESRI Light Gray — minimal, clean, light land/ocean, clear borders
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: '&copy; Esri',
          maxZoom: 10,
          crossOrigin: true,
        }
      ).addTo(map);

      // Reference layer — country outlines, city labels
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 10,
          crossOrigin: true,
        }
      ).addTo(map);

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
  }, []);

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
   }, [prayers, showCityLabels]);

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
      className="world-map-clean h-full w-full rounded-2xl overflow-hidden"
      style={{
        background: "#0A1A3A",
        minHeight: "250px",
        border: "1px solid rgba(124,143,255,0.1)",
      }}
    />
  );
}