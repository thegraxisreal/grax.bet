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

const LANE_TOTAL = 18;
const CAMERA_ANCHOR_ROW = 4; // keep chicken near lower part once climbing high
const PLAYER_X = 50;
const PLAYER_WIDTH = 7;
const CHICKEN_COLOR_FILL = 0.64; // yellow body/wing visual width used for collision
const CAR_COLOR_FILL = 0.86; // painted body region (ignores transparent margins/lights)
const SAFE_STEP = 5;
const CAR_COLORS = ["#ef4444", "#3b82f6", "#f97316", "#a855f7", "#14b8a6", "#eab308"];
const HOLD_TRIGGER_MS = 5000;
const CRASH_IMPACT_DELAY_MS = 800;

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

function CheaterPlaneIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 260 120" fill="none">
      <defs>
        <linearGradient id="plane-body" x1="30" y1="34" x2="206" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="plane-wing" x1="84" y1="26" x2="150" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="plane-banner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>

      <ellipse cx="132" cy="96" rx="84" ry="10" fill="rgba(0,0,0,0.22)" />

      <path d="M18 68 C10 61 10 49 18 42 L40 34 L52 42 L52 68 L40 76 Z" fill="#475569" />
      <path d="M34 56 L10 61 L20 49 Z" fill="#64748b" />

      <path d="M42 70 L160 26 C177 20 204 22 224 36 L240 48 C246 53 246 59 240 64 L224 76 C205 89 178 92 160 86 L42 70 Z" fill="url(#plane-body)" />
      <path d="M54 68 L164 34 C178 29 201 31 217 42 L228 50 C232 53 232 59 228 62 L217 70 C201 81 178 83 164 78 L54 68 Z" fill="rgba(15,23,42,0.08)" />
      <path d="M42 70 L160 26 C177 20 204 22 224 36 L240 48 C246 53 246 59 240 64 L224 76 C205 89 178 92 160 86 L42 70 Z" stroke="#475569" strokeWidth="3" />

      <path d="M86 50 L116 16 L170 18 L140 52 Z" fill="url(#plane-wing)" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
      <path d="M116 56 L154 96 L184 88 L146 55 Z" fill="#64748b" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
      <path d="M58 62 L36 90 L70 78 L84 64 Z" fill="#94a3b8" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />

      <path d="M170 34 C178 28 190 28 200 33 L210 38 L180 46 Z" fill="#e2e8f0" />
      <path d="M162 70 L218 67 C213 75 204 81 192 84 L154 84 Z" fill="#cbd5e1" />

      <path d="M194 38 L214 41 L225 49 L210 53 L188 49 Z" fill="#0f172a" />
      <path d="M201 42 L213 44 L217 48 L208 50 L197 48 Z" fill="#7dd3fc" />

      <rect x="86" y="49" width="86" height="20" rx="6" fill="url(#plane-banner)" stroke="#7f1d1d" strokeWidth="2.5" />
      <text x="129" y="63" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" style={{ letterSpacing: "0.12em" }}>
        CHEATER
      </text>

      <circle cx="28" cy="55" r="11" fill="#111827" stroke="#475569" strokeWidth="3" />
      <path d="M21 49 L35 61 M35 49 L21 61" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

      <path d="M6 54 C-2 50 -2 40 8 36" stroke="rgba(251,191,36,0.7)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M2 61 C-10 60 -12 50 0 45" stroke="rgba(249,115,22,0.7)" strokeWidth="5" strokeLinecap="round" />
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
  const [cheaterCrashRow, setCheaterCrashRow] = useState<number | null>(null);
  const [cheaterImpact, setCheaterImpact] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const jumpsRef = useRef(0);
  const cooldownRef = useRef<Record<number, number>>({});
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const carIdRef = useRef(0);
  const jumpGraceUntilRef = useRef(0);
  const cameraStartRef = useRef(0);
  const cheaterCrashRef = useRef(false);
  const cheaterImpactRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const spaceHoldStartRef = useRef<number | null>(null);
  const crashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    jumpsRef.current = jumps;
    cameraStartRef.current = Math.max(0, jumps - CAMERA_ANCHOR_ROW);
  }, [jumps]);

  useEffect(() => {
    cheaterCrashRef.current = cheaterCrashRow !== null;
  }, [cheaterCrashRow]);

  useEffect(() => {
    cheaterImpactRef.current = cheaterImpact;
  }, [cheaterImpact]);

  const multiplier = useMemo(() => Math.max(1, jumps), [jumps]);
  const potentialPayout = useMemo(() => clampMoney(bet * multiplier), [bet, multiplier]);

  const resetRound = useCallback(() => {
    setJumps(0);
    jumpsRef.current = 0;
    setCars([]);
    cooldownRef.current = {};
    jumpGraceUntilRef.current = 0;
    cameraStartRef.current = 0;
    setCheaterCrashRow(null);
    setCheaterImpact(false);
    cheaterCrashRef.current = false;
    cheaterImpactRef.current = false;
    spaceHeldRef.current = false;
    spaceHoldStartRef.current = null;
    if (crashTimeoutRef.current) {
      clearTimeout(crashTimeoutRef.current);
      crashTimeoutRef.current = null;
    }
  }, []);

  const triggerLoss = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setCheaterCrashRow(null);
    setCheaterImpact(false);
    cheaterCrashRef.current = false;
    cheaterImpactRef.current = false;
    spaceHeldRef.current = false;
    spaceHoldStartRef.current = null;
    if (crashTimeoutRef.current) {
      clearTimeout(crashTimeoutRef.current);
      crashTimeoutRef.current = null;
    }
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
        if (
          !cheaterCrashRef.current
          && spaceHeldRef.current
          && spaceHoldStartRef.current !== null
          && ts - spaceHoldStartRef.current >= HOLD_TRIGGER_MS
        ) {
          cheaterCrashRef.current = true;
          setCheaterImpact(false);
          setCheaterCrashRow(Math.max(0, jumpsRef.current - cameraStartRef.current));
        }

        if (cheaterCrashRef.current) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }

        setCars((prev) => {
          const minLane = cameraStartRef.current - 2;
          const maxLane = cameraStartRef.current + LANE_TOTAL + 2;
          const updated = prev
            .map((car) => ({ ...car, x: car.x + car.dir * car.speed * dt }))
            .filter((car) => car.x > -car.width - 8 && car.x < 108 && car.lane >= minLane && car.lane <= maxLane);

          for (let lane = cameraStartRef.current + 1; lane <= cameraStartRef.current + LANE_TOTAL; lane++) {
            if (isSafeLane(lane)) continue;
            if (cooldownRef.current[lane] === undefined) {
              cooldownRef.current[lane] = Math.random() * 0.9;
            }
            cooldownRef.current[lane] -= dt;
            if (cooldownRef.current[lane] <= 0) {
              const progress = jumpsRef.current;
              const hardRamp = progress <= 20 ? 1 : Math.min(2.35, 1 + (progress - 20) / 20);
              const laneCars = updated.filter((car) => car.lane === lane);
              const hasCenterTraffic = laneCars.some((car) => {
                const mid = car.x + car.width / 2;
                return mid > 34 && mid < 66;
              });
              if (hasCenterTraffic) {
                cooldownRef.current[lane] = (0.25 + Math.random() * 0.35) / hardRamp;
                continue;
              }

              const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
              const hasOppositeDirCar = laneCars.some((car) => car.dir !== dir);
              if (hasOppositeDirCar) {
                cooldownRef.current[lane] = (0.4 + Math.random() * 0.55) / hardRamp;
                continue;
              }

              const width = 11 + Math.random() * 6;
              const speed = (16 + Math.random() * 14) * hardRamp;
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
              cooldownRef.current[lane] = (1.35 + Math.random() * 1.45) / hardRamp;
            }
          }
          const forgetBefore = cameraStartRef.current - 8;
          Object.keys(cooldownRef.current).forEach((laneKey) => {
            const laneNum = Number(laneKey);
            if (laneNum < forgetBefore) delete cooldownRef.current[laneNum];
          });

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
    if (phase !== "playing" || jumps <= 0 || cheaterCrashRef.current) return;
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
    if (phaseRef.current !== "playing" || cheaterCrashRef.current) return;
    jumpGraceUntilRef.current = performance.now() + 130;
    setJumps((prev) => {
      const next = prev + 1;
      if (next > bestJump) setBestJump(next);
      playWireCut();
      return next;
    });
  }, [bestJump]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phaseRef.current === "playing" && !spaceHeldRef.current) {
          spaceHeldRef.current = true;
          spaceHoldStartRef.current = performance.now();
        }
        jump();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceHeldRef.current = false;
      spaceHoldStartRef.current = null;
    };
    const onBlur = () => {
      spaceHeldRef.current = false;
      spaceHoldStartRef.current = null;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [jump]);

  const cameraStart = Math.max(0, jumps - CAMERA_ANCHOR_ROW);
  const playerVisibleRow = jumps - cameraStart;
  const lanes = Array.from({ length: LANE_TOTAL + 1 }, (_, i) => cameraStart + i);
  const laneHeightPct = 100 / (LANE_TOTAL + 1);
  const targetRow = cheaterCrashRow ?? playerVisibleRow;
  const targetBottomPct = (targetRow / LANE_TOTAL) * 100;
  const targetTopPct = Math.max(2, 100 - targetBottomPct - laneHeightPct * 0.78);

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
            const yPct = ((lane - cameraStart) / LANE_TOTAL) * 100;
            const rowCars = cars.filter((car) => car.lane === lane);
            const isPlayerLane = playerVisibleRow === lane - cameraStart;

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

          {cheaterCrashRow !== null && (
            <>
              <motion.div
                initial={{ left: "116%", top: "-24%", rotate: -18, scale: 0.9 }}
                animate={{ left: "42.5%", top: `${targetTopPct}%`, rotate: 42, scale: 1.06 }}
                transition={{ duration: 2.8, ease: [0.16, 0.9, 0.2, 1] }}
                onAnimationComplete={() => {
                  if (!cheaterCrashRef.current || cheaterImpactRef.current) return;
                  setCheaterImpact(true);
                  if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
                  crashTimeoutRef.current = setTimeout(() => {
                    crashTimeoutRef.current = null;
                    triggerLoss();
                  }, CRASH_IMPACT_DELAY_MS);
                }}
                style={{
                  position: "absolute",
                  width: "42%",
                  pointerEvents: "none",
                  zIndex: 40,
                  filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.55))",
                }}
              >
                <CheaterPlaneIcon />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: cheaterImpact ? 1 : 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 35,
                  background: cheaterImpact ? "radial-gradient(circle at 48% 66%, rgba(248,113,113,0.72), rgba(127,29,29,0.08) 44%, rgba(0,0,0,0.2) 100%)" : "transparent",
                }}
              />
              {cheaterImpact && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.28 }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "46%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 45,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "2rem",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    color: "#fecaca",
                    textShadow: "0 0 20px rgba(239,68,68,0.9)",
                    pointerEvents: "none",
                  }}
                >
                  YOU DIED
                </motion.div>
              )}
            </>
          )}
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
            <Stat label="Next Safe" value={`${Math.ceil((jumps + 1) / SAFE_STEP) * SAFE_STEP}×`} />
            <div style={{ ...mutedStyle, marginTop: 4 }}>Click the board or press <strong style={{ color: "var(--accent-gold)" }}>Space</strong> to jump.</div>
            <div style={mutedStyle}>Difficulty ramps up quickly after <strong style={{ color: "var(--accent-gold)" }}>20×</strong>.</div>
            {cheaterCrashRow !== null && (
              <div style={{ ...mutedStyle, color: "#fca5a5", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>
                Cheater detected. Incoming airstrike...
              </div>
            )}

            <motion.button className="btn-primary" whileHover={{ scale: jumps > 0 && cheaterCrashRow === null ? 1.03 : 1 }} whileTap={{ scale: jumps > 0 && cheaterCrashRow === null ? 0.97 : 1 }} disabled={jumps <= 0 || cheaterCrashRow !== null} onClick={cashout} style={{ width: "100%", marginTop: "auto", background: "linear-gradient(135deg,#22c55e,#15803d)", opacity: jumps > 0 && cheaterCrashRow === null ? 1 : 0.5 }}>
              CASH OUT ${fmtMoney(potentialPayout)}
            </motion.button>
          </>
        )}

        {(phase === "dead" || phase === "cashout") && (
          <>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <div style={{ ...mutedStyle, color: phase === "cashout" ? "#4ade80" : "#fca5a5", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {phase === "cashout" ? "Escaped!" : "You Died"}
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
