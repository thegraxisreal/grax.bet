"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: "40px 24px",
      textAlign: "center",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1.1,
          marginBottom: "16px",
        }}>
          <span className="shimmer-text">thegraxisreal</span>
          <br />
          <span style={{ color: "var(--text-secondary)", fontSize: "0.5em" }}>GAMBLE</span>
        </h1>

        <p style={{
          color: "var(--text-secondary)",
          fontSize: "1rem",
          marginBottom: "48px",
          maxWidth: "380px",
          lineHeight: 1.7,
        }}>
          Premium fake money casino. Play with friends, no real stakes,
          all the thrills.
        </p>

        <Link href="/blackjack" style={{ textDecoration: "none" }}>
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ fontSize: "1.2rem", padding: "14px 48px" }}
          >
            Play Blackjack
          </motion.button>
        </Link>

        <div style={{
          marginTop: "64px",
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {[
            { label: "Starting Balance", value: "$50.00" },
            { label: "Table Minimum", value: "$1.00" },
            { label: "Blackjack Pays", value: "3:2" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "16px 24px",
              minWidth: "130px",
            }}>
              <div style={{
                color: "var(--accent-gold)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1.6rem",
                fontWeight: 700,
              }}>
                {stat.value}
              </div>
              <div style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "4px",
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
