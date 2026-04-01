"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  formatCountdown,
  getResolvedLiveEventState,
  isGameParticipating,
  type ResolvedLiveEventState,
} from "@/lib/liveEvents";

interface LiveEventCallout {
  id: number;
  message: string;
}

interface SharePromptDetail {
  game: string;
  amount: number;
  title: string;
  body: string;
}

interface LiveEventsContextValue {
  resolvedState: ResolvedLiveEventState;
  eventCountdown: string | null;
  nextCountdown: string | null;
  getPayoutMultiplier: (gameName: string) => number;
  pushResultCallout: (message: string) => void;
  queueSharePrompt: (detail: SharePromptDetail) => void;
}

const LiveEventsContext = createContext<LiveEventsContextValue | null>(null);

function LiveEventToast({ callout }: { callout: LiveEventCallout | null }) {
  const pathname = usePathname();

  if (!callout || pathname !== "/plinko") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 108,
        right: 20,
        zIndex: 1200,
        maxWidth: 320,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(240,180,41,0.18), rgba(0,230,118,0.14))",
          border: "1px solid rgba(240,180,41,0.35)",
          borderLeft: "4px solid var(--accent-gold)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          borderRadius: 12,
          padding: "12px 14px",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ color: "var(--accent-gold)", fontSize: "0.72rem", marginBottom: 4 }}>
          Live Events
        </div>
        <div style={{ fontSize: "0.96rem", fontWeight: 700 }}>{callout.message}</div>
      </div>
    </div>
  );
}

export function LiveEventsProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  const [callout, setCallout] = useState<LiveEventCallout | null>(null);
  const calloutIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resolvedState = useMemo(() => getResolvedLiveEventState(now), [now]);

  const pushResultCallout = useCallback((message: string) => {
    const id = ++calloutIdRef.current;
    setCallout({ id, message });
    window.setTimeout(() => {
      setCallout((current) => (current?.id === id ? null : current));
    }, 3600);
  }, []);

  const queueSharePrompt = useCallback((detail: SharePromptDetail) => {
    window.dispatchEvent(new CustomEvent("grax-live-event-share", { detail }));
  }, []);

  const getPayoutMultiplier = useCallback((gameName: string) => {
    return isGameParticipating(resolvedState.currentEvent, gameName) ? 2 : 1;
  }, [resolvedState.currentEvent]);

  const eventCountdown = resolvedState.currentEvent
    ? formatCountdown(resolvedState.currentEvent.endAtMs, resolvedState.nowMs)
    : null;
  const nextCountdown = resolvedState.nextEvent
    ? formatCountdown(resolvedState.nextEvent.startAtMs, resolvedState.nowMs)
    : null;

  const value = useMemo<LiveEventsContextValue>(() => ({
    resolvedState,
    eventCountdown,
    nextCountdown,
    getPayoutMultiplier,
    pushResultCallout,
    queueSharePrompt,
  }), [
    resolvedState,
    eventCountdown,
    nextCountdown,
    getPayoutMultiplier,
    pushResultCallout,
    queueSharePrompt,
  ]);

  return (
    <LiveEventsContext.Provider value={value}>
      {children}
      <LiveEventToast callout={callout} />
    </LiveEventsContext.Provider>
  );
}

export function useLiveEvents(): LiveEventsContextValue {
  const context = useContext(LiveEventsContext);
  if (!context) {
    throw new Error("useLiveEvents must be used within a LiveEventsProvider");
  }
  return context;
}

export function usePlinkoLiveEvent() {
  const {
    resolvedState,
    eventCountdown,
    getPayoutMultiplier,
    pushResultCallout,
    queueSharePrompt,
  } = useLiveEvents();

  const nextEvent = resolvedState.upcomingEvents.find((event) => isGameParticipating(event, "Plinko")) ?? null;

  return {
    liveEvent: isGameParticipating(resolvedState.currentEvent, "Plinko") ? resolvedState.currentEvent : null,
    nextEvent,
    recentlyEndedEvent: null,
    activeLeaderboard: [],
    recentWinners: [],
    eventCountdown,
    nextCountdown: nextEvent ? formatCountdown(nextEvent.startAtMs, resolvedState.nowMs) : null,
    getPayoutMultiplier,
    pushResultCallout,
    queueSharePrompt,
  };
}
