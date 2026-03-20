"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { CasinoChip } from "@/components/CasinoChip";
import {
  playWheelSpin,
  playBallClatter,
  playRouletteWin,
  playRouletteLose,
} from "@/lib/sound";

// ── American Roulette Wheel Order (clockwise) ────────────────────────────────
const WHEEL_ORDER = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
] as const;

type WheelSlot = (typeof WHEEL_ORDER)[number];

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function getPocketColor(n: WheelSlot): "red" | "black" | "green" {
  if (n === 0 || n === "00") return "green";
  return RED_NUMBERS.has(n as number) ? "red" : "black";
}

type BetKey = "0" | "00" | `n${number}` | "red" | "black";

function betLabel(key: BetKey): string {
  if (key === "0") return "0";
  if (key === "00") return "00";
  if (key === "red") return "RED";
  if (key === "black") return "BLACK";
  return key.slice(1);
}

function betPayout(key: BetKey): number {
  if (key === "red" || key === "black") return 1;
  return 35;
}

function betMatches(key: BetKey, winning: WheelSlot): boolean {
  if (key === "0") return winning === 0;
  if (key === "00") return winning === "00";
  if (key === "red") return getPocketColor(winning) === "red";
  if (key === "black") return getPocketColor(winning) === "black";
  return (winning as number) === parseInt(key.slice(1));
}

// Grid layout: 12 columns of 3 numbers (top row = 3,6,9…36; bottom = 1,4,7…34)
const GRID_ROWS: number[][] = [];
for (let col = 0; col < 12; col++) {
  GRID_ROWS.push([3 * col + 3, 3 * col + 2, 3 * col + 1]);
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.62rem",
      fontFamily: "'Barlow Condensed', sans-serif",
      fontWeight: 700,
      letterSpacing: "0.18em",
      color: "var(--text-muted)",
      textTransform: "uppercase",
      marginBottom: "7px",
    }}>
      {children}
    </div>
  );
}

function PanelDivider() {
  return <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />;
}

function SmallStat({ label, value, accent }: { label: string; value: string; accent?: "gold" | "green" | "red" }) {
  const color = accent === "gold" ? "var(--accent-gold)" : accent === "green" ? "var(--accent-green)" : accent === "red" ? "#f87171" : "var(--text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0" }}>
      <span style={{ fontSize: "0.7rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.95rem", color }}>{value}</span>
    </div>
  );
}

// ── Roulette Wheel ────────────────────────────────────────────────────────────

interface RouletteWheelProps {
  spinDeg: number;
  ballAngle: number;
  ballRadius: number;
  winningSlot: WheelSlot | null;
  spinDuration: number;
}

