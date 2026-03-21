"use client";

import { useBalance } from "@/context/BalanceContext";

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
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: "1.5rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}>
          <span className="shimmer-text">thegraxisreal</span>
          <span style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            fontWeight: 500,
            marginLeft: "8px",
            letterSpacing: "0.1em",
          }}>
            GAMBLE
          </span>
        </h1>
      </div>

      {/* Balance */}
      <div className="balance-display">
        <ChipIcon />
        <span>${balance.toFixed(2)}</span>
      </div>
    </header>
  );
}
