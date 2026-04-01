"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { fmtMoney } from "@/lib/format";

const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 760;
const ROWS = 12;
const BUCKETS = ROWS + 1;
const GRAVITY = 0.18;
const PEG_BOUNCE = 0.72;
const BALL_RADIUS = 8;
const BALL_OPTIONS = [1, 3, 5, 10, 25];

const MULTIPLIERS = [9, 4.5, 2.5, 1.6, 1.1, 0.9, 0.6, 0.9, 1.1, 1.6, 2.5, 4.5, 9];
const BALL_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#34d399", "#a78bfa", "#fb7185", "#60a5fa"];

interface Peg {
  x: number;
  y: number;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  glow: string;
  landed: boolean;
  betAmount: number;
}

interface Flash {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PlinkoIIPage() {
  const { balance, setBalance } = useBalance();
  const [bet, setBet] = useState(0.25);
  const [ballsToDrop, setBallsToDrop] = useState(5);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastDrop, setLastDrop] = useState<{ multiplier: number; payout: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [pegFlashes, setPegFlashes] = useState<Flash[]>([]);
  const [binFlashes, setBinFlashes] = useState<Flash[]>([]);

  const ballsRef = useRef<Ball[]>([]);
  const balanceRef = useRef(balance);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledDropIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const ballIdRef = useRef(1);
  const fxIdRef = useRef(1);

  const pegs = useMemo<Peg[]>(() => {
    const list: Peg[] = [];
    const topPad = 84;
    const sidePad = 58;
    const yStep = 44;
    for (let row = 0; row < ROWS; row++) {
      const cols = row + 3;
      const rowWidth = (cols - 1) * 42;
      const xStart = (BOARD_WIDTH - rowWidth) / 2;
      for (let col = 0; col < cols; col++) {
        const x = xStart + col * 42;
        const y = topPad + row * yStep;
        if (x >= sidePad && x <= BOARD_WIDTH - sidePad) list.push({ x, y });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const addPegFlash = useCallback((x: number, y: number) => {
    const id = fxIdRef.current++;
    setPegFlashes((prev) => [...prev, { id, x, y, color: "#67e8f9", size: 28 }]);
    setTimeout(() => setPegFlashes((prev) => prev.filter((f) => f.id !== id)), 260);
  }, []);

  const addBinFlash = useCallback((x: number, y: number, multiplier: number) => {
    const id = fxIdRef.current++;
    const color = multiplier >= 4 ? "#fbbf24" : multiplier >= 1 ? "#4ade80" : "#fb7185";
    setBinFlashes((prev) => [...prev, { id, x, y, color, size: 54 }]);
    setTimeout(() => setBinFlashes((prev) => prev.filter((f) => f.id !== id)), 350);
  }, []);

  const dropOneBall = useCallback((overrideBet?: number) => {
    const betAmount = Math.round((overrideBet ?? bet) * 100) / 100;
    if (balanceRef.current < betAmount || betAmount <= 0) return false;

    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const nextBalance = Math.round((balanceRef.current - betAmount) * 100) / 100;
    balanceRef.current = nextBalance;
    setBalance(nextBalance);

    const nextBall: Ball = {
      id: ballIdRef.current++,
      x: BOARD_WIDTH / 2 + (Math.random() * 12 - 6),
      y: 32,
      vx: Math.random() * 0.6 - 0.3,
      vy: 0,
      color,
      glow: `${color}66`,
      landed: false,
      betAmount,
    };

    ballsRef.current = [...ballsRef.current, nextBall];
    setBalls(ballsRef.current);
    return true;
  }, [bet, setBalance]);

  const stopHoldDrop = useCallback(() => {
    setIsHolding(false);
    if (!holdIntervalRef.current) return;
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }, []);

  const startHoldDrop = useCallback(() => {
    setIsHolding(true);
    const tick = () => {
      const holdBet = Math.max(0.01, Math.round(balanceRef.current * 0.05 * 100) / 100);
      dropOneBall(holdBet);
    };
    tick();
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(tick, 180);
  }, [dropOneBall]);

  const runScheduledDrop = useCallback(() => {
    if (scheduledDropIntervalRef.current) {
      clearInterval(scheduledDropIntervalRef.current);
      scheduledDropIntervalRef.current = null;
    }

    let remaining = ballsToDrop;
    scheduledDropIntervalRef.current = setInterval(() => {
      if (remaining <= 0) {
        if (scheduledDropIntervalRef.current) clearInterval(scheduledDropIntervalRef.current);
        scheduledDropIntervalRef.current = null;
        return;
      }
      const didDrop = dropOneBall();
      if (!didDrop) {
        if (scheduledDropIntervalRef.current) clearInterval(scheduledDropIntervalRef.current);
        scheduledDropIntervalRef.current = null;
        return;
      }
      remaining -= 1;
    }, 130);
  }, [ballsToDrop, dropOneBall]);

  const spinWheel = useCallback(() => {
    if (isSpinningWheel) return;
    setIsSpinningWheel(true);
    setTimeout(() => {
      const pick = BALL_OPTIONS[Math.floor(Math.random() * BALL_OPTIONS.length)];
      setBallsToDrop(pick);
      setIsSpinningWheel(false);
    }, 1500);
  }, [isSpinningWheel]);

  useEffect(() => {
    const bucketW = BOARD_WIDTH / BUCKETS;

    const tick = () => {
      const next = ballsRef.current.map((ball) => {
        if (ball.landed) return ball;

        let vx = ball.vx;
        let vy = ball.vy + GRAVITY;
        let x = ball.x + vx;
        let y = ball.y + vy;

        for (const peg of pegs) {
          const dx = x - peg.x;
          const dy = y - peg.y;
          const d2 = dx * dx + dy * dy;
          const minD = BALL_RADIUS + 6;
          if (d2 > 0 && d2 < minD * minD) {
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            x = peg.x + nx * (minD + 0.2);
            y = peg.y + ny * (minD + 0.2);
            const dot = vx * nx + vy * ny;
            vx = (vx - 2 * dot * nx) * PEG_BOUNCE + (Math.random() - 0.5) * 0.25;
            vy = (vy - 2 * dot * ny) * PEG_BOUNCE + Math.random() * 0.16;
            addPegFlash(peg.x, peg.y);
          }
        }

        if (x < BALL_RADIUS) {
          x = BALL_RADIUS;
          vx = Math.abs(vx) * 0.6;
        }
        if (x > BOARD_WIDTH - BALL_RADIUS) {
          x = BOARD_WIDTH - BALL_RADIUS;
          vx = -Math.abs(vx) * 0.6;
        }

        const floorY = BOARD_HEIGHT - 78;
        if (y >= floorY) {
          y = floorY;
          vx = 0;
          vy = 0;
          const bucketIndex = clamp(Math.floor(x / bucketW), 0, BUCKETS - 1);
          const mult = MULTIPLIERS[bucketIndex] ?? 0;
          const payout = Math.round(ball.betAmount * mult * 100) / 100;
          const nextBalance = Math.round((balanceRef.current + payout) * 100) / 100;
          balanceRef.current = nextBalance;
          setBalance(nextBalance);
          setLastDrop({ multiplier: mult, payout });
          addBinFlash((bucketIndex + 0.5) * bucketW, BOARD_HEIGHT - 52, mult);
          return { ...ball, x, y, vx, vy, landed: true };
        }

        return { ...ball, x, y, vx, vy };
      });

      ballsRef.current = next.filter((b) => !b.landed);
      setBalls(ballsRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopHoldDrop();
      if (scheduledDropIntervalRef.current) clearInterval(scheduledDropIntervalRef.current);
    };
  }, [addBinFlash, addPegFlash, pegs, setBalance, stopHoldDrop]);

  return (
    <main style={{ padding: "clamp(12px, 2.2vw, 24px)" }}>
      <section style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "radial-gradient(circle at 15% 0%, rgba(125,211,252,0.25), rgba(15,23,42,0.95) 40%), linear-gradient(180deg, #0f172a, #020617)",
        boxShadow: "0 20px 60px rgba(15,23,42,0.65), inset 0 0 0 1px rgba(255,255,255,0.05)",
        padding: "clamp(12px, 2.6vw, 24px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 36px)", color: "#e2e8f0", letterSpacing: "0.05em" }}>
              Plinko II <span style={{ color: "#22d3ee" }}>Early Access</span>
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
              Responsive board, upgraded FX, hold-to-drop (5% bankroll per ball), and wheel-based multi-drop control.
            </p>
          </div>
          <div style={{ textAlign: "right", color: "#e2e8f0" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>BALANCE</div>
            <div style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800 }}>{fmtMoney(balance)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)", gap: 14 }}>
          <div style={{
            position: "relative",
            width: "100%",
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.65), rgba(2,6,23,0.95))",
            overflow: "hidden",
          }}>
            <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`, position: "relative" }}>
              {pegs.map((peg, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    left: `${(peg.x / BOARD_WIDTH) * 100}%`,
                    top: `${(peg.y / BOARD_HEIGHT) * 100}%`,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "radial-gradient(circle at 30% 30%, #e2e8f0, #64748b)",
                    boxShadow: "0 0 16px rgba(34,211,238,0.45)",
                  }}
                />
              ))}

              <AnimatePresence>
                {pegFlashes.map((flash) => (
                  <motion.div
                    key={flash.id}
                    initial={{ opacity: 0.8, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "absolute",
                      left: `${(flash.x / BOARD_WIDTH) * 100}%`,
                      top: `${(flash.y / BOARD_HEIGHT) * 100}%`,
                      width: flash.size,
                      height: flash.size,
                      borderRadius: "50%",
                      border: `2px solid ${flash.color}`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  />
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {binFlashes.map((flash) => (
                  <motion.div
                    key={flash.id}
                    initial={{ opacity: 0.8, scale: 0.65 }}
                    animate={{ opacity: 0, scale: 1.35 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: "absolute",
                      left: `${(flash.x / BOARD_WIDTH) * 100}%`,
                      top: `${(flash.y / BOARD_HEIGHT) * 100}%`,
                      width: flash.size,
                      height: flash.size,
                      borderRadius: "50%",
                      border: `2px solid ${flash.color}`,
                      boxShadow: `0 0 30px ${flash.color}`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  />
                ))}
              </AnimatePresence>

              {balls.map((ball) => (
                <motion.div
                  key={ball.id}
                  animate={{ left: `${(ball.x / BOARD_WIDTH) * 100}%`, top: `${(ball.y / BOARD_HEIGHT) * 100}%` }}
                  transition={{ type: "tween", duration: 0.04, ease: "linear" }}
                  style={{
                    position: "absolute",
                    width: BALL_RADIUS * 2,
                    height: BALL_RADIUS * 2,
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle at 30% 30%, #fff, ${ball.color})`,
                    boxShadow: `0 0 24px ${ball.glow}`,
                  }}
                />
              ))}

              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "grid", gridTemplateColumns: `repeat(${BUCKETS}, 1fr)`, gap: 5, padding: 8 }}>
                {MULTIPLIERS.map((m, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.07 }}
                    style={{
                      height: "clamp(40px, 6.8vw, 54px)",
                      borderRadius: 12,
                      background: m >= 4 ? "linear-gradient(180deg, #f59e0b, #b45309)" : m >= 1 ? "linear-gradient(180deg, #22c55e, #166534)" : "linear-gradient(180deg, #ef4444, #7f1d1d)",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "clamp(11px, 1.9vw, 13px)",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                  >
                    {m}x
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <aside style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.25)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
            padding: 12,
            display: "grid",
            gap: 12,
            alignContent: "start",
          }}>
            <div style={{ color: "#cbd5e1", fontWeight: 700 }}>Bet per ball</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[0.1, 0.25, 0.5, 1, 2, 5].map((chip) => (
                <button key={chip} onClick={() => setBet(chip)} style={{
                  borderRadius: 999,
                  border: bet === chip ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.2)",
                  background: bet === chip ? "rgba(34,211,238,0.25)" : "rgba(15,23,42,0.7)",
                  color: "#e2e8f0",
                  padding: "8px 10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}>{fmtMoney(chip)}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <button onClick={() => setBet(Math.max(0.01, Math.round((balance * 0.5) * 100) / 100))} style={quickBtn}>HALF</button>
              <button onClick={() => setBet(Math.max(0.01, Math.round((balance * 0.25) * 100) / 100))} style={quickBtn}>QUARTER</button>
              <button onClick={() => setBet(Math.max(0.01, Math.round(balance * 100) / 100))} style={quickBtn}>ALL IN</button>
            </div>

            <div style={{ color: "#cbd5e1", fontWeight: 700 }}>Ball count wheel</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <motion.div
                animate={{ rotate: isSpinningWheel ? 1440 : 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: "50%",
                  background: "conic-gradient(#22d3ee, #a78bfa, #f472b6, #f59e0b, #22d3ee)",
                  boxShadow: "0 0 24px rgba(34,211,238,0.4)",
                  display: "grid",
                  placeItems: "center",
                  border: "2px solid rgba(255,255,255,0.4)",
                }}
              >
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#0f172a", display: "grid", placeItems: "center", color: "#e2e8f0", fontWeight: 900 }}>
                  {ballsToDrop}
                </div>
              </motion.div>
              <div style={{ display: "grid", gap: 8, flex: 1 }}>
                <button onClick={spinWheel} style={actionBtn}>{isSpinningWheel ? "SPINNING..." : "SPIN"}</button>
                <button onClick={runScheduledDrop} style={actionBtn}>DROP {ballsToDrop}</button>
              </div>
            </div>

            <button
              onMouseDown={startHoldDrop}
              onMouseUp={stopHoldDrop}
              onMouseLeave={stopHoldDrop}
              onTouchStart={startHoldDrop}
              onTouchEnd={stopHoldDrop}
              style={{
                borderRadius: 12,
                padding: "12px 14px",
                border: "1px solid rgba(251,191,36,0.7)",
                color: "#f8fafc",
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                fontWeight: 900,
                letterSpacing: "0.04em",
                boxShadow: "0 10px 30px rgba(239,68,68,0.4)",
                cursor: "pointer",
              }}
            >
              {isHolding ? "HOLDING: 5%/BALL" : "HOLD TO DROP (5%/BALL)"}
            </button>

            <div style={{ color: "#cbd5e1", fontSize: 14 }}>
              Last drop: <strong>{lastDrop ? `${lastDrop.multiplier}x (${fmtMoney(lastDrop.payout)})` : "Waiting..."}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

const quickBtn: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(15,23,42,0.8)",
  color: "#cbd5e1",
  padding: "8px 6px",
  fontWeight: 700,
  cursor: "pointer",
};

const actionBtn: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(34,211,238,0.55)",
  background: "rgba(34,211,238,0.14)",
  color: "#e2e8f0",
  padding: "8px 10px",
  fontWeight: 800,
  cursor: "pointer",
};