function RouletteWheel({ spinDeg, ballAngle, ballRadius, winningSlot, spinDuration }: RouletteWheelProps) {
  const SIZE = 300;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 140;
  const POCKET_OUTER_R = 127;
  const POCKET_INNER_R = 94;
  const SEPARATOR_R = 90;
  const INNER_R = 46;

  const numPockets = WHEEL_ORDER.length;
  const anglePerPocket = 360 / numPockets;

  const ballRad = (ballAngle * Math.PI) / 180;
  const ballX = CX + ballRadius * Math.cos(ballRad);
  const ballY = CY + ballRadius * Math.sin(ballRad);

  const pocketColors: Record<string, string> = {
    green: "#1a7a2e",
    red: "#c62828",
    black: "#1a1a1a",
  };

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <radialGradient id="rimGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="40%" stopColor="#b8960c" />
          <stop offset="70%" stopColor="#8a6f0a" />
          <stop offset="100%" stopColor="#5c4a08" />
        </radialGradient>
        <radialGradient id="wheelBody2" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </radialGradient>
        <radialGradient id="hubGrad2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e0c060" />
          <stop offset="50%" stopColor="#b8960c" />
          <stop offset="100%" stopColor="#5c4a08" />
        </radialGradient>
        <filter id="wShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(0,0,0,0.7)" />
        </filter>
        <filter id="bGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r={OUTER_R + 3} fill="rgba(0,0,0,0.5)" filter="url(#wShadow)" />
      <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#rimGrad2)" />
      <circle cx={CX} cy={CY} r={OUTER_R - 3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={OUTER_R - 6} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />

      {/* Spinning group */}
      <g style={{
        transform: `rotate(${spinDeg}deg)`,
        transformOrigin: `${CX}px ${CY}px`,
        transition: spinDuration > 0 ? `transform ${spinDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)` : "none",
      }}>
        <circle cx={CX} cy={CY} r={POCKET_OUTER_R} fill="url(#wheelBody2)" />

        {WHEEL_ORDER.map((slot, i) => {
          const startAngle = (i * anglePerPocket - anglePerPocket / 2) * (Math.PI / 180);
          const endAngle = ((i + 1) * anglePerPocket - anglePerPocket / 2) * (Math.PI / 180);
          const ox1 = CX + POCKET_OUTER_R * Math.cos(startAngle);
          const oy1 = CY + POCKET_OUTER_R * Math.sin(startAngle);
          const ox2 = CX + POCKET_OUTER_R * Math.cos(endAngle);
          const oy2 = CY + POCKET_OUTER_R * Math.sin(endAngle);
          const ix1 = CX + POCKET_INNER_R * Math.cos(startAngle);
          const iy1 = CY + POCKET_INNER_R * Math.sin(startAngle);
          const ix2 = CX + POCKET_INNER_R * Math.cos(endAngle);
          const iy2 = CY + POCKET_INNER_R * Math.sin(endAngle);
          const color = getPocketColor(slot);
          const isWinner = winningSlot !== null && slot === winningSlot;
          const d = `M ${ox1} ${oy1} A ${POCKET_OUTER_R} ${POCKET_OUTER_R} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${POCKET_INNER_R} ${POCKET_INNER_R} 0 0 0 ${ix1} ${iy1} Z`;
          const midAngle = (i * anglePerPocket) * (Math.PI / 180);
          const textR = (POCKET_OUTER_R + POCKET_INNER_R) / 2;
          const textX = CX + textR * Math.cos(midAngle);
          const textY = CY + textR * Math.sin(midAngle);
          const textRotate = i * anglePerPocket + 90;
          return (
            <g key={i}>
              <path d={d}
                fill={isWinner ? (color === "green" ? "#2ecc40" : color === "red" ? "#ff4136" : "#333") : pocketColors[color]}
                stroke={isWinner ? "#f0b429" : "rgba(0,0,0,0.6)"}
                strokeWidth={isWinner ? 1.5 : 0.6}
              />
              {isWinner && <path d={d} fill="rgba(255,220,80,0.25)" />}
              <text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${textRotate} ${textX} ${textY})`}
                fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="700"
                fontFamily="'Barlow Condensed', sans-serif"
                style={{ pointerEvents: "none", userSelect: "none" }}>
                {slot}
              </text>
            </g>
          );
        })}

        {WHEEL_ORDER.map((_, i) => {
          const angle = (i * anglePerPocket - anglePerPocket / 2) * (Math.PI / 180);
          return (
            <line key={i}
              x1={CX + POCKET_INNER_R * Math.cos(angle)} y1={CY + POCKET_INNER_R * Math.sin(angle)}
              x2={CX + POCKET_OUTER_R * Math.cos(angle)} y2={CY + POCKET_OUTER_R * Math.sin(angle)}
              stroke="rgba(180,150,10,0.7)" strokeWidth="0.9" />
          );
        })}

        <circle cx={CX} cy={CY} r={SEPARATOR_R} fill="none" stroke="rgba(180,150,10,0.8)" strokeWidth="2" />
        <circle cx={CX} cy={CY} r={SEPARATOR_R} fill="#141414" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          return <line key={i}
            x1={CX + (INNER_R + 2) * Math.cos(rad)} y1={CY + (INNER_R + 2) * Math.sin(rad)}
            x2={CX + (SEPARATOR_R - 2) * Math.cos(rad)} y2={CY + (SEPARATOR_R - 2) * Math.sin(rad)}
            stroke="rgba(180,150,10,0.2)" strokeWidth="0.8" />;
        })}
        {[45,135,225,315].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const r2 = (SEPARATOR_R + INNER_R) / 2;
          const x = CX + r2 * Math.cos(rad);
          const y = CY + r2 * Math.sin(rad);
          return <g key={i} transform={`translate(${x} ${y}) rotate(${a + 45})`}>
            <rect x="-3" y="-3" width="6" height="6" fill="rgba(180,150,10,0.5)" rx="0.8" />
          </g>;
        })}
        <circle cx={CX} cy={CY} r={INNER_R} fill="url(#hubGrad2)" />
        <circle cx={CX} cy={CY} r={INNER_R - 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx={CX} cy={CY} r={INNER_R * 0.5} fill="rgba(0,0,0,0.5)" />
        <circle cx={CX} cy={CY} r={INNER_R * 0.28} fill="url(#hubGrad2)" />
        <ellipse cx={CX - INNER_R * 0.22} cy={CY - INNER_R * 0.25} rx={INNER_R * 0.22} ry={INNER_R * 0.13}
          fill="rgba(255,255,255,0.22)" transform={`rotate(-35 ${CX} ${CY})`} />
      </g>

      {/* Ball */}
      <circle cx={ballX} cy={ballY} r={5} fill="white" filter="url(#bGlow)" />
      <circle cx={ballX - 1.5} cy={ballY - 1.5} r={1.5} fill="rgba(255,255,255,0.8)" />

      {/* Rim shine */}
      <ellipse cx={CX - 38} cy={CY - 78} rx="54" ry="18" fill="rgba(255,255,255,0.05)" transform={`rotate(-20 ${CX} ${CY})`} />
    </svg>
  );
}

// ── Betting Board Cell ────────────────────────────────────────────────────────

interface BettingCellProps {
  betKey: BetKey;
  label: string;
  color: "red" | "black" | "green";
  isSelected: boolean;
  isWinner: boolean;
  onClick: (key: BetKey) => void;
  disabled: boolean;
}

function BettingCell({ betKey, label, color, isSelected, isWinner, onClick, disabled }: BettingCellProps) {
  const bg: Record<string, string> = { red: "#c62828", black: "#1a1a1a", green: "#1a7a2e" };
  let border = "1px solid rgba(255,255,255,0.1)";
  let shadow = "none";
  if (isWinner) { border = "2px solid #f0b429"; shadow = "0 0 10px rgba(240,180,41,0.6)"; }
  else if (isSelected) { border = "2px solid var(--accent-green)"; shadow = "0 0 8px rgba(0,230,118,0.4)"; }

  return (
    <motion.button
      onClick={() => !disabled && onClick(betKey)}
      whileHover={!disabled ? { scale: 1.08, zIndex: 2 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      style={{
        background: isSelected ? `linear-gradient(135deg, ${bg[color]}, rgba(0,230,118,0.15))` : bg[color],
        border,
        borderRadius: 3,
        color: "rgba(255,255,255,0.95)",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: "0.75rem",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        boxShadow: shadow,
        transition: "box-shadow 0.2s, border 0.1s",
        position: "relative",
        letterSpacing: "0.02em",
        padding: 0,
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Phase = "betting" | "spinning" | "result";

export default function RoulettePage() {
  const { balance, addBalance, subtractBalance } = useBalance();

  const [phase, setPhase] = useState<Phase>("betting");
  const [betAmount, setBetAmount] = useState(0);
  const [selectedBet, setSelectedBet] = useState<BetKey | null>(null);
  const [winningSlot, setWinningSlot] = useState<WheelSlot | null>(null);
  const [lastResult, setLastResult] = useState<{ won: boolean; payout: number } | null>(null);

  const [spinDeg, setSpinDeg] = useState(0);
  const [ballAngle, setBallAngle] = useState(-90);
  const [ballRadius, setBallRadius] = useState(133);
  const [spinDuration, setSpinDuration] = useState(0);

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ballAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAddBet = useCallback((amount: number) => {
    if (phase !== "betting") return;
    const safeAdd = Math.min(amount, balance - betAmount);
    if (safeAdd <= 0) return;
    setBetAmount(prev => Math.round((prev + safeAdd) * 100) / 100);
  }, [phase, balance, betAmount]);

  const handleSelectBet = useCallback((key: BetKey) => {
    if (phase !== "betting") return;
    setSelectedBet(prev => prev === key ? null : key);
  }, [phase]);

  const handleClear = useCallback(() => {
    setBetAmount(0);
    setSelectedBet(null);
  }, []);

  const handleSpin = useCallback(() => {
    if (phase !== "betting" || betAmount <= 0 || !selectedBet || betAmount > balance) return;
    subtractBalance(betAmount);
    setPhase("spinning");

    const slotIndex = Math.floor(Math.random() * WHEEL_ORDER.length);
    const winner = WHEEL_ORDER[slotIndex];

    const anglePerPocket = 360 / WHEEL_ORDER.length;
    const targetAngle = 270 - slotIndex * anglePerPocket;
    const fullRotations = 8;
    const finalDeg = spinDeg + fullRotations * 360 + ((targetAngle - spinDeg) % 360 + 360) % 360;
    const dur = 5 + Math.random() * 1;
    setSpinDuration(dur);
    setSpinDeg(finalDeg);

    // Ball animation
    const startTime = Date.now();
    const totalMs = dur * 1000;
    const ballLandAngle = -90;

    playWheelSpin();
    playBallClatter(dur - 0.5);

    if (ballAnimRef.current) clearInterval(ballAnimRef.current);
    ballAnimRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalMs, 1);
      let angle: number;
      let radius: number;

      if (progress < 0.65) {
        const speed = 680 * (1 - progress * 0.5);
        angle = -90 - (speed * elapsed / 1000) % 360;
        radius = 133;
      } else {
        const lp = (progress - 0.65) / 0.35;
        const eased = 1 - Math.pow(1 - lp, 3);
        const fromAngle = -90 - (680 * (dur * 0.65) * 0.675) % 360;
        angle = fromAngle + eased * (ballLandAngle - fromAngle);
        radius = 133 - eased * (133 - 108);
      }
      setBallAngle(angle);
      setBallRadius(radius);

      if (progress >= 1) {
        if (ballAnimRef.current) clearInterval(ballAnimRef.current);
        setBallAngle(ballLandAngle);
        setBallRadius(108);
      }
    }, 16);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      setWinningSlot(winner);
      setPhase("result");

      const won = selectedBet ? betMatches(selectedBet, winner) : false;
      let payout = 0;
      if (won && selectedBet) {
        payout = betAmount * (betPayout(selectedBet) + 1);
        addBalance(payout);
        playRouletteWin();
      } else {
        playRouletteLose();
      }
      setLastResult({ won, payout });
    }, dur * 1000 + 300);
  }, [phase, betAmount, selectedBet, balance, subtractBalance, addBalance, spinDeg]);

  const handleNewRound = useCallback(() => {
    setWinningSlot(null);
    setLastResult(null);
    setBetAmount(0);
    setSelectedBet(null);
    setBallAngle(-90);
    setBallRadius(133);
    setSpinDuration(0);
    setPhase("betting");
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (ballAnimRef.current) clearInterval(ballAnimRef.current);
    };
  }, []);

  const winningColor = winningSlot !== null ? getPocketColor(winningSlot) : null;
  const winningColorHex = winningColor === "red" ? "#c62828" : winningColor === "green" ? "#1a7a2e" : "#1a1a1a";
  const netResult = lastResult ? (lastResult.won ? lastResult.payout - betAmount : -betAmount) : 0;
  const canSpin = phase === "betting" && betAmount > 0 && selectedBet !== null && betAmount <= balance;

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: "210px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "18px 14px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        overflowY: "auto",
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="4" stroke="var(--text-muted)" strokeWidth="1" fill="none" opacity="0.5" />
            <circle cx="8" cy="8" r="1.5" fill="var(--text-muted)" />
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.16em", color: "var(--text-primary)", textTransform: "uppercase" }}>
            Roulette
          </span>
        </div>

        <PanelDivider />

        {phase === "betting" && (
          <>
            {/* Bet amount input */}
            <div>
              <PanelLabel>Bet Amount</PanelLabel>
              <div style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--border-color)",
                borderRadius: "7px",
                padding: "4px 8px",
                gap: "6px",
              }}>
                <span style={{ fontSize: "0.65rem", fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase" }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={betAmount || ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setBetAmount(isNaN(v) ? 0 : Math.min(Math.max(0, Math.round(v * 100) / 100), balance));
                  }}
                  placeholder="0.00"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: "1.05rem", color: "var(--text-primary)", width: "100%",
                  }}
                />
                {betAmount > 0 && (
                  <button onClick={() => setBetAmount(0)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>

            {/* Chips + Half/All-In */}
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", justifyItems: "center" }}>
                {[1, 5, 10, 25].map(val => (
                  <CasinoChip key={val} value={val} onClick={handleAddBet}
                    disabled={betAmount >= balance || val > balance - betAmount} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => setBetAmount(Math.round(balance / 2 * 100) / 100)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="13" r="6" fill="var(--text-muted)"/><circle cx="10" cy="13" r="4.5" fill="var(--bg-secondary)"/><circle cx="10" cy="9" r="6" fill="var(--text-secondary)"/><circle cx="10" cy="9" r="4.5" fill="var(--bg-secondary)"/><text x="10" y="10" textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="var(--text-secondary)" fontWeight="800">½</text></svg>
                  Half
                </button>
                <button onClick={() => setBetAmount(Math.round(balance * 100) / 100)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(240,180,41,0.3)", background: "rgba(240,180,41,0.08)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="15" r="5" fill="#8b6914"/><circle cx="10" cy="15" r="3.5" fill="#0f1923"/><circle cx="10" cy="11" r="5" fill="#b8960c"/><circle cx="10" cy="11" r="3.5" fill="#0f1923"/><circle cx="10" cy="7" r="5" fill="#d4af37"/><circle cx="10" cy="7" r="3.5" fill="#0f1923"/><text x="10" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#d4af37" fontWeight="800">MAX</text></svg>
                  All In
                </button>
              </div>
            </div>

            {/* Selected bet display */}
            <div style={{
              background: selectedBet ? "rgba(0,230,118,0.07)" : "rgba(0,0,0,0.15)",
              border: selectedBet ? "1px solid rgba(0,230,118,0.25)" : "1px solid var(--border-color)",
              borderRadius: "7px",
              padding: "7px 11px",
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ fontSize: "0.65rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.14em", color: "var(--text-muted)", textTransform: "uppercase" }}>On</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: selectedBet ? "var(--accent-green)" : "var(--text-muted)", flex: 1 }}>
                {selectedBet ? betLabel(selectedBet) : "—"}
              </span>
              {selectedBet && (
                <button onClick={() => setSelectedBet(null)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
              )}
            </div>

            <PanelDivider />

            <motion.button className="btn-primary" onClick={handleClear}
              disabled={betAmount === 0 && !selectedBet}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "10px", fontSize: "0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--text-secondary)", boxShadow: "none", letterSpacing: "0.1em" }}>
              CLEAR
            </motion.button>

            <motion.button className="btn-primary" onClick={handleSpin}
              disabled={!canSpin}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "13px", fontSize: "1rem", letterSpacing: "0.1em" }}>
              {!selectedBet ? "PICK A BET" : betAmount === 0 ? "ADD CHIPS" : "SPIN"}
            </motion.button>

            <div style={{ textAlign: "center", marginTop: "auto" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em" }}>
                Balance: <strong style={{ color: "var(--text-secondary)" }}>${balance.toFixed(2)}</strong>
              </span>
            </div>
          </>
        )}

        {phase === "spinning" && (
          <div style={{ textAlign: "center", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "12px" }}>
              {[0,1,2].map(i => (
                <motion.div key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-gold)" }} />
              ))}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.16em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
              Spinning...
            </div>
            <PanelDivider />
            <SmallStat label="Bet" value={`$${betAmount.toFixed(2)}`} />
            <SmallStat label="On" value={selectedBet ? betLabel(selectedBet) : "—"} />
          </div>
        )}

        {phase === "result" && winningSlot !== null && lastResult && (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }} style={{ textAlign: "center" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 52, height: 52, borderRadius: "50%",
                background: winningColorHex,
                border: "2.5px solid var(--accent-gold)",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                fontSize: "1.5rem", color: "white", marginBottom: 8,
                boxShadow: "0 0 20px rgba(240,180,41,0.5)",
              }}>
                {winningSlot}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                {winningColor?.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "2rem", color: lastResult.won ? "var(--accent-green)" : "#f87171", lineHeight: 1 }}>
                {lastResult.won ? `+$${netResult.toFixed(2)}` : `-$${betAmount.toFixed(2)}`}
              </div>
            </motion.div>

            <PanelDivider />
            <SmallStat label="Bet on" value={selectedBet ? betLabel(selectedBet) : "—"} />
            <SmallStat label="Result" value={lastResult.won ? "WIN" : "LOSE"} accent={lastResult.won ? "green" : "red"} />
            {lastResult.won && <SmallStat label="Payout" value={`$${lastResult.payout.toFixed(2)}`} accent="gold" />}

            <div style={{ flex: 1 }} />

            <motion.button className="btn-primary" onClick={handleNewRound}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "12px", fontSize: "1rem", letterSpacing: "0.1em" }}>
              NEW ROUND
            </motion.button>
          </>
        )}
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: "28px",
        padding: "20px",
        overflow: "auto",
        minWidth: 0,
      }}>

        {/* Wheel */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 40%, #236b3b 0%, #1a5230 45%, #0e3b1c 100%)",
          borderRadius: "50%",
          padding: "16px",
          boxShadow: "0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4)",
          border: "2px solid rgba(240,180,41,0.2)",
          flexShrink: 0,
        }}>
          {/* Felt grain */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px", mixBlendMode: "overlay", pointerEvents: "none",
          }} />
          {/* Top indicator */}
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
            borderTop: "10px solid var(--accent-gold)",
            zIndex: 20, filter: "drop-shadow(0 0 4px rgba(240,180,41,0.8))",
          }} />
          <RouletteWheel
            spinDeg={spinDeg}
            ballAngle={ballAngle}
            ballRadius={ballRadius}
            winningSlot={phase === "result" ? winningSlot : null}
            spinDuration={spinDuration}
          />
        </div>

        {/* Betting board + result */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, minWidth: 0, maxWidth: 560 }}>

          {/* Result banner */}
          <AnimatePresence>
            {phase === "result" && winningSlot !== null && lastResult && (
              <motion.div
                key="banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div className={`result-banner ${lastResult.won ? "win" : "lose"}`}
                  style={{ fontSize: "1.2rem", padding: "8px 20px", textAlign: "center" }}>
                  {lastResult.won
                    ? `${winningSlot} ${winningColor?.toUpperCase()}  +$${netResult.toFixed(2)}`
                    : `${winningSlot} ${winningColor?.toUpperCase()}  -$${betAmount.toFixed(2)}`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          {phase === "betting" && (
            <div style={{ fontSize: "0.7rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
              ← Add chips, then click a number or color to bet on it
            </div>
          )}

          {/* Felt board */}
          <div style={{
            background: "radial-gradient(ellipse at 50% 20%, #236b3b 0%, #1a5230 40%, #0e3b1c 100%)",
            border: "2px solid rgba(240,180,41,0.2)",
            borderRadius: "12px",
            padding: "14px",
            boxShadow: "0 0 30px rgba(0,0,0,0.5) inset, 0 4px 16px rgba(0,0,0,0.4)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Felt grain */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 10,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 200px", mixBlendMode: "overlay", pointerEvents: "none",
            }} />

            {/* Number grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px repeat(12, 1fr)",
              gridTemplateRows: "repeat(3, 34px)",
              gap: "2px",
              marginBottom: "6px",
            }}>
              {/* 0 */}
              <div style={{ gridColumn: 1, gridRow: "1 / 2", display: "flex" }}>
                <BettingCell betKey="0" label="0" color="green"
                  isSelected={selectedBet === "0"} isWinner={winningSlot === 0}
                  onClick={handleSelectBet} disabled={phase !== "betting"} />
              </div>
              {/* 00 */}
              <div style={{ gridColumn: 1, gridRow: "2 / 3", display: "flex" }}>
                <BettingCell betKey="00" label="00" color="green"
                  isSelected={selectedBet === "00"} isWinner={winningSlot === "00"}
                  onClick={handleSelectBet} disabled={phase !== "betting"} />
              </div>
              <div style={{ gridColumn: 1, gridRow: "3 / 4" }} />

              {/* Numbers 1–36 */}
              {GRID_ROWS.map((row, colIdx) =>
                row.map((num, rowIdx) => {
                  const key: BetKey = `n${num}`;
                  return (
                    <div key={num} style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 1, display: "flex" }}>
                      <BettingCell betKey={key} label={String(num)} color={getPocketColor(num as WheelSlot)}
                        isSelected={selectedBet === key} isWinner={(winningSlot as number) === num}
                        onClick={handleSelectBet} disabled={phase !== "betting"} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Outside bets */}
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr", gap: "2px" }}>
              <div />
              <BettingCell betKey="red" label="RED  1:1" color="red"
                isSelected={selectedBet === "red"}
                isWinner={winningSlot !== null && getPocketColor(winningSlot) === "red"}
                onClick={handleSelectBet} disabled={phase !== "betting"} />
              <BettingCell betKey="black" label="BLACK  1:1" color="black"
                isSelected={selectedBet === "black"}
                isWinner={winningSlot !== null && getPocketColor(winningSlot) === "black"}
                onClick={handleSelectBet} disabled={phase !== "betting"} />
            </div>

            {/* Payout hint */}
            <div style={{ marginTop: "10px", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              {[{ label: "Straight Up", value: "35:1" }, { label: "Red / Black", value: "1:1" }].map(({ label, value }) => (
                <span key={label} style={{ fontSize: "0.62rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                  {label} — <span style={{ color: "var(--accent-gold)" }}>{value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
