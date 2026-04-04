import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, Check } from "lucide-react";

export function Logo() {
  const logoRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!logoRef.current) return;
    try {
      const canvas = await html2canvas(logoRef.current, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "oratio-logo.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-8 px-4 py-12"
      style={{ background: "#060E1F" }}
    >
      <div className="text-center mb-2">
        <h1
          className="font-heading tracking-[0.15em] uppercase mb-2"
          style={{ fontSize: "1.4rem", fontWeight: 300, color: "#e8eaf6" }}
        >
          Brand Wordmark
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#6b7499" }}>
          Exported at 4&times; resolution (2160&times;2160px)
        </p>
      </div>

      {/* The logo canvas */}
      <div
        ref={logoRef}
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: 540,
          height: 540,
          background: "#0e1a32",
        }}
      >
        {/* Subtle ambient glow behind text */}
        <div
          className="absolute rounded-full"
          style={{
            width: 360,
            height: 200,
            background:
              "radial-gradient(ellipse, rgba(100,120,200,0.07) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* O. wordmark — the dot is a mini cross */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <h1
            className="font-heading"
            style={{
              fontSize: "7rem",
              fontWeight: 300,
              color: "#d8ddef",
              letterSpacing: "0.15em",
              lineHeight: 1,
              margin: 0,
              padding: 0,
              display: "inline-block",
            }}
          >
            O
          </h1>
          {/* Mini cross in place of the period - positioned where a period would be */}
          <svg
            width="16"
            height="22"
            viewBox="0 0 16 22"
            fill="none"
            style={{
              position: "absolute",
              bottom: 0,
              left: "100%",
              marginLeft: "2px",
              filter: "drop-shadow(0 0 6px rgba(180,195,240,0.5))",
            }}
          >
            <rect x="5.5" y="0" width="5" height="22" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
            <rect x="0" y="5" width="16" height="5" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
          </svg>
        </div>
      </div>

      {/* Profile pic previews */}
      <div className="flex items-center gap-4">
        <div
          className="overflow-hidden rounded-full flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            background: "#0e1a32",
            border: "1px solid rgba(100,120,175,0.15)",
          }}
        >
          <div className="flex items-end gap-[1px]">
            <span
              className="font-heading"
              style={{
                fontSize: "1.1rem",
                fontWeight: 300,
                color: "#d8ddef",
                letterSpacing: "0.1em",
                lineHeight: 1,
              }}
            >
              O
            </span>
            <svg width="4" height="6" viewBox="0 0 16 22" fill="none" style={{ marginBottom: "2px" }}>
              <rect x="5.5" y="0" width="5" height="22" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
              <rect x="0" y="5" width="16" height="5" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
            </svg>
          </div>
        </div>
        <div
          className="overflow-hidden rounded-full flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            background: "#0e1a32",
            border: "1px solid rgba(100,120,175,0.15)",
          }}
        >
          <div className="flex items-end gap-[0.5px]">
            <span
              className="font-heading"
              style={{
                fontSize: "0.7rem",
                fontWeight: 300,
                color: "#d8ddef",
                letterSpacing: "0.1em",
                lineHeight: 1,
              }}
            >
              O
            </span>
            <svg width="2.5" height="4" viewBox="0 0 16 22" fill="none" style={{ marginBottom: "1px" }}>
              <rect x="5.5" y="0" width="5" height="22" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
              <rect x="0" y="5" width="16" height="5" rx="2.5" fill="#b0bce0" fillOpacity="0.85" />
            </svg>
          </div>
        </div>
        <p style={{ fontSize: "0.65rem", color: "#3e4460" }}>
          ← profile pic preview
        </p>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-8 py-3 rounded-full cursor-pointer transition-all duration-200"
        style={{
          background: downloaded
            ? "rgba(110,231,183,0.15)"
            : "linear-gradient(135deg, #7c8fff, #5a6fd6)",
          color: downloaded ? "#6ee7b7" : "#fff",
          fontSize: "0.9rem",
          border: downloaded ? "1px solid rgba(110,231,183,0.3)" : "none",
          boxShadow: downloaded
            ? "none"
            : "0 4px 25px rgba(124,143,255,0.25)",
        }}
      >
        {downloaded ? <Check size={16} /> : <Download size={16} />}
        {downloaded ? "Saved!" : "Download Logo (High-Res)"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "#3e4460", marginTop: -4 }}>
        540 &times; 540 on screen &rarr; 2160 &times; 2160 exported
      </p>
    </div>
  );
}