"use client";

import Link from "next/link";
import { useLiveEvents } from "@/context/LiveEventsContext";
import { formatCountdown, isGameParticipating } from "@/lib/liveEvents";

function routeForGame(gameName: string): string {
  const normalized = gameName.toLowerCase();
  if (normalized === "plinko") return "/plinko";
  if (normalized === "mines") return "/mines";
  if (normalized === "crash") return "/crash";
  if (normalized === "slots") return "/slots";
  return "/";
}

export default function GameLiveEventBanner({ gameName }: { gameName: "Plinko" | "Mines" | "Crash" | "Slots" }) {
  const { resolvedState, eventCountdown, getPayoutMultiplier } = useLiveEvents();
  const liveEvent = isGameParticipating(resolvedState.currentEvent, gameName) ? resolvedState.currentEvent : null;
  const nextEvent = resolvedState.upcomingEvents.find((event) => isGameParticipating(event, gameName)) ?? null;
  const payoutMultiplier = getPayoutMultiplier(gameName);
  const localNextCountdown = nextEvent ? formatCountdown(nextEvent.startAtMs, resolvedState.nowMs) : null;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(240,180,41,0.16)",
        borderRadius: 8,
        padding: "9px 10px",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ color: "var(--accent-gold)", fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
          {liveEvent ? `${gameName} 2x Live` : `${gameName} 2x`}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
          {liveEvent ? `${eventCountdown} left` : nextEvent ? `${localNextCountdown}` : "off now"}
        </span>
      </div>

      <div
        style={{
          color: liveEvent ? "var(--accent-green)" : "var(--accent-gold)",
          fontSize: "0.88rem",
          lineHeight: 1.35,
          fontWeight: 700,
          background: liveEvent ? "rgba(0,230,118,0.08)" : "rgba(240,180,41,0.1)",
          border: liveEvent ? "1px solid rgba(0,230,118,0.18)" : "1px solid rgba(240,180,41,0.18)",
          borderRadius: 7,
          padding: "7px 8px",
        }}
      >
        {liveEvent
          ? `${gameName} payouts are ${payoutMultiplier}x until ${new Date(liveEvent.endAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
          : nextEvent
            ? `${gameName} goes 2x at ${new Date(nextEvent.startAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
            : `${gameName} goes 2x during the daily rotation.`}
      </div>

      {!liveEvent && nextEvent ? (
        <Link
          href={routeForGame(gameName)}
          style={{
            textDecoration: "none",
            color: "var(--accent-gold)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.76rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          View {gameName}
        </Link>
      ) : null}
    </div>
  );
}
