"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { useLiveEvents } from "@/context/LiveEventsContext";
import { fmtDollar } from "@/lib/format";
import textLogo from "../../images/textlogo.png";

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
          x1="11"
          y1="1.5"
          x2="11"
          y2="4"
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
  const { balance, resetBalance } = useBalance();
  const { username } = useUser();
  const { resolvedState, eventCountdown, nextCountdown } = useLiveEvents();
  const [hovered, setHovered] = useState(false);

  const liveEvent = resolvedState.currentEvent;
  const nextEvents = resolvedState.upcomingEvents;
  const isOffHours = resolvedState.status === "off_hours";

  return (
    <header
      style={{
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      <div
        style={{
          minHeight: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: "16px",
        }}
      >
        <button
          className="mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>

        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 42 }}>
          <Link href="/" aria-label="Go to home" style={{ display: "inline-flex", alignItems: "center" }}>
            <Image
              src={textLogo}
              alt="grax.bet"
              priority
              style={{
                width: "auto",
                height: 60,
                objectFit: "contain",
                filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.5))",
              }}
            />
          </Link>
        </div>

        {username && (
          <span
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            {username}
          </span>
        )}

        <div
          style={{ position: "relative" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="balance-display">
            <ChipIcon />
            <span>{fmtDollar(balance)}</span>
          </div>
          {hovered && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px",
                zIndex: 100,
                minWidth: "140px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <button
                onClick={resetBalance}
                style={{
                  width: "100%",
                  background: "var(--accent-green)",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-green-dark)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent-green)")}
              >
                Reset to $50.00
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "8px 24px 9px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(180deg, rgba(9,20,32,0.7), rgba(9,20,32,0.92))",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {liveEvent ? (
          <>
            <span
              style={{
                background: "linear-gradient(135deg, #f97316, #ef4444)",
                color: "#fff",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Live Now
            </span>
            <div style={{ minWidth: 180, flex: "0 1 auto", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.88rem" }}>
              {liveEvent.title}
            </div>
            <div
              style={{
                color: "var(--accent-gold)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.92rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Ends in {eventCountdown}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", flex: "1 1 320px" }}>
              {nextEvents.slice(0, 2).map((event, index) => (
                <span key={event.id}>
                  {index > 0 ? " • " : ""}
                  Next {index + 1}: {event.targetGames[0]} 2x at {new Date(event.startAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              ))}
            </div>
            <Link
              href={`/${liveEvent.eventKey === "plinko" ? "plinko" : liveEvent.eventKey}`}
              style={{
                textDecoration: "none",
                background: "rgba(0,230,118,0.14)",
                border: "1px solid rgba(0,230,118,0.24)",
                color: "var(--accent-green)",
                borderRadius: 999,
                padding: "8px 12px",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.84rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {liveEvent.ctaText}
            </Link>
          </>
        ) : (
          <>
            <span
              style={{
                background: isOffHours ? "rgba(255,255,255,0.08)" : "rgba(240,180,41,0.16)",
                color: isOffHours ? "var(--text-secondary)" : "var(--accent-gold)",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {isOffHours ? "No Live Event" : "Next Event"}
            </span>
            <div style={{ minWidth: 180, flex: "0 1 auto", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.88rem" }}>
              {nextEvents[0] ? `${nextEvents[0].targetGames[0]} goes 2x next` : "No active event"}
            </div>
            <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.92rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {resolvedState.nowMs < (nextEvents[0]?.startAtMs ?? 0) ? nextCountdown : "Off hours"}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", flex: "1 1 320px" }}>
              {nextEvents.length > 0
                ? nextEvents.map((event, index) => (
                    <span key={event.id}>
                      {index > 0 ? " • " : ""}
                      Next {index + 1}: {event.targetGames[0]} 2x at {new Date(event.startAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  ))
                : "Come back when the next hourly event window opens."}
            </div>
            <Link
              href={`/${nextEvents[0]?.eventKey === "plinko" ? "plinko" : nextEvents[0]?.eventKey ?? "plinko"}`}
              style={{
                textDecoration: "none",
                background: "rgba(240,180,41,0.14)",
                border: "1px solid rgba(240,180,41,0.24)",
                color: "var(--accent-gold)",
                borderRadius: 999,
                padding: "8px 12px",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.84rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {nextEvents[0] ? `View ${nextEvents[0].targetGames[0]}` : "View Event"}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
