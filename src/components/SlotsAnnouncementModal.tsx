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
    return () => {
      clearTimeout(t);
      setVisible(false);
    };
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
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes goldPulse {
          0%,100% { box-shadow: 0 0 20px rgba(240,180,41,0.3), 0 0 60px rgba(240,180,41,0.12); }
          50% { box-shadow: 0 0 36px rgba(240,180,41,0.6), 0 0 100px rgba(240,180,41,0.24); }
        }
        @keyframes badgePop {
          0% { transform: scale(0) rotate(-12deg); }
          70% { transform: scale(1.15) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatFlag {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .announcement-card::-webkit-scrollbar {
          width: 8px;
        }
        .announcement-card::-webkit-scrollbar-thumb {
          background: rgba(240,180,41,0.35);
          border-radius: 999px;
        }
      `}</style>

      <div
        className="announcement-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #0d1e2e 0%, #0a1520 60%, #0f1923 100%)",
          border: "2px solid rgba(240,180,41,0.45)",
          borderRadius: 24,
          padding: "clamp(20px, 3.5vw, 36px) clamp(18px, 3vw, 34px) clamp(16px, 2.4vw, 28px)",
          maxWidth: "min(680px, 94vw)",
          width: "100%",
          maxHeight: "84vh",
          overflowY: "auto",
          textAlign: "center",
          position: "relative",
          animation: "slideUpCard 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards, goldPulse 2.5s ease-in-out 0.5s infinite",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,180,41,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "linear-gradient(135deg, #f0b429, #ffd166)",
            color: "#0a1520",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            padding: "4px 10px",
            borderRadius: 999,
            boxShadow: "0 0 14px rgba(240,180,41,0.5)",
            animation: "badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both",
          }}
        >
          COMING SOON
        </div>

        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: "clamp(0.95rem, 2.2vw, 1.2rem)",
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        >
          ✕
        </button>

        <div style={{ animation: "floatFlag 3s ease-in-out infinite", marginBottom: 24 }}>
          <GolfComingSoonIcon />
        </div>

        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.65rem, 4.2vw, 2.3rem)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            lineHeight: 1.05,
            marginBottom: 10,
            background: "linear-gradient(90deg, #f0b429 0%, #fff4d0 45%, #f0b429 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmerText 3s linear infinite",
          }}
        >
          Golf coming soon!
        </div>

        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(0.95rem, 2.2vw, 1.2rem)",
            fontWeight: 700,
            letterSpacing: "0.07em",
            color: "var(--text-secondary)",
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          18 holes · Pixel art · Big wins
        </div>

        <p
          style={{
            fontSize: "clamp(0.84rem, 1.8vw, 0.93rem)",
            color: "var(--text-muted)",
            lineHeight: 1.65,
            marginBottom: 24,
            maxWidth: 380,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          We&apos;re building a brand-new golf mode where every swing can turn into a jackpot run.
          It&apos;s not out yet, but the fairways are almost ready.
        </p>

        <div
          style={{
            background: "rgba(240,180,41,0.09)",
            border: "1px solid rgba(240,180,41,0.35)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "var(--accent-gold)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.9rem",
            marginBottom: 14,
          }}
        >
          New game mode in development
        </div>

        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
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

function GolfComingSoonIcon() {
  return (
    <svg
      width="180"
      height="130"
      viewBox="0 0 180 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", margin: "0 auto", width: "min(46vw, 180px)", height: "auto" }}
      aria-hidden="true"
    >
      <rect x="38" y="92" width="104" height="18" rx="4" fill="rgba(34,197,94,0.3)" stroke="rgba(34,197,94,0.8)" />
      <rect x="85" y="30" width="6" height="62" rx="2" fill="#d6dde8" />
      <path d="M91 34L132 46L91 58V34Z" fill="#f0b429" stroke="#ffd166" strokeWidth="2" />
      <rect x="54" y="86" width="72" height="6" rx="3" fill="rgba(240,180,41,0.35)" />
      <circle cx="74" cy="89" r="5" fill="#ffffff" stroke="#d1d5db" strokeWidth="1.5" />
      <path d="M72.8 86.8L75.2 89.2M75.2 86.8L72.8 89.2" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" />
      <circle cx="49" cy="42" r="3" fill="#f0b429" />
      <circle cx="142" cy="67" r="3" fill="#34d399" />
      <circle cx="133" cy="24" r="2.5" fill="#f87171" />
      <text
        x="90"
        y="122"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.9)"
        fontFamily="'Barlow Condensed', sans-serif"
        letterSpacing="1.3"
        fontWeight="700"
      >
        PIXEL GOLF TEASER
      </text>
    </svg>
  );
}
