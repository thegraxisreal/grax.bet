"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import { CasinoChip } from "@/components/CasinoChip";
import { fmtMoney } from "@/lib/format";
import { logFeedEvent } from "@/lib/feed";
import { playCashoutWin, playChipClick, playLose, playWireCut } from "@/lib/sound";

type Phase = "idle" | "playing" | "dead" | "cashout";

interface Car {
  id: number;
  lane: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  width: number;
  color: string;
}

const MAX_JUMPS = 35;
const LANE_TOTAL = 18;
const PLAYER_X = 50;
const PLAYER_WIDTH = 7;
const CHICKEN_COLOR_FILL = 0.64; // yellow body/wing visual width used for collision
const CAR_COLOR_FILL = 0.86; // painted body region (ignores transparent margins/lights)
const SAFE_STEP = 5;
const CAR_COLORS = ["#ef4444", "#3b82f6", "#f97316", "#a855f7", "#14b8a6", "#eab308"];

const isSafeLane = (jump: number) => jump % SAFE_STEP === 0;
const clampMoney = (v: number) => Math.round(v * 100) / 100;

function ChickenIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="38" rx="18" ry="16" fill="#fbbf24" />
      <circle cx="32" cy="20" r="12" fill="#fbbf24" />
      <circle cx="37" cy="18" r="4.5" fill="white" />
      <circle cx="38.5" cy="18" r="2.2" fill="#111827" />
      <polygon points="44,22 54,20 44,26" fill="#f97316" />
      <path d="M26 11 Q24 5 28 7 Q29 2 33 5 Q34 1 38 4 Q39 8 37 12" fill="#ef4444" />
      <ellipse cx="44" cy="27" rx="3" ry="4" fill="#ef4444" />
      <ellipse cx="23" cy="40" rx="6" ry="7" fill="#f59e0b" opacity="0.85" />
      <line x1="27" y1="50" x2="23" y2="58" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <line x1="36" y1="50" x2="40" y2="58" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CarIcon({ color, dir }: { color: string; dir: 1 | -1 }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 34" fill="none" style={{ transform: dir === -1 ? "scaleX(-1)" : undefined }}>
      <rect x="2" y="10" width="60" height="18" rx="6" fill={color} />
      <rect x="12" y="4" width="34" height="12" rx="4" fill="rgba(0,0,0,0.25)" />
      <rect x="16" y="6" width="12" height="8" rx="2" fill="rgba(147,197,253,0.8)" />
      <rect x="30" y="6" width="12" height="8" rx="2" fill="rgba(147,197,253,0.8)" />
      <circle cx="14" cy="29" r="4" fill="#111827" />
      <circle cx="50" cy="29" r="4" fill="#111827" />
      <circle cx="59" cy="14" r="2.5" fill="#fde68a" />
      <circle cx="59" cy="21" r="2.5" fill="#fde68a" />
    </svg>
  );
}

