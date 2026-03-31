"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SlotsAnnouncementModal() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const key = "grax_golf_coming_soon_seen";
    if (sessionStorage.getItem(key) === "1") return;

    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  function dismiss() {
    sessionStorage.setItem("grax_golf_coming_soon_seen", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0d1e2e 0%, #0a1520 60%, #0f1923 100%)",
          border: "2px solid rgba(34,197,94,0.45)",
          borderRadius: 22,
          padding: "34px 28px 28px",
          maxWidth: 500,
          width: "100%",
          textAlign: "center",
          position: "relative",
          boxShadow: "0 0 28px rgba(34,197,94,0.26)",
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ✕
        </button>

        <div style={{ marginBottom: 18 }}>
          <PixelGolfFlag />
        </div>

        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "2.2rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: 10,
            color: "#86efac",
          }}
        >
          Golf Coming Soon
        </div>

        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          18 Holes · Pixel Art · Big Wins
        </p>

        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: 22,
            maxWidth: 390,
            marginInline: "auto",
          }}
        >
          Our retro mini-golf course is still in the workshop. Expect classic pixel vibes, tricky bank shots, and casino-style payouts across a full 18-hole run.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
          {[
            "Play-money betting",
            "Over/Under par",
            "Arcade shot timing",
          ].map((label) => (
            <div
              key={label}
              style={{
                padding: "6px 11px",
                borderRadius: 999,
                border: "1px solid rgba(52,211,153,0.35)",
                background: "rgba(52,211,153,0.08)",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#a7f3d0",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#062315",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "1.1rem",
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Stay Tuned
        </button>
      </div>
    </div>
  );
}

function PixelGolfFlag() {
  return (
    <svg width="170" height="120" viewBox="0 0 170 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", margin: "0 auto", imageRendering: "pixelated" }}>
      <rect x="22" y="84" width="126" height="20" fill="#14532d" />
      <rect x="40" y="72" width="90" height="12" fill="#166534" />
      <rect x="80" y="22" width="8" height="54" fill="#e5e7eb" />
      <rect x="88" y="26" width="34" height="18" fill="#ef4444" />
      <rect x="92" y="30" width="8" height="4" fill="#fef2f2" />
      <rect x="38" y="78" width="12" height="6" fill="#22c55e" />
      <rect x="120" y="78" width="12" height="6" fill="#22c55e" />
      <rect x="64" y="88" width="42" height="8" fill="#0f172a" />
      <rect x="70" y="90" width="6" height="4" fill="#0b1220" />
      <rect x="94" y="90" width="6" height="4" fill="#0b1220" />
      <rect x="34" y="102" width="102" height="4" fill="#0f3d24" />
    </svg>
  );
}
