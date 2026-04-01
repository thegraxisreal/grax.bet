"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { fmtMoney } from "@/lib/format";

const BOARD_WIDTH = 580;
const BOARD_HEIGHT = 620;
const ROWS = 12;
const BUCKETS = ROWS + 1;
const BALL_RADIUS = 8;
const GRAVITY = 0.18;
const PEG_BOUNCE = 0.72;

const MULTIPLIERS = [9, 4.5, 2.5, 1.6, 1.1, 0.9, 0.6, 0.9, 1.1, 1.6, 2.5, 4.5, 9];
const DROP_OPTIONS = [1, 3, 5, 10, 25];
const BALL_COLORS = ["#22d3ee", "#f472b6", "#facc15", "#34d399", "#a78bfa", "#fb7185", "#60a5fa"];

interface Peg { x: number; y: number }
interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  betAmount: number;
  landed: boolean;
}
interface Flash { id: number; x: number; y: number; color: string }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PlinkoIIPage() {
  const { balance, setBalance } = useBalance();
  const [bet, setBet] = useState(0.25);
  const [dropCount, setDropCount] = useState(5);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastDrop, setLastDrop] = useState<{ mult: number; payout: number } | null>(null);
  const [pegFlashes, setPegFlashes] = useState<Flash[]>([]);
  const [binFlashes, setBinFlashes] = useState<Flash[]>([]);
  const [holding, setHolding] = useState(false);
  const [dropWheelTurn, setDropWheelTurn] = useState(0);
  const [showNotice] = useState(true);

  const ballsRef = useRef<Ball[]>([]);
  const balanceRef = useRef(balance);
  const ballIdRef = useRef(1);
  const fxIdRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pegs = useMemo(() => {
    const list: Peg[] = [];
    const top = 80;
    const side = 58;
    const yGap = 43;
    for (let row = 0; row < ROWS; row++) {
      const cols = row + 3;
      const w = (cols - 1) * 40;
      const startX = (BOARD_WIDTH - w) / 2;
      for (let col = 0; col < cols; col++) {
        const x = startX + col * 40;
        const y = top + row * yGap;
        if (x >= side && x <= BOARD_WIDTH - side) list.push({ x, y });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const spawnBall = useCallback((overrideBet?: number) => {
    const wager = Math.max(0.01, Math.round((overrideBet ?? bet) * 100) / 100);
    if (balanceRef.current < wager) return false;

    const nextBalance = Math.round((balanceRef.current - wager) * 100) / 100;
    balanceRef.current = nextBalance;
    setBalance(nextBalance);

    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const ball: Ball = {
      id: ballIdRef.current++,
      x: BOARD_WIDTH / 2 + (Math.random() * 10 - 5),
      y: 32,
      vx: Math.random() * 0.55 - 0.275,
      vy: 0,
      color,
      betAmount: wager,
      landed: false,
    };

    ballsRef.current = [...ballsRef.current, ball];
    setBalls(ballsRef.current);
    return true;
  }, [bet, setBalance]);

  const pushFlash = useCallback((type: "peg" | "bin", x: number, y: number, color: string) => {
    const id = fxIdRef.current++;
    if (type === "peg") {
      setPegFlashes((prev) => [...prev, { id, x, y, color }]);
      setTimeout(() => setPegFlashes((prev) => prev.filter((f) => f.id !== id)), 220);
      return;
    }
    setBinFlashes((prev) => [...prev, { id, x, y, color }]);
    setTimeout(() => setBinFlashes((prev) => prev.filter((f) => f.id !== id)), 320);
  }, []);

  const dropBatch = useCallback(() => {
    if (dropIntervalRef.current) {
      clearInterval(dropIntervalRef.current);
      dropIntervalRef.current = null;
    }

    let left = dropCount;
    dropIntervalRef.current = setInterval(() => {
      if (left <= 0) {
        if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
        return;
      }
      const ok = spawnBall();
      if (!ok) {
        if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
        return;
      }
      left -= 1;
    }, 140);
  }, [dropCount, spawnBall]);

  const spinDropWheel = useCallback((direction: 1 | -1) => {
    const currentIdx = DROP_OPTIONS.findIndex((v) => v === dropCount);
    const nextIdx = (currentIdx + direction + DROP_OPTIONS.length) % DROP_OPTIONS.length;
    setDropCount(DROP_OPTIONS[nextIdx]);
    setDropWheelTurn((prev) => prev + direction * 180);
  }, [dropCount]);

  const stopHold = useCallback(() => {
    setHolding(false);
    if (!holdIntervalRef.current) return;
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }, []);

  const startHold = useCallback(() => {
    setHolding(true);
    const fire = () => {
      const holdBet = Math.max(0.01, Math.round(balanceRef.current * 0.05 * 100) / 100);
      spawnBall(holdBet);
    };
    fire();
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(fire, 180);
  }, [spawnBall]);

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
          const minDist = BALL_RADIUS + 6;
          if (d2 > 0 && d2 < minDist * minDist) {
            const dist = Math.sqrt(d2);
            const nx = dx / dist;
            const ny = dy / dist;
            x = peg.x + nx * (minDist + 0.2);
            y = peg.y + ny * (minDist + 0.2);
            const dot = vx * nx + vy * ny;
            vx = (vx - 2 * dot * nx) * PEG_BOUNCE + (Math.random() - 0.5) * 0.25;
            vy = (vy - 2 * dot * ny) * PEG_BOUNCE + Math.random() * 0.15;
            pushFlash("peg", peg.x, peg.y, "#67e8f9");
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

        const floorY = BOARD_HEIGHT - 74;
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
          setLastDrop({ mult, payout });
          pushFlash("bin", (bucketIndex + 0.5) * bucketW, BOARD_HEIGHT - 50, mult >= 1 ? "#4ade80" : "#fb7185");
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
      stopHold();
      if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
    };
  }, [pegs, pushFlash, setBalance, stopHold]);

  return (
    <main style={{ padding: "clamp(12px, 2vw, 24px)" }}>
      {showNotice && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(2,6,23,0.84)",
          backdropFilter: "blur(5px)",
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}>
          <div style={{
            width: "min(680px, 100%)",
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
            boxShadow: "0 24px 90px rgba(0,0,0,0.55)",
            padding: "24px 20px",
            textAlign: "center",
            color: "#e2e8f0",
          }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px, 4vw, 32px)" }}>Plinko II</h2>
            <p style={{ margin: "0 0 18px", color: "#cbd5e1", fontSize: "clamp(16px, 2.3vw, 18px)" }}>
              The next generation of plinko is under development — check back later.
            </p>
            <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 700 }}>Check back later.</div>
          </div>
        </div>
      )}
      <section style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.22), rgba(15,23,42,0.95) 44%), linear-gradient(180deg, #0f172a, #020617)",
        boxShadow: "0 18px 48px rgba(15,23,42,0.65)",
        padding: "clamp(12px, 2.2vw, 20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, color: "#e2e8f0", fontSize: "clamp(25px, 3.7vw, 34px)", letterSpacing: "0.04em" }}>
            Plinko II <span style={{ color: "#22d3ee" }}>Early Access, subject to change</span>
          </h1>
          <div style={{ color: "#cbd5e1", fontWeight: 700 }}>Balance: {fmtMoney(balance)}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: "1 1 540px", width: "100%", maxWidth: 580, margin: "0 auto", aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`, position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(148,163,184,0.25)", background: "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(2,6,23,0.95))" }}>
            {pegs.map((peg, idx) => (
              <div key={idx} style={{ position: "absolute", left: `${(peg.x / BOARD_WIDTH) * 100}%`, top: `${(peg.y / BOARD_HEIGHT) * 100}%`, width: 10, height: 10, borderRadius: "50%", transform: "translate(-50%, -50%)", background: "radial-gradient(circle at 30% 30%, #e2e8f0, #64748b)", boxShadow: "0 0 14px rgba(34,211,238,0.4)" }} />
            ))}

            <AnimatePresence>
              {pegFlashes.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0.8, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  style={{ position: "absolute", left: `${(f.x / BOARD_WIDTH) * 100}%`, top: `${(f.y / BOARD_HEIGHT) * 100}%`, width: 26, height: 26, borderRadius: "50%", border: `2px solid ${f.color}`, transform: "translate(-50%, -50%)" }}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {binFlashes.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0.8, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  style={{ position: "absolute", left: `${(f.x / BOARD_WIDTH) * 100}%`, top: `${(f.y / BOARD_HEIGHT) * 100}%`, width: 52, height: 52, borderRadius: "50%", border: `2px solid ${f.color}`, boxShadow: `0 0 30px ${f.color}`, transform: "translate(-50%, -50%)" }}
                />
              ))}
            </AnimatePresence>

            {balls.map((ball) => (
              <motion.div
                key={ball.id}
                animate={{ left: `${(ball.x / BOARD_WIDTH) * 100}%`, top: `${(ball.y / BOARD_HEIGHT) * 100}%` }}
                transition={{ type: "tween", duration: 0.04, ease: "linear" }}
                style={{ position: "absolute", width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, borderRadius: "50%", transform: "translate(-50%, -50%)", background: `radial-gradient(circle at 30% 30%, #fff, ${ball.color})`, boxShadow: `0 0 24px ${ball.color}99` }}
              />
            ))}

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "grid", gridTemplateColumns: `repeat(${BUCKETS}, 1fr)`, gap: 5, padding: 8 }}>
              {MULTIPLIERS.map((m, idx) => (
                <div key={idx} style={{ height: "clamp(38px, 6.4vw, 52px)", borderRadius: 12, background: m >= 4 ? "linear-gradient(180deg, #f59e0b, #b45309)" : m >= 1 ? "linear-gradient(180deg, #22c55e, #166534)" : "linear-gradient(180deg, #ef4444, #7f1d1d)", color: "white", fontWeight: 900, display: "grid", placeItems: "center", fontSize: "clamp(10px, 1.8vw, 13px)", border: "1px solid rgba(255,255,255,0.35)" }}>{m}x</div>
              ))}
            </div>
          </div>

          <aside style={{ flex: "0 1 240px", minWidth: 220, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, background: "rgba(2,6,23,0.75)", padding: 10, display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>BALL COUNT</div>
            <div style={wheelRow}>
              <button onClick={() => spinDropWheel(1)} style={arrowBtn}>▲</button>
              <motion.div animate={{ rotate: dropWheelTurn }} transition={{ duration: 0.35 }} style={wheelOuter}>
                <div style={wheelInner}>{dropCount}</div>
              </motion.div>
              <button onClick={() => spinDropWheel(-1)} style={arrowBtn}>▼</button>
            </div>

            <button onClick={() => setBet(Math.max(0.01, Math.round(balance * 0.5 * 100) / 100))} style={baseBtn}>HALF</button>
            <button onClick={() => setBet(Math.max(0.01, Math.round(balance * 100) / 100))} style={baseBtn}>ALL IN</button>
            <div style={{ color: "#cbd5e1", fontSize: 13 }}>Bet per ball: <strong>{fmtMoney(bet)}</strong></div>
            <button onClick={dropBatch} style={dropBtn}>DROP {dropCount}</button>
            <button
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              style={holdBtn}
            >
              {holding ? "HOLDING 5%/BALL" : "HOLD TO DROP (5%/BALL)"}
            </button>

            <div style={{ color: "#cbd5e1", fontSize: 13 }}>
              Last drop: <strong>{lastDrop ? `${lastDrop.mult}x (${fmtMoney(lastDrop.payout)})` : "Waiting..."}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

const baseBtn: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(15,23,42,0.78)",
  color: "#e2e8f0",
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const dropBtn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(34,211,238,0.6)",
  background: "rgba(34,211,238,0.14)",
  color: "#e2e8f0",
  padding: "8px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const holdBtn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(251,191,36,0.75)",
  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
  color: "#fff",
  padding: "8px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const wheelOuter: CSSProperties = {
  width: 74,
  height: 74,
  borderRadius: "50%",
  background: "conic-gradient(#22d3ee, #a78bfa, #f472b6, #f59e0b, #22d3ee)",
  boxShadow: "0 0 20px rgba(34,211,238,0.35)",
  display: "grid",
  placeItems: "center",
  border: "2px solid rgba(255,255,255,0.4)",
};

const wheelInner: CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: "50%",
  background: "#0f172a",
  display: "grid",
  placeItems: "center",
  color: "#e2e8f0",
  fontWeight: 800,
  fontSize: 12,
  padding: 4,
  textAlign: "center",
};

const wheelRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "30px 1fr 30px",
  alignItems: "center",
  gap: 8,
};

const arrowBtn: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.24)",
  background: "rgba(15,23,42,0.8)",
  color: "#e2e8f0",
  fontWeight: 900,
  cursor: "pointer",
  height: 30,
};
