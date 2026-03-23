"use client";

import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";

function GraxLogo({ height = 28 }: { height?: number }) {
  const w = height * 3.6;
  return (
    <svg width={w} height={height} viewBox="0 0 130 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hdr-g1" x1="0" y1="0" x2="130" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0b429" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f0b429" />
        </linearGradient>
        <linearGradient id="hdr-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* G icon mark */}
      <circle cx="18" cy="18" r="13" fill="rgba(240,180,41,0.1)" stroke="#f0b429" strokeWidth="1.5" />
      <path d="M24 14 Q18 10 13 14 Q9 17 11 22 Q13 27 19 26 L19 21 L23 21" stroke="#f0b429" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* GRAX wordmark */}
      <text x="37" y="25" fontFamily="'Barlow Condensed', Arial Black, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1" fill="url(#hdr-g1)" textDecoration="none">GRAX</text>
      {/* .bet */}
      <text x="94" y="25" fontFamily="'Barlow Condensed', Arial Black, sans-serif" fontWeight="500" fontSize="16" letterSpacing="0.5" fill="rgba(255,255,255,0.45)">.bet</text>
      {/* Live dot */}
      <circle cx="126" cy="9" r="3.5" fill="url(#hdr-dot)">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" fill="#f0b429" opacity="0.15"/>
      <circle cx="11" cy="11" r="10" stroke="#f0b429" strokeWidth="1.5"/>
      <circle cx="11" cy="11" r="7" stroke="#f0b429" strokeWidth="1" opacity="0.6"/>
      <circle cx="11" cy="11" r="4" fill="#f0b429" opacity="0.25"/>
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <line
          key={i}
          x1="11" y1="1.5"
          x2="11" y2="4"
          stroke="#f0b429"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angle} 11 11)`}
        />
      ))}
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { balance } = useBalance();
  const { username } = useUser();

  return (
    <header style={{
      height: "56px",
      background: "var(--bg-sidebar)",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: "16px",
      flexShrink: 0,
      position: "relative",
      zIndex: 10,
    }}>
      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
      >
        <HamburgerIcon />
      </button>

      {/* Site name */}
      <div style={{ flex: 1 }}>
        <GraxLogo height={28} />
      </div>

      {/* Username */}
      {username && (
        <span style={{
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}>
          {username}
        </span>
      )}

      {/* Balance */}
      <div className="balance-display">
        <ChipIcon />
        <span>${balance.toFixed(2)}</span>
      </div>
    </header>
  );
}
