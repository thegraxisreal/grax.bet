"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";

export default function BrokeModal() {
  const { isBroke, resetBalance } = useBalance();

  return (
    <AnimatePresence>
      {isBroke && (
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
            {/* Big emoji / icon */}
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>💸</div>

            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "2.5rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: "var(--lose-color)",
              marginBottom: "12px",
            }}>
              YOU&apos;RE BROKE
            </h2>

            <p style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              marginBottom: "8px",
              lineHeight: 1.6,
            }}>
              You&apos;ve lost all your chips. The house always wins... eventually.
            </p>

            <p style={{
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              marginBottom: "32px",
            }}>
              No worries — it&apos;s all fake money anyway.
            </p>

            <button
              className="btn-primary"
              onClick={resetBalance}
              style={{ width: "100%", fontSize: "1.1rem", padding: "14px" }}
            >
              Reset to $50.00
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
