"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useLiveEvents } from "@/context/LiveEventsContext";
import { useUser } from "@/context/UserContext";
import GameLiveEventBanner from "@/components/GameLiveEventBanner";
import { logFeedEvent } from "@/lib/feed";
import { fmtMoney } from "@/lib/format";
import { CasinoChip } from "@/components/CasinoChip";
import {
  SlotSymbol,
  buildStrip,
  generateResults,
  checkWins,
  calculateTotalPayout,
  winLabel,
} from "@/lib/slots";
import {
  playSlotsReel,
  playReelStop,
  playSlotsWin,
  playSlotsBigWin,
  playLose,
} from "@/lib/sound";

// ── Constants ────────────────────────────────────────────────────────────────

const SYMBOL_H = 80;
const VISIBLE_ROWS = 4;
const STRIP_RANDOMS = 28;
const TOTAL_STRIP = STRIP_RANDOMS + VISIBLE_ROWS;
const FINAL_Y = -((TOTAL_STRIP - VISIBLE_ROWS) * SYMBOL_H); // -2240px

const SPIN_DURATIONS = [0.82, 1.05, 1.28, 1.51, 1.74]; // staggered reel stops

type Phase = "idle" | "spinning" | "result";

const PAYLINE_COLORS = [
  "rgba(240,180,41,0.18)",
  "rgba(0,230,118,0.13)",
  "rgba(100,180,255,0.13)",
  "rgba(255,120,200,0.13)",
];
const PAYLINE_BORDERS = [
  "rgba(240,180,41,0.5)",
  "rgba(0,230,118,0.4)",
  "rgba(100,180,255,0.4)",
  "rgba(255,120,200,0.4)",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeInitialStrips(): SlotSymbol[][] {
  const seed: SlotSymbol[] = ["🔔", "🍀", "🍊", "🎯"];
  return Array.from({ length: 5 }, () => buildStrip(seed));
}

function isBigWin(wins: ReturnType<typeof checkWins>): boolean {
  return wins.some((w) => w.count >= 5);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SlotsPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } =
    useBalance();
  const { getPayoutMultiplier } = useLiveEvents();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [betInput, setBetInput] = useState(""); // raw text the user types
  const [bet, setBet] = useState(0);            // validated numeric bet
  const [strips, setStrips] = useState<SlotSymbol[][]>(makeInitialStrips);

  const resultsRef = useRef<SlotSymbol[][]>([]);
  const betRef = useRef(0);
  betRef.current = bet;

  const [wins, setWins] = useState<ReturnType<typeof checkWins>>([]);
  const [totalPayout, setTotalPayout] = useState(0);
  const [stoppedReels, setStoppedReels] = useState<boolean[]>([
    false, false, false, false, false,
  ]);
  const payoutBoost = getPayoutMultiplier("Slots");

  const reelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const stopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Bet management ───────────────────────────────────────────────────────

  // Sync betInput → bet on blur / enter
  const commitBet = useCallback((raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      setBet(0);
      setBetInput("");
    } else {
      const clamped = Math.min(Math.round(parsed * 100) / 100, balance);
      setBet(clamped);
      setBetInput(String(clamped));
    }
  }, [balance]);

  const addChip = useCallback((value: number) => {
    if (phase !== "idle") return;
    setBet((prev) => {
      const next = Math.min(Math.round((prev + value) * 100) / 100, balance);
      setBetInput(String(next));
      return next;
    });
  }, [phase, balance]);

  const clearBet = useCallback(() => {
    if (phase !== "idle") return;
    setBet(0);
    setBetInput("");
  }, [phase]);

  const halfBet = useCallback(() => {
    if (phase !== "idle") return;
    setBet((prev) => {
      const next = Math.max(0.01, Math.round((prev / 2) * 100) / 100);
      setBetInput(String(next));
      return next;
    });
  }, [phase]);

  const maxBet = useCallback(() => {
    if (phase !== "idle") return;
    const next = Math.round(balance * 100) / 100;
    setBet(next);
    setBetInput(String(next));
  }, [phase, balance]);

  // ── Spin logic ───────────────────────────────────────────────────────────

  const doSpin = useCallback(() => {
    const currentBet = betRef.current;
    if (currentBet <= 0 || balance < currentBet) return;

    const newResults = generateResults();
    resultsRef.current = newResults;
    const newStrips = newResults.map((reelResult) => buildStrip(reelResult));

    subtractBalance(currentBet);
    registerBet();

    setStrips(newStrips);
    setWins([]);
    setTotalPayout(0);
    setStoppedReels([false, false, false, false, false]);
    setPhase("spinning");

    playSlotsReel();

    requestAnimationFrame(() => {
      reelRefs.current.forEach((el) => {
        if (!el) return;
        el.style.transition = "none";
        el.style.transform = "translateY(0px)";
      });

      reelRefs.current[0]?.getBoundingClientRect();

      reelRefs.current.forEach((el, r) => {
        if (!el) return;
        el.style.transition = `transform ${SPIN_DURATIONS[r]}s cubic-bezier(0.08, 0, 0.18, 1)`;
        el.style.transform = `translateY(${FINAL_Y}px)`;
      });

      stopTimersRef.current.forEach(clearTimeout);
      stopTimersRef.current = SPIN_DURATIONS.map((dur, r) =>
        setTimeout(() => {
          playReelStop();
          setStoppedReels((prev) => {
            const next = [...prev];
            next[r] = true;
            return next;
          });
        }, dur * 1000)
      );

      const maxDuration = Math.max(...SPIN_DURATIONS);
      const resultTimer = setTimeout(() => {
        const results = resultsRef.current;
        const b = betRef.current;
        const rawWins = checkWins(results, b);
        const spinWins = rawWins.map((win) => ({
          ...win,
          multiplier: Math.round(win.multiplier * payoutBoost * 100) / 100,
          payout: Math.round(win.payout * payoutBoost * 100) / 100,
        }));
        const payout = calculateTotalPayout(spinWins);

        setWins(spinWins);
        setTotalPayout(payout);
        setPhase("result");

        if (payout > 0) {
          addBalance(payout);
          if (isBigWin(spinWins)) {
            playSlotsBigWin();
          } else {
            playSlotsWin();
          }
          logFeedEvent(username ?? "Anonymous", "Slots", payout - b, "win");
        } else {
          playLose();
          logFeedEvent(username ?? "Anonymous", "Slots", b, "loss");
        }
        unregisterBet();
      }, maxDuration * 1000 + 80);

      stopTimersRef.current.push(resultTimer);
    });
  }, [balance, subtractBalance, registerBet, addBalance, unregisterBet, username, payoutBoost]);

  const handleSpin = useCallback(() => {
    if (phase !== "idle" || bet <= 0 || balance < bet) return;
    doSpin();
  }, [phase, bet, balance, doSpin]);

  // Return to idle after showing result — fast on loss, longer on win
  useEffect(() => {
    if (phase !== "result") return;
    const delay = wins.length > 0 ? 2500 : 900;
    const t = setTimeout(() => setPhase("idle"), delay);
    return () => clearTimeout(t);
  }, [phase, wins]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTimersRef.current.forEach(clearTimeout);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const isSpinning = phase === "spinning";
  const isResult = phase === "result";
  const hasWin = wins.length > 0;
  const bigWin = isResult && isBigWin(wins);
  const profit = totalPayout - bet;
  const canSpin = phase === "idle" && bet > 0 && balance >= bet;

  const winningRows = new Set(wins.map((w) => w.row));
  const winningCells = new Set(
    wins.flatMap((w) => w.reelIndices.map((r) => `${r}-${w.row}`))
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="game-layout"
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* ── Left panel ───────────────────────────────────────────────── */}
      <div
        className="game-panel"
        style={{
          width: 290,
          minWidth: 290,
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "20px 16px",
          overflowY: "auto",
          background: "var(--bg-secondary)",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1
            className="shimmer-text"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            🎰 Slots
          </h1>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            5 Reels · 4 Rows · 4 Paylines
          </div>
        </div>

        <GameLiveEventBanner gameName="Slots" />

        {/* Balance */}
        <div className="balance-display" style={{ justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <text x="8" y="12" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">$</text>
          </svg>
          <span>${fmtMoney(balance)}</span>
        </div>

        {/* Bet input */}
        <div>
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Bet Amount
          </div>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--accent-gold)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "1.1rem",
                pointerEvents: "none",
              }}
            >
              $
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={betInput}
              onChange={(e) => {
                if (phase !== "idle") return;
                setBetInput(e.target.value);
                const parsed = parseFloat(e.target.value);
                if (!isNaN(parsed) && parsed > 0) {
                  setBet(Math.min(Math.round(parsed * 100) / 100, balance));
                } else {
                  setBet(0);
                }
              }}
              onBlur={(e) => commitBet(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitBet((e.target as HTMLInputElement).value);
                  if (canSpin) doSpin();
                }
              }}
              disabled={isSpinning}
              placeholder="0.00"
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.35)",
                border: `1px solid ${bet > 0 ? "rgba(240,180,41,0.5)" : "var(--border-color)"}`,
                borderRadius: 8,
                padding: "11px 12px 11px 26px",
                color: "var(--text-primary)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "1.3rem",
                letterSpacing: "0.04em",
                outline: "none",
                transition: "border-color 0.2s",
                MozAppearance: "textfield",
              }}
            />
          </div>
        </div>

        {/* Quick-add chips */}
        <div>
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Quick add
          </div>
          <div
            className="bet-chips"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              justifyItems: "center",
            }}
          >
            {[1, 5, 10, 25, 50, 100].map((v) => (
              <CasinoChip
                key={v}
                value={v}
                onClick={addChip}
                disabled={isSpinning || balance < v}
              />
            ))}
          </div>
        </div>

        {/* Bet modifiers */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn-action"
            onClick={clearBet}
            disabled={isSpinning || bet === 0}
            style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
          >
            Clear
          </button>
          <button
            className="btn-action"
            onClick={halfBet}
            disabled={isSpinning || bet < 0.02}
            style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
          >
            ½
          </button>
          <button
            className="btn-action"
            onClick={maxBet}
            disabled={isSpinning || balance === 0}
            style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
          >
            Max
          </button>
        </div>

        {/* Spin button */}
        <button
          className="btn-primary pulse-gold"
          onClick={handleSpin}
          disabled={!canSpin}
          style={{
            width: "100%",
            fontSize: "1.3rem",
            padding: "14px",
            letterSpacing: "0.15em",
            border: "2px solid rgba(240,180,41,0.4)",
          }}
        >
          {isSpinning ? "Spinning..." : isResult ? "Spin Again" : "Spin"}
        </button>

        {/* Payout table */}
        <div
          style={{
            background: "rgba(0,0,0,0.2)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Payout Table
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {[
              { label: "3 of a kind", mult: "2.5×", color: "var(--text-secondary)" },
              { label: "4 of a kind", mult: "8×", color: "var(--accent-green)" },
              { label: "5 of a kind", mult: "30× / 50×", color: "var(--accent-gold)" },
              { label: "5× 💰 or ⭐ JACKPOT", mult: "100×", color: "#ff69b4" },
            ].map((row) => (
              <div
                key={row.label}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 700 }}>{row.mult}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 4,
                paddingTop: 4,
                borderTop: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                fontSize: "0.68rem",
              }}
            >
              💎👑 mid-tier · 💰⭐ rare · 🔔🍀🍊🎯 common
            </div>
          </div>
        </div>
      </div>

      {/* ── Right board: reels ────────────────────────────────────────── */}
      <div
        className="game-board"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          padding: "20px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            width: "100%",
            maxWidth: 600,
          }}
        >
          {/* Reel machine frame */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(160deg, #0d1e2e 0%, #0a1520 100%)",
              border: "2px solid rgba(240,180,41,0.35)",
              borderRadius: 18,
              padding: "10px 10px",
              boxShadow:
                "0 0 40px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.4), 0 0 20px rgba(240,180,41,0.08)",
              width: "100%",
            }}
          >
            {/* Top gold rail */}
            <div
              style={{
                height: 6,
                background:
                  "linear-gradient(90deg, transparent, rgba(240,180,41,0.6), rgba(240,180,41,0.8), rgba(240,180,41,0.6), transparent)",
                borderRadius: 3,
                marginBottom: 8,
              }}
            />

            {/* Payline markers */}
            <div
              style={{
                position: "absolute",
                left: -20,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 0,
                zIndex: 10,
              }}
            >
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  style={{
                    width: 14,
                    height: SYMBOL_H,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: winningRows.has(row)
                        ? PAYLINE_BORDERS[row]
                        : "rgba(255,255,255,0.1)",
                      boxShadow: winningRows.has(row)
                        ? `0 0 8px ${PAYLINE_BORDERS[row]}`
                        : "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Reels */}
            <div style={{ display: "flex", gap: 4, position: "relative" }}>
              {strips.map((strip, reelIdx) => (
                <ReelColumn
                  key={reelIdx}
                  reelIdx={reelIdx}
                  strip={strip}
                  stopped={stoppedReels[reelIdx]}
                  isSpinning={isSpinning}
                  winningCells={winningCells}
                  winningRows={winningRows}
                  reelRef={(el) => {
                    reelRefs.current[reelIdx] = el;
                  }}
                />
              ))}

              {/* Win line overlays */}
              <AnimatePresence>
                {isResult &&
                  wins.map((win, i) => (
                    <WinLineOverlay
                      key={`${win.row}-${win.symbol}-${i}`}
                      win={win}
                      color={PAYLINE_COLORS[win.row]}
                      borderColor={PAYLINE_BORDERS[win.row]}
                    />
                  ))}
              </AnimatePresence>
            </div>

            {/* Bottom gold rail */}
            <div
              style={{
                height: 6,
                background:
                  "linear-gradient(90deg, transparent, rgba(240,180,41,0.6), rgba(240,180,41,0.8), rgba(240,180,41,0.6), transparent)",
                borderRadius: 3,
                marginTop: 8,
              }}
            />
          </div>

          {/* Result banner */}
          <AnimatePresence mode="wait">
            {isResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.45, type: "spring", stiffness: 280, damping: 22 }}
                style={{ width: "100%", maxWidth: 540 }}
              >
                {hasWin ? (
                  <WinBanner
                    wins={wins}
                    totalPayout={totalPayout}
                    bet={bet}
                    profit={profit}
                    isBig={bigWin}
                  />
                ) : (
                  <div
                    style={{
                      background: "rgba(244,67,54,0.08)",
                      border: "1px solid rgba(244,67,54,0.25)",
                      borderRadius: 10,
                      padding: "12px 20px",
                      textAlign: "center",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "rgba(244,67,54,0.8)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    No win · -${fmtMoney(bet)}
                  </div>
                )}
              </motion.div>
            )}

            {isSpinning && (
              <motion.div
                key="spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {stoppedReels.filter(Boolean).length} / 5 reels stopped
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ReelColumnProps {
  reelIdx: number;
  strip: SlotSymbol[];
  stopped: boolean;
  isSpinning: boolean;
  winningCells: Set<string>;
  winningRows: Set<number>;
  reelRef: (el: HTMLDivElement | null) => void;
}

function ReelColumn({
  reelIdx,
  strip,
  stopped,
  isSpinning,
  winningCells,
  winningRows,
  reelRef,
}: ReelColumnProps) {
  return (
    <div
      style={{
        flex: 1,
        height: SYMBOL_H * VISIBLE_ROWS,
        overflow: "hidden",
        position: "relative",
        borderRadius: 8,
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(15,25,35,0.8) 50%, rgba(0,0,0,0.5) 100%)",
        boxShadow: "inset 0 0 18px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Top vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "28%",
          background: "linear-gradient(to bottom, rgba(10,20,30,0.9), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      {/* Bottom vignette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background: "linear-gradient(to top, rgba(10,20,30,0.9), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Symbol strip */}
      <div
        ref={reelRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          transform: `translateY(${FINAL_Y}px)`,
          willChange: "transform",
        }}
      >
        {strip.map((symbol, symbolIdx) => {
          const resultRow = symbolIdx - (strip.length - VISIBLE_ROWS);
          const isWinCell = resultRow >= 0 && winningCells.has(`${reelIdx}-${resultRow}`);
          const isWinRow = resultRow >= 0 && winningRows.has(resultRow);
          const isVisible = stopped || !isSpinning;

          return (
            <SymbolCell
              key={symbolIdx}
              symbol={symbol}
              isWin={isWinCell && isVisible}
              isWinRow={isWinRow && isVisible}
              delay={reelIdx * 0.05 + (resultRow >= 0 ? resultRow * 0.04 : 0)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SymbolCellProps {
  symbol: SlotSymbol;
  isWin: boolean;
  isWinRow: boolean;
  delay: number;
}

function SymbolCell({ symbol, isWin, isWinRow, delay }: SymbolCellProps) {
  return (
    <motion.div
      animate={
        isWin
          ? {
              scale: [1, 1.12, 1.0, 1.08, 1.0],
              filter: [
                "drop-shadow(0 0 0px transparent)",
                "drop-shadow(0 0 12px rgba(240,180,41,0.9))",
                "drop-shadow(0 0 6px rgba(240,180,41,0.7))",
                "drop-shadow(0 0 14px rgba(240,180,41,1))",
                "drop-shadow(0 0 8px rgba(240,180,41,0.8))",
              ],
            }
          : { scale: 1, filter: "drop-shadow(0 0 0px transparent)" }
      }
      transition={
        isWin
          ? { duration: 1.4, repeat: Infinity, delay, ease: "easeInOut" }
          : { duration: 0.2 }
      }
      style={{
        width: "100%",
        height: SYMBOL_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 42,
        userSelect: "none",
        background: isWin
          ? "rgba(240,180,41,0.08)"
          : isWinRow
          ? "rgba(255,255,255,0.02)"
          : "transparent",
        position: "relative",
      }}
    >
      {symbol}
      {isWin && (
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: 6,
            border: "1.5px solid rgba(240,180,41,0.6)",
            boxShadow: "0 0 10px rgba(240,180,41,0.3), inset 0 0 8px rgba(240,180,41,0.1)",
            pointerEvents: "none",
            animation: "pulseGold 1.4s ease-in-out infinite",
          }}
        />
      )}
    </motion.div>
  );
}

interface WinLineOverlayProps {
  win: { row: number; count: number };
  color: string;
  borderColor: string;
}

function WinLineOverlay({ win, color, borderColor }: WinLineOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: win.row * SYMBOL_H,
        left: 0,
        width: `${(win.count / 5) * 100}%`,
        height: SYMBOL_H,
        background: color,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        pointerEvents: "none",
        transformOrigin: "left center",
        zIndex: 1,
      }}
    />
  );
}

interface WinBannerProps {
  wins: ReturnType<typeof checkWins>;
  totalPayout: number;
  bet: number;
  profit: number;
  isBig: boolean;
}

function WinBanner({ wins, totalPayout, bet, profit, isBig }: WinBannerProps) {
  return (
    <div
      style={{
        background: isBig
          ? "linear-gradient(135deg, rgba(240,180,41,0.18), rgba(255,100,100,0.1))"
          : "rgba(0,230,118,0.08)",
        border: `2px solid ${isBig ? "rgba(240,180,41,0.6)" : "rgba(0,230,118,0.4)"}`,
        borderRadius: 12,
        padding: "14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: isBig
          ? "0 0 30px rgba(240,180,41,0.25), 0 0 60px rgba(240,180,41,0.1)"
          : "0 0 20px rgba(0,230,118,0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          {isBig && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--accent-gold)",
                marginBottom: 2,
              }}
            >
              🎉 BIG WIN! 🎉
            </motion.div>
          )}
          <div
            className={isBig ? "shimmer-text" : ""}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "2.2rem",
              fontWeight: 900,
              letterSpacing: "0.05em",
              color: isBig ? "var(--accent-gold)" : "var(--win-color)",
              lineHeight: 1,
            }}
          >
            +${fmtMoney(totalPayout)}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginTop: 2,
            }}
          >
            profit: +${fmtMoney(profit)} · bet: ${fmtMoney(bet)}
          </div>
        </div>
        <div
          style={{
            fontSize: "2.5rem",
            animation: isBig ? "float 2s ease-in-out infinite" : "none",
          }}
        >
          {isBig ? "🏆" : "✨"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {wins.map((win, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 280, damping: 22 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 6,
              padding: "4px 10px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.9rem",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              Row {win.row + 1}: {winLabel(win)}
            </span>
            <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>
              {win.multiplier}× · +${fmtMoney(win.payout)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
