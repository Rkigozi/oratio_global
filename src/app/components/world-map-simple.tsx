import { useEffect, useRef, useState } from "react";
import type { PrayerRequest } from "../data/prayer-data";

// Simple map component that just renders a div with debug info
interface WorldMapSimpleProps {
  prayers: PrayerRequest[];
  onPrayerTap: (prayer: PrayerRequest) => void;
  centerTrigger?: number;
  prayedId?: string | null;
  newPrayerId?: string | null;
  flyTo?: { lat: number; lng: number } | null;
}

export function WorldMapSimple({
  prayers,
  onPrayerTap,
  centerTrigger,
  prayedId,
  newPrayerId,
  flyTo,
}: WorldMapSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    console.log("WorldMapSimple: Component mounted");
    console.log("WorldMapSimple: prayers count:", prayers.length);
    console.log("WorldMapSimple: centerTrigger:", centerTrigger);
    console.log("WorldMapSimple: prayedId:", prayedId);
    console.log("WorldMapSimple: newPrayerId:", newPrayerId);
    console.log("WorldMapSimple: flyTo:", flyTo);
    
    setRendered(true);

    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
        console.log("WorldMapSimple: Container size:", width, "x", height);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => {
      console.log("WorldMapSimple: Component unmounted");
      window.removeEventListener("resize", updateSize);
    };
  }, [prayers, centerTrigger, prayedId, newPrayerId, flyTo]);

  useEffect(() => {
    console.log("WorldMapSimple: onPrayerTap function:", typeof onPrayerTap);
  }, [onPrayerTap]);

  return (
    <div
      ref={containerRef}
      className="world-map-simple h-full w-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0A1A3A, #1a237e)",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        border: "2px solid #7c8fff",
        position: "relative",
      }}
    >
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", color: "#7c8fff" }}>
          SIMPLE MAP COMPONENT
        </h2>
        <p>✅ Component rendered: {rendered ? "YES" : "NO"}</p>
        <p>✅ Container ref: {containerRef.current ? "EXISTS" : "NULL"}</p>
        <p>✅ Container size: {containerSize.width}px x {containerSize.height}px</p>
        <p>✅ Prayers count: {prayers.length}</p>
        <p>✅ Center trigger: {centerTrigger}</p>
        <p>✅ Prayed ID: {prayedId || "null"}</p>
        <p>✅ New prayer ID: {newPrayerId || "null"}</p>
        <p>✅ Fly to: {flyTo ? `${flyTo.lat}, ${flyTo.lng}` : "null"}</p>
        
        <div style={{ marginTop: "20px", padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            If you can see this, the map component is rendering correctly.<br />
            The actual Leaflet map will be implemented next.
          </p>
        </div>

        {/* Test button to trigger onPrayerTap */}
        {prayers.length > 0 && (
          <button
            onClick={() => onPrayerTap(prayers[0])}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#7c8fff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Test: Tap First Prayer
          </button>
        )}
      </div>
    </div>
  );
}