"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MusicPlayer from "@/components/MusicPlayer";

interface NavItem {
  label: string;
  href: string;
  locked?: boolean;
  live?: boolean;
  promo?: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      {/* Horizontal seam */}
      <path d="M3 11 Q7 7 11 7 Q15 7 19 11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7"/>
      <path d="M3 11 Q7 15 11 15 Q15 15 19 11" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7"/>
      {/* Vertical seam */}
      <line x1="11" y1="3" x2="11" y2="19" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      {/* Cross seams */}
      <path d="M6 5 Q8 8 6 11 Q8 14 6 17" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4"/>
      <path d="M16 5 Q14 8 16 11 Q14 14 16 17" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4"/>
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

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 4.5h16a1 1 0 011 1v9a1 1 0 01-1 1H7.5L3 19V5.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <line x1="7" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <line x1="7" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* Center podium — 1st place */}
      <rect x="8.5" y="7" width="5" height="12" rx="1" fill="currentColor"/>
      {/* Left podium — 2nd place */}
      <rect x="2" y="11" width="5.5" height="8" rx="1" fill="currentColor" opacity="0.65"/>
      {/* Right podium — 3rd place */}
      <rect x="14.5" y="13" width="5.5" height="6" rx="1" fill="currentColor" opacity="0.45"/>
      {/* Trophy on top of center */}
      <path d="M10 4.5h2v1.8a1 1 0 01-2 0V4.5z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.9"/>
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

function HorseRacingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <ellipse cx="13" cy="13" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="7" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M9 10 L13 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M7 17 L7 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M10 17 L10 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M16 17 L16 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M19 17 L19 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M7 8 Q8 5 11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function BombDefuseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="13" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="11" cy="13" r="3" fill="currentColor" opacity="0.6"/>
      <path d="M11 6.5 L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 5 Q16 3 18 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8"/>
      <circle cx="18" cy="4" r="1.2" fill="currentColor" opacity="0.9"/>
      <line x1="8" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
    </svg>
  );
}

function ChickenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <ellipse cx="11" cy="13" rx="5" ry="4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="11" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M9 7 L7 6 L8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 17 L7 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M14 17 L15 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M11 10.5 L11 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function SpamIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="3" width="18" height="16" rx="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 8.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M7 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="16.5" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="4" y1="4" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="14" y1="4" x2="4" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SidebarLogo() {
  return (
    <svg width="90" height="32" viewBox="0 0 90 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sb-g1" x1="0" y1="0" x2="90" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0b429" />
          <stop offset="55%" stopColor="#fffbe6" />
          <stop offset="100%" stopColor="#f0b429" />
        </linearGradient>
        <linearGradient id="sb-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* G mark */}
      <circle cx="14" cy="16" r="11" fill="rgba(240,180,41,0.1)" stroke="#f0b429" strokeWidth="1.3"/>
      <path d="M19 12 Q14 9 10 12 Q7 15 9 19 Q11 23 16 22 L16 18 L19 18" stroke="#f0b429" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* GRAX */}
      <text x="30" y="22" fontFamily="'Barlow Condensed', Arial Black, sans-serif" fontWeight="900" fontSize="18" letterSpacing="0.5" fill="url(#sb-g1)">GRAX</text>
      {/* .bet */}
      <text x="70" y="22" fontFamily="'Barlow Condensed', Arial Black, sans-serif" fontWeight="500" fontSize="13" fill="rgba(255,255,255,0.4)">.bet</text>
      {/* pulse dot */}
      <circle cx="87" cy="8" r="3" fill="url(#sb-dot)">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",         href: "/",            icon: <HomeIcon /> },
  { label: "Leaderboard",  href: "/leaderboard", icon: <LeaderboardIcon /> },
  { label: "Chat",         href: "/chat",        icon: <ChatIcon /> },
  { label: "Blackjack",    href: "/blackjack",   icon: <BlackjackIcon /> },
  { label: "Slots",     href: "/slots",     icon: <SlotsIcon /> },
  { label: "Roulette",  href: "/roulette",  icon: <RouletteIcon /> },
  { label: "Crash",     href: "/crash",     icon: <CrashIcon /> },
  { label: "March Madness", href: "/sports",    icon: <SportsIcon />, live: true },
  { label: "SPAM!",         href: "/spam",      icon: <SpamIcon />, promo: "15 SEC" },
  { label: "Mines",     href: "/mines",     icon: <MinesIcon /> },
  { label: "Plinko",        href: "/plinko",       icon: <PlinkoIcon /> },
  { label: "Horse Racing",  href: "/horse-racing",  icon: <HorseRacingIcon />, locked: true },
  { label: "Bomb Defuse",   href: "/bomb-defuse",   icon: <BombDefuseIcon />, promo: "2X MONEY" },
  { label: "Chicken",       href: "/chicken",       icon: <ChickenIcon /> },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${isOpen ? " open" : ""}`}>
      {/* Logo area */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{ flex: 1 }}>
          <SidebarLogo />
        </div>

        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <CloseIcon />
        </button>
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
              onClick={onClose}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.live && !isActive && (
                <span className="live-bets-badge" style={{
                  background: "linear-gradient(135deg, #f97316, #ef4444)",
                  borderRadius: "10px",
                  padding: "1px 7px",
                  fontSize: "0.55rem",
                  letterSpacing: "0.08em",
                  color: "white",
                  fontWeight: 700,
                  marginLeft: "auto",
                  boxShadow: "0 0 8px rgba(249,115,22,0.6), 0 0 20px rgba(239,68,68,0.3)",
                  animation: "glow-pulse 2s ease-in-out infinite",
                  textTransform: "uppercase",
                }}>
                  Live Bets
                </span>
              )}
              {item.promo && !isActive && !item.live && (
                <span style={{
                  background: "linear-gradient(135deg, #22c55e, #06b6d4)",
                  borderRadius: "10px",
                  padding: "1px 8px",
                  fontSize: "0.56rem",
                  letterSpacing: "0.1em",
                  color: "#04121d",
                  fontWeight: 800,
                  marginLeft: "auto",
                  boxShadow: "0 0 8px rgba(34,197,94,0.55), 0 0 20px rgba(6,182,212,0.3)",
                  animation: "glow-pulse 1.8s ease-in-out infinite",
                  textTransform: "uppercase",
                }}>
                  {item.promo}
                </span>
              )}
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
