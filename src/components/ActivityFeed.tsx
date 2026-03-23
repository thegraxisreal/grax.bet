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
};

const MAX_VISIBLE = 5;
const TOAST_MS = 5500;

export default function ActivityFeed() {
  const { username: currentUser } = useUser();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isFirst = useRef(true);
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
      if (isFirst.current) {
        isFirst.current = false;
        return;
      }
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const d = change.doc.data();
          // Skip own events — already shown via local dispatch
          if (d.username === currentUser) return;
          addToast(change.doc.id, {
            username: d.username,
            game: d.game,
            amount: d.amount,
            result: d.result,
          });
        }
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
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.88 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: toast.result === "win"
                ? "linear-gradient(135deg, rgba(0,230,118,0.1), var(--bg-card))"
                : "linear-gradient(135deg, rgba(244,67,54,0.08), var(--bg-card))",
              border: `1px solid ${toast.result === "win" ? "rgba(0,230,118,0.4)" : "rgba(244,67,54,0.3)"}`,
              borderLeft: `4px solid ${toast.result === "win" ? "var(--accent-green)" : "#f44336"}`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1.05rem",
              letterSpacing: "0.02em",
              pointerEvents: "auto",
              boxShadow: toast.result === "win"
                ? "0 4px 24px rgba(0,230,118,0.18), 0 2px 8px rgba(0,0,0,0.4)"
                : "0 4px 24px rgba(244,67,54,0.12), 0 2px 8px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={() => dismiss(toast.id)}
          >
            <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>
              {GAME_ICONS[toast.game] ?? "🎰"}
            </span>
            <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "1.1rem" }}>
                {toast.username}
              </span>
              {" "}
              <span style={{ color: toast.result === "win" ? "var(--accent-green)" : "#f44336", fontWeight: 700 }}>
                {toast.result === "win" ? "won" : "lost"}
              </span>
              {" "}
              <span style={{ color: toast.result === "win" ? "var(--accent-gold)" : "#ff6b6b", fontWeight: 800, fontSize: "1.1rem" }}>
                ${toast.amount.toLocaleString()}
              </span>
              {" on "}
              <span style={{ color: "var(--text-primary)" }}>{toast.game}</span>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
