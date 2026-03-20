"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { CasinoChip } from "@/components/CasinoChip";
import { playChipClick } from "@/lib/sound";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROWS = 16;
const BUCKETS = ROWS + 1;

type Risk = "low" | "medium" | "high";
type Phase = "idle" | "dropping" | "result";

const MULTIPLIERS: Record<Risk, number[]> = {
  low: [0.5, 0.7, 0.8, 1, 1.2, 1.5, 2, 3, 5, 3, 2, 1.5, 1.2, 1, 0.8, 0.7, 0.5],
  medium: [0.2, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10, 5, 3, 2, 1.5, 1, 0.5, 0.3, 0.2],
  high: [0.1, 0.2, 0.3, 0.5, 1, 2, 5, 10, 25, 10, 5, 2, 1, 0.5, 0.3, 0.2, 0.1],
};

const BALL_COUNTS = [1, 3, 5, 10];
const SPEED_LABELS: Record<string, number> = { Slow: 0.6, Normal: 1, Fast: 2 };

function bucketColor(mult: number): string {
  if (mult >= 10) return "#f0b429";
  if (mult >= 3) return "#00e676";
  if (mult >= 1) return "#f59e0b";
  if (mult >= 0.5) return "#ef5350";
  return "#c62828";
}

// ── Sounds ────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playPegHit(row: number) {
  try {
    const ctx = getAudioCtx();
    const freq = 1800 - row * 70;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch { /* silent */ }
}

function playBucketLand() {
  try {
    const ctx = getAudioCtx();
    const bufSize = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    src.connect(g); g.connect(ctx.destination);
    src.start();
  } catch { /* silent */ }
}

function playHighWin() {
  try {
    const ctx = getAudioCtx();
    [784, 988, 1175, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch { /* silent */ }
}

function playJackpotWin() {
  try {
    const ctx = getAudioCtx();
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    });
    setTimeout(() => {
      try {
        const ctx2 = getAudioCtx();
        [1047, 1319].forEach((freq, i) => {
          const osc = ctx2.createOscillator();
          const g = ctx2.createGain();
          osc.connect(g); g.connect(ctx2.destination);
          osc.type = "triangle";
          const t = ctx2.currentTime + i * 0.12;
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.15, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.start(t); osc.stop(t + 0.4);
        });
      } catch { /* silent */ }
    }, 500);
  } catch { /* silent */ }
}

