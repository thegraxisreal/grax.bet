"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { sendWinAnnouncement } from "@/lib/chat";
import type { FeedPayload } from "@/lib/feed";

const WINDOW_MS = 5000;

const GAME_ICONS: Record<string, string> = {
  Blackjack: "🃏",
  Crash: "🚀",
  Roulette: "🎡",
  Mines: "💣",
  Plinko: "🔵",
};

export default function WinShareButton() {
  const { username } = useUser();
  const [pending, setPending] = useState<FeedPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sent, setSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPending(null);
    setTimeLeft(0);
    setSent(false);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<FeedPayload>).detail;
      if (payload.result !== "win") return;

      // Reset if there's already one showing
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setSent(false);
      setPending(payload);
      setTimeLeft(WINDOW_MS / 1000);

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        setPending(null);
        setSent(false);
      }, WINDOW_MS);
    };

    window.addEventListener("grax-feed", handler);
    return () => {
      window.removeEventListener("grax-feed", handler);
      clear();
    };
  }, [clear]);

  const handleShare = useCallback(async () => {
    if (!pending || !username || sent || typeof pending.amount !== "number") return;
    setSent(true);
    try {
      await sendWinAnnouncement(username, pending.game, pending.amount);
    } catch {
      setSent(false);
      return;
    }
    // Fade out after brief "Shared!" state
    setTimeout(clear, 1200);
  }, [clear, pending, sent, username]);

  if (!pending || !username) return null;
  if (typeof pending.amount !== "number") return null;

  const icon = GAME_ICONS[pending.game] ?? "🎰";
  const amountStr = `$${pending.amount % 1 === 0 ? pending.amount : pending.amount.toFixed(2)}`;

  return (
    <button
      onClick={() => void handleShare()}
      disabled={sent}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 22px",
        borderRadius: 999,
        border: "2px solid rgba(240,180,41,0.7)",
        background: sent
          ? "rgba(0,230,118,0.2)"
          : "linear-gradient(135deg, rgba(240,180,41,0.22), rgba(240,180,41,0.08))",
        color: sent ? "var(--accent-green)" : "var(--accent-gold)",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: "1.05rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: sent ? "default" : "pointer",
        boxShadow: "0 4px 30px rgba(240,180,41,0.35), 0 0 0 1px rgba(240,180,41,0.15)",
        whiteSpace: "nowrap",
        animation: sent ? "none" : "win-share-pulse 1.4s ease-in-out infinite",
      }}
    >
      <span style={{ fontSize: "1.3rem" }}>{sent ? "✓" : icon}</span>
      {sent
        ? "Shared to chat!"
        : `Share win to chat — ${amountStr} on ${pending.game} (${timeLeft}s)`}
    </button>
  );
}
