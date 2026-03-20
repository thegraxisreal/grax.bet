"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MusicPlayer from "@/components/MusicPlayer";

interface NavItem {
  label: string;
  href: string;
  locked?: boolean;
  icon: React.ReactNode;
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 10.5L11 3L19 10.5V19.5H14.5V14H7.5V19.5H3V10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function BlackjackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="1" width="8" height="11" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="12" y="10" width="8" height="11" rx="1.5" fill="currentColor" opacity="0.6"/>
      <text x="6" y="9" textAnchor="middle" fontSize="7" fill="#0f1923" fontWeight="bold" fontFamily="monospace">A</text>
      <text x="16" y="18" textAnchor="middle" fontSize="6" fill="#0f1923" fontWeight="bold" fontFamily="monospace">K</text>
    </svg>
  );
}

function SlotsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="3" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="4" y="6" width="4" height="10" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="6" width="4" height="10" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="14" y="6" width="4" height="10" rx="1" fill="currentColor" opacity="0.6"/>
      <circle cx="6" cy="11" r="1.5" fill="#0f1923"/>
      <circle cx="11" cy="11" r="1.5" fill="#0f1923"/>
      <circle cx="16" cy="11" r="1.5" fill="#0f1923"/>
    </svg>
  );
}

function RouletteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
      <circle cx="11" cy="11" r="2" fill="currentColor"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="11" y1="3"
          x2="11" y2="5.5"
          stroke="currentColor"
          strokeWidth="1.2"
          transform={`rotate(${angle} 11 11)`}
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

function CrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polyline points="3,18 8,12 12,9 17,4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="4" r="2.5" fill="currentColor"/>
      <line x1="3" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  );
}

function SportsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <ellipse cx="11" cy="12" rx="7" ry="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="11" cy="12" rx="3.5" ry="2.5" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.4"/>
      <path d="M4 12 Q7 6 11 5 Q15 6 18 12" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6"/>
    </svg>
  );
}

function MinesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="6" fill="currentColor" opacity="0.8"/>
      <circle cx="11" cy="11" r="3" fill="#0f1923"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="11" y1="3"
          x2="11" y2="1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 11 11)`}
        />
      ))}
    </svg>
  );
}

function PlinkoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="2.5" r="1.8" fill="currentColor"/>
      {[4, 7, 10, 13].map((y, row) =>
        Array.from({ length: row + 1 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={11 - row * 1.8 + col * 3.6}
            cy={y + 3}
            r="1"
            fill="currentColor"
            opacity="0.6"
          />
        ))
      )}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.7">
      <rect x="2" y="5.5" width="8" height="5.5" rx="1.5"/>
      <path d="M3.5 5.5V4a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",      href: "/",          icon: <HomeIcon /> },
  { label: "Blackjack", href: "/blackjack", icon: <BlackjackIcon /> },
  { label: "Slots",     href: "/slots",     icon: <SlotsIcon />,   locked: true },
  { label: "Roulette",  href: "/roulette",  icon: <RouletteIcon /> },
  { label: "Crash",     href: "/crash",     icon: <CrashIcon /> },
  { label: "Sports",    href: "/sports",    icon: <SportsIcon />,  locked: true },
  { label: "Mines",     href: "/mines",     icon: <MinesIcon /> },
  { label: "Plinko",    href: "/plinko",    icon: <PlinkoIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo area */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid var(--border-color)",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: "1.1rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1.2,
        }}>
          <span style={{ color: "var(--accent-gold)" }}>thegraxisreal</span>
          <br />
          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 500 }}>gamble</span>
        </div>
      </div>

      {/* Section label */}
      <div style={{
        padding: "12px 16px 4px",
        fontSize: "0.65rem",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}>
        Casino Games
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          return item.locked ? (
            <div
              key={item.label}
              className={`sidebar-item locked`}
            >
              <span style={{ opacity: 0.7 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "0.6rem",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}>
                <LockIcon /> SOON
              </span>
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {isActive && (
                <span style={{
                  background: "var(--accent-green)",
                  borderRadius: "10px",
                  padding: "1px 7px",
                  fontSize: "0.6rem",
                  letterSpacing: "0.08em",
                  color: "#0f1923",
                  fontWeight: 700,
                  marginLeft: "auto",
                }}>
                  LIVE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Music player */}
      <MusicPlayer />

      {/* Footer */}
      <div style={{
        padding: "8px 14px",
        fontSize: "0.62rem",
        color: "var(--text-muted)",
        letterSpacing: "0.05em",
      }}>
        Play responsibly. Fake money only.
      </div>
    </aside>
  );
}
