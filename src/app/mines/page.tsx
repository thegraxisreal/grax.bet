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
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <defs>
        <linearGradient id="gemGrad" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#80ffb4" />
          <stop offset="100%" stopColor="#00c853" />
        </linearGradient>
        <linearGradient id="gemFacetL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
      </defs>
      {/* Main body */}
      <polygon points="19,2 36,16 19,36 2,16" fill="url(#gemGrad)" />
      {/* Top-right facet */}
      <polygon points="19,2 36,16 19,16" fill="rgba(255,255,255,0.22)" />
      {/* Top-left facet */}
      <polygon points="19,2 2,16 19,16" fill="rgba(255,255,255,0.1)" />
      {/* Horizontal divider */}
      <line x1="2" y1="16" x2="36" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      {/* Left edge */}
      <line x1="19" y1="2" x2="2" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
      {/* Right edge */}
      <line x1="19" y1="2" x2="36" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
      {/* Shine highlight */}
      <ellipse cx="13" cy="11" rx="3.5" ry="2" fill="rgba(255,255,255,0.55)" transform="rotate(-20 13 11)" />
      {/* Small inner sparkle */}
      <circle cx="25" cy="22" r="1.2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function MineIcon({ lit = false }: { lit?: boolean }) {
  const spikes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    return {
      x1: 19 + 11 * Math.cos(a),
      y1: 19 + 11 * Math.sin(a),
      x2: 19 + 19 * Math.cos(a),
      y2: 19 + 19 * Math.sin(a),
    };
  });

  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <defs>
        <radialGradient id="mineGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#757575" />
          <stop offset="60%" stopColor="#2d2d2d" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>
      </defs>
      {/* Spikes */}
      {spikes.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="#555" strokeWidth="3.2" strokeLinecap="round"
        />
      ))}
      {/* Body */}
      <circle cx="19" cy="19" r="10.5" fill="url(#mineGrad)" />
      {/* Body shine */}
      <ellipse cx="14.5" cy="14.5" rx="3.2" ry="1.9" fill="rgba(255,255,255,0.28)" transform="rotate(-35 14.5 14.5)" />
      {/* Fuse */}
      <path d="M19 8.5 Q23 5 27 3.5" stroke="#6d4c41" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Fuse ember */}
      <circle cx="27" cy="3.5" r="2" fill={lit ? "#ff6f00" : "#e65100"} />
      {lit && <circle cx="27" cy="3.5" r="4" fill="rgba(255,111,0,0.35)" />}
    </svg>
  );
}

