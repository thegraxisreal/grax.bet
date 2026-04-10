"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import { CasinoChip } from "@/components/CasinoChip";
import { fmtMoney } from "@/lib/format";
import { logFeedEvent } from "@/lib/feed";
import { playCashoutWin, playChipClick, playLose, playWireCut } from "@/lib/sound";

type Phase = "idle" | "playing" | "dead" | "cashout";
type TileState = "hidden" | "safe" | "trap";

interface LanesRow {
  trapIndex: number;
  revealedIndex: number | null;
}

interface CrashScene {
  row: number;
  tile: number;
  id: number;
}

const TILE_COUNT = 3;
const INITIAL_ROW_COUNT = 8;
const ROW_BUFFER = 6;
const SAFE_REVEAL_MS = 320;

const clampMoney = (value: number) => Math.round(value * 100) / 100;

function createRows(count: number): LanesRow[] {
  return Array.from({ length: count }, () => ({
    trapIndex: Math.floor(Math.random() * TILE_COUNT),
    revealedIndex: null,
  }));
}

function getMultiplierForClears(clears: number) {
  return clears <= 0 ? 1 : 2 ** clears;
}

function formatMultiplier(multiplier: number) {
  if (multiplier >= 1000) return `${multiplier.toLocaleString()}x`;
  return `${multiplier}x`;
}

function tileLabel(index: number) {
  return ["Left", "Center", "Right"][index];
}

