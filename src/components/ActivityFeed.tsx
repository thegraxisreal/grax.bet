"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { getDb } from "@/lib/firebase";
import { useUser } from "@/context/UserContext";
import type { FeedPayload } from "@/lib/feed";

interface Toast extends FeedPayload {
  id: string;
}

const GAME_ICONS: Record<string, string> = {
  Blackjack: "🃏",
  Crash:     "🚀",
  Roulette:  "🎡",
  Mines:     "💣",
  Plinko:    "🔵",
  Chicken:   "🐔",
  "Bomb Defuse": "🧨",
};

const MAX_VISIBLE = 5;
const TOAST_MS = 5500;

function getToastColors(result: Toast["result"]) {
  if (result === "win") {
    return {
      bg: "linear-gradient(135deg, rgba(0,230,118,0.1), var(--bg-card))",
      border: "rgba(0,230,118,0.4)",
      left: "var(--accent-green)",
      shadow: "0 4px 24px rgba(0,230,118,0.18), 0 2px 8px rgba(0,0,0,0.4)",
      verb: "won",
      verbColor: "var(--accent-green)",
      amountColor: "var(--accent-gold)",
    };
  }
  if (result === "hold") {
    return {
      bg: "linear-gradient(135deg, rgba(240,180,41,0.14), var(--bg-card))",
      border: "rgba(240,180,41,0.45)",
      left: "var(--accent-gold)",
      shadow: "0 4px 24px rgba(240,180,41,0.18), 0 2px 8px rgba(0,0,0,0.4)",
      verb: "was held",
      verbColor: "var(--accent-gold)",
      amountColor: "var(--accent-gold)",
    };
  }
  return {
    bg: "linear-gradient(135deg, rgba(244,67,54,0.08), var(--bg-card))",
    border: "rgba(244,67,54,0.3)",
    left: "#f44336",
    shadow: "0 4px 24px rgba(244,67,54,0.12), 0 2px 8px rgba(0,0,0,0.4)",
    verb: "lost",
    verbColor: "#f44336",
    amountColor: "#ff6b6b",
  };
}

function formatFeedAmount(value: number): string {
  const abs = Math.abs(value);
  const short = (n: number, suffix: string) => {
    const v = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, "");
    return `${v}${suffix}`;
  };

  if (abs >= 1e15) return abs.toExponential(2).replace("e+", "e+");
  if (abs >= 1e12) return short(abs / 1e12, "T");
  if (abs >= 1e9) return short(abs / 1e9, "B");
  if (abs >= 1e6) return short(abs / 1e6, "M");
  return abs.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ActivityFeed() {
  const { username: currentUser } = useUser();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  };

  const addToast = (id: string, data: FeedPayload) => {
    setToasts(prev => [{ id, ...data }, ...prev].slice(0, MAX_VISIBLE));
    const timer = setTimeout(() => dismiss(id), TOAST_MS);
    timers.current.set(id, timer);
  };

  // Local events — your own wins/losses, shown instantly with no Firestore lag
  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<FeedPayload>).detail;
      addToast(`local-${Date.now()}-${Math.random()}`, payload);
    };
    window.addEventListener("grax-feed", handler);
    return () => window.removeEventListener("grax-feed", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Firestore — other players' events only (skip own to avoid duplicates)
  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "feed"), orderBy("timestamp", "desc"), limit(50));

    const unsub = onSnapshot(q, snapshot => {
      if (!initialized.current) {
        // First snapshot (may fire twice: once from cache, once from server).
        // Stamp all existing doc IDs as pre-existing so we never show them.
        snapshot.docs.forEach(doc => seenIds.current.add(doc.id));
        initialized.current = true;
        return;
      }
      // Subsequent snapshots — only truly new docs appear in docChanges
      snapshot.docChanges().forEach(change => {
        if (change.type !== "added") return;
        const id = change.doc.id;
        if (seenIds.current.has(id)) return; // from cache batch, skip
        seenIds.current.add(id);
        const d = change.doc.data();
        if (d.username === currentUser) return; // own — shown via local event
        addToast(id, {
          username: d.username,
          game: d.game,
          amount: d.amount,
          result: d.result,
          note: d.note,
        });
      });
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 1100,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      pointerEvents: "none",
      maxWidth: 360,
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          (() => {
            const colors = getToastColors(toast.result);
            const hasAmount = typeof toast.amount === "number" && toast.amount > 0;
            return (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.88 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${colors.left}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1rem",
              letterSpacing: "0.02em",
              pointerEvents: "auto",
              boxShadow: colors.shadow,
              cursor: "pointer",
            }}
            onClick={() => dismiss(toast.id)}
          >
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>
              {GAME_ICONS[toast.game] ?? "🎰"}
            </span>
            <div style={{ color: "var(--text-secondary)", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", lineHeight: 1.1 }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "1.05rem", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {toast.username}
                </span>
                <span style={{ color: colors.verbColor, fontWeight: 700 }}>
                  {colors.verb}
                </span>
                {hasAmount && (
                  <span style={{ color: colors.amountColor, fontWeight: 800, fontSize: "1.05rem" }}>
                    ${formatFeedAmount(toast.amount!)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {toast.result === "hold" && toast.note
                  ? toast.note
                  : <>on <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{toast.game}</span></>}
              </div>
            </div>
          </motion.div>
            );
          })()
        ))}
      </AnimatePresence>
    </div>
  );
}
