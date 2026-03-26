"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { CasinoChip } from "@/components/CasinoChip";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import { logFeedEvent } from "@/lib/feed";
import { fmtMoney } from "@/lib/format";
import { multiplierAt, placeBombs } from "@/lib/bombDefuse";
import { playCashoutWin, playExplosion, playWireCut } from "@/lib/sound";

const TOTAL_WIRES = 6;
const BOMB_PRESETS = [1, 2, 3, 4] as const;
const WIRE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#e5e7eb", "#f97316"];

type Phase = "idle" | "playing" | "cashout" | "dead";

interface State {
  phase: Phase;
  bombPositions: boolean[];
  cut: boolean[];
  bombCount: number;
  bet: number;
  pendingBet: number;
  safeCut: number;
  hitIdx: number | null;
  finalPayout: number;
}

type Action =
  | { type: "set-bomb-count"; value: number }
  | { type: "set-pending-bet"; value: number }
  | { type: "start"; bet: number; bombs: boolean[] }
  | { type: "safe-cut"; index: number }
  | { type: "bomb-cut"; index: number }
  | { type: "cashout"; payout: number }
  | { type: "play-again" };

const initialState: State = {
  phase: "idle",
  bombPositions: Array(TOTAL_WIRES).fill(false),
  cut: Array(TOTAL_WIRES).fill(false),
  bombCount: 2,
  bet: 0,
  pendingBet: 0,
  safeCut: 0,
  hitIdx: null,
  finalPayout: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-bomb-count":
      if (state.phase !== "idle") return state;
      return { ...state, bombCount: action.value };
    case "set-pending-bet":
      if (state.phase !== "idle") return state;
      return { ...state, pendingBet: action.value };
    case "start":
      return {
        ...state,
        phase: "playing",
        bombPositions: action.bombs,
        cut: Array(TOTAL_WIRES).fill(false),
        bet: action.bet,
        safeCut: 0,
        hitIdx: null,
        finalPayout: 0,
      };
    case "safe-cut": {
      const updated = [...state.cut];
      updated[action.index] = true;
      return { ...state, cut: updated, safeCut: state.safeCut + 1 };
    }
    case "bomb-cut": {
      const updated = [...state.cut];
      updated[action.index] = true;
      return { ...state, cut: updated, hitIdx: action.index, phase: "dead", finalPayout: 0 };
    }
    case "cashout":
      return { ...state, phase: "cashout", finalPayout: action.payout };
    case "play-again":
      return {
        ...state,
        phase: "idle",
        bombPositions: Array(TOTAL_WIRES).fill(false),
        cut: Array(TOTAL_WIRES).fill(false),
        bet: 0,
        safeCut: 0,
        hitIdx: null,
        finalPayout: 0,
      };
    default:
      return state;
  }
}