function HiddenTilePattern() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <polygon
        points="19,7 31,19 19,31 7,19"
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1.5"
      />
      <circle cx="19" cy="19" r="2" fill="rgba(255,255,255,0.04)" />
    </svg>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = "gold",
  pulse,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "green";
  pulse?: boolean;
}) {
  const color = accent === "gold" ? "var(--accent-gold)" : "var(--accent-green)";
  const borderColor = accent === "gold" ? "rgba(240,180,41,0.22)" : "rgba(0,230,118,0.22)";
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.25)",
        border: `1px solid ${borderColor}`,
        borderRadius: "10px",
        padding: "10px 18px",
        textAlign: "center",
        minWidth: "110px",
        animation: pulse ? "pulseGold 2s ease-in-out infinite" : undefined,
      }}
    >
      <div style={{
        fontSize: "0.58rem",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        letterSpacing: "0.18em",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        marginBottom: "3px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: "1.45rem",
        color,
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: "0.65rem",
          color: "var(--text-muted)",
          marginTop: "2px",
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {sub}
        </div>
      )}
    </div>
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

  // Background
  let bg: string;
  let borderCol: string;
  let boxShadow: string = "none";

  if (showMine) {
    bg = isHitMine
      ? "linear-gradient(145deg, #4a0d0d, #7a1414)"
      : "linear-gradient(145deg, #2e1010, #421818)";
    borderCol = isHitMine
      ? "rgba(244,67,54,0.75)"
      : "rgba(180,40,40,0.35)";
    if (isHitMine) boxShadow = "0 0 20px rgba(244,67,54,0.4) inset";
  } else if (showGem) {
    bg = "linear-gradient(145deg, #0b2e1a, #0e3d22)";
    borderCol = "rgba(0,230,118,0.5)";
    boxShadow = "0 0 12px rgba(0,230,118,0.2) inset";
  } else {
    bg = "linear-gradient(145deg, #121f2e, #0d1825)";
    borderCol = "rgba(255,255,255,0.07)";
  }

  return (
    <motion.button
      onClick={() => isActive && onClick(index)}
      whileHover={isActive ? { scale: 1.07, y: -2 } : {}}
      whileTap={isActive ? { scale: 0.93 } : {}}
      animate={isHitMine ? { x: [0, -7, 7, -5, 5, -2, 2, 0] } : {}}
      transition={isHitMine ? { duration: 0.45 } : { type: "spring", stiffness: 300, damping: 20 }}
      style={{
        aspectRatio: "1",
        background: bg,
        border: `1.5px solid ${borderCol}`,
        borderRadius: "10px",
        cursor: isActive ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        outline: "none",
        padding: 0,
        boxShadow,
        transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
      }}
    >
      {/* Hover shimmer overlay */}
      {isActive && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(100,160,255,0.06) 0%, transparent 60%)",
          borderRadius: "inherit",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.2s",
        }} />
      )}

      {/* Gem */}
      {showGem && (
        <motion.div
          initial={{ scale: 0, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          style={{ display: "flex", filter: "drop-shadow(0 0 6px rgba(0,230,118,0.5))" }}
        >
          <GemIcon />
        </motion.div>
      )}

      {/* Mine */}
      {showMine && (
        <motion.div
          initial={isUnrevealedMine ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={isUnrevealedMine
            ? { type: "spring", stiffness: 260, damping: 18, delay: revealDelay }
            : {}
          }
          style={{
            display: "flex",
            filter: isHitMine
              ? "drop-shadow(0 0 10px rgba(244,67,54,0.8))"
              : "drop-shadow(0 0 4px rgba(200,50,50,0.4))",
          }}
        >
          <MineIcon lit={isHitMine} />
        </motion.div>
      )}

      {/* Hidden */}
      {!showGem && !showMine && (
        <div style={{ opacity: phase === "idle" ? 0.6 : 1, transition: "opacity 0.3s" }}>
          <HiddenTilePattern />
        </div>
      )}
    </motion.button>
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

  // Staggered mine reveal delays for game-over animation
  const mineRevealDelays: number[] = Array(TOTAL).fill(0);
  if (phase === "dead" || phase === "cashout") {
    let counter = 0;
    for (let i = 0; i < TOTAL; i++) {
      if (minePositions[i] && !revealed[i]) {
        mineRevealDelays[i] = 0.05 + counter * 0.055;
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

      // Auto-cashout when all safe tiles found
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

  const showStats = (phase === "playing" && safeRevealed > 0) || phase === "cashout";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top stats bar ── */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            key="statsbar"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              display: "flex",
              gap: "10px",
              padding: "12px 20px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-color)",
              justifyContent: "center",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <StatCard
              label="Multiplier"
              value={`${mult.toFixed(2)}x`}
              accent="gold"
              pulse={phase === "playing"}
            />
            {phase === "playing" && (
              <StatCard
                label="Next Tile"
                value={`${nextMult.toFixed(2)}x`}
                sub="if safe"
                accent="green"
              />
            )}
            <StatCard
              label={phase === "cashout" ? "Won" : "Profit"}
              value={`+$${profit.toFixed(2)}`}
              sub={`$${cashoutTotal.toFixed(2)} total`}
              accent="green"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main grid area ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        overflow: "auto",
        position: "relative",
        gap: "16px",
      }}>
        {/* Page title */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "4px",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <line key={i}
                  x1={10 + 5 * Math.cos(a)} y1={10 + 5 * Math.sin(a)}
                  x2={10 + 9 * Math.cos(a)} y2={10 + 9 * Math.sin(a)}
                  stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"
                />
              );
            })}
            <circle cx="10" cy="10" r="4.5" fill="var(--text-muted)" />
            <ellipse cx="7.5" cy="7.5" rx="1.3" ry="0.8" fill="rgba(255,255,255,0.3)" transform="rotate(-35 7.5 7.5)" />
          </svg>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.18em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}>
            Mines &mdash; {mineCount} {mineCount === 1 ? "mine" : "mines"} hidden
          </span>
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {(phase === "dead" || phase === "cashout") && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.75, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.25 }}
            >
              <div className={`result-banner ${phase === "cashout" ? "win" : "lose"}`}
                style={{ fontSize: "1.6rem", padding: "10px 28px" }}>
                {phase === "cashout"
                  ? `CASHED OUT  +$${(finalPayout - bet).toFixed(2)}`
                  : `MINE!  -$${bet.toFixed(2)}`
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* THE GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "clamp(5px, 1.2vw, 9px)",
          width: "100%",
          maxWidth: "460px",
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

        {/* Mine count indicator pills during play */}
        {phase === "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.1em",
            }}>
              {safeRevealed} safe revealed &nbsp;·&nbsp; {TOTAL - mineCount - safeRevealed} remaining
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        padding: "14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flexShrink: 0,
      }}>

        {/* ── IDLE: mine count + bet + start ── */}
        {phase === "idle" && (
          <>
            {/* Mine count presets */}
            <div style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              <span style={{
                fontSize: "0.68rem",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginRight: "2px",
              }}>
                Mines:
              </span>
              {MINE_PRESETS.map(n => (
                <motion.button
                  key={n}
                  onClick={() => setMineCount(n)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    background: mineCount === n
                      ? "rgba(244,67,54,0.18)"
                      : "rgba(255,255,255,0.05)",
                    border: mineCount === n
                      ? "1.5px solid rgba(244,67,54,0.55)"
                      : "1.5px solid rgba(255,255,255,0.09)",
                    borderRadius: "6px",
                    color: mineCount === n ? "#ef5350" : "var(--text-secondary)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    padding: "4px 11px",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  }}
                >
                  {n}
                </motion.button>
              ))}
            </div>

            {/* Chips */}
            <div style={{
              display: "flex",
              gap: "14px",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              {[1, 5, 10, 25].map(val => (
                <CasinoChip
                  key={val}
                  value={val}
                  onClick={handleAddBet}
                  disabled={pendingBet >= balance || val > balance - pendingBet}
                />
              ))}
            </div>

            {/* Bet display + start */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              flexWrap: "wrap",
            }}>
              {/* Bet display */}
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: "130px",
              }}>
                <span style={{
                  color: "var(--text-muted)",
                  fontSize: "0.7rem",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.12em",
                }}>
                  BET
                </span>
                <span style={{
                  color: "var(--text-primary)",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                }}>
                  ${pendingBet.toFixed(2)}
                </span>
                {pendingBet > 0 && (
                  <button
                    onClick={() => setPendingBet(0)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      padding: 0,
                      lineHeight: 1,
                      marginLeft: "auto",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <motion.button
                className="btn-primary"
                onClick={handleStartGame}
                disabled={pendingBet <= 0 || pendingBet > balance}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  fontSize: "1.05rem",
                  padding: "11px 34px",
                  background: "linear-gradient(135deg, #e53935, #c62828)",
                  boxShadow: "0 4px 15px rgba(229,57,53,0.35)",
                }}
              >
                START GAME
              </motion.button>
            </div>
          </>
        )}

        {/* ── PLAYING ── */}
        {phase === "playing" && (
          <div style={{
            display: "flex",
            gap: "14px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            <div style={{
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.06em",
            }}>
              Bet:{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                ${bet.toFixed(2)}
              </span>
              {" "}·{" "}
              <span style={{ color: "#ef5350" }}>{mineCount} mines</span>
            </div>

            <motion.button
              className="btn-primary"
              onClick={handleCashout}
              disabled={safeRevealed === 0}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                fontSize: "1.05rem",
                padding: "11px 34px",
                opacity: safeRevealed === 0 ? 0.5 : 1,
              }}
            >
              {safeRevealed === 0
                ? "PICK A TILE"
                : `CASH OUT  $${cashoutTotal.toFixed(2)}`}
            </motion.button>
          </div>
        )}

        {/* ── RESULT: dead / cashout ── */}
        {(phase === "dead" || phase === "cashout") && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <motion.button
              className="btn-primary"
              onClick={handlePlayAgain}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ fontSize: "1.05rem", padding: "11px 48px" }}
            >
              PLAY AGAIN
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
