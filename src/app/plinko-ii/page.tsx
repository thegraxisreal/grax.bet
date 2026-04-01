"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { fmtMoney } from "@/lib/format";

const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 760;
const ROWS = 12;
const BUCKETS = ROWS + 1;
const GRAVITY = 0.18;
const PEG_BOUNCE = 0.72;
const BALL_RADIUS = 8;

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
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PlinkoIIPage() {
  const { balance, setBalance } = useBalance();
  const [bet, setBet] = useState(0.25);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastDrop, setLastDrop] = useState<{ multiplier: number; payout: number } | null>(null);
  const [dropping, setDropping] = useState(false);

  const ballsRef = useRef<Ball[]>([]);
  const balanceRef = useRef(balance);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const ballIdRef = useRef(1);

  const pegs = useMemo<Peg[]>(() => {
    const list: Peg[] = [];
    const topPad = 84;
    const sidePad = 60;
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

  const dropOneBall = useCallback(() => {
    if (balanceRef.current < bet) return;
    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const nextBalance = Math.round((balanceRef.current - bet) * 100) / 100;
    balanceRef.current = nextBalance;
    setBalance(nextBalance);
    setDropping(true);
    const nextBall: Ball = {
      id: ballIdRef.current++,
      x: BOARD_WIDTH / 2 + (Math.random() * 12 - 6),
      y: 32,
      vx: Math.random() * 0.6 - 0.3,
      vy: 0,
      color,
      glow: `${color}66`,
      landed: false,
    };
    ballsRef.current = [...ballsRef.current, nextBall];
    setBalls(ballsRef.current);
  }, [bet, setBalance]);

  const stopHoldDrop = useCallback(() => {
    if (!holdIntervalRef.current) return;
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }, []);

  const startHoldDrop = useCallback(() => {
    dropOneBall();
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      dropOneBall();
    }, 170);
  }, [dropOneBall]);

  useEffect(() => {
    const bucketW = BOARD_WIDTH / BUCKETS;

    const tick = () => {
      let hadLiveBall = false;
      const next = ballsRef.current.map((ball) => {
        if (ball.landed) return ball;
        hadLiveBall = true;

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
            vx = (vx - 2 * dot * nx) * PEG_BOUNCE + (Math.random() - 0.5) * 0.3;
            vy = (vy - 2 * dot * ny) * PEG_BOUNCE + Math.random() * 0.15;
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
          const payout = Math.round(bet * mult * 100) / 100;
          const nextBalance = Math.round((balanceRef.current + payout) * 100) / 100;
          balanceRef.current = nextBalance;
          setBalance(nextBalance);
          setLastDrop({ multiplier: mult, payout });
          return { ...ball, x, y, vx, vy, landed: true };
        }

        return { ...ball, x, y, vx, vy };
      });

      ballsRef.current = next.filter((b) => !b.landed);
      setBalls(ballsRef.current);
      setDropping(hadLiveBall || (holdIntervalRef.current !== null));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopHoldDrop();
    };
  }, [bet, pegs, setBalance, stopHoldDrop]);

  return (
    <main style={{ padding: "24px", display: "grid", gap: 20 }}>
      <section style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.25), rgba(15,23,42,0.95) 45%), linear-gradient(180deg, #0f172a, #020617)",
        boxShadow: "0 25px 80px rgba(15,23,42,0.65), inset 0 0 0 1px rgba(255,255,255,0.04)",
        padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, color: "#e2e8f0", letterSpacing: "0.04em" }}>Plinko II <span style={{ color: "#22d3ee" }}>Early Access</span></h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>Enhanced visuals, upgraded peg physics, and hold-to-drop for rapid testing.</p>
          </div>
          <div style={{ textAlign: "right", color: "#e2e8f0" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>BALANCE</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(balance)}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          {[0.1, 0.25, 0.5, 1, 2].map((chip) => (
            <button key={chip} onClick={() => setBet(chip)} style={{
              borderRadius: 999,
              border: bet === chip ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.18)",
              background: bet === chip ? "rgba(34,211,238,0.2)" : "rgba(15,23,42,0.8)",
              color: "#e2e8f0",
              padding: "8px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}>{fmtMoney(chip)}</button>
          ))}

          <button
            onMouseDown={startHoldDrop}
            onMouseUp={stopHoldDrop}
            onMouseLeave={stopHoldDrop}
            onTouchStart={startHoldDrop}
            onTouchEnd={stopHoldDrop}
            style={{
              marginLeft: "auto",
              borderRadius: 12,
              padding: "10px 18px",
              border: "1px solid rgba(251,191,36,0.65)",
              color: "#f8fafc",
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              fontWeight: 800,
              letterSpacing: "0.03em",
              boxShadow: "0 10px 30px rgba(239,68,68,0.4)",
              cursor: "pointer",
            }}
          >
            {dropping ? "HOLDING..." : "HOLD TO DROP"}
          </button>
        </div>

        <div style={{ position: "relative", width: "100%", overflow: "auto", borderRadius: 20, border: "1px solid rgba(148,163,184,0.25)", background: "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(2,6,23,0.95))" }}>
          <div style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, margin: "0 auto", position: "relative" }}>
            {pegs.map((peg, idx) => (
              <div key={idx} style={{
                position: "absolute",
                left: peg.x - 5,
                top: peg.y - 5,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #e2e8f0, #64748b)",
                boxShadow: "0 0 18px rgba(34,211,238,0.35)",
              }} />
            ))}

            {balls.map((ball) => (
              <motion.div
                key={ball.id}
                animate={{ x: ball.x - BALL_RADIUS, y: ball.y - BALL_RADIUS }}
                transition={{ type: "tween", duration: 0.04, ease: "linear" }}
                style={{
                  position: "absolute",
                  width: BALL_RADIUS * 2,
                  height: BALL_RADIUS * 2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 30% 30%, #fff, ${ball.color})`,
                  boxShadow: `0 0 20px ${ball.glow}`,
                }}
              />
            ))}

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "grid", gridTemplateColumns: `repeat(${BUCKETS}, 1fr)`, gap: 6, padding: 8 }}>
              {MULTIPLIERS.map((m, idx) => (
                <div key={idx} style={{
                  height: 54,
                  borderRadius: 12,
                  background: m >= 4 ? "linear-gradient(180deg, #f59e0b, #b45309)" : m >= 1 ? "linear-gradient(180deg, #22c55e, #166534)" : "linear-gradient(180deg, #ef4444, #7f1d1d)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 13,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(255,255,255,0.35)",
                }}>{m}x</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
          <span>Bet per ball: <strong>{fmtMoney(bet)}</strong></span>
          <span>Last drop: <strong>{lastDrop ? `${lastDrop.multiplier}x (${fmtMoney(lastDrop.payout)})` : "Waiting..."}</strong></span>
        </div>
      </section>
    </main>
  );
}
