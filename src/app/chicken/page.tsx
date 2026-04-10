"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const MODES = [
  {
    title: "Classic",
    href: "/chicken/classic",
    accent: "#f59e0b",
    description: "The original run. Keep climbing, dodge traffic, and cash out before one hit wipes the round.",
    bullets: ["Infinite run", "Every 5th lane is safe", "Pure reflex mode"],
  },
  {
    title: "Lanes",
    href: "/chicken/lanes",
    accent: "#22c55e",
    description: "Pick one coop on every lane. Two routes are safe, one is a trap, and each correct read pushes the multiplier up.",
    bullets: ["3 choices per lane", "Cash out anytime", "Perfect clear bonus"],
  },
] as const;

export default function ChickenModePage() {
  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div style={eyebrowStyle}>Chicken</div>
        <h1 style={titleStyle}>Choose your mode</h1>
        <p style={subheadStyle}>
          Keep the main Chicken slot, but split it into a classic reflex run and a tighter, risk-based lanes mode.
        </p>
      </div>

      <div style={gridStyle}>
        {MODES.map((mode, index) => (
          <motion.div
            key={mode.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index, duration: 0.38 }}
            style={{
              ...cardStyle,
              borderColor: `${mode.accent}44`,
              boxShadow: `0 24px 60px ${mode.accent}18`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ ...modeLabelStyle, color: mode.accent }}>{mode.title}</div>
                <div style={modeTextStyle}>{mode.description}</div>
              </div>
              <div style={{ ...accentOrbStyle, background: `radial-gradient(circle, ${mode.accent}, transparent 72%)` }} />
            </div>

            <div style={bulletWrapStyle}>
              {mode.bullets.map((bullet) => (
                <div key={bullet} style={bulletStyle}>
                  {bullet}
                </div>
              ))}
            </div>

            <Link href={mode.href} style={{ textDecoration: "none" }}>
              <motion.button className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: "100%" }}>
                PLAY {mode.title.toUpperCase()}
              </motion.button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  padding: "24px 16px 36px",
  background: "radial-gradient(circle at top, rgba(245,158,11,0.12), transparent 28%), linear-gradient(180deg, #0b1220 0%, #0f172a 100%)",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const heroStyle: React.CSSProperties = {
  maxWidth: 760,
  padding: "6px 4px",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "#fbbf24",
  fontSize: "0.72rem",
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "clamp(2rem, 5vw, 3.8rem)",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const subheadStyle: React.CSSProperties = {
  margin: "10px 0 0",
  maxWidth: 680,
  color: "var(--text-secondary)",
  fontSize: "1rem",
  lineHeight: 1.55,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.84))",
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const modeLabelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontWeight: 800,
  marginBottom: 8,
};

const modeTextStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  maxWidth: 360,
};

const accentOrbStyle: React.CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: "50%",
  filter: "blur(4px)",
  flexShrink: 0,
  opacity: 0.9,
};

const bulletWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const bulletStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "6px 10px",
  fontFamily: "'Barlow Condensed', sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  fontSize: "0.72rem",
  color: "var(--text-secondary)",
};
