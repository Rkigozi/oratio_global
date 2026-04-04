import { useEffect, useRef, useState } from "react";

// Simple test component to verify rendering
export function WorldMapTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    console.log("WorldMapTest: Component mounted");
    setRendered(true);
    
    if (containerRef.current) {
      console.log("WorldMapTest: Container ref exists", containerRef.current);
    }
    
    return () => {
      console.log("WorldMapTest: Component unmounted");
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="world-map-test"
      style={{
        width: "100%",
        height: "400px",
        backgroundColor: "#1a237e",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        border: "2px solid #7c8fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>MAP TEST COMPONENT</h2>
        <p>Component rendered: {rendered ? "YES" : "NO"}</p>
        <p>Container ref: {containerRef.current ? "EXISTS" : "NULL"}</p>
        <p>If you can see this, the component is rendering!</p>
      </div>
    </div>
  );
}