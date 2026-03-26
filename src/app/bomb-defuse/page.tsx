"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { CSSProperties, ReactNode } from "react";
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
const WIRE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#f8fafc", "#f97316"];

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

  const wires = useMemo(() => {
    return WIRE_COLORS.map((_, idx) => {
      const isCut = state.cut[idx];
      const isBomb = state.bombPositions[idx];
      const revealAll = state.phase === "dead" || state.phase === "cashout";
      return {
        isCut,
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
      <div className="game-panel" style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.05rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Bomb Defuse</h2>
          <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>6 wires</div>
        </div>
        <PanelDivider />

        {state.phase === "idle" && (
          <>
            <div>
              <Label>Difficulty</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {BOMB_PRESETS.map((count) => (
                  <button key={count} onClick={() => dispatch({ type: "set-bomb-count", value: count })} style={{ ...presetBtn, ...(state.bombCount === count ? presetBtnActive : {}) }}>
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <PanelDivider />

            <div>
              <Label>Bet Amount</Label>
              <div style={{ border: "1px solid rgba(148,163,184,0.28)", borderRadius: 8, padding: "7px 10px", background: "rgba(15,23,42,0.5)" }}>
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
                  style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: "var(--text-primary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.05rem", fontWeight: 700 }}
                />
              </div>
            </div>

            <CollapsibleBetSelector>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[1, 5, 10, 25, 50, 100].map((value) => (
                  <CasinoChip key={value} value={value} onClick={addBet} disabled={state.pendingBet >= balance || value > balance - state.pendingBet} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
                <button style={utilityBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round((state.pendingBet / 2) * 100) / 100 })}>Half</button>
                <button style={utilityBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round(Math.min(balance, state.pendingBet * 2) * 100) / 100 })}>Double</button>
                <button style={utilityBtn} onClick={() => dispatch({ type: "set-pending-bet", value: Math.round(balance * 100) / 100 })}>All In</button>
              </div>
            </CollapsibleBetSelector>

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={state.pendingBet <= 0 || state.pendingBet > balance} onClick={startGame} style={{ width: "100%", marginTop: "auto", padding: 13, background: "linear-gradient(135deg,#dc2626,#b91c1c)", boxShadow: "0 8px 26px rgba(220,38,38,0.4)" }}>
              START DEFUSING
            </motion.button>
          </>
        )}

        {state.phase === "playing" && (
          <>
            <div style={{ textAlign: "center", padding: "2px 0" }}>
              <Label>Current Multiplier</Label>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2.3rem", fontWeight: 800, color: "var(--accent-gold)", lineHeight: 1 }}>{currentMult.toFixed(2)}×</div>
            </div>
            <PanelDivider />
            <Stat label="Next Cut" value={`${nextMult.toFixed(2)}×`} accent="green" />
            <Stat label="Potential" value={`$${fmtMoney(currentPayout)}`} />
            <Stat label="Safe Remaining" value={`${safeTotal - state.safeCut}`} />

            <motion.button className="btn-primary" whileHover={{ scale: canCashout ? 1.03 : 1 }} whileTap={{ scale: canCashout ? 0.97 : 1 }} disabled={!canCashout} onClick={cashout} style={{ width: "100%", marginTop: "auto", padding: 13, background: "linear-gradient(135deg,#22c55e,#15803d)", boxShadow: "0 8px 24px rgba(34,197,94,0.35)", opacity: canCashout ? 1 : 0.5 }}>
              CASH OUT ${fmtMoney(currentPayout)}
            </motion.button>
          </>
        )}

        {(state.phase === "dead" || state.phase === "cashout") && (
          <>
            <div style={{ textAlign: "center", paddingTop: 4 }}>
              <div style={{ ...label, color: state.phase === "cashout" ? "#4ade80" : "#fca5a5" }}>{state.phase === "cashout" ? "Bomb Defused" : "Detonation"}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2.1rem", fontWeight: 800, color: state.phase === "cashout" ? "#4ade80" : "#f87171", lineHeight: 1 }}>
                {state.phase === "cashout" ? `+$${fmtMoney(state.finalPayout - state.bet)}` : `-$${fmtMoney(state.bet)}`}
              </div>
            </div>
            <PanelDivider />
            <Stat label="Multiplier" value={`${currentMult.toFixed(2)}×`} accent="gold" />
            <Stat label="Safe Cuts" value={`${state.safeCut} / ${safeTotal}`} />

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => dispatch({ type: "play-again" })} style={{ width: "100%", marginTop: "auto", padding: 12 }}>
              PLAY AGAIN
            </motion.button>
          </>
        )}
      </div>

      <motion.div
        animate={state.phase === "dead" ? { x: [0, -7, 7, -5, 5, -2, 2, 0], y: [0, -2, 2, -1, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.5 }}
        style={boardWrapStyle}
      >
        <div style={ambientGlow} />

        <AnimatePresence>
          {state.phase === "dead" && <ExplosionOverlay />}
        </AnimatePresence>

        <div style={boardStyle}>
          <div style={headerBoardStyle}>
            <span style={{ fontSize: "0.66rem", color: "rgba(226,232,240,0.7)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Circuit Board</span>
            <span style={{ fontSize: "0.66rem", color: "rgba(251,191,36,0.85)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Live Charge</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(76px, 1fr))", gap: 10 }}>
            {WIRE_COLORS.map((wireColor, idx) => (
              <WireCell
                key={idx}
                index={idx}
                color={wireColor}
                state={wires[idx]}
                phase={state.phase}
                isHit={state.hitIdx === idx}
                onCut={cutWire}
              />
            ))}
          </div>
        </div>

        {(state.phase === "dead" || state.phase === "cashout") && (
          <div className={`result-banner ${state.phase === "cashout" ? "win" : "lose"}`} style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", fontSize: "1.32rem", padding: "9px 24px", zIndex: 30 }}>
            {state.phase === "cashout" ? `DEFUSED +$${fmtMoney(state.finalPayout - state.bet)}` : `BOOM -$${fmtMoney(state.bet)}`}
          </div>
        )}

        {state.phase === "playing" && (
          <p style={{ position: "absolute", bottom: 12, margin: 0, fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Safe cuts: {state.safeCut} · Bombs: {state.bombCount}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function WireCell({
  index,
  color,
  state,
  phase,
  isHit,
  onCut,
}: {
  index: number;
  color: string;
  state: { isCut: boolean; showSafe: boolean; showBomb: boolean; showHiddenSafe: boolean };
  phase: Phase;
  isHit: boolean;
  onCut: (idx: number) => void;
}) {
  const clickable = phase === "playing" && !state.isCut;
  return (
    <motion.button
      onClick={() => onCut(index)}
      whileHover={clickable ? { y: -4, scale: 1.03 } : {}}
      whileTap={clickable ? { scale: 0.94 } : {}}
      animate={isHit ? { rotate: [0, -3, 3, -2, 2, 0] } : { rotate: 0 }}
      transition={isHit ? { duration: 0.4 } : { type: "spring", stiffness: 260, damping: 19 }}
      style={{
        border: "1px solid rgba(148,163,184,0.2)",
        borderRadius: 13,
        background: state.showBomb ? "linear-gradient(180deg, rgba(127,29,29,0.72), rgba(69,10,10,0.65))" : state.showSafe || state.showHiddenSafe ? "linear-gradient(180deg, rgba(20,83,45,0.55), rgba(5,46,22,0.5))" : "linear-gradient(180deg, rgba(15,23,42,0.8), rgba(2,6,23,0.8))",
        minHeight: 272,
        position: "relative",
        cursor: clickable ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {!state.isCut && phase === "playing" && (
        <motion.div
          animate={{ x: ["-100%", "160%"] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }}
          style={{ position: "absolute", top: 0, left: 0, width: "58%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)", transform: "skewX(-18deg)", pointerEvents: "none" }}
        />
      )}

      <svg viewBox="0 0 70 210" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id={`wire-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {!state.isCut && <path d="M35 10 C 29 72, 39 138, 35 198" stroke={`url(#wire-${index})`} strokeWidth="11" strokeLinecap="round" fill="none" />}
        {state.isCut && (
          <>
            <path d="M35 10 C 30 66, 38 96, 29 116" stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" />
            <path d="M40 122 C 46 145, 41 173, 35 198" stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" opacity="0.7" />
            <line x1="31" y1="116" x2="40" y2="122" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
      </svg>

      {(state.showSafe || state.showHiddenSafe) && <span style={safeBadge}>{state.showSafe ? "✓" : "○"}</span>}
      {state.showBomb && <span style={bombBadge}>💣</span>}
    </motion.button>
  );
}

function ExplosionOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}
    >
      <motion.div
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 1.75, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ position: "absolute", left: "50%", top: "49%", width: 420, height: 420, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,146,60,0.7) 0%, rgba(239,68,68,0.35) 45%, rgba(127,29,29,0) 75%)" }}
      />

      <motion.svg
        viewBox="0 0 600 420"
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: [0, 1, 0.85, 0], scale: [0.55, 1, 1.08, 1.15] }}
        transition={{ duration: 0.8, times: [0, 0.2, 0.55, 1] }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <g transform="translate(300 205)">
          {Array.from({ length: 22 }).map((_, i) => {
            const angle = (i / 22) * Math.PI * 2;
            const x = Math.cos(angle) * 150;
            const y = Math.sin(angle) * 120;
            return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="rgba(253,186,116,0.8)" strokeWidth="8" strokeLinecap="round" />;
          })}
          <circle r="64" fill="rgba(251,146,60,0.9)" />
          <circle r="38" fill="rgba(254,215,170,0.95)" />
        </g>
      </motion.svg>
    </motion.div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div style={label}>{children}</div>;
}

function PanelDivider() {
  return <div style={{ height: 1, background: "var(--border-color)" }} />;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "gold" }) {
  const color = accent === "green" ? "#4ade80" : accent === "gold" ? "var(--accent-gold)" : "var(--text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={label}>{label}</span>
      <span style={{ color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>{value}</span>
    </div>
  );
}

const panelStyle: CSSProperties = {
  width: 220,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "18px 14px",
  background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
  borderRight: "1px solid var(--border-color)",
};

const boardWrapStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  padding: 20,
  overflow: "hidden",
  backgroundColor: "#080f19",
  backgroundImage: "radial-gradient(circle at 24px 24px, rgba(71,85,105,0.17) 2px, transparent 0), linear-gradient(135deg, rgba(255,255,255,0.03), transparent)",
  backgroundSize: "28px 28px, auto",
};

const ambientGlow: CSSProperties = {
  position: "absolute",
  inset: "18% 16%",
  borderRadius: 26,
  background: "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.16), rgba(15,23,42,0))",
  filter: "blur(20px)",
  pointerEvents: "none",
};

const boardStyle: CSSProperties = {
  width: "min(860px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.2)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))",
  padding: 16,
  boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
  position: "relative",
  zIndex: 10,
};

const headerBoardStyle: CSSProperties = {
  height: 18,
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.3)",
  background: "linear-gradient(90deg, rgba(51,65,85,0.6), rgba(15,23,42,0.7))",
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 10px",
};

const label: CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.65rem",
  letterSpacing: "0.16em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 6,
};

const presetBtn: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 6,
  background: "rgba(30,41,59,0.45)",
  color: "var(--text-secondary)",
  padding: "5px 0",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700,
  cursor: "pointer",
};

const presetBtnActive: CSSProperties = {
  border: "1px solid rgba(239,68,68,0.75)",
  background: "rgba(239,68,68,0.2)",
  color: "#fca5a5",
};

const utilityBtn: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 6,
  background: "rgba(30,41,59,0.45)",
  color: "var(--text-secondary)",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.74rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  padding: "6px 0",
};

const safeBadge: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "rgba(34,197,94,0.22)",
  color: "#4ade80",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
};

const bombBadge: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "rgba(239,68,68,0.24)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.86rem",
};