function playPlinkoLose() {
  try {
    const ctx = getAudioCtx();
    [300, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sawtooth";
      const t = ctx.currentTime + i * 0.18;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch { /* silent */ }
}

// ── Board Geometry ────────────────────────────────────────────────────────────

const BOARD_W = 580;
const BOARD_H = 620;
const PEG_RADIUS = 4;
const BALL_RADIUS = 6;
const BUCKET_H = 36;
const TOP_PAD = 40;
const SIDE_PAD = 30;
const BOARD_BOTTOM = BOARD_H - BUCKET_H - 12;

// Compute peg positions once
function getPegPositions(): { x: number; y: number; row: number; col: number }[] {
  const pegs: { x: number; y: number; row: number; col: number }[] = [];
  const spacingY = (BOARD_BOTTOM - TOP_PAD) / (ROWS);
  const usableW = BOARD_W - SIDE_PAD * 2;
  const spacingX = usableW / (ROWS + 2);

  for (let row = 0; row < ROWS; row++) {
    const pegsInRow = row + 3;
    const rowWidth = (pegsInRow - 1) * spacingX;
    const startX = (BOARD_W - rowWidth) / 2;
    const y = TOP_PAD + row * spacingY;
    for (let col = 0; col < pegsInRow; col++) {
      pegs.push({ x: startX + col * spacingX, y, row, col });
    }
  }
  return pegs;
}

const ALL_PEGS = getPegPositions();

function getBucketPositions(): { x: number; w: number; cx: number }[] {
  const usableW = BOARD_W - SIDE_PAD * 2;
  const w = usableW / BUCKETS;
  return Array.from({ length: BUCKETS }, (_, i) => ({
    x: SIDE_PAD + i * w,
    w,
    cx: SIDE_PAD + i * w + w / 2,
  }));
}

const ALL_BUCKETS = getBucketPositions();

// ── Ball Physics ──────────────────────────────────────────────────────────────

interface PhysBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  landed: boolean;
  bucketIndex: number;
  multiplier: number;
  trail: { x: number; y: number; age: number }[];
  rotation: number;
  squish: number; // 1 = normal, <1 = squished
  hitPegTimers: Map<string, number>; // pegKey -> time remaining
  resultReported: boolean;
}

interface BallResult {
  ballNum: number;
  multiplier: number;
  payout: number;
}

interface BucketFlash {
  index: number;
  time: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlinkoPage() {
  const { balance, addBalance, subtractBalance } = useBalance();

  const [phase, setPhase] = useState<Phase>("idle");
  const [bet, setBet] = useState(1);
  const [ballCount, setBallCount] = useState(1);
  const [risk, setRisk] = useState<Risk>("medium");
  const [speed, setSpeed] = useState("Normal");
  const [sessionProfit, setSessionProfit] = useState(0);

  // Auto-drop
  const [autoMode, setAutoMode] = useState(false);
  const [autoStopWin, setAutoStopWin] = useState("");
  const [autoStopLoss, setAutoStopLoss] = useState("");
  const [autoStopRounds, setAutoStopRounds] = useState("");
  const [autoStats, setAutoStats] = useState({ rounds: 0, wagered: 0, won: 0, biggestWin: 0 });
  const autoModeRef = useRef(false);
  const autoStatsRef = useRef(autoStats);

  // Results
  const [ballResults, setBallResults] = useState<BallResult[]>([]);
  const [totalResult, setTotalResult] = useState<{ net: number; totalPayout: number } | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: BOARD_W, h: BOARD_H });

  // Physics state stored in refs for animation loop
  const ballsRef = useRef<PhysBall[]>([]);
  const bucketFlashRef = useRef<BucketFlash[]>([]);
  const animFrameRef = useRef(0);
  const ballIdRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const riskRef = useRef<Risk>(risk);
  const betRef = useRef(bet);
  const speedRef = useRef(SPEED_LABELS[speed]);
  const dropContextRef = useRef<{
    totalBet: number;
    ballCount: number;
    results: BallResult[];
    totalPayout: number;
    allLanded: number;
  } | null>(null);

  phaseRef.current = phase;
  riskRef.current = risk;
  betRef.current = bet;
  speedRef.current = SPEED_LABELS[speed];

  const totalBet = bet * ballCount;

  // ── Canvas resize ─────────────────────────────────────────────────────────

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / BOARD_W, rect.height / BOARD_H, 1);
      setCanvasSize({
        w: Math.floor(BOARD_W * scale),
        h: Math.floor(BOARD_H * scale),
      });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Render loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let lastTime = performance.now();

    const mults = () => MULTIPLIERS[riskRef.current];

    function drawBoard(ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) {
      ctx.save();
      ctx.scale(scaleX, scaleY);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, BOARD_H);
      bgGrad.addColorStop(0, "#0e1c2a");
      bgGrad.addColorStop(1, "#091420");
      ctx.fillStyle = bgGrad;
      roundRect(ctx, 0, 0, BOARD_W, BOARD_H, 12);
      ctx.fill();

      // Border
      ctx.strokeStyle = "#1e3450";
      ctx.lineWidth = 2;
      roundRect(ctx, 0, 0, BOARD_W, BOARD_H, 12);
      ctx.stroke();

      // Side walls
      const wallGrad = ctx.createLinearGradient(0, 0, 8, 0);
      wallGrad.addColorStop(0, "#2a4060");
      wallGrad.addColorStop(1, "#0e1c2a");
      ctx.fillStyle = wallGrad;
      roundRect(ctx, 0, 0, 6, BOARD_H, 3);
      ctx.fill();
      const wallGrad2 = ctx.createLinearGradient(BOARD_W - 8, 0, BOARD_W, 0);
      wallGrad2.addColorStop(0, "#0e1c2a");
      wallGrad2.addColorStop(1, "#2a4060");
      ctx.fillStyle = wallGrad2;
      roundRect(ctx, BOARD_W - 6, 0, 6, BOARD_H, 3);
      ctx.fill();

      // Pegs
      const hitPegs = new Set<string>();
      for (const ball of ballsRef.current) {
        ball.hitPegTimers.forEach((t, key) => {
          if (t > 0) hitPegs.add(key);
        });
      }

      for (const peg of ALL_PEGS) {
        const pegKey = `${peg.row}-${peg.col}`;
        const isHit = hitPegs.has(pegKey);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.arc(peg.x + 1, peg.y + 2, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Body
        const pegGrad = ctx.createRadialGradient(
          peg.x - 1, peg.y - 1, 0,
          peg.x, peg.y, PEG_RADIUS
        );
        pegGrad.addColorStop(0, isHit ? "#ffffff" : "#8fa8c8");
        pegGrad.addColorStop(0.6, isHit ? "#bbddff" : "#4a6480");
        pegGrad.addColorStop(1, isHit ? "#6699cc" : "#2a3e55");
        ctx.fillStyle = pegGrad;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(peg.x - 1, peg.y - 1, PEG_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Hit ripple
        if (isHit) {
          // find max timer for this peg
          let maxT = 0;
          for (const b of ballsRef.current) {
            const tv = b.hitPegTimers.get(pegKey) ?? 0;
            if (tv > maxT) maxT = tv;
          }
          const rippleR = PEG_RADIUS + (PEG_RADIUS * 3) * (1 - maxT / 0.15);
          const rippleAlpha = maxT / 0.15 * 0.5;
          ctx.strokeStyle = `rgba(255,255,255,${rippleAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, rippleR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Buckets
      const currentMults = mults();
      const maxMult = Math.max(...currentMults);
      const flashSet = new Map<number, number>();
      for (const f of bucketFlashRef.current) {
        flashSet.set(f.index, Math.max(flashSet.get(f.index) ?? 0, f.time));
      }

      for (let i = 0; i < BUCKETS; i++) {
        const bp = ALL_BUCKETS[i];
        const mult = currentMults[i];
        const col = bucketColor(mult);
        const isJackpot = mult === maxMult;
        const flashTime = flashSet.get(i) ?? 0;

        // Bucket body
        ctx.fillStyle = col;
        ctx.globalAlpha = flashTime > 0 ? 1 : 0.7;
        roundRect(ctx, bp.x + 1, BOARD_H - BUCKET_H - 4, bp.w - 2, BUCKET_H, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Jackpot glow
        if (isJackpot) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 12;
          ctx.fillStyle = col;
          roundRect(ctx, bp.x + 1, BOARD_H - BUCKET_H - 4, bp.w - 2, BUCKET_H, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Flash overlay
        if (flashTime > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flashTime * 0.5})`;
          roundRect(ctx, bp.x + 1, BOARD_H - BUCKET_H - 4, bp.w - 2, BUCKET_H, 4);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = "white";
        ctx.font = `800 ${mult >= 10 ? 11 : 9}px 'Barlow Condensed', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${mult}x`, bp.cx, BOARD_H - BUCKET_H / 2 - 4);
      }

      // Ball trails
      for (const ball of ballsRef.current) {
        if (ball.trail.length < 2) continue;
        for (let i = 0; i < ball.trail.length; i++) {
          const t = ball.trail[i];
          const alpha = ((i + 1) / ball.trail.length) * 0.2;
          const r = BALL_RADIUS * 0.4 * ((i + 1) / ball.trail.length);
          ctx.fillStyle = `rgba(251,191,36,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Balls
      for (const ball of ballsRef.current) {
        if (ball.landed) continue;

        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);
        ctx.scale(1, ball.squish);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(2, 3 / ball.squish, BALL_RADIUS, BALL_RADIUS * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body gradient
        const ballGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, BALL_RADIUS);
        ballGrad.addColorStop(0, "#fef3c7");
        ballGrad.addColorStop(0.5, "#fbbf24");
        ballGrad.addColorStop(1, "#d97706");
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(-2, -2, BALL_RADIUS * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }

    function step(now: number) {
      if (!running) return;
      const rawDt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;
      const dt = rawDt * speedRef.current;

      const balls = ballsRef.current;
      const gravity = 1200;
      const bounceDamping = 0.5;
      const friction = 0.98;

      for (const ball of balls) {
        if (ball.landed) continue;

        // Apply gravity
        ball.vy += gravity * dt;

        // Move
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Rotation
        ball.rotation += ball.vx * dt * 0.05;

        // Squish recovery
        ball.squish += (1 - ball.squish) * 10 * dt;

        // Trail
        ball.trail.push({ x: ball.x, y: ball.y, age: 0 });
        if (ball.trail.length > 12) ball.trail.shift();

        // Update hit peg timers
        ball.hitPegTimers.forEach((t, key) => {
          const newT = t - rawDt;
          if (newT <= 0) ball.hitPegTimers.delete(key);
          else ball.hitPegTimers.set(key, newT);
        });

        // Collide with pegs
        for (const peg of ALL_PEGS) {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = PEG_RADIUS + BALL_RADIUS;

          if (dist < minDist && dist > 0) {
            // Push ball out
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = peg.x + nx * minDist;
            ball.y = peg.y + ny * minDist;

            // Reflect velocity
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              ball.vx -= 2 * dot * nx;
              ball.vy -= 2 * dot * ny;
              ball.vx *= bounceDamping;
              ball.vy *= bounceDamping;

              // Add random horizontal nudge for realism
              const riskBias = riskRef.current === "low" ? 0.6 : riskRef.current === "high" ? 0.3 : 0.45;
              const nudge = (Math.random() < riskBias ? -1 : 1) *
                (30 + Math.random() * 60) *
                (ball.x > BOARD_W / 2 ? -0.3 : 0.3); // slight center bias
              ball.vx += nudge;

              // Squish
              ball.squish = 0.7;

              // Sound + hit visual
              const pegKey = `${peg.row}-${peg.col}`;
              if (!ball.hitPegTimers.has(pegKey)) {
                playPegHit(peg.row);
              }
              ball.hitPegTimers.set(pegKey, 0.15);
            }
          }
        }

        // Wall collisions
        if (ball.x < SIDE_PAD + BALL_RADIUS) {
          ball.x = SIDE_PAD + BALL_RADIUS;
          ball.vx = Math.abs(ball.vx) * bounceDamping;
        }
        if (ball.x > BOARD_W - SIDE_PAD - BALL_RADIUS) {
          ball.x = BOARD_W - SIDE_PAD - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx) * bounceDamping;
        }

        // Friction
        ball.vx *= friction;

        // Landing check
        if (ball.y >= BOARD_BOTTOM - BALL_RADIUS) {
          ball.y = BOARD_BOTTOM - BALL_RADIUS;
          ball.landed = true;

          // Determine bucket
          const bucketW = (BOARD_W - SIDE_PAD * 2) / BUCKETS;
          let bIdx = Math.floor((ball.x - SIDE_PAD) / bucketW);
          bIdx = Math.max(0, Math.min(BUCKETS - 1, bIdx));
          ball.bucketIndex = bIdx;
          ball.multiplier = mults()[bIdx];

          // Bucket flash
          bucketFlashRef.current.push({ index: bIdx, time: 0.5 });

          playBucketLand();
          if (ball.multiplier >= 10) playJackpotWin();
          else if (ball.multiplier >= 3) playHighWin();

          // Report result
          if (!ball.resultReported && dropContextRef.current) {
            ball.resultReported = true;
            const dc = dropContextRef.current;
            const payout = Math.round(betRef.current * ball.multiplier * 100) / 100;
            const result: BallResult = {
              ballNum: dc.results.length + 1,
              multiplier: ball.multiplier,
              payout,
            };
            dc.results.push(result);
            dc.totalPayout += payout;
            dc.allLanded++;
            setBallResults([...dc.results]);

            // All balls landed?
            if (dc.allLanded >= dc.ballCount) {
              const net = Math.round((dc.totalPayout - dc.totalBet) * 100) / 100;
              const roundedPayout = Math.round(dc.totalPayout * 100) / 100;
              addBalance(roundedPayout);
              setTotalResult({ net, totalPayout: roundedPayout });
              setSessionProfit(prev => Math.round((prev + net) * 100) / 100);
              setPhase("result");

              if (net > 0) {
                const maxM = Math.max(...dc.results.map(r => r.multiplier));
                if (maxM >= 10) playJackpotWin();
                else playHighWin();
              } else if (net < 0) {
                playPlinkoLose();
              }

              if (autoModeRef.current) {
                autoStatsRef.current = {
                  rounds: autoStatsRef.current.rounds + 1,
                  wagered: Math.round((autoStatsRef.current.wagered + dc.totalBet) * 100) / 100,
                  won: Math.round((autoStatsRef.current.won + roundedPayout) * 100) / 100,
                  biggestWin: Math.max(autoStatsRef.current.biggestWin, roundedPayout),
                };
                setAutoStats({ ...autoStatsRef.current });
              }
            }
          }
        }
      }

      // Update bucket flashes
      bucketFlashRef.current = bucketFlashRef.current
        .map(f => ({ ...f, time: f.time - rawDt * 2 }))
        .filter(f => f.time > 0);

      // Draw
      if (!ctx) return;
      const scaleX = canvasRef.current!.width / BOARD_W;
      const scaleY = canvasRef.current!.height / BOARD_H;
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      drawBoard(ctx, scaleX, scaleY);

      animFrameRef.current = requestAnimationFrame(step);
    }

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasSize, addBalance]);

  // ── Drop ──────────────────────────────────────────────────────────────────

  const dropBalls = useCallback(() => {
    if (totalBet > balance || totalBet <= 0) return;

    subtractBalance(totalBet);
    setPhase("dropping");
    setBallResults([]);
    setTotalResult(null);

    dropContextRef.current = {
      totalBet,
      ballCount,
      results: [],
      totalPayout: 0,
      allLanded: 0,
    };

    // Remove old landed balls
    ballsRef.current = ballsRef.current.filter(b => !b.landed);

    const centerX = BOARD_W / 2;
    for (let i = 0; i < ballCount; i++) {
      const ball: PhysBall = {
        x: centerX + (Math.random() - 0.5) * 10,
        y: TOP_PAD - 30 - i * 15,
        vx: (Math.random() - 0.5) * 20,
        vy: 0,
        id: ballIdRef.current++,
        landed: false,
        bucketIndex: -1,
        multiplier: 0,
        trail: [],
        rotation: 0,
        squish: 1,
        hitPegTimers: new Map(),
        resultReported: false,
      };
      ballsRef.current.push(ball);
    }
  }, [totalBet, balance, ballCount, subtractBalance]);

  // ── Auto-drop ─────────────────────────────────────────────────────────────

  const autoDropInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoMode = useCallback(() => {
    autoModeRef.current = true;
    autoStatsRef.current = { rounds: 0, wagered: 0, won: 0, biggestWin: 0 };
    setAutoStats(autoStatsRef.current);
    setAutoMode(true);
  }, []);

  const stopAutoMode = useCallback(() => {
    autoModeRef.current = false;
    setAutoMode(false);
    if (autoDropInterval.current) {
      clearTimeout(autoDropInterval.current);
      autoDropInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoMode) return;
    if (phase === "dropping") return;

    const stats = autoStatsRef.current;
    const netProfit = stats.won - stats.wagered;
    const stopWin = autoStopWin ? parseFloat(autoStopWin) : Infinity;
    const stopLoss = autoStopLoss ? parseFloat(autoStopLoss) : -Infinity;
    const stopRounds = autoStopRounds ? parseInt(autoStopRounds) : Infinity;

    if (netProfit >= stopWin || netProfit <= -Math.abs(stopLoss) || stats.rounds >= stopRounds) {
      stopAutoMode();
      return;
    }
    if (totalBet > balance || totalBet <= 0) {
      stopAutoMode();
      return;
    }

    const delay = speed === "Fast" ? 300 : speed === "Slow" ? 2000 : 1000;
    autoDropInterval.current = setTimeout(() => {
      if (autoModeRef.current && phaseRef.current !== "dropping") {
        dropBalls();
      }
    }, delay);

    return () => {
      if (autoDropInterval.current) clearTimeout(autoDropInterval.current);
    };
  }, [autoMode, phase, dropBalls, balance, totalBet, speed, autoStopWin, autoStopLoss, autoStopRounds, stopAutoMode]);

  useEffect(() => {
    return () => {
      if (autoDropInterval.current) clearTimeout(autoDropInterval.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const canDrop = phase !== "dropping" && totalBet > 0 && totalBet <= balance;

  const addChip = useCallback((v: number) => {
    playChipClick();
    setBet(prev => prev + v);
  }, []);

  return (
    <div style={{
      display: "flex",
      height: "100%",
      overflow: "hidden",
      background: "var(--bg-primary)",
    }}>
      {/* ── Left Panel ────────────────────────────────── */}
      <div style={{
        width: 240,
        minWidth: 240,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        padding: "16px 14px",
        gap: 12,
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="2.5" r="1.8" fill="var(--accent-green)" />
            {[4, 7, 10, 13].map((y, row) =>
              Array.from({ length: row + 1 }).map((_, col) => (
                <circle key={`${row}-${col}`} cx={11 - row * 1.8 + col * 3.6} cy={y + 3} r="1" fill="var(--accent-green)" opacity="0.6" />
              ))
            )}
          </svg>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: "1.3rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
          }}>Plinko</span>
        </div>

        {/* Bet */}
        <div>
          <label style={labelStyle}>Bet Per Ball</label>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            padding: "4px 8px",
            gap: 6,
          }}>
            <span style={{ fontSize: "0.65rem", fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.14em", color: "var(--text-muted)" }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bet || ""}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setBet(isNaN(v) ? 0 : Math.min(Math.max(0, Math.round(v * 100) / 100), balance));
              }}
              placeholder="0.00"
              disabled={phase === "dropping"}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: "1rem", color: "var(--accent-gold)", width: "100%",
              }}
            />
            {bet > 0 && (
              <button onClick={() => setBet(0)}
                style={{ background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[1, 5, 10, 25].map(v => (
              <div key={v} style={{ transform: "scale(0.65)", transformOrigin: "top left" }}>
                <CasinoChip value={v} onClick={addChip} disabled={phase === "dropping"} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button onClick={() => setBet(Math.round(balance / 2 * 100) / 100)}
              disabled={phase === "dropping"}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 6px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="13" r="6" fill="var(--text-muted)"/><circle cx="10" cy="13" r="4.5" fill="var(--bg-secondary)"/><circle cx="10" cy="9" r="6" fill="var(--text-secondary)"/><circle cx="10" cy="9" r="4.5" fill="var(--bg-secondary)"/><text x="10" y="10" textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="var(--text-secondary)" fontWeight="800">½</text></svg>
              Half
            </button>
            <button onClick={() => setBet(Math.round(balance * 100) / 100)}
              disabled={phase === "dropping"}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 6px", borderRadius: 5, border: "1px solid rgba(240,180,41,0.3)", background: "rgba(240,180,41,0.08)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="15" r="5" fill="#8b6914"/><circle cx="10" cy="15" r="3.5" fill="#0f1923"/><circle cx="10" cy="11" r="5" fill="#b8960c"/><circle cx="10" cy="11" r="3.5" fill="#0f1923"/><circle cx="10" cy="7" r="5" fill="#d4af37"/><circle cx="10" cy="7" r="3.5" fill="#0f1923"/><text x="10" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#d4af37" fontWeight="800">MAX</text></svg>
              All In
            </button>
          </div>
        </div>

        {/* Ball Count */}
        <div>
          <label style={labelStyle}>Balls</label>
          <div style={{ display: "flex", gap: 4 }}>
            {BALL_COUNTS.map(n => (
              <button key={n} onClick={() => setBallCount(n)}
                disabled={phase === "dropping"}
                style={{
                  ...pillStyle,
                  background: ballCount === n ? "var(--accent-green)" : "rgba(255,255,255,0.07)",
                  color: ballCount === n ? "#0f1923" : "var(--text-secondary)",
                  fontWeight: ballCount === n ? 800 : 500,
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Risk */}
        <div>
          <label style={labelStyle}>Risk</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["low", "medium", "high"] as Risk[]).map(r => (
              <button key={r} onClick={() => setRisk(r)}
                disabled={phase === "dropping"}
                style={{
                  ...pillStyle,
                  flex: 1,
                  background: risk === r ? "var(--accent-green)" : "rgba(255,255,255,0.07)",
                  color: risk === r ? "#0f1923" : "var(--text-secondary)",
                  fontWeight: risk === r ? 800 : 500,
                  textTransform: "uppercase",
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Total Bet */}
        <div style={{
          background: "rgba(0,0,0,0.25)",
          border: "1px solid var(--border-color)",
          borderRadius: 6,
          padding: "8px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ ...labelStyle, margin: 0, fontSize: "0.7rem" }}>Total Bet</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "1.05rem",
            color: totalBet > balance ? "var(--lose-color)" : "var(--accent-gold)",
          }}>
            ${totalBet.toFixed(2)}
          </span>
        </div>
        {totalBet > balance && (
          <div style={{ color: "var(--lose-color)", fontSize: "0.72rem", fontWeight: 600, marginTop: -8 }}>
            Insufficient balance
          </div>
        )}

        {/* Drop Button */}
        {!autoMode ? (
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={dropBalls}
            disabled={!canDrop}
            style={{ width: "100%", fontSize: "1.15rem", letterSpacing: "0.14em" }}
          >
            {phase === "result" ? "DROP AGAIN" : "DROP"}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={stopAutoMode}
            style={{
              width: "100%",
              padding: "11px 28px",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg, #f44336, #c62828)",
              color: "white",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(244,67,54,0.4)",
            }}
          >
            STOP AUTO
          </motion.button>
        )}

        {/* Speed */}
        <div>
          <label style={labelStyle}>Speed</label>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.keys(SPEED_LABELS).map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                style={{
                  ...pillStyle,
                  flex: 1,
                  background: speed === s ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                  color: speed === s ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: speed === s ? 700 : 500,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Drop */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
          <label style={labelStyle}>Auto Drop</label>
          {!autoMode ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={tinyLabelStyle}>Stop win $</span>
                  <input type="number" value={autoStopWin} onChange={e => setAutoStopWin(e.target.value)}
                    placeholder="∞" style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={tinyLabelStyle}>Stop loss $</span>
                  <input type="number" value={autoStopLoss} onChange={e => setAutoStopLoss(e.target.value)}
                    placeholder="∞" style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={tinyLabelStyle}>Max rounds</span>
                  <input type="number" value={autoStopRounds} onChange={e => setAutoStopRounds(e.target.value)}
                    placeholder="∞" style={inputStyle} />
                </div>
              </div>
              <button onClick={startAutoMode} disabled={!canDrop}
                className="btn-action" style={{ width: "100%", fontSize: "0.85rem" }}>
                Start Auto
              </button>
            </>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
              <div>Rounds: <b style={{ color: "var(--text-primary)" }}>{autoStats.rounds}</b></div>
              <div>Wagered: <b style={{ color: "var(--accent-gold)" }}>${autoStats.wagered.toFixed(2)}</b></div>
              <div>Won: <b style={{ color: "var(--accent-green)" }}>${autoStats.won.toFixed(2)}</b></div>
              <div>Net: <b style={{ color: autoStats.won - autoStats.wagered >= 0 ? "var(--accent-green)" : "var(--lose-color)" }}>
                ${(autoStats.won - autoStats.wagered).toFixed(2)}
              </b></div>
              <div>Best: <b style={{ color: "var(--accent-gold)" }}>${autoStats.biggestWin.toFixed(2)}</b></div>
            </div>
          )}
        </div>

        {/* Session P/L */}
        <div style={{
          marginTop: "auto",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid var(--border-color)",
          borderRadius: 6,
          padding: "8px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ ...labelStyle, margin: 0, fontSize: "0.7rem" }}>Session P/L</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: sessionProfit >= 0 ? "var(--accent-green)" : "var(--lose-color)",
          }}>
            {sessionProfit >= 0 ? "+" : ""}${sessionProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Board ─────────────────────────────────────── */}
      <div ref={containerRef} style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.w * 2}
          height={canvasSize.h * 2}
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            borderRadius: 12,
          }}
        />

        {/* Result banner */}
        <AnimatePresence>
          {totalResult && phase === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                position: "absolute",
                top: 24,
                zIndex: 10,
              }}
            >
              <div className={`result-banner ${totalResult.net >= 0 ? "win" : "lose"}`}
                style={{ fontSize: "1.6rem", padding: "10px 24px" }}>
                {totalResult.net >= 0 ? "+" : ""}${totalResult.net.toFixed(2)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right Panel ───────────────────────────────── */}
      <div style={{
        width: 200,
        minWidth: 200,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "16px 12px",
      }}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>Ball Results</label>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          <AnimatePresence>
            {ballResults.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${r.payout > bet ? "rgba(0,230,118,0.3)" : "rgba(244,67,54,0.2)"}`,
                  borderRadius: 6,
                  padding: "5px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.78rem",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Ball {r.ballNum}</span>
                <span style={{ color: bucketColor(r.multiplier), fontWeight: 800 }}>{r.multiplier}x</span>
                <span style={{
                  color: r.payout >= bet ? "var(--accent-green)" : "var(--lose-color)",
                  fontWeight: 700,
                }}>
                  {r.payout >= bet ? "+" : ""}${(r.payout - bet).toFixed(2)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {ballResults.length === 0 && (
            <div style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              textAlign: "center",
              marginTop: 20,
              fontStyle: "italic",
            }}>
              Drop balls to see results
            </div>
          )}
        </div>

        {totalResult && (
          <div style={{
            marginTop: 8,
            borderTop: "1px solid var(--border-color)",
            paddingTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Total Payout</span>
              <span style={{ color: "var(--accent-gold)", fontWeight: 800 }}>
                ${totalResult.totalPayout.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Net</span>
              <span style={{
                color: totalResult.net >= 0 ? "var(--accent-green)" : "var(--lose-color)",
                fontWeight: 800,
              }}>
                {totalResult.net >= 0 ? "+" : ""}${totalResult.net.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 600,
  fontSize: "0.68rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 5,
};

const pillStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.1)",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.85rem",
  letterSpacing: "0.06em",
  cursor: "pointer",
  transition: "all 0.15s ease",
};


const tinyLabelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.65rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  letterSpacing: "0.06em",
  width: 72,
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(0,0,0,0.3)",
  border: "1px solid var(--border-color)",
  borderRadius: 4,
  padding: "4px 8px",
  color: "var(--text-primary)",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.78rem",
  fontWeight: 600,
  outline: "none",
  width: "100%",
};
