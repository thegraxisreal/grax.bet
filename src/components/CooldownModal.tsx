"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function CooldownModal() {
  const { isCoolingDown, cooldownRemainingMs } = useBalance();

  return (
    <AnimatePresence>
      {isCoolingDown && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-card"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🛑</div>

            <h2
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "2.3rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: "var(--accent-gold)",
                marginBottom: "12px",
              }}
            >
              COOLING DOWN
            </h2>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                marginBottom: "14px",
                lineHeight: 1.6,
              }}
            >
              You hit the house win-rate cap. Betting is paused briefly.
            </p>

            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "2rem",
                color: "var(--accent-green)",
                letterSpacing: "0.08em",
                marginBottom: "8px",
                fontWeight: 800,
              }}
            >
              {formatRemaining(cooldownRemainingMs)}
            </div>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              You can play again when the timer reaches 0:00.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
