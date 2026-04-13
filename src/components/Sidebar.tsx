"use client";

import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MusicPlayer from "@/components/MusicPlayer";
import bombLogo from "../../images/bomb.png";
import chickenLogo from "../../images/chicken.png";
import crashLogo from "../../images/crash.png";
import chatLogo from "../../images/chat.png";
import golfLogo from "../../images/golf.png";
import homeLogo from "../../images/home.png";
import iconLogo from "../../images/icon.png";
import inventoryLogo from "../../images/inventory.png";
import leaderboardLogo from "../../images/leaderboard.png";
import minesLogo from "../../images/mines.png";
import plinkoLogo from "../../images/plinko.png";
import rouletteLogo from "../../images/roulette.png";
import shopLogo from "../../images/shop.png";
import slotsLogo from "../../images/slots.png";
import spamLogo from "../../images/spam.png";

interface NavItem {
  label: string;
  href: string;
  locked?: boolean;
  live?: boolean;
  promo?: string;
  iconColor?: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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

function SidebarLogoIcon({
  src,
  alt,
  blendMode = "normal",
  opaqueBackground = false,
}: {
  src: StaticImageData;
  alt: string;
  blendMode?: "normal" | "multiply";
  opaqueBackground?: boolean;
}) {
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: opaqueBackground ? "transparent" : "rgba(255,255,255,0.05)",
        border: opaqueBackground ? "none" : "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={30}
        height={30}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          mixBlendMode: blendMode,
          filter: opaqueBackground ? "contrast(1.14) saturate(0.96) brightness(0.94)" : "none",
          opacity: opaqueBackground ? 0.96 : 1,
        }}
      />
    </span>
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
    <Image
      src={iconLogo}
      alt="grax.bet"
      priority
      style={{
        width: "auto",
        height: 48,
        objectFit: "contain",
        filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
      }}
    />
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",         href: "/",            icon: <SidebarLogoIcon src={homeLogo} alt="Home logo" opaqueBackground />, iconColor: "#60a5fa" },
  { label: "Leaderboard",  href: "/leaderboard", icon: <SidebarLogoIcon src={leaderboardLogo} alt="Leaderboard logo" opaqueBackground />, iconColor: "#fbbf24" },
  { label: "Shop",         href: "/shop",        icon: <SidebarLogoIcon src={shopLogo} alt="Shop logo" opaqueBackground />, locked: true, iconColor: "#f472b6" },
  { label: "Inventory",    href: "/inventory",   icon: <SidebarLogoIcon src={inventoryLogo} alt="Inventory logo" opaqueBackground />, locked: true, iconColor: "#38bdf8" },
  { label: "Chat",         href: "/chat",        icon: <SidebarLogoIcon src={chatLogo} alt="Chat logo" opaqueBackground />, iconColor: "#34d399" },
  { label: "Blackjack",    href: "/blackjack",   icon: <BlackjackIcon />, iconColor: "#f59e0b" },
  { label: "Slots",     href: "/slots",     icon: <SidebarLogoIcon src={slotsLogo} alt="Slots logo" blendMode="multiply" opaqueBackground />, iconColor: "#22d3ee" },
  { label: "Roulette",  href: "/roulette",  icon: <SidebarLogoIcon src={rouletteLogo} alt="Roulette logo" blendMode="multiply" opaqueBackground />, iconColor: "#f87171" },
  { label: "Crash",     href: "/crash",     icon: <SidebarLogoIcon src={crashLogo} alt="Crash logo" blendMode="multiply" opaqueBackground />, iconColor: "#fb923c" },
  { label: "SPAM!",         href: "/spam",      icon: <SidebarLogoIcon src={spamLogo} alt="Spam logo" blendMode="multiply" opaqueBackground />, promo: "15 SEC", iconColor: "#2dd4bf" },
  { label: "Mines",     href: "/mines",     icon: <SidebarLogoIcon src={minesLogo} alt="Mines logo" blendMode="multiply" opaqueBackground />, iconColor: "#a78bfa" },
  { label: "Golf",      href: "/golf",      icon: <SidebarLogoIcon src={golfLogo} alt="Golf logo" blendMode="multiply" opaqueBackground />, iconColor: "#4ade80" },
  { label: "Plinko",        href: "/plinko",       icon: <SidebarLogoIcon src={plinkoLogo} alt="Plinko logo" blendMode="multiply" opaqueBackground />, iconColor: "#818cf8" },
  { label: "Horse Racing",  href: "/horse-racing",  icon: <HorseRacingIcon />, locked: true, iconColor: "#facc15" },
  { label: "Bomb Defuse",   href: "/bomb-defuse",   icon: <SidebarLogoIcon src={bombLogo} alt="Bomb Defuse logo" blendMode="multiply" opaqueBackground />, promo: "2X MONEY", iconColor: "#fb7185" },
  { label: "Chicken",       href: "/chicken",       icon: <SidebarLogoIcon src={chickenLogo} alt="Chicken logo" blendMode="multiply" opaqueBackground />, iconColor: "#f97316" },
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
          const isActive = item.href === "/" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return item.locked ? (
            <div
              key={item.label}
              className={`sidebar-item locked`}
            >
              <span style={{ opacity: 0.85, color: item.iconColor ?? "#9ca3af" }}>{item.icon}</span>
              <span style={{ flex: 1, color: item.iconColor ?? "var(--text-muted)" }}>{item.label}</span>
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
              <span style={{ color: item.iconColor ?? "#9ca3af" }}>{item.icon}</span>
              <span style={{ color: isActive ? "var(--text-primary)" : item.iconColor ?? "var(--text-secondary)" }}>{item.label}</span>
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
