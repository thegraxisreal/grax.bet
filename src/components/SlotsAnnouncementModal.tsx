"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SlotsAnnouncementModal() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Show every time the home page is loaded/navigated to
  useEffect(() => {
    if (pathname !== "/") return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => { clearTimeout(t); setVisible(false); };
  }, [pathname]);

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeInOverlay 0.4s ease",
      }}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(40px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes reelSpin {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-300%); }
        }
        @keyframes goldPulse {
          0%,100% { box-shadow: 0 0 20px rgba(240,180,41,0.4), 0 0 60px rgba(240,180,41,0.15); }
          50%      { box-shadow: 0 0 40px rgba(240,180,41,0.7), 0 0 100px rgba(240,180,41,0.3); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0) rotate(-12deg); }
          70%  { transform: scale(1.15) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shimmerBtn {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatReel {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .thanks-btn:hover {
          transform: translateY(-2px) scale(1.03) !important;
          box-shadow: 0 8px 40px rgba(0,230,118,0.6), 0 0 80px rgba(0,230,118,0.2) !important;
        }
        .thanks-btn:active {
          transform: translateY(1px) scale(0.98) !important;
        }
      `}</style>

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0d1e2e 0%, #0a1520 60%, #0f1923 100%)",
          border: "2px solid rgba(240,180,41,0.5)",
          borderRadius: 24,
          padding: "40px 36px 36px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          position: "relative",
          animation: "slideUpCard 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards, goldPulse 2.5s ease-in-out 0.5s infinite",
          overflow: "hidden",
        }}
      >
        {/* Background glow orb */}
        <div style={{
          position: "absolute",
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,180,41,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* THANK YOU badge */}
        <div style={{
          position: "absolute",
          top: 18,
          right: 18,
          background: "linear-gradient(135deg, #00c853, #00e676)",
          color: "white",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          padding: "4px 10px",
          borderRadius: 999,
          boxShadow: "0 0 12px rgba(249,115,22,0.7)",
          animation: "badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both",
        }}>
          THANK YOU
        </div>

        {/* Dismiss X */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            fontSize: "1.2rem",
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          ✕
        </button>

        {/* Celebration SVG */}
        <div style={{ animation: "floatReel 3s ease-in-out infinite", marginBottom: 24 }}>
          <SlotMachineSVG />
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: "2.6rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          lineHeight: 1,
          marginBottom: 8,
          background: "linear-gradient(90deg, #f0b429 0%, #fffbe6 45%, #f0b429 100%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "shimmerBtn 3s linear infinite",
        }}>
          Thank You
        </div>

        {/* Subhead */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "1.1rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--text-secondary)",
          marginBottom: 6,
          textTransform: "uppercase",
        }}>
          50 users · 40,000+ bets placed
        </div>

        {/* Description */}
        <p style={{
          fontSize: "0.88rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginBottom: 28,
          maxWidth: 340,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          We appreciate every single one of you. Incredibly grateful for this community and
          excited to keep building with you all.
        </p>

        {/* Milestone pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Community", value: "50 Users", color: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", text: "var(--text-secondary)" },
            { label: "Activity", value: "40,000+", color: "rgba(0,230,118,0.08)", border: "rgba(0,230,118,0.3)", text: "var(--accent-green)" },
            { label: "Milestone", value: "Bets Placed", color: "rgba(240,180,41,0.1)", border: "rgba(240,180,41,0.4)", text: "var(--accent-gold)" },
          ].map((p) => (
            <div key={p.label} style={{
              background: p.color,
              border: `1px solid ${p.border}`,
              borderRadius: 8,
              padding: "5px 12px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.82rem",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}>
              <span style={{ color: "var(--text-muted)" }}>{p.label}</span>
              <span style={{ color: p.text, fontWeight: 800 }}>{p.value}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          className="thanks-btn"
          onClick={dismiss}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #00e676, #00c853)",
            backgroundSize: "200% auto",
            color: "#0a1520",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "1.4rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(0,230,118,0.4), 0 0 60px rgba(0,230,118,0.1)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>🙏</span>
          Thank You
          <span style={{ fontSize: "1.5rem" }}>🎉</span>
        </button>

        {/* Dismiss link */}
        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
            marginTop: 14,
            letterSpacing: "0.06em",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Slot machine SVG ──────────────────────────────────────────────────────────

function SlotMachineSVG() {
  return (
    <svg
      width="160"
      height="120"
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", margin: "0 auto" }}
    >
      <defs>
        <linearGradient id="machineBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a52" />
          <stop offset="100%" stopColor="#0d1e2e" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d4920a" />
          <stop offset="50%" stopColor="#f0b429" />
          <stop offset="100%" stopColor="#d4920a" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#061018" />
          <stop offset="100%" stopColor="#0a1a26" />
        </linearGradient>
        <linearGradient id="btnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#00a854" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="screenClip">
          <rect x="22" y="22" width="116" height="62" rx="6" />
        </clipPath>
      </defs>

      {/* Machine body */}
      <rect x="8" y="8" width="144" height="104" rx="14" fill="url(#machineBody)" stroke="url(#goldGrad)" strokeWidth="2"/>

      {/* Top gold rail */}
      <rect x="8" y="8" width="144" height="10" rx="7" fill="url(#goldGrad)" opacity="0.9"/>

      {/* Screen background */}
      <rect x="22" y="22" width="116" height="62" rx="6" fill="url(#screenGrad)" stroke="rgba(240,180,41,0.4)" strokeWidth="1"/>

      {/* Reel dividers */}
      <line x1="60" y1="22" x2="60" y2="84" stroke="rgba(240,180,41,0.25)" strokeWidth="1"/>
      <line x1="100" y1="22" x2="100" y2="84" stroke="rgba(240,180,41,0.25)" strokeWidth="1"/>

      {/* Symbols — reel 1 */}
      <text x="41" y="60" textAnchor="middle" fontSize="22" clipPath="url(#screenClip)">🔔</text>
      {/* Symbols — reel 2 */}
      <text x="80" y="60" textAnchor="middle" fontSize="22" clipPath="url(#screenClip)">💰</text>
      {/* Symbols — reel 3 */}
      <text x="119" y="60" textAnchor="middle" fontSize="22" clipPath="url(#screenClip)">⭐</text>

      {/* Center payline highlight */}
      <rect x="22" y="46" width="116" height="26" rx="4" fill="rgba(240,180,41,0.07)" stroke="rgba(240,180,41,0.35)" strokeWidth="1"/>

      {/* Screen corner glints */}
      <circle cx="28" cy="28" r="2" fill="rgba(255,255,255,0.15)"/>
      <circle cx="132" cy="28" r="1.5" fill="rgba(255,255,255,0.1)"/>

      {/* Bottom strip with GRAX branding */}
      <rect x="22" y="88" width="116" height="14" rx="4" fill="rgba(240,180,41,0.08)" stroke="rgba(240,180,41,0.2)" strokeWidth="1"/>
      <text x="80" y="99" textAnchor="middle" fontSize="7" fill="rgba(240,180,41,0.7)" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="2">GRAX SLOTS</text>

      {/* Spin lever (right side) */}
      <circle cx="154" cy="36" r="5" fill="url(#goldGrad)" filter="url(#glow)"/>
      <rect x="152" y="36" width="4" height="22" rx="2" fill="url(#goldGrad)"/>
      <circle cx="154" cy="60" r="4" fill="url(#goldGrad)"/>

      {/* Spin button */}
      <rect x="52" y="97" width="56" height="16" rx="8" fill="url(#btnGrad)" filter="url(#glow)"/>
      <text x="80" y="109" textAnchor="middle" fontSize="8" fill="#0a1520" fontFamily="'Barlow Condensed', sans-serif" fontWeight="900" letterSpacing="1.5">SPIN</text>

      {/* Coin slot */}
      <rect x="110" y="100" width="22" height="7" rx="3.5" fill="rgba(0,0,0,0.5)" stroke="rgba(240,180,41,0.4)" strokeWidth="1"/>

      {/* Glow dots on corners */}
      <circle cx="16" cy="16" r="3" fill="rgba(240,180,41,0.3)">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="144" cy="16" r="3" fill="rgba(240,180,41,0.3)">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}
