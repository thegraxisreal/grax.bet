"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { CasinoChip } from "@/components/CasinoChip";
import { playChipClick, playWin, playLose } from "@/lib/sound";

// ── Constants ──────────────────────────────────────────────────────────────

const TOTAL = 25;
const MINE_PRESETS = [1, 2, 3, 5, 10, 15, 20, 24];

type Phase = "idle" | "playing" | "cashout" | "dead";

// ── Math ───────────────────────────────────────────────────────────────────

function comb(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  const kk = Math.min(k, n - k);
  for (let i = 0; i < kk; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

function multiplierAt(mineCount: number, picks: number): number {
  if (picks === 0) return 1;
  const safe = TOTAL - mineCount;
  const raw = comb(TOTAL, picks) / comb(safe, picks);
  return Math.round(raw * 0.99 * 100) / 100;
}

function placeMines(count: number): boolean[] {
  const idx = Array.from({ length: TOTAL }, (_, i) => i);
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const result = Array(TOTAL).fill(false);
  for (let i = 0; i < count; i++) result[idx[i]] = true;
  return result;
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

function GemIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="gemG" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#a5f3c0" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <polygon points="24,3 44,19 24,45 4,19" fill="url(#gemG)" />
      <polygon points="24,3 44,19 24,19" fill="rgba(255,255,255,0.24)" />
      <polygon points="24,3 4,19 24,19" fill="rgba(255,255,255,0.1)" />
      <line x1="4" y1="19" x2="44" y2="19" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9" />
      <line x1="24" y1="3" x2="4" y2="19" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <line x1="24" y1="3" x2="44" y2="19" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <ellipse cx="16" cy="13" rx="4.5" ry="2.5" fill="rgba(255,255,255,0.55)" transform="rotate(-22 16 13)" />
      <circle cx="31" cy="27" r="1.5" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function MineIcon({ lit = false }: { lit?: boolean }) {
  const spikes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    return {
      x1: 24 + 13 * Math.cos(a),
      y1: 24 + 13 * Math.sin(a),
      x2: 24 + 22 * Math.cos(a),
      y2: 24 + 22 * Math.sin(a),
    };
  });
  return (
    <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="mineG" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="60%" stopColor="#262626" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </radialGradient>
      </defs>
      {spikes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="#525252" strokeWidth="3.8" strokeLinecap="round" />
      ))}
      <circle cx="24" cy="24" r="12.5" fill="url(#mineG)" />
      <ellipse cx="18" cy="18" rx="3.8" ry="2.2" fill="rgba(255,255,255,0.28)" transform="rotate(-35 18 18)" />
      <path d="M24 11.5 Q29 7 33 5" stroke="#78350f" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="33" cy="5" r="2.2" fill={lit ? "#f97316" : "#ea580c"} />
      {lit && <circle cx="33" cy="5" r="4.5" fill="rgba(249,115,22,0.4)" />}
    </svg>
  );
}

function HiddenPattern() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none">
      <polygon points="24,10 38,24 24,38 10,24"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.8" />
      <circle cx="24" cy="24" r="2.5" fill="rgba(255,255,255,0.04)" />
    </svg>
  );
}

// ── Tile ───────────────────────────────────────────────────────────────────

interface TileProps {
  index: number;
  isMine: boolean;
  isRevealed: boolean;
  phase: Phase;
  isHitMine: boolean;
  revealDelay: number;
  onClick: (i: number) => void;
}