export default function BombDefusePage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentMult = multiplierAt(state.bombCount, state.safeCut);
  const nextMult = multiplierAt(state.bombCount, state.safeCut + 1);
  const safeTotal = TOTAL_WIRES - state.bombCount;
  const canCashout = state.phase === "playing" && state.safeCut > 0;
  const currentPayout = canCashout ? Math.round(state.bet * currentMult * 100) / 100 : 0;

  const shownWireState = useMemo(() => {
    return WIRE_COLORS.map((_, idx) => {
      const isCut = state.cut[idx];
      const isBomb = state.bombPositions[idx];
      const revealAll = state.phase === "dead" || state.phase === "cashout";
      return {
        isCut,
        isBomb,
        showSafe: isCut && !isBomb,
        showBomb: (isCut && isBomb) || (revealAll && isBomb),
        showHiddenSafe: revealAll && !isBomb && !isCut,
      };
    });
  }, [state]);

  const addBet = useCallback((value: number) => {
    if (state.phase !== "idle") return;
    const allowed = Math.min(value, balance - state.pendingBet);
    if (allowed <= 0) return;
    dispatch({ type: "set-pending-bet", value: Math.round((state.pendingBet + allowed) * 100) / 100 });
  }, [balance, state.pendingBet, state.phase]);

  const startGame = useCallback(() => {
    if (state.phase !== "idle" || state.pendingBet <= 0 || state.pendingBet > balance) return;
    subtractBalance(state.pendingBet);
    registerBet();
    dispatch({ type: "start", bet: state.pendingBet, bombs: placeBombs(state.bombCount) });
  }, [balance, registerBet, state, subtractBalance]);

  const cutWire = useCallback((index: number) => {
    if (state.phase !== "playing" || state.cut[index]) return;
    const isBomb = state.bombPositions[index];

    if (isBomb) {
      dispatch({ type: "bomb-cut", index });
      unregisterBet();
      playExplosion();
      if (username) logFeedEvent(username, "Bomb Defuse", state.bet, "loss");
      return;
    }

    playWireCut();
    const nextSafeCut = state.safeCut + 1;
    dispatch({ type: "safe-cut", index });

    if (nextSafeCut === safeTotal) {
      const maxMult = multiplierAt(state.bombCount, nextSafeCut);
      const payout = Math.round(state.bet * maxMult * 100) / 100;
      addBalance(payout);
      unregisterBet();
      dispatch({ type: "cashout", payout });
      playCashoutWin();
      if (username) logFeedEvent(username, "Bomb Defuse", payout - state.bet, "win");
    }
  }, [addBalance, safeTotal, state, unregisterBet, username]);

  const cashout = useCallback(() => {
    if (!canCashout) return;
    const payout = Math.round(state.bet * currentMult * 100) / 100;
    addBalance(payout);
    unregisterBet();
    dispatch({ type: "cashout", payout });
    playCashoutWin();
    if (username) logFeedEvent(username, "Bomb Defuse", payout - state.bet, "win");
  }, [addBalance, canCashout, currentMult, state.bet, unregisterBet, username]);

  return (
    <div className="game-layout" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <div className="game-panel" style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, padding: "18px 14px", background: "var(--bg-secondary)", borderRight: "1px solid var(--border-color)" }}>
        <h2 style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Bomb Defuse</h2>
        <div style={{ height: 1, background: "var(--border-color)" }} />

        {state.phase === "idle" && (
          <>
            <div>
              <div style={labelStyle}>Bomb Count</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {BOMB_PRESETS.map((count) => (
                  <button key={count} onClick={() => dispatch({ type: "set-bomb-count", value: count })} style={{ ...chipBtn, ...(state.bombCount === count ? activeChipBtn : null) }}>
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-color)" }} />
            <div>
              <div style={labelStyle}>Bet Amount</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.pendingBet || ""}
                onChange={(e) => {
                  const next = parseFloat(e.target.value);
                  dispatch({ type: "set-pending-bet", value: Number.isNaN(next) ? 0 : Math.min(balance, Math.max(0, Math.round(next * 100) / 100)) });
                }}
                placeholder="0.00"
                style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.2)", color: "var(--text-primary)", padding: "8px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}
              />
            </div>

            <CollapsibleBetSelector>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[1, 5, 10, 25, 50, 100].map((value) => (
                  <CasinoChip key={value} value={value} onClick={addBet} disabled={state.pendingBet >= balance || value > balance - state.pendingBet} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
                <button style={utilBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round((state.pendingBet / 2) * 100) / 100 })}>Half</button>
                <button style={utilBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round(Math.min(balance, state.pendingBet * 2) * 100) / 100 })}>Double</button>
                <button style={utilBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round(balance * 100) / 100 })}>All In</button>
              </div>
            </CollapsibleBetSelector>

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={state.pendingBet <= 0 || state.pendingBet > balance} onClick={startGame} style={{ width: "100%", marginTop: "auto", padding: 12 }}>
              START DEFUSING
            </motion.button>
          </>
        )}

        {state.phase === "playing" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={labelStyle}>Current Multiplier</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "var(--accent-gold)" }}>{currentMult.toFixed(2)}×</div>
            </div>
            <div style={{ height: 1, background: "var(--border-color)" }} />
            <Stat label="Next Cut" value={`${nextMult.toFixed(2)}×`} />
            <Stat label="Potential" value={`$${fmtMoney(currentPayout)}`} />
            <Stat label="Safe Remaining" value={`${safeTotal - state.safeCut}`} />
            <motion.button className="btn-primary" whileHover={{ scale: canCashout ? 1.03 : 1 }} whileTap={{ scale: canCashout ? 0.97 : 1 }} disabled={!canCashout} onClick={cashout} style={{ width: "100%", marginTop: "auto", padding: 12, background: "linear-gradient(135deg,#22c55e,#15803d)", opacity: canCashout ? 1 : 0.55 }}>
              CASH OUT ${fmtMoney(currentPayout)}
            </motion.button>
          </>
        )}

        {(state.phase === "dead" || state.phase === "cashout") && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ ...labelStyle, color: state.phase === "cashout" ? "var(--accent-green)" : "#f87171" }}>{state.phase === "cashout" ? "Defused" : "Explosion"}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, color: state.phase === "cashout" ? "var(--accent-green)" : "#f87171" }}>
                {state.phase === "cashout" ? `+$${fmtMoney(state.finalPayout - state.bet)}` : `-$${fmtMoney(state.bet)}`}
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border-color)" }} />
            <Stat label="Multiplier" value={`${currentMult.toFixed(2)}×`} />
            <Stat label="Safe Cuts" value={`${state.safeCut} / ${safeTotal}`} />
            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => dispatch({ type: "play-again" })} style={{ width: "100%", marginTop: "auto", padding: 12 }}>
              PLAY AGAIN
            </motion.button>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: 20, backgroundColor: "#0d141d", backgroundImage: "radial-gradient(circle at 25px 25px, rgba(100,116,139,0.1) 2px, transparent 0), linear-gradient(135deg, rgba(255,255,255,0.03), transparent)", backgroundSize: "26px 26px, auto" }}>
        <AnimatePresence>
          {state.phase === "dead" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.09)", pointerEvents: "none" }} />
          )}
        </AnimatePresence>

        <div style={{ width: "min(780px, 100%)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, #111827, #0b1220)", padding: 20 }}>
          <div style={{ height: 16, borderRadius: 999, background: "linear-gradient(90deg, rgba(148,163,184,0.35), rgba(71,85,105,0.2))", marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(70px, 1fr))", gap: 10 }}>
            {WIRE_COLORS.map((wireColor, idx) => {
              const wire = shownWireState[idx];
              const isClickable = state.phase === "playing" && !state.cut[idx];
              const isHit = state.hitIdx === idx;
              return (
                <motion.button
                  key={wireColor}
                  onClick={() => cutWire(idx)}
                  whileHover={isClickable ? { y: -2, scale: 1.03 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                  animate={isHit ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                  transition={isHit ? { duration: 0.45 } : { type: "spring", stiffness: 260, damping: 18 }}
                  style={{
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 12,
                    background: wire.showBomb ? "rgba(127,29,29,0.45)" : wire.showSafe || wire.showHiddenSafe ? "rgba(20,83,45,0.35)" : "rgba(15,23,42,0.65)",
                    padding: "8px 6px 10px",
                    cursor: isClickable ? "pointer" : "default",
                    minHeight: 250,
                    position: "relative",
                  }}
                >
                  <svg viewBox="0 0 70 210" style={{ width: "100%", height: "100%" }}>
                    <defs>
                      <linearGradient id={`wire-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={wireColor} stopOpacity="0.95" />
                        <stop offset="100%" stopColor={wireColor} stopOpacity="0.55" />
                      </linearGradient>
                    </defs>
                    {!wire.isCut && (
                      <path d="M35 8 C 30 70, 40 130, 35 196" stroke={`url(#wire-${idx})`} strokeWidth="11" strokeLinecap="round" fill="none" />
                    )}
                    {wire.isCut && (
                      <>
                        <path d="M35 8 C 30 70, 36 98, 30 116" stroke={wireColor} strokeWidth="11" strokeLinecap="round" fill="none" />
                        <path d="M39 122 C 46 145, 40 173, 34 198" stroke={wireColor} strokeWidth="11" strokeLinecap="round" fill="none" opacity="0.7" />
                      </>
                    )}
                  </svg>

                  {(wire.showSafe || wire.showHiddenSafe) && <span style={badgeSafe}>{wire.showSafe ? "✓" : "○"}</span>}
                  {wire.showBomb && <span style={badgeBomb}>💣</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {(state.phase === "dead" || state.phase === "cashout") && (
          <div className={`result-banner ${state.phase === "cashout" ? "win" : "lose"}`} style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", fontSize: "1.2rem", padding: "8px 20px" }}>
            {state.phase === "cashout" ? `DEFUSED +$${fmtMoney(state.finalPayout - state.bet)}` : `BOOM -$${fmtMoney(state.bet)}`}
          </div>
        )}

        {state.phase === "playing" && (
          <p style={{ position: "absolute", bottom: 12, margin: 0, fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Safe cuts: {state.safeCut} · Bombs: {state.bombCount}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Barlow Condensed', sans-serif" }}>
      <span style={{ color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.68rem" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.65rem",
  letterSpacing: "0.16em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  marginBottom: 6,
  fontWeight: 700,
};

const chipBtn: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  background: "rgba(255,255,255,0.05)",
  color: "var(--text-secondary)",
  padding: "5px 0",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700,
  cursor: "pointer",
};

const activeChipBtn: CSSProperties = {
  border: "1px solid rgba(239,68,68,0.7)",
  background: "rgba(239,68,68,0.2)",
  color: "#fca5a5",
};

const utilBtn: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  color: "var(--text-secondary)",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  padding: "6px 0",
};

const badgeSafe: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 22,
  height: 22,
  borderRadius: 999,
  background: "rgba(34,197,94,0.2)",
  color: "#4ade80",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.95rem",
};

const badgeBomb: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "rgba(239,68,68,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.9rem",
};
