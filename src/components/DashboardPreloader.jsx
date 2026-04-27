import { useState, useEffect } from "react";

const PRELOADER_VIDEO =
  "https://cdn.dribbble.com/userupload/11001831/file/large-cc6e7b6fc27b543399281ca41108ca3f.mp4";

const DISPLAY_MS = 3200;
const FADE_MS = 600;

export default function DashboardPreloader({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, FADE_MS);
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(5, 5, 10, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: fading ? "none" : "all",
      }}
    >
      {/* Contained card — not full screen */}
      <div
        style={{
          width: "260px",
          height: "260px",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow:
            "0 0 60px rgba(99,102,241,0.25), 0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <video
          src={PRELOADER_VIDEO}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