function Tile({ index, isMine, isRevealed, phase, isHitMine, revealDelay, onClick }: TileProps) {
  const isActive = phase === "playing" && !isRevealed;
  const gameOver = phase === "dead" || phase === "cashout";

  const showGem = isRevealed && !isMine;
  const showMine = (isRevealed && isMine) || (gameOver && isMine);
  const isUnrevealedMine = gameOver && isMine && !isRevealed;

  let bg: string;
  let borderCol: string;
  let shadow: string = "none";

  if (showMine) {
    bg = isHitMine ? "linear-gradient(145deg,#4a0d0d,#7a1212)" : "linear-gradient(145deg,#2a0f0f,#3d1515)";
    borderCol = isHitMine ? "rgba(239,68,68,0.8)" : "rgba(185,28,28,0.38)";
    if (isHitMine) shadow = "inset 0 0 22px rgba(239,68,68,0.35)";
  } else if (showGem) {
    bg = "linear-gradient(145deg,#052e16,#0f4a25)";
    borderCol = "rgba(34,197,94,0.55)";
    shadow = "inset 0 0 14px rgba(34,197,94,0.18)";
  } else {
    bg = "linear-gradient(145deg,#111c2b,#0c1520)";
    borderCol = "rgba(255,255,255,0.07)";
  }

  return (
    <motion.button
      onClick={() => isActive && onClick(index)}
      whileHover={isActive ? { scale: 1.06, y: -2 } : {}}
      whileTap={isActive ? { scale: 0.92 } : {}}
      animate={isHitMine ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
      transition={isHitMine ? { duration: 0.45 } : { type: "spring", stiffness: 300, damping: 22 }}
      style={{
        aspectRatio: "1",
        background: bg,
        border: `1.5px solid ${borderCol}`,
        borderRadius: "clamp(6px, 1.2vmin, 11px)",
        cursor: isActive ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        padding: "14%",
        boxShadow: shadow,
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Active hover shimmer */}
      {isActive && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          background: "linear-gradient(135deg, rgba(99,179,237,0.07) 0%, transparent 55%)",
          pointerEvents: "none",
        }} />
      )}

      {showGem && (
        <motion.div style={{ width: "100%", height: "100%", display: "flex",
          filter: "drop-shadow(0 0 8px rgba(34,197,94,0.55))" }}
          initial={{ scale: 0, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 17 }}
        >
          <GemIcon />
        </motion.div>
      )}

      {showMine && (
        <motion.div style={{ width: "100%", height: "100%", display: "flex",
          filter: isHitMine ? "drop-shadow(0 0 12px rgba(239,68,68,0.9))" : "drop-shadow(0 0 5px rgba(185,28,28,0.5))" }}
          initial={isUnrevealedMine ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={isUnrevealedMine
            ? { type: "spring", stiffness: 260, damping: 18, delay: revealDelay }
            : {}}
        >
          <MineIcon lit={isHitMine} />
        </motion.div>
      )}

      {!showGem && !showMine && (
        <div style={{ width: "100%", height: "100%", display: "flex",
          opacity: phase === "idle" ? 0.55 : 1, transition: "opacity 0.3s" }}>
          <HiddenPattern />
        </div>
      )}
    </motion.button>
  );
}

// ── Panel helpers ──────────────────────────────────────────────────────────

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
  return <div style={{ height: "1px", background: "var(--border-color)", margin: "2px 0" }} />;
}

function BigStat({ label, value, accent }: { label: string; value: string; accent: "gold" | "green" }) {
  const color = accent === "gold" ? "var(--accent-gold)" : "var(--accent-green)";
  return (
    <div style={{ textAlign: "center" }}>
      <PanelLabel>{label}</PanelLabel>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: "2.2rem",
        color,
        lineHeight: 1,
        letterSpacing: "0.02em",
      }}>
        {value}
      </div>
    </div>
  );
}

