"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { getDb } from "@/lib/firebase";

interface Toast {
  id: string;
  username: string;
  game: string;
  amount: number;
  result: "win" | "loss";
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isFirst = useRef(true);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    timers.current.delete(id);
  };

  const addToast = (id: string, data: Omit<Toast, "id">) => {
    setToasts(prev => [{ id, ...data }, ...prev].slice(0, MAX_VISIBLE));
    const timer = setTimeout(() => dismiss(id), TOAST_MS);
    timers.current.set(id, timer);
  };

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
          addToast(change.doc.id, {
            username: d.username,
            game: d.game,
            amount: d.amount,
            result: d.result,
          });
        }
      });
    });

    return () => {
      unsub();
      timers.current.forEach(t => clearTimeout(t));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      maxWidth: 300,
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 48, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.9 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${toast.result === "win" ? "rgba(0,230,118,0.28)" : "rgba(244,67,54,0.2)"}`,
              borderLeft: `3px solid ${toast.result === "win" ? "var(--accent-green)" : "#f44336"}`,
              borderRadius: 8,
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.88rem",
              letterSpacing: "0.02em",
              pointerEvents: "auto",
              boxShadow: toast.result === "win"
                ? "0 2px 16px rgba(0,230,118,0.1)"
                : "0 2px 16px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={() => dismiss(toast.id)}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>
              {GAME_ICONS[toast.game] ?? "🎰"}
            </span>
            <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {toast.username}
              </span>
              {" "}
              <span style={{ color: toast.result === "win" ? "var(--accent-green)" : "#f44336", fontWeight: 600 }}>
                {toast.result === "win" ? "won" : "lost"}
              </span>
              {" "}
              <span style={{ color: toast.result === "win" ? "var(--accent-gold)" : "var(--text-secondary)", fontWeight: 700 }}>
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
