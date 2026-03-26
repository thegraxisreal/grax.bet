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
          <CelebrationSVG />
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
          background: "linear-gradient(90deg, #00e676 0%, #d6ffe9 45%, #00e676 100%)",
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
          As a solo developer, I truly appreciate every single one of you.
          Thank you for being here and helping this community hit such an awesome milestone.
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

// ── Celebration SVG ───────────────────────────────────────────────────────────

function CelebrationSVG() {
  return (
    <svg
      width="180"
      height="130"
      viewBox="0 0 180 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", margin: "0 auto" }}
    >
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#00c853" />
        </linearGradient>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff7eb6" />
          <stop offset="100%" stopColor="#ff4d8d" />
        </linearGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* outer ring */}
      <circle cx="90" cy="64" r="50" fill="rgba(0,230,118,0.12)" stroke="url(#ringGrad)" strokeWidth="2.5" />
      <circle cx="90" cy="64" r="40" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.14)" />

      {/* heart */}
      <path
        d="M90 83C89 82 66 68 66 51C66 42 73 35 82 35C86 35 90 37 90 41C90 37 94 35 98 35C107 35 114 42 114 51C114 68 91 82 90 83Z"
        fill="url(#heartGrad)"
        filter="url(#softGlow)"
      />

      {/* milestone text */}
      <text x="90" y="104" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.9)" fontFamily="'Barlow Condensed', sans-serif" letterSpacing="1.5" fontWeight="700">
        THANK YOU
      </text>

      {/* confetti */}
      <circle cx="42" cy="28" r="3.5" fill="#f0b429">
        <animate attributeName="cy" values="28;24;28" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="135" cy="24" r="3" fill="#00e676">
        <animate attributeName="cy" values="24;20;24" dur="2.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="62" r="2.5" fill="#ff7eb6" />
      <circle cx="149" cy="62" r="2.5" fill="#f0b429" />
      <circle cx="58" cy="104" r="2.5" fill="#00e676" />
      <circle cx="122" cy="103" r="2.5" fill="#ff7eb6" />
    </svg>
  );
}