export default function ChickenPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingBet, setPendingBet] = useState(0);
  const [bet, setBet] = useState(0);
  const [jumps, setJumps] = useState(0);
  const [cars, setCars] = useState<Car[]>([]);
  const [bestJump, setBestJump] = useState(0);
  const [recentResult, setRecentResult] = useState<{ net: number; jumps: number } | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const jumpsRef = useRef(0);
  const cooldownRef = useRef<number[]>(Array.from({ length: LANE_TOTAL + 1 }, () => Math.random() * 0.9));
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const carIdRef = useRef(0);
  const jumpGraceUntilRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    jumpsRef.current = jumps;
  }, [jumps]);

  const multiplier = useMemo(() => Math.max(1, jumps), [jumps]);
  const potentialPayout = useMemo(() => clampMoney(bet * multiplier), [bet, multiplier]);

  const resetRound = useCallback(() => {
    setJumps(0);
    jumpsRef.current = 0;
    setCars([]);
    cooldownRef.current = Array.from({ length: LANE_TOTAL + 1 }, () => Math.random() * 0.9);
    jumpGraceUntilRef.current = 0;
  }, []);

  const triggerLoss = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setPhase("dead");
    unregisterBet();
    playLose();
    setRecentResult({ net: -bet, jumps: jumpsRef.current });
    if (username) logFeedEvent(username, "Chicken", bet, "loss");
  }, [bet, unregisterBet, username]);

  useEffect(() => {
    const animate = (ts: number) => {
      if (lastFrameRef.current === 0) lastFrameRef.current = ts;
      const dt = Math.min(0.05, (ts - lastFrameRef.current) / 1000);
      lastFrameRef.current = ts;

      if (phaseRef.current === "playing") {
        setCars((prev) => {
          const updated = prev
            .map((car) => ({ ...car, x: car.x + car.dir * car.speed * dt }))
            .filter((car) => car.x > -car.width - 8 && car.x < 108);

          for (let lane = 1; lane <= LANE_TOTAL; lane++) {
            if (isSafeLane(lane)) continue;
            cooldownRef.current[lane] -= dt;
            if (cooldownRef.current[lane] <= 0) {
              const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
              const width = 11 + Math.random() * 6;
              const speed = 18 + Math.random() * 18;
              const nextCar: Car = {
                id: carIdRef.current++,
                lane,
                width,
                speed,
                dir,
                x: dir === 1 ? -width - 3 : 104,
                color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
              };
              updated.push(nextCar);
              cooldownRef.current[lane] = 1.0 + Math.random() * 1.2;
            }
          }

          const row = jumpsRef.current;
          if (!isSafeLane(row) && ts >= jumpGraceUntilRef.current) {
            const playerColorHalf = (PLAYER_WIDTH * CHICKEN_COLOR_FILL) / 2;
            const playerLeft = PLAYER_X - playerColorHalf;
            const playerRight = PLAYER_X + playerColorHalf;
            const hit = updated.some((car) => {
              if (car.lane !== row) return false;
              const colorInset = ((1 - CAR_COLOR_FILL) * car.width) / 2;
              const carLeft = car.x + colorInset;
              const carRight = car.x + car.width - colorInset;
              const overlap = Math.min(playerRight, carRight) - Math.max(playerLeft, carLeft);
              return overlap > 0.7;
            });
            if (hit) {
              queueMicrotask(triggerLoss);
            }
          }

          return updated;
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    };
  }, [triggerLoss]);

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
    setPhase("playing");
    resetRound();
  }, [balance, pendingBet, phase, registerBet, resetRound, subtractBalance]);

  const cashout = useCallback(() => {
    if (phase !== "playing" || jumps <= 0) return;
    const payout = clampMoney(bet * jumps);
    addBalance(payout);
    unregisterBet();
    setPhase("cashout");
    playCashoutWin();
    const net = clampMoney(payout - bet);
    setRecentResult({ net, jumps });
    if (username) logFeedEvent(username, "Chicken", net, "win");
  }, [addBalance, bet, jumps, phase, unregisterBet, username]);

  const jump = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    jumpGraceUntilRef.current = performance.now() + 130;
    setJumps((prev) => {
      const next = Math.min(MAX_JUMPS, prev + 1);
      if (next > bestJump) setBestJump(next);
      if (next === MAX_JUMPS) {
        const payout = clampMoney(bet * next);
        addBalance(payout);
        unregisterBet();
        setPhase("cashout");
        playCashoutWin();
        const net = clampMoney(payout - bet);
        setRecentResult({ net, jumps: next });
        if (username) logFeedEvent(username, "Chicken", net, "win");
      } else {
        playWireCut();
      }
      return next;
    });
  }, [addBalance, bestJump, bet, unregisterBet, username]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  const playerRow = Math.max(0, Math.min(LANE_TOTAL, jumps));
  const lanes = Array.from({ length: LANE_TOTAL + 1 }, (_, i) => i);

  return (
    <div className="game-layout" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <div style={boardWrapStyle} onClick={jump} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); jump(); } }}>
        <div style={boardHeaderStyle}>
          <div style={{ fontWeight: 700 }}>Chicken Run</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Bet: ${fmtMoney(bet || pendingBet)}</div>
        </div>

        <div style={boardStyle}>
          {lanes.slice().reverse().map((lane) => {
            const isSafe = isSafeLane(lane);
            const yPct = (lane / LANE_TOTAL) * 100;
            const rowCars = cars.filter((car) => car.lane === lane);
            const isPlayerLane = playerRow === lane;

            return (
              <div
                key={lane}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${yPct}%`,
                  height: `${100 / (LANE_TOTAL + 1)}%`,
                  background: isSafe
                    ? "linear-gradient(90deg,#14532d,#166534 35%,#1f7a42 65%,#14532d)"
                    : "linear-gradient(90deg,#111827,#1f2937 15%,#374151 50%,#1f2937 85%,#111827)",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {!isSafe && (
                  <>
                    <div style={{ position: "absolute", left: 5, top: 0, bottom: 0, width: 3, background: "rgba(253,224,71,0.35)" }} />
                    <div style={{ position: "absolute", right: 5, top: 0, bottom: 0, width: 3, background: "rgba(253,224,71,0.35)" }} />
                    {[20, 46, 72].map((left) => (
                      <div key={left} style={{ position: "absolute", left: `${left}%`, top: "36%", width: "10%", height: 4, background: "rgba(255,255,255,0.26)", borderRadius: 99 }} />
                    ))}
                  </>
                )}
                {isSafe && lane > 0 && (
                  <div style={{ position: "absolute", left: 10, top: "26%", fontSize: "0.58rem", color: "#86efac", fontWeight: 700, letterSpacing: "0.12em" }}>
                    SAFE {lane}×
                  </div>
                )}

                {rowCars.map((car) => (
                  <div
                    key={car.id}
                    style={{
                      position: "absolute",
                      left: `${car.x}%`,
                      width: `${car.width}%`,
                      top: 2,
                      bottom: 2,
                    }}
                  >
                    <CarIcon color={car.color} dir={car.dir} />
                  </div>
                ))}

                {isPlayerLane && (
                  <motion.div
                    key={jumps}
                    initial={{ scale: 0.82, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                    style={{ position: "absolute", left: "46.5%", width: "7%", top: 0, bottom: 1 }}
                  >
                    <ChickenIcon />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="game-panel" style={panelStyle}>
        <h2 style={titleStyle}>Chicken</h2>
        <div style={mutedStyle}>Jump to grow your multiplier. Every 5th jump is a safe grass lane.</div>
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
              START RUN
            </motion.button>
          </>
        )}

        {phase === "playing" && (
          <>
            <Stat label="Current" value={`${multiplier.toFixed(2)}×`} accent="gold" />
            <Stat label="Potential" value={`$${fmtMoney(potentialPayout)}`} accent="green" />
            <Stat label="Safe Checkpoint" value={`${Math.floor(jumps / SAFE_STEP) * SAFE_STEP} / ${MAX_JUMPS}`} />
            <div style={{ ...mutedStyle, marginTop: 4 }}>Click the board or press <strong style={{ color: "var(--accent-gold)" }}>Space</strong> to jump.</div>

            <motion.button className="btn-primary" whileHover={{ scale: jumps > 0 ? 1.03 : 1 }} whileTap={{ scale: jumps > 0 ? 0.97 : 1 }} disabled={jumps <= 0} onClick={cashout} style={{ width: "100%", marginTop: "auto", background: "linear-gradient(135deg,#22c55e,#15803d)", opacity: jumps > 0 ? 1 : 0.5 }}>
              CASH OUT ${fmtMoney(potentialPayout)}
            </motion.button>
          </>
        )}

        {(phase === "dead" || phase === "cashout") && (
          <>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <div style={{ ...mutedStyle, color: phase === "cashout" ? "#4ade80" : "#fca5a5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {phase === "cashout" ? "Escaped!" : "Splat!"}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, color: phase === "cashout" ? "#4ade80" : "#f87171" }}>
                {recentResult && (recentResult.net >= 0 ? `+$${fmtMoney(recentResult.net)}` : `-$${fmtMoney(-recentResult.net)}`)}
              </div>
            </div>
            <Divider />
            <Stat label="Jumps" value={`${jumps}`} />
            <Stat label="Multiplier" value={`${Math.max(1, jumps).toFixed(2)}×`} accent="gold" />
            <Stat label="Best Run" value={`${bestJump}`} />

            <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setPhase("idle"); setBet(0); resetRound(); }} style={{ width: "100%", marginTop: "auto" }}>
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
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0b1220",
  boxShadow: "inset 0 0 26px rgba(0,0,0,0.45)",
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