function ChickenBadge() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="36" rx="19" ry="17" fill="#fbbf24" />
      <circle cx="31" cy="21" r="12" fill="#fde68a" />
      <circle cx="36.5" cy="19" r="4" fill="white" />
      <circle cx="38" cy="19" r="2" fill="#111827" />
      <path d="M24 13 Q24 6 29 8 Q30 3 34 6 Q36 2 40 6 Q39 10 38 13" fill="#ef4444" />
      <polygon points="42,22 52,19 43,27" fill="#f97316" />
      <ellipse cx="22" cy="38" rx="7" ry="8" fill="#f59e0b" opacity="0.85" />
      <line x1="28" y1="51" x2="25" y2="59" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="51" x2="39" y2="59" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FeatherBurst() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 120" fill="none">
      {[
        { x: 30, y: 78, r: -25, color: "#fbbf24" },
        { x: 52, y: 28, r: 14, color: "#fde68a" },
        { x: 78, y: 20, r: -10, color: "#f97316" },
        { x: 92, y: 76, r: 22, color: "#fb7185" },
        { x: 120, y: 42, r: -18, color: "#fbbf24" },
      ].map((feather, index) => (
        <g key={index} transform={`translate(${feather.x}, ${feather.y}) rotate(${feather.r})`}>
          <path d="M0 0 C8 -18 24 -20 28 -6 C18 -4 10 4 4 20 C0 16 -2 10 0 0Z" fill={feather.color} opacity="0.9" />
          <line x1="2" y1="18" x2="22" y2="-6" stroke="rgba(120,53,15,0.55)" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function CrashCar({ color = "#ef4444" }: { color?: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 150 76" fill="none">
      <rect x="12" y="24" width="108" height="28" rx="10" fill={color} />
      <rect x="36" y="10" width="52" height="22" rx="8" fill="rgba(255,255,255,0.18)" />
      <rect x="42" y="14" width="17" height="13" rx="3" fill="#93c5fd" opacity="0.9" />
      <rect x="63" y="14" width="17" height="13" rx="3" fill="#93c5fd" opacity="0.9" />
      <circle cx="40" cy="56" r="11" fill="#111827" />
      <circle cx="94" cy="56" r="11" fill="#111827" />
      <circle cx="126" cy="32" r="6" fill="#fde68a" />
      <circle cx="126" cy="44" r="6" fill="#fde68a" />
      <path d="M8 30 L-10 28" stroke="rgba(239,68,68,0.5)" strokeWidth="4" strokeLinecap="round" />
      <path d="M6 39 L-18 39" stroke="rgba(239,68,68,0.4)" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 48 L-12 50" stroke="rgba(239,68,68,0.3)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function ChickenLanesPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingBet, setPendingBet] = useState(0);
  const [bet, setBet] = useState(0);
  const [rows, setRows] = useState<LanesRow[]>(() => createRows(INITIAL_ROW_COUNT));
  const [currentRow, setCurrentRow] = useState(0);
  const [bestClear, setBestClear] = useState(0);
  const [lastPick, setLastPick] = useState<{ row: number; tile: number } | null>(null);
  const [recentResult, setRecentResult] = useState<{ net: number; rowsCleared: number } | null>(null);
  const [crashScene, setCrashScene] = useState<CrashScene | null>(null);
  const [isResolvingSafePick, setIsResolvingSafePick] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearedRows = currentRow;
  const currentMultiplier = getMultiplierForClears(clearedRows);

  const resetBoard = useCallback(() => {
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    setRows(createRows(INITIAL_ROW_COUNT));
    setCurrentRow(0);
    setLastPick(null);
    setCrashScene(null);
    setIsResolvingSafePick(false);
  }, []);

  useEffect(() => {
    if (!crashScene) return;
    const timer = window.setTimeout(() => setCrashScene(null), 760);
    return () => window.clearTimeout(timer);
  }, [crashScene]);

  useEffect(() => {
    return () => {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = scrollAreaRef.current;
    const rowNode = rowRefs.current[currentRow];
    if (!container || !rowNode) return;
    const nextTop = Math.max(0, rowNode.offsetTop - 2);
    container.scrollTo({
      top: nextTop,
      behavior: phase === "idle" ? "auto" : "smooth",
    });
  }, [currentRow, phase]);

  const addBet = useCallback((chip: number) => {
    if (phase !== "idle") return;
    const allowed = Math.min(chip, balance - pendingBet);
    if (allowed <= 0) return;
    setPendingBet((prev) => clampMoney(prev + allowed));
    playChipClick();
  }, [balance, pendingBet, phase]);

  const startRound = useCallback(() => {
    if (phase !== "idle" || pendingBet <= 0 || pendingBet > balance) return;
    subtractBalance(pendingBet);
    registerBet();
    setBet(pendingBet);
    setRecentResult(null);
    resetBoard();
    setPhase("playing");
  }, [balance, pendingBet, phase, registerBet, resetBoard, subtractBalance]);

  const startRoundFromTilePick = useCallback((tileIndex: number) => {
    if (phase !== "idle" || pendingBet <= 0 || pendingBet > balance) return;

    const freshRows = createRows(INITIAL_ROW_COUNT);
    const firstRow = freshRows[0];
    freshRows[0] = { ...firstRow, revealedIndex: tileIndex };

    subtractBalance(pendingBet);
    registerBet();
    setBet(pendingBet);
    setRecentResult(null);
    setLastPick({ row: 0, tile: tileIndex });
    setCrashScene(null);
    setIsResolvingSafePick(false);
    setRows(freshRows);
    setCurrentRow(0);
    setPhase("playing");

    if (tileIndex === firstRow.trapIndex) {
      setCrashScene({ row: 0, tile: tileIndex, id: Date.now() });
      setPhase("dead");
      unregisterBet();
      setRecentResult({ net: -pendingBet, rowsCleared: 0 });
      playLose();
      if (username) logFeedEvent(username, "Chicken Lanes", pendingBet, "loss");
      return;
    }

    setIsResolvingSafePick(true);
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
    }
    resolveTimeoutRef.current = setTimeout(() => {
      resolveTimeoutRef.current = null;
      setIsResolvingSafePick(false);
      setBestClear((prev) => Math.max(prev, 1));
      setCurrentRow(1);
    }, SAFE_REVEAL_MS);
  }, [balance, pendingBet, phase, registerBet, subtractBalance, unregisterBet, username]);

  const settleWin = useCallback((rowsCleared: number, multiplier: number) => {
    const payout = clampMoney(bet * multiplier);
    const net = clampMoney(payout - bet);
    addBalance(payout);
    unregisterBet();
    setPhase("cashout");
    setRecentResult({ net, rowsCleared });
    setBestClear((prev) => Math.max(prev, rowsCleared));
    playCashoutWin();
    if (username) logFeedEvent(username, "Chicken Lanes", net, "win");
  }, [addBalance, bet, unregisterBet, username]);

  const handleTilePick = useCallback((tileIndex: number) => {
    if (phase === "idle") {
      startRoundFromTilePick(tileIndex);
      return;
    }
    if (phase !== "playing" || isResolvingSafePick) return;

    const activeRow = rows[currentRow];
    if (!activeRow || activeRow.revealedIndex !== null) return;

    setLastPick({ row: currentRow, tile: tileIndex });
    playWireCut();

    const nextRows = rows.map((row, index) =>
      index === currentRow ? { ...row, revealedIndex: tileIndex } : row
    );
    setRows(nextRows);

    if (tileIndex === activeRow.trapIndex) {
      setCrashScene({ row: currentRow, tile: tileIndex, id: Date.now() });
      setPhase("dead");
      setIsResolvingSafePick(false);
      unregisterBet();
      setRecentResult({ net: -bet, rowsCleared: currentRow });
      playLose();
      if (username) logFeedEvent(username, "Chicken Lanes", bet, "loss");
      return;
    }

    const cleared = currentRow + 1;
    setIsResolvingSafePick(true);
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
    }
    resolveTimeoutRef.current = setTimeout(() => {
      resolveTimeoutRef.current = null;
      setIsResolvingSafePick(false);
      setBestClear((prev) => Math.max(prev, cleared));
      setRows((prev) => prev.length - cleared <= ROW_BUFFER ? [...prev, ...createRows(ROW_BUFFER)] : prev);
      setCurrentRow(cleared);
    }, SAFE_REVEAL_MS);
  }, [bet, currentRow, isResolvingSafePick, phase, rows, startRoundFromTilePick, unregisterBet, username]);

  const cashout = useCallback(() => {
    if (phase !== "playing" || clearedRows <= 0 || isResolvingSafePick) return;
    settleWin(clearedRows, currentMultiplier);
  }, [clearedRows, currentMultiplier, isResolvingSafePick, phase, settleWin]);

  const nextTarget = getMultiplierForClears(clearedRows + 1);
  const crashLeft = crashScene ? 24 + crashScene.tile * 33.333 : 50;

  return (
    <div className="game-layout" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <div style={boardWrapStyle}>
        <div style={boardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Chicken Lanes</div>
            <Link href="/chicken" style={modeLinkStyle}>
              Switch Mode
            </Link>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            {phase === "playing" ? `Lane ${currentRow + 1}` : `Bet: $${fmtMoney(bet || pendingBet)}`}
          </div>
        </div>

        <div style={boardStyle}>
          <div style={laneBackdropStyle} />
          <div style={streakGlowStyle} />

          <div ref={scrollAreaRef} style={scrollAreaStyle}>
            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((row, rowIndex) => {
              const isActive = (phase === "playing" || (phase === "idle" && pendingBet > 0)) && rowIndex === currentRow;
              const isPassed = rowIndex < clearedRows;
              const isLocked = rowIndex > currentRow;
              const revealAll = phase === "dead" && rowIndex === currentRow;
              const shouldReveal = row.revealedIndex !== null;
              const label = `Lane ${rowIndex + 1}`;
              const rewardText = formatMultiplier(getMultiplierForClears(rowIndex + 1));

              return (
                <div
                  key={rowIndex}
                  ref={(node) => {
                    rowRefs.current[rowIndex] = node;
                  }}
                  style={{
                    borderRadius: 18,
                    padding: "12px 14px",
                    border: isActive ? "1px solid rgba(251,191,36,0.42)" : "1px solid rgba(255,255,255,0.08)",
                    background: isPassed
                      ? "linear-gradient(135deg, rgba(21,128,61,0.34), rgba(8,47,73,0.2))"
                      : isActive
                        ? "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))"
                        : "rgba(15,23,42,0.5)",
                    boxShadow: isActive ? "0 0 0 1px rgba(251,191,36,0.1), 0 16px 40px rgba(0,0,0,0.22)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={laneTitleStyle}>{label}</div>
                      <div style={laneSubStyle}>
                        {isPassed ? "Cleared" : isActive ? (isResolvingSafePick ? "Locked in" : "Pick one coop") : isLocked ? "Locked" : "Revealed"}
                      </div>
                    </div>
                    <div style={laneRewardStyle}>{rewardText}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    {Array.from({ length: TILE_COUNT }, (_, tileIndex) => {
                      let tileState: TileState = "hidden";
                      if (shouldReveal && row.revealedIndex === tileIndex) {
                        tileState = tileIndex === row.trapIndex ? "trap" : "safe";
                      } else if (revealAll) {
                        tileState = tileIndex === row.trapIndex ? "trap" : "safe";
                      }

                      const isClickable = isActive && tileState === "hidden";

                      return (
                        <button
                          key={tileIndex}
                          type="button"
                          onClick={() => handleTilePick(tileIndex)}
                          disabled={!isClickable}
                          style={{
                            ...tileStyle,
                            cursor: isClickable ? "pointer" : "default",
                            opacity: isLocked ? 0.6 : 1,
                            borderColor: tileState === "safe"
                              ? "rgba(74,222,128,0.48)"
                              : tileState === "trap"
                                ? "rgba(248,113,113,0.5)"
                                : isClickable
                                  ? "rgba(251,191,36,0.28)"
                                  : "rgba(255,255,255,0.08)",
                            background: tileState === "safe"
                              ? "linear-gradient(135deg, rgba(22,163,74,0.5), rgba(21,94,117,0.32))"
                              : tileState === "trap"
                                ? "linear-gradient(135deg, rgba(220,38,38,0.48), rgba(127,29,29,0.26))"
                                : "linear-gradient(180deg, rgba(30,41,59,0.88), rgba(15,23,42,0.92))",
                          }}
                        >
                          <div style={{ width: 56, height: 56 }}>
                            {tileState === "trap" ? <FeatherBurst /> : <ChickenBadge />}
                          </div>
                          <div style={tileTitleStyle}>
                            {tileState === "safe" ? "Safe" : tileState === "trap" ? "Trap" : tileLabel(tileIndex)}
                          </div>
                          <div style={tileHintStyle}>
                            {tileState === "safe"
                              ? "Crossed clean"
                              : tileState === "trap"
                                ? "Roadkill"
                                : isActive
                                  ? "Tap to commit"
                                  : "Hidden"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {crashScene && (
            <>
              <motion.div
                key={`flash-${crashScene.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.34, times: [0, 0.35, 1] }}
                style={crashFlashStyle}
              />
              <motion.div
                key={`car-${crashScene.id}`}
                initial={{ x: "115%", y: 0, rotate: -3, scale: 0.95 }}
                animate={{ x: "-12%", y: 0, rotate: [0, -2, 0, 3], scale: [0.95, 1, 1, 0.98] }}
                transition={{ duration: 0.56, ease: [0.16, 0.9, 0.2, 1] }}
                style={{
                  ...crashCarStyle,
                  top: crashZoneTop,
                }}
              >
                <CrashCar />
              </motion.div>
              <motion.div
                key={`chicken-${crashScene.id}`}
                initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
                animate={{ x: [0, 12, 90], y: [0, -18, -44], rotate: [0, -18, 110], scale: [1, 1.08, 0.82], opacity: [1, 1, 0] }}
                transition={{ duration: 0.48, delay: 0.18, ease: [0.24, 0.88, 0.32, 1] }}
                style={{
                  ...crashChickenStyle,
                  top: crashZoneTop - 4,
                  left: `calc(${crashLeft}% + 14px)`,
                }}
              >
                <ChickenBadge />
              </motion.div>
              <motion.div
                key={`feathers-${crashScene.id}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: [0, 1, 0], scale: [0.7, 1.1, 1.2] }}
                transition={{ duration: 0.42, delay: 0.18, times: [0, 0.25, 1] }}
                style={{
                  ...crashFeathersStyle,
                  top: crashZoneTop - 28,
                  left: `calc(${crashLeft}% + 2px)`,
                }}
              >
                <FeatherBurst />
              </motion.div>
              <motion.div
                key={`label-${crashScene.id}`}
                initial={{ opacity: 0, scale: 0.84, y: 4 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.84, 1.02, 1, 0.94], y: [4, 0, 0, -2] }}
                transition={{ duration: 0.56, delay: 0.08, times: [0, 0.2, 0.72, 1] }}
                style={crashLabelStyle}
              >
                SPLAT
              </motion.div>
            </>
          )}
        </div>
      </div>

      <div className="game-panel" style={panelStyle}>
        <h2 style={titleStyle}>Chicken Lanes</h2>
        <div style={mutedStyle}>Pick one coop per lane. Two routes are safe, one is a trap. Every clear doubles your bet.</div>
        <Divider />

        {phase === "idle" && (
          <>
            <Label>Bet Amount</Label>
            <div style={inputWrapStyle}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={pendingBet || ""}
                onChange={(e) => {
                  const next = parseFloat(e.target.value);
                  setPendingBet(Number.isNaN(next) ? 0 : clampMoney(Math.max(0, Math.min(balance, next))));
                }}
                style={inputStyle}
              />
            </div>

            <CollapsibleBetSelector>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[1, 5, 10, 25, 50, 100].map((value) => (
                  <CasinoChip key={value} value={value} onClick={addBet} disabled={pendingBet >= balance || value > balance - pendingBet} />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6, marginTop: 8 }}>
                <button style={utilityBtnStyle} onClick={() => setPendingBet((prev) => clampMoney(prev / 2))}>
                  Half
                </button>
                <button style={utilityBtnStyle} onClick={() => setPendingBet(clampMoney(balance))}>
                  All In
                </button>
              </div>
            </CollapsibleBetSelector>

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={startRound} disabled={pendingBet <= 0 || pendingBet > balance} style={{ width: "100%", marginTop: 6, opacity: pendingBet > 0 ? 1 : 0.6 }}>
              START LANES
            </motion.button>
          </>
        )}

        {phase === "playing" && (
          <>
            <Stat label="Cleared" value={`${clearedRows}`} />
            <Stat label="Current" value={formatMultiplier(currentMultiplier)} accent="gold" />
            <Stat label="Cashout" value={`$${fmtMoney(clampMoney(bet * currentMultiplier))}`} accent="green" />
            <Stat label="Next Lane" value={formatMultiplier(nextTarget)} />
            <div style={{ ...mutedStyle, marginTop: 4 }}>
              {lastPick
                ? `Last pick: lane ${lastPick.row + 1}, ${tileLabel(lastPick.tile).toLowerCase()} coop.`
                : "Pick one coop on the highlighted lane."}
            </div>
            {isResolvingSafePick && (
              <div style={{ ...mutedStyle, color: "#86efac" }}>Safe. Advancing...</div>
            )}
            <div style={mutedStyle}>No finish line. Every lane doubles the payout again.</div>

            <motion.button className="btn-primary" whileHover={{ scale: clearedRows > 0 && !isResolvingSafePick ? 1.03 : 1 }} whileTap={{ scale: clearedRows > 0 && !isResolvingSafePick ? 0.97 : 1 }} onClick={cashout} disabled={clearedRows <= 0 || isResolvingSafePick} style={{ width: "100%", marginTop: "auto", background: "linear-gradient(135deg,#22c55e,#15803d)", opacity: clearedRows > 0 && !isResolvingSafePick ? 1 : 0.5 }}>
              CASH OUT ${fmtMoney(clampMoney(bet * currentMultiplier))}
            </motion.button>
          </>
        )}

        {(phase === "dead" || phase === "cashout") && recentResult && (
          <>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <div style={{ ...mutedStyle, color: phase === "cashout" ? "#4ade80" : "#fca5a5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {phase === "cashout" ? "Cashed Out" : "Cooked"}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, color: phase === "cashout" ? "#4ade80" : "#f87171" }}>
                {recentResult.net >= 0 ? `+$${fmtMoney(recentResult.net)}` : `-$${fmtMoney(-recentResult.net)}`}
              </div>
            </div>
            <Divider />
            <Stat label="Rows Cleared" value={`${recentResult.rowsCleared}`} />
            <Stat label="Best Clear" value={`${bestClear}`} />
            <Stat label="Peak Multiplier" value={formatMultiplier(getMultiplierForClears(recentResult.rowsCleared))} accent="gold" />

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setPhase("idle"); setBet(0); resetBoard(); }} style={{ width: "100%", marginTop: "auto" }}>
              PLAY AGAIN
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border-color)", margin: "2px 0" }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ ...mutedStyle, marginBottom: 6, letterSpacing: "0.12em", textTransform: "uppercase" }}>{children}</div>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "gold" | "green" }) {
  const color = accent === "gold" ? "var(--accent-gold)" : accent === "green" ? "#4ade80" : "var(--text-primary)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <div style={{ ...mutedStyle, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: "min(320px, 100%)",
  borderLeft: "1px solid var(--border-color)",
  background: "linear-gradient(180deg, rgba(15,25,35,0.95), rgba(12,20,30,0.95))",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.05rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const mutedStyle: React.CSSProperties = {
  fontSize: "0.66rem",
  color: "var(--text-muted)",
  fontFamily: "'Barlow Condensed', sans-serif",
};

const inputWrapStyle: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 8,
  padding: "7px 10px",
  background: "rgba(15,23,42,0.5)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--text-primary)",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.05rem",
  fontWeight: 700,
};

const boardWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  padding: "16px 8px 16px 16px",
  gap: 10,
};

const boardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontFamily: "'Barlow Condensed', sans-serif",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const boardStyle: React.CSSProperties = {
  position: "relative",
  flex: 1,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "radial-gradient(circle at top, rgba(245,158,11,0.09), transparent 38%), #0b1220",
  boxShadow: "inset 0 0 26px rgba(0,0,0,0.45)",
  padding: 14,
};

const utilityBtnStyle: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(30,41,59,0.8)",
  color: "var(--text-secondary)",
  borderRadius: 7,
  padding: "7px 8px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const modeLinkStyle: React.CSSProperties = {
  border: "1px solid rgba(251,191,36,0.24)",
  borderRadius: 999,
  padding: "4px 10px",
  color: "#fbbf24",
  textDecoration: "none",
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
};

const laneBackdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(245,158,11,0.04), transparent 25%, rgba(34,197,94,0.04) 100%)",
};

const streakGlowStyle: React.CSSProperties = {
  position: "absolute",
  right: -60,
  top: -30,
  width: 180,
  height: 180,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(251,191,36,0.16), transparent 68%)",
  filter: "blur(12px)",
};

const laneTitleStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.98rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const laneSubStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  color: "var(--text-muted)",
  fontFamily: "'Barlow Condensed', sans-serif",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const laneRewardStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 800,
  color: "#fde68a",
  letterSpacing: "0.08em",
};

const tileStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "12px 8px 10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const tileTitleStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.82rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const tileHintStyle: React.CSSProperties = {
  fontSize: "0.66rem",
  color: "var(--text-muted)",
  fontFamily: "'Barlow Condensed', sans-serif",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textAlign: "center",
};

const scrollAreaStyle: React.CSSProperties = {
  position: "absolute",
  inset: 14,
  overflowY: "auto",
  overflowX: "hidden",
  zIndex: 2,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const crashCarStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  width: "46%",
  height: 88,
  zIndex: 10,
  pointerEvents: "none",
  filter: "drop-shadow(0 16px 20px rgba(0,0,0,0.35))",
};

const crashChickenStyle: React.CSSProperties = {
  position: "absolute",
  width: 54,
  height: 54,
  zIndex: 11,
  pointerEvents: "none",
  marginLeft: -27,
};

const crashFeathersStyle: React.CSSProperties = {
  position: "absolute",
  width: 100,
  height: 72,
  zIndex: 12,
  pointerEvents: "none",
  marginLeft: -50,
};

const crashFlashStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 9,
  background: "radial-gradient(circle at center, rgba(248,113,113,0.22), transparent 36%)",
};

const crashLabelStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 16,
  transform: "translateX(-50%)",
  zIndex: 13,
  pointerEvents: "none",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "0.14em",
  color: "#fecaca",
  textShadow: "0 0 18px rgba(239,68,68,0.65)",
};

const crashZoneTop = 22;