function SmallStat({ label, value, accent }: { label: string; value: string; accent?: "gold" | "green" }) {
  const color = accent === "gold" ? "var(--accent-gold)" : accent === "green" ? "var(--accent-green)" : "var(--text-primary)";
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "5px 0",
    }}>
      <span style={{
        fontSize: "0.7rem",
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.12em",
        color: "var(--text-muted)",
        textTransform: "uppercase",
      }}>{label}</span>
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: "0.95rem",
        color,
      }}>{value}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function MinesPage() {
  const { balance, addBalance, subtractBalance } = useBalance();

  const [phase, setPhase] = useState<Phase>("idle");
  const [minePositions, setMinePositions] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [mineCount, setMineCount] = useState(3);
  const [bet, setBet] = useState(0);
  const [pendingBet, setPendingBet] = useState(0);
  const [safeRevealed, setSafeRevealed] = useState(0);
  const [hitMineIdx, setHitMineIdx] = useState<number | null>(null);
  const [finalPayout, setFinalPayout] = useState(0);

  const mult = multiplierAt(mineCount, safeRevealed);
  const nextMult = multiplierAt(mineCount, safeRevealed + 1);
  const cashoutTotal = safeRevealed > 0 ? Math.round(bet * mult * 100) / 100 : 0;
  const profit = cashoutTotal - bet;

  // Staggered mine reveal delays
  const mineRevealDelays: number[] = Array(TOTAL).fill(0);
  if (phase === "dead" || phase === "cashout") {
    let counter = 0;
    for (let i = 0; i < TOTAL; i++) {
      if (minePositions[i] && !revealed[i]) {
        mineRevealDelays[i] = 0.04 + counter * 0.05;
        counter++;
      }
    }
  }

  const handleAddBet = useCallback((amount: number) => {
    if (phase !== "idle") return;
    const safeAdd = Math.min(amount, balance - pendingBet);
    if (safeAdd <= 0) return;
    setPendingBet(prev => Math.round((prev + safeAdd) * 100) / 100);
  }, [phase, balance, pendingBet]);

  const handleStartGame = useCallback(() => {
    if (pendingBet <= 0 || pendingBet > balance) return;
    subtractBalance(pendingBet);
    setBet(pendingBet);
    setMinePositions(placeMines(mineCount));
    setRevealed(Array(TOTAL).fill(false));
    setSafeRevealed(0);
    setHitMineIdx(null);
    setFinalPayout(0);
    setPhase("playing");
  }, [pendingBet, balance, mineCount, subtractBalance]);

  const handleTileClick = useCallback((index: number) => {
    if (phase !== "playing" || revealed[index]) return;
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (minePositions[index]) {
      setHitMineIdx(index);
      setPhase("dead");
      setFinalPayout(0);
      playLose();
    } else {
      const newSafe = safeRevealed + 1;
      setSafeRevealed(newSafe);
      playChipClick();
      if (newSafe === TOTAL - mineCount) {
        const finalMult = multiplierAt(mineCount, newSafe);
        const payout = Math.round(bet * finalMult * 100) / 100;
        addBalance(payout);
        setFinalPayout(payout);
        setPhase("cashout");
        playWin();
      }
    }
  }, [phase, revealed, minePositions, safeRevealed, mineCount, bet, addBalance]);

  const handleCashout = useCallback(() => {
    if (phase !== "playing" || safeRevealed === 0) return;
    addBalance(cashoutTotal);
    setFinalPayout(cashoutTotal);
    setPhase("cashout");
    playWin();
  }, [phase, safeRevealed, cashoutTotal, addBalance]);

  const handlePlayAgain = useCallback(() => {
    setPendingBet(bet > 0 ? bet : pendingBet);
    setBet(0);
    setMinePositions(Array(TOTAL).fill(false));
    setRevealed(Array(TOTAL).fill(false));
    setSafeRevealed(0);
    setHitMineIdx(null);
    setFinalPayout(0);
    setPhase("idle");
  }, [bet, pendingBet]);

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: "210px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "18px 14px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        overflowY: "auto",
      }}>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "2px" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <line key={i} x1={8 + 4.5 * Math.cos(a)} y1={8 + 4.5 * Math.sin(a)}
                x2={8 + 7.5 * Math.cos(a)} y2={8 + 7.5 * Math.sin(a)}
                stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" />;
            })}
            <circle cx="8" cy="8" r="3.8" fill="var(--text-muted)" />
            <ellipse cx="6.2" cy="6.2" rx="1.1" ry="0.7" fill="rgba(255,255,255,0.3)" transform="rotate(-35 6.2 6.2)" />
          </svg>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: "1rem",
            letterSpacing: "0.16em",
            color: "var(--text-primary)",
            textTransform: "uppercase",
          }}>
            Mines
          </span>
        </div>

        <PanelDivider />

        {/* ── IDLE: controls ── */}
        {phase === "idle" && (
          <>
            {/* Mine count */}
            <div>
              <PanelLabel>Mine Count</PanelLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {MINE_PRESETS.map(n => (
                  <motion.button
                    key={n}
                    onClick={() => setMineCount(n)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    style={{
                      background: mineCount === n ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)",
                      border: mineCount === n ? "1.5px solid rgba(239,68,68,0.55)" : "1.5px solid rgba(255,255,255,0.09)",
                      borderRadius: "5px",
                      color: mineCount === n ? "#f87171" : "var(--text-secondary)",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      padding: "3px 9px",
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                      transition: "background 0.14s, border-color 0.14s, color 0.14s",
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </div>

            <PanelDivider />

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
                  value={pendingBet || ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setPendingBet(isNaN(v) ? 0 : Math.min(Math.max(0, Math.round(v * 100) / 100), balance));
                  }}
                  placeholder="0.00"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: "1.05rem", color: "var(--text-primary)", width: "100%",
                  }}
                />
                {pendingBet > 0 && (
                  <button onClick={() => setPendingBet(0)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)",
                      cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>

            {/* Chips + Half/All-In */}
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", justifyItems: "center" }}>
                {[1, 5, 10, 25].map(val => (
                  <CasinoChip
                    key={val}
                    value={val}
                    onClick={handleAddBet}
                    disabled={pendingBet >= balance || val > balance - pendingBet}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => setPendingBet(Math.round(balance / 2 * 100) / 100)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="13" r="6" fill="var(--text-muted)"/><circle cx="10" cy="13" r="4.5" fill="var(--bg-secondary)"/><circle cx="10" cy="9" r="6" fill="var(--text-secondary)"/><circle cx="10" cy="9" r="4.5" fill="var(--bg-secondary)"/><text x="10" y="10" textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="var(--text-secondary)" fontWeight="800">½</text></svg>
                  Half
                </button>
                <button onClick={() => setPendingBet(Math.round(balance * 100) / 100)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(240,180,41,0.3)", background: "rgba(240,180,41,0.08)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="15" r="5" fill="#8b6914"/><circle cx="10" cy="15" r="3.5" fill="#0f1923"/><circle cx="10" cy="11" r="5" fill="#b8960c"/><circle cx="10" cy="11" r="3.5" fill="#0f1923"/><circle cx="10" cy="7" r="5" fill="#d4af37"/><circle cx="10" cy="7" r="3.5" fill="#0f1923"/><text x="10" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#d4af37" fontWeight="800">MAX</text></svg>
                  All In
                </button>
              </div>
            </div>

            <PanelDivider />

            {/* Start button */}
            <motion.button
              className="btn-primary"
              onClick={handleStartGame}
              disabled={pendingBet <= 0 || pendingBet > balance}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "1rem",
                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                boxShadow: "0 4px 18px rgba(220,38,38,0.35)",
                letterSpacing: "0.1em",
              }}
            >
              START GAME
            </motion.button>

            {/* Balance */}
            <div style={{ textAlign: "center", marginTop: "auto" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)",
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em" }}>
                Balance: <strong style={{ color: "var(--text-secondary)" }}>${balance.toFixed(2)}</strong>
              </span>
            </div>
          </>
        )}

        {/* ── PLAYING: stats + cashout ── */}
        {phase === "playing" && (
          <>
            {safeRevealed > 0 ? (
              <>
                <BigStat label="Multiplier" value={`${mult.toFixed(2)}×`} accent="gold" />
                <PanelDivider />
                <SmallStat label="Next Tile" value={`${nextMult.toFixed(2)}×`} accent="green" />
                <SmallStat label="Profit" value={`+$${profit.toFixed(2)}`} accent="green" />
                <SmallStat label="Cashout" value={`$${cashoutTotal.toFixed(2)}`} />
              </>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "12px 0",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.1em",
                lineHeight: 1.6,
              }}>
                Pick a tile<br />to begin
              </div>
            )}

            <PanelDivider />
            <SmallStat label="Bet" value={`$${bet.toFixed(2)}`} />
            <SmallStat label="Mines" value={String(mineCount)} />
            <SmallStat
              label="Remaining"
              value={`${TOTAL - mineCount - safeRevealed} safe`}
            />

            <div style={{ flex: 1 }} />

            <motion.button
              className="btn-primary"
              onClick={handleCashout}
              disabled={safeRevealed === 0}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "0.95rem",
                opacity: safeRevealed === 0 ? 0.45 : 1,
                letterSpacing: "0.06em",
              }}
            >
              {safeRevealed === 0 ? "PICK A TILE" : `CASH OUT\n$${cashoutTotal.toFixed(2)}`}
            </motion.button>
          </>
        )}

        {/* ── RESULT: dead / cashout ── */}
        {(phase === "dead" || phase === "cashout") && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              style={{ textAlign: "center" }}
            >
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: "1.05rem",
                letterSpacing: "0.12em",
                color: phase === "cashout" ? "var(--accent-green)" : "#f87171",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}>
                {phase === "cashout" ? "Cashed Out" : "Mine Hit!"}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: "2rem",
                color: phase === "cashout" ? "var(--accent-green)" : "#f87171",
                lineHeight: 1,
              }}>
                {phase === "cashout"
                  ? `+$${(finalPayout - bet).toFixed(2)}`
                  : `-$${bet.toFixed(2)}`}
              </div>
            </motion.div>

            <PanelDivider />

            {phase === "cashout" && (
              <>
                <SmallStat label="Multiplier" value={`${mult.toFixed(2)}×`} accent="gold" />
                <SmallStat label="Payout" value={`$${finalPayout.toFixed(2)}`} />
                <SmallStat label="Tiles Found" value={`${safeRevealed} / ${TOTAL - mineCount}`} accent="green" />
              </>
            )}
            {phase === "dead" && (
              <>
                <SmallStat label="Bet Lost" value={`$${bet.toFixed(2)}`} />
                <SmallStat label="Tiles Found" value={String(safeRevealed)} />
                <SmallStat label="Mines" value={String(mineCount)} />
              </>
            )}

            <div style={{ flex: 1 }} />

            <motion.button
              className="btn-primary"
              onClick={handlePlayAgain}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "12px", fontSize: "1rem", letterSpacing: "0.1em" }}
            >
              PLAY AGAIN
            </motion.button>
          </>
        )}
      </div>

      {/* ── GRID AREA ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflow: "hidden",
        position: "relative",
        minWidth: 0,
      }}>

        {/* Result overlay on the grid */}
        <AnimatePresence>
          {(phase === "dead" || phase === "cashout") && (
            <motion.div
              key="grid-result"
              initial={{ opacity: 0, scale: 0.8, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.25 }}
              style={{
                position: "absolute",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <div className={`result-banner ${phase === "cashout" ? "win" : "lose"}`}
                style={{ fontSize: "1.5rem", padding: "9px 24px" }}>
                {phase === "cashout"
                  ? `CASHED OUT  +$${(finalPayout - bet).toFixed(2)}`
                  : `MINE!  Lost $${bet.toFixed(2)}`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* THE GRID — fills available space as a square */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "clamp(5px, 1.1vmin, 10px)",
          // Fill as large a square as the container allows
          width: "min(100%, calc(100vh - 56px - 32px))",
          aspectRatio: "1",
          maxWidth: "100%",
          maxHeight: "100%",
        }}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <Tile
              key={i}
              index={i}
              isMine={minePositions[i]}
              isRevealed={revealed[i]}
              phase={phase}
              isHitMine={i === hitMineIdx}
              revealDelay={mineRevealDelays[i]}
              onClick={handleTileClick}
            />
          ))}
        </div>

        {/* Subtle tile count hint */}
        {phase === "playing" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: "absolute",
              bottom: "10px",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {safeRevealed} revealed · {mineCount} mines hidden
          </motion.p>
        )}
      </div>
    </div>
  );
}
