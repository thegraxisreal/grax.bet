"use client";

import { motion } from "framer-motion";
import type { Card } from "@/lib/blackjack";

interface PlayingCardProps {
  card: Card;
  index?: number;
  faceDown?: boolean;
}

// Suit symbols and colors
const SUIT_SYMBOL: Record<string, string> = {
  c: "♣", d: "♦", h: "♥", s: "♠"
};
const SUIT_COLOR: Record<string, string> = {
  c: "#1a1a1a", d: "#c62828", h: "#c62828", s: "#1a1a1a"
};
const RANK_DISPLAY: Record<string, string> = {
  "T": "10", "J": "J", "Q": "Q", "K": "K", "A": "A",
  "2": "2", "3": "3", "4": "4", "5": "5",
  "6": "6", "7": "7", "8": "8", "9": "9"
};

function CardBack() {
  return (
    <div style={{
      width: "80px",
      height: "120px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #1565c0 0%, #0d3b8e 100%)",
      border: "2px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Diamond pattern */}
      <svg
        width="80" height="120"
        style={{ position: "absolute", inset: 0 }}
        viewBox="0 0 80 120"
      >
        <defs>
          <pattern id="diamonds" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M6 0L12 6L6 12L0 6Z" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="80" height="120" fill="url(#diamonds)" />
        <rect x="6" y="6" width="68" height="108" rx="4" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <rect x="10" y="10" width="60" height="100" rx="3" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>
      {/* Center emblem */}
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        border: "1.5px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        zIndex: 1,
      }}>
        🂠
      </div>
    </div>
  );
}

function CardFace({ card }: { card: Card }) {
  const suitSym = SUIT_SYMBOL[card.suit] ?? card.suit;
  const color = SUIT_COLOR[card.suit] ?? "#1a1a1a";
  const rankDisp = RANK_DISPLAY[card.rank] ?? card.rank;
  const isFaceCard = ["J", "Q", "K"].includes(card.rank);

  return (
    <div style={{
      width: "80px",
      height: "120px",
      borderRadius: "8px",
      background: "#fafafa",
      border: "1px solid rgba(0,0,0,0.1)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      padding: "5px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top-left rank+suit */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1.1,
        userSelect: "none",
      }}>
        <span style={{
          color,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: rankDisp === "10" ? "15px" : "17px",
          letterSpacing: "-0.02em",
        }}>{rankDisp}</span>
        <span style={{ color, fontSize: "11px", marginTop: "-1px" }}>{suitSym}</span>
      </div>

      {/* Center symbol */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {isFaceCard ? (
          <div style={{
            width: "42px",
            height: "60px",
            borderRadius: "4px",
            background: color === "#c62828"
              ? "linear-gradient(135deg, #ffebee, #ffcdd2)"
              : "linear-gradient(135deg, #e8eaf6, #c5cae9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            border: `1.5px solid ${color === "#c62828" ? "#ef9a9a" : "#9fa8da"}`,
          }}>
            {card.rank === "J" && <span style={{ color }}>♞</span>}
            {card.rank === "Q" && <span style={{ color }}>♛</span>}
            {card.rank === "K" && <span style={{ color }}>♚</span>}
          </div>
        ) : card.rank === "A" ? (
          <span style={{ color, fontSize: "36px", fontWeight: 700 }}>{suitSym}</span>
        ) : (
          <span style={{ color, fontSize: "22px" }}>{suitSym}</span>
        )}
      </div>

      {/* Bottom-right rank+suit (rotated) */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        transform: "rotate(180deg)",
        lineHeight: 1.1,
        userSelect: "none",
      }}>
        <span style={{
          color,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: rankDisp === "10" ? "15px" : "17px",
        }}>{rankDisp}</span>
        <span style={{ color, fontSize: "11px", marginTop: "-1px" }}>{suitSym}</span>
      </div>
    </div>
  );
}

export default function PlayingCard({ card, index = 0, faceDown }: PlayingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotate: -8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 22,
        delay: index * 0.08,
      }}
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {faceDown || card.faceDown ? (
        <CardBack />
      ) : (
        <CardFace card={card} />
      )}
    </motion.div>
  );
}
