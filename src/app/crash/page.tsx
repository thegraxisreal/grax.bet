"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useLiveEvents } from "@/context/LiveEventsContext";
import { useUser } from "@/context/UserContext";
import { logFeedEvent } from "@/lib/feed";
import { fmtMoney } from "@/lib/format";
import GameLiveEventBanner from "@/components/GameLiveEventBanner";
import { CasinoChip } from "@/components/CasinoChip";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import { playChipClick } from "@/lib/sound";

// ── Constants ──────────────────────────────────────────────────────────────────

const GROWTH_RATE = 0.09; // mult = e^(GROWTH_RATE * seconds)
const WAITING_SECS = 5;

function generateCrashPoint(): number {
  const r = Math.random();
  return Math.max(1.0, 0.96 / (1 - r));
}

function multFromTime(t: number): number {
  return Math.pow(Math.E, GROWTH_RATE * t);
}

function multColor(m: number, a = 1): string {
  if (m < 1.5) return `rgba(0,230,118,${a})`;
  if (m < 3)   return `rgba(240,180,41,${a})`;
  if (m < 10)  return `rgba(255,140,0,${a})`;
  return `rgba(244,67,54,${a})`;
}

// ── Audio ──────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
function getACtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

let engOsc: OscillatorNode | null = null;
let engGain: GainNode | null = null;

function startEngine() {
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.5);
    osc.connect(g); g.connect(ctx.destination);
    osc.start();
    engOsc = osc; engGain = g;
  } catch { /* silent */ }
}

function updateEngine(mult: number) {
  if (!engOsc) return;
  try { engOsc.frequency.setValueAtTime(55 + mult * 18, getACtx().currentTime); } catch { /* silent */ }
}

function stopEngine() {
  if (!engGain || !engOsc) return;
  try {
    const ctx = getACtx();
    engGain.gain.setValueAtTime(engGain.gain.value, ctx.currentTime);
    engGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    setTimeout(() => { try { engOsc?.stop(); } catch { /**/ } engOsc = null; engGain = null; }, 300);
  } catch { /* silent */ }
}

function playCashout() {
  try {
    const ctx = getACtx();
    [784, 1047, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
      const t = ctx.currentTime + i * 0.07;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    });
  } catch { /* silent */ }
}

function playCrash() {
  try {
    const ctx = getACtx();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(g); g.connect(ctx.destination); src.start();
    const osc = ctx.createOscillator(); const g2 = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.5);
    g2.gain.setValueAtTime(0.45, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g2); g2.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent */ }
}

// ── Fake players ───────────────────────────────────────────────────────────────

// ── Particles ──────────────────────────────────────────────────────────────────

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

function spawnExplosion(x: number, y: number, particles: Particle[]) {
  const colors = ["#f44336", "#ff9800", "#ffeb3b", "#ffffff", "#ff5722", "#ff1744"];
  for (let i = 0; i < 48; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 9;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 5 });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = "waiting" | "running" | "crashed";
interface HistoryEntry { mult: number; id: number; }

// ── Styles ─────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem",
  letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6, display: "block",
};

const pillStyle: React.CSSProperties = {
  flex: 1, padding: "5px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.07)", color: "var(--text-secondary)",
  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: "0.8rem",
  letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", textAlign: "center",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function CrashPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { getPayoutMultiplier } = useLiveEvents();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("waiting");
  const [waitTimer, setWaitTimer] = useState(WAITING_SECS);
  const [multiplier, setMultiplier] = useState(1);
  const [bet, setBet] = useState(1);
  const [autoCashout, setAutoCashout] = useState("");
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [lastResult, setLastResult] = useState<{ net: number; mult: number } | null>(null);

  // Refs for animation loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("waiting");
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(2);
  const multRef = useRef(1);
  const betRef = useRef(1);
  const hasBetRef = useRef(false);
  const cashedOutRef = useRef(false);
  const autoCashoutRef = useRef("");
  const particlesRef = useRef<Particle[]>([]);
  const histIdRef = useRef(0);
  const waitStartRef = useRef(performance.now());
  const animRef = useRef(0);
  const pointsRef = useRef<{ t: number; m: number }[]>([]);
  const tipRef = useRef<{ x: number; y: number } | null>(null);
  const crashedAtRef = useRef<number | null>(null);
  const canvasLogicalRef = useRef({ w: 800, h: 500 });

  // Sync refs
  phaseRef.current = phase;
  betRef.current = bet;
  autoCashoutRef.current = autoCashout;
  const payoutBoost = getPayoutMultiplier("Crash");

  // ── Cashout ──────────────────────────────────────────────────────────────────

  const doCashout = useCallback(() => {
    if (!hasBetRef.current || cashedOutRef.current || phaseRef.current !== "running") return;
    const m = multRef.current;
    cashedOutRef.current = true;
    setCashedOut(true);
    setCashedOutAt(m);
    const payout = Math.round(betRef.current * m * payoutBoost * 100) / 100;
    addBalance(payout);
    unregisterBet();
    const net = Math.round((payout - betRef.current) * 100) / 100;
    setLastResult({ net, mult: m });
    setSessionProfit(p => Math.round((p + net) * 100) / 100);
    if (username) logFeedEvent(username, "Crash", net, "win");
    playCashout();
  }, [addBalance, unregisterBet, username, payoutBoost]);

  // ── Main loop ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;

    // ── Drawing helpers ────────────────────────────────────────────────────────

    function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      // Flame (flickers)
      const flicker = Math.random() * 3;
      const fg = ctx.createRadialGradient(0, 14, 0, 0, 14, 11 + flicker);
      fg.addColorStop(0, "rgba(255,220,50,0.95)");
      fg.addColorStop(0.4, "rgba(255,120,0,0.8)");
      fg.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(0, 14, 5, 12 + flicker, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const bg2 = ctx.createLinearGradient(-7, 0, 7, 0);
      bg2.addColorStop(0, "#9aa8b4"); bg2.addColorStop(0.45, "#ffffff"); bg2.addColorStop(1, "#70808f");
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(0, -17); ctx.lineTo(-7, -3); ctx.lineTo(7, -3);
      ctx.closePath(); ctx.fill();

      // Window
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.arc(0, -1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.arc(-1.5, -2.5, 1.5, 0, Math.PI * 2); ctx.fill();

      // Fins
      ctx.fillStyle = "#8090a0";
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(-13, 13); ctx.lineTo(-7, 13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, 7); ctx.lineTo(13, 13); ctx.lineTo(7, 13); ctx.closePath(); ctx.fill();

      ctx.restore();
    }

    function drawChart(ctx: CanvasRenderingContext2D, W: number, H: number, crashed: boolean, curMult: number) {
      const PL = 58, PR = 18, PT = 22, PB = 38;
      const CW = W - PL - PR, CH = H - PT - PB;

      const pts = pointsRef.current;
      const maxT = pts.length > 0 ? pts[pts.length - 1].t * 1.15 : 5;
      const maxM = Math.max(curMult * 1.3, 2.2);

      const tx = (t: number) => PL + (t / maxT) * CW;
      const my = (m: number) => PT + CH - Math.min(((m - 1) / (maxM - 1)) * CH, CH + 20);

      // Grid
      const yStepOptions = [0.5, 1, 2, 5, 10, 25, 50, 100, 250];
      const yStep = yStepOptions.find(s => (maxM - 1) / s <= 5 && (maxM - 1) / s >= 1.5) ?? 1;

      ctx.save();
      ctx.strokeStyle = "rgba(30,52,80,0.7)";
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(74,100,128,0.55)";
      ctx.font = `600 11px 'Barlow Condensed', sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      let gm = 1;
      while (gm <= maxM * 1.05) {
        const gy = my(gm);
        if (gy >= PT - 2 && gy <= PT + CH + 2) {
          ctx.beginPath(); ctx.moveTo(PL, gy); ctx.lineTo(W - PR, gy); ctx.stroke();
          const label = gm >= 10 ? `${Math.round(gm)}×` : `${gm % 1 === 0 ? gm.toFixed(0) : gm.toFixed(1)}×`;
          ctx.fillText(label, PL - 6, gy);
        }
        gm += yStep;
      }
      ctx.restore();

      if (pts.length < 2) return;

      const lineCol = crashed ? "#f44336" : multColor(curMult);

      // Clip chart area
      ctx.save();
      ctx.beginPath();
      ctx.rect(PL, PT, CW, CH);
      ctx.clip();

      // Fill under curve
      ctx.beginPath();
      ctx.moveTo(tx(pts[0].t), my(1));
      for (const p of pts) ctx.lineTo(tx(p.t), my(p.m));
      ctx.lineTo(tx(pts[pts.length - 1].t), my(1));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PT, 0, PT + CH);
      grad.addColorStop(0, crashed ? "rgba(244,67,54,0.22)" : multColor(curMult, 0.22));
      grad.addColorStop(0.7, crashed ? "rgba(244,67,54,0.06)" : multColor(curMult, 0.06));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(tx(pts[0].t), my(pts[0].m));
      for (const p of pts) ctx.lineTo(tx(p.t), my(p.m));
      ctx.strokeStyle = lineCol;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = lineCol;
      ctx.shadowBlur = crashed ? 0 : 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Rocket at tip
      if (!crashed && pts.length >= 2) {
        const last = pts[pts.length - 1];
        const prev = pts[Math.max(0, pts.length - 4)];
        const tipX = tx(last.t);
        const tipY = my(last.m);
        const angle = Math.atan2(my(prev.m) - tipY, tx(prev.t) - tipX);
        tipRef.current = { x: tipX, y: tipY };
        drawRocket(ctx, tipX, tipY, angle);
      }

      // Particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawMultiplierText(ctx: CanvasRenderingContext2D, W: number, H: number, mult: number, crashed: boolean) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (crashed) {
        ctx.fillStyle = "rgba(244,67,54,0.75)";
        ctx.font = `700 22px 'Barlow Condensed', sans-serif`;
        ctx.fillText("CRASHED AT", W / 2, H / 2 - 36);
        ctx.fillStyle = "#f44336";
        ctx.font = `900 84px 'Barlow Condensed', sans-serif`;
        ctx.shadowColor = "rgba(244,67,54,0.7)";
        ctx.shadowBlur = 38;
        ctx.fillText(`${mult.toFixed(2)}×`, W / 2, H / 2 + 20);
        ctx.shadowBlur = 0;
      } else {
        const col = multColor(mult);
        ctx.fillStyle = col;
        ctx.font = `900 80px 'Barlow Condensed', sans-serif`;
        ctx.shadowColor = col;
        ctx.shadowBlur = 28 + mult * 1.5;
        ctx.fillText(`${mult.toFixed(2)}×`, W / 2, H / 2 - 10);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    function drawWaiting(ctx: CanvasRenderingContext2D, W: number, H: number, timeLeft: number) {
      // Faint grid
      ctx.save();
      ctx.strokeStyle = "rgba(30,52,80,0.35)";
      ctx.lineWidth = 1;
      for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(58, y); ctx.lineTo(W - 18, y); ctx.stroke(); }
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(143,168,200,0.55)";
      ctx.font = `600 15px 'Barlow Condensed', sans-serif`;
      ctx.fillText("NEXT ROUND IN", W / 2, H / 2 - 44);

      ctx.fillStyle = "rgba(240,180,41,0.92)";
      ctx.font = `800 80px 'Barlow Condensed', sans-serif`;
      ctx.shadowColor = "rgba(240,180,41,0.4)";
      ctx.shadowBlur = 28;
      ctx.fillText(timeLeft.toFixed(1) + "s", W / 2, H / 2 + 12);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Frame loop ────────────────────────────────────────────────────────────

    function frame(now: number) {
      if (!alive) return;
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(frame); return; }

      // Sync canvas resolution to display size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = Math.floor(rect.width);
      const displayH = Math.floor(rect.height);
      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }
      canvasLogicalRef.current = { w: displayW, h: displayH };

      const ctx = canvas.getContext("2d");
      if (!ctx) { animRef.current = requestAnimationFrame(frame); return; }

      const W = displayW, H = displayH;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0c1520");
      bg.addColorStop(1, "#080f18");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const p = phaseRef.current;

      if (p === "waiting") {
        const elapsed = (now - waitStartRef.current) / 1000;
        const left = Math.max(0, WAITING_SECS - elapsed);
        setWaitTimer(left);
        drawWaiting(ctx, W, H, left);
        if (left <= 0) {
          // Start round
          crashPointRef.current = generateCrashPoint();
          startTimeRef.current = now;
          pointsRef.current = [];
          particlesRef.current = [];
          cashedOutRef.current = false;
          tipRef.current = null;
          setCashedOut(false);
          setCashedOutAt(null);
          setLastResult(null);
          setMultiplier(1);
          multRef.current = 1;
          crashedAtRef.current = null;
          phaseRef.current = "running";
          setPhase("running");
          startEngine();
        }
      } else if (p === "running") {
        const elapsed = (now - startTimeRef.current) / 1000;
        const mult = multFromTime(elapsed);
        multRef.current = mult;
        setMultiplier(mult);

        // Sample points (throttle to ~60 per second max)
        const lastPt = pointsRef.current[pointsRef.current.length - 1];
        if (!lastPt || elapsed - lastPt.t > 0.016) {
          pointsRef.current.push({ t: elapsed, m: mult });
          if (pointsRef.current.length > 400) pointsRef.current.splice(0, 100);
        }

        updateEngine(mult);

        // Auto cashout
        const autoCO = parseFloat(autoCashoutRef.current);
        if (!cashedOutRef.current && hasBetRef.current && !isNaN(autoCO) && autoCO > 1 && mult >= autoCO) {
          doCashout();
        }

        // Crash check
        if (mult >= crashPointRef.current) {
          const finalMult = parseFloat(crashPointRef.current.toFixed(2));
          stopEngine();
          playCrash();

          if (hasBetRef.current && !cashedOutRef.current) {
            const net = -betRef.current;
            setLastResult({ net, mult: finalMult });
            setSessionProfit(prev => Math.round((prev + net) * 100) / 100);
          }

          setHistory(prev => [{ mult: finalMult, id: histIdRef.current++ }, ...prev].slice(0, 22));

          if (tipRef.current) spawnExplosion(tipRef.current.x, tipRef.current.y, particlesRef.current);

          multRef.current = finalMult;
          setMultiplier(finalMult);
          crashedAtRef.current = finalMult;
          phaseRef.current = "crashed";
          setPhase("crashed");

          setTimeout(() => {
            if (!alive) return;
            if (hasBetRef.current && !cashedOutRef.current) {
              unregisterBet();
            }
            hasBetRef.current = false;
            setHasBet(false);
            phaseRef.current = "waiting";
            setPhase("waiting");
            waitStartRef.current = performance.now();
          }, 4000);
        }

        drawChart(ctx, W, H, false, mult);
        drawMultiplierText(ctx, W, H, mult, false);

      } else {
        // crashed
        const finalMult = crashedAtRef.current ?? multRef.current;

        // Update particles
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.25;
          p.vx *= 0.97;
          p.life -= 0.018;
        }
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        drawChart(ctx, W, H, true, finalMult);
        drawMultiplierText(ctx, W, H, finalMult, true);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(frame);
    }

    waitStartRef.current = performance.now();
    animRef.current = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(animRef.current);
      stopEngine();
    };
  }, [doCashout, unregisterBet]);

  // Log crash loss when game crashes with an unrecovered bet
  useEffect(() => {
    if (phase === "crashed" && hasBet && !cashedOut && username) {
      logFeedEvent(username, "Crash", bet, "loss");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Place bet ─────────────────────────────────────────────────────────────────

  const placeBet = useCallback(() => {
    if (phase !== "waiting" || hasBet || bet <= 0 || bet > balance) return;
    subtractBalance(bet);
    registerBet();
    hasBetRef.current = true;
    setHasBet(true);
  }, [phase, hasBet, bet, balance, subtractBalance, registerBet]);

  const handleAction = useCallback(() => {
    if (phase === "waiting") placeBet();
    else if (phase === "running" && hasBet && !cashedOut) doCashout();
  }, [phase, hasBet, cashedOut, placeBet, doCashout]);

  const addChip = useCallback((v: number) => { playChipClick(); setBet(p => Math.min(p + v, balance)); }, [balance]);

  const canBet = phase === "waiting" && !hasBet && bet > 0 && bet <= balance;
  const canCashout = phase === "running" && hasBet && !cashedOut;

  const btnLabel = () => {
    if (phase === "waiting") return hasBet ? "✓ Bet Placed" : "Place Bet";
    if (canCashout) return `Cash Out  $${fmtMoney(bet * multiplier * payoutBoost)}`;
    if (phase === "running") return "Waiting…";
    return "Crashed";
  };

  const btnBg = canCashout
    ? `linear-gradient(135deg, ${multColor(multiplier)}, ${multColor(multiplier, 0.75)})`
    : canBet
    ? "linear-gradient(135deg, var(--accent-green), var(--accent-green-dark))"
    : phase === "waiting" && hasBet
    ? "rgba(0,230,118,0.08)"
    : "rgba(255,255,255,0.04)";

  const btnColor = (canBet || canCashout) ? "#0f1923" : canCashout ? "#0f1923" : "var(--text-muted)";
  const btnDisabled = !canBet && !canCashout;

  return (
    <div className="game-layout" style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg-primary)" }}>

      {/* ── Left Panel ────────────────────────────────────────────────────────── */}
      <div className="game-panel" style={{
        width: 240, minWidth: 240, background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex", flexDirection: "column", overflow: "auto",
        padding: "16px 14px", gap: 12,
      }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
            <polyline points="2,19 7,13 12,9.5 18,4" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="4" r="2.5" fill="var(--accent-green)" />
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary)" }}>Crash</span>
        </div>

        <GameLiveEventBanner gameName="Crash" />

        {/* Status badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
          borderRadius: 6, border: "1px solid var(--border-color)", background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: phase === "running" ? "var(--accent-green)" : phase === "crashed" ? "#f44336" : "var(--accent-gold)", boxShadow: `0 0 6px ${phase === "running" ? "var(--accent-green)" : phase === "crashed" ? "#f44336" : "var(--accent-gold)"}` }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-secondary)", textTransform: "uppercase" }}>
            {phase === "waiting" ? `Starting in ${waitTimer.toFixed(1)}s` : phase === "running" ? `${multiplier.toFixed(2)}× Live` : "Crashed"}
          </span>
        </div>

        {/* Bet */}
        <div>
          <label style={labelStyle}>Bet Amount</label>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", gap: 6 }}>
            <span style={{ fontSize: "0.65rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.14em", color: "var(--text-muted)" }}>$</span>
            <input
              type="number" min="0" step="0.01" value={bet || ""} placeholder="0.00"
              disabled={phase !== "waiting" || hasBet}
              onChange={e => { const v = parseFloat(e.target.value); setBet(isNaN(v) ? 0 : Math.min(Math.max(0, Math.round(v * 100) / 100), balance)); }}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--accent-gold)", width: "100%" }}
            />
            {bet > 0 && <button onClick={() => setBet(0)} disabled={phase !== "waiting" || hasBet} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: 0 }}>×</button>}
          </div>
          <CollapsibleBetSelector>
            <div className="crash-chips" style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {[1, 5, 10, 25].map(v => (
                <div key={v} style={{ transform: "scale(0.65)", transformOrigin: "top left" }}>
                  <CasinoChip value={v} onClick={addChip} disabled={phase !== "waiting" || hasBet} />
                </div>
              ))}
            </div>
            <div className="bet-halfall" style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button onClick={() => setBet(Math.floor(balance / 2 * 100) / 100)} disabled={phase !== "waiting" || hasBet}
                style={{ ...pillStyle, flex: 1 }}>½ Half</button>
              <button onClick={() => setBet(Math.floor(balance * 100) / 100)} disabled={phase !== "waiting" || hasBet}
                style={{ ...pillStyle, flex: 1, borderColor: "rgba(240,180,41,0.3)", color: "var(--accent-gold)" }}>All In</button>
            </div>
          </CollapsibleBetSelector>
        </div>

        {/* Auto Cash Out */}
        <div>
          <label style={labelStyle}>Auto Cash Out</label>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 8px", gap: 6 }}>
            <input
              type="number" min="1.01" step="0.1" value={autoCashout} placeholder="e.g. 2.00"
              disabled={phase !== "waiting" || hasBet}
              onChange={e => setAutoCashout(e.target.value)}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-gold)", width: "100%" }}
            />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.8rem", color: "var(--text-muted)" }}>×</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[1.5, 2, 3, 5, 10].map(v => (
              <button key={v} onClick={() => setAutoCashout(String(v))} disabled={phase !== "waiting" || hasBet}
                style={{ ...pillStyle, padding: "4px 4px", fontSize: "0.68rem", background: autoCashout === String(v) ? "var(--accent-green)" : "rgba(255,255,255,0.06)", color: autoCashout === String(v) ? "#0f1923" : "var(--text-muted)", fontWeight: autoCashout === String(v) ? 800 : 500 }}>
                {v}×
              </button>
            ))}
          </div>
        </div>

        {/* Action button */}
        <motion.button
          whileHover={btnDisabled ? {} : { scale: 1.02 }}
          whileTap={btnDisabled ? {} : { scale: 0.97 }}
          onClick={handleAction}
          disabled={btnDisabled}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 6, border: "none",
            background: btnBg, color: btnColor,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
            fontSize: "1.1rem", letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: btnDisabled ? "not-allowed" : "pointer",
            boxShadow: canCashout ? `0 4px 20px ${multColor(multiplier, 0.45)}` : canBet ? "0 4px 15px rgba(0,230,118,0.3)" : "none",
            transition: "all 0.12s",
            opacity: btnDisabled && !hasBet ? 0.35 : 1,
            outline: phase === "waiting" && hasBet ? "1px solid rgba(0,230,118,0.25)" : "none",
          } as React.CSSProperties}
        >
          {btnLabel()}
        </motion.button>

        {/* Potential payout */}
        {hasBet && phase === "running" && !cashedOut && (
          <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...labelStyle, margin: 0 }}>Potential</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1rem", color: multColor(multiplier) }}>
              ${fmtMoney(bet * multiplier)}
              {payoutBoost > 1 ? ` → $${fmtMoney(bet * multiplier * payoutBoost)}` : ""}
            </span>
          </div>
        )}

        {/* Last result */}
        <AnimatePresence>
          {lastResult && (
            <motion.div key={`${lastResult.mult}-${lastResult.net}`}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: lastResult.net >= 0 ? "rgba(0,230,118,0.08)" : "rgba(244,67,54,0.08)", border: `1px solid ${lastResult.net >= 0 ? "rgba(0,230,118,0.25)" : "rgba(244,67,54,0.25)"}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.62rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 2 }}>
                {lastResult.net >= 0 ? `CASHED OUT @ ${lastResult.mult.toFixed(2)}×` : "BUSTED"}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: lastResult.net >= 0 ? "var(--win-color)" : "var(--lose-color)" }}>
                {lastResult.net >= 0 ? "+" : ""}${fmtMoney(lastResult.net)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session P/L */}
        <div className="crash-session-pl" style={{ marginTop: "auto", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...labelStyle, margin: 0, fontSize: "0.7rem" }}>Session P/L</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1rem", color: sessionProfit >= 0 ? "var(--accent-green)" : "var(--lose-color)" }}>
            {sessionProfit >= 0 ? "+" : ""}${fmtMoney(sessionProfit)}
          </span>
        </div>
      </div>

      {/* ── Main Area ──────────────────────────────────────────────────────────── */}
      <div className="game-board" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Canvas */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Cashed out badge */}
          <AnimatePresence>
            {cashedOut && cashedOutAt && phase === "running" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,230,118,0.12)", border: "2px solid rgba(0,230,118,0.5)", borderRadius: 12, padding: "10px 28px", textAlign: "center", backdropFilter: "blur(4px)" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.68rem", letterSpacing: "0.15em", color: "var(--text-muted)" }}>CASHED OUT AT</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "2rem", color: "var(--win-color)", textShadow: "0 0 20px rgba(0,230,118,0.5)" }}>
                  {cashedOutAt.toFixed(2)}×
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
        <div className="crash-bottom-bar" style={{ borderTop: "1px solid var(--border-color)", display: "flex", minHeight: 148 }}>

          {/* History */}
          <div style={{ flex: 1, padding: "10px 14px", borderRight: "1px solid var(--border-color)", overflow: "hidden" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Crash History
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {history.map(h => {
                const col = h.mult < 1.5 ? "#f44336" : h.mult < 2 ? "var(--accent-gold)" : h.mult < 10 ? "var(--accent-green)" : "#fbbf24";
                const bg = h.mult < 1.5 ? "rgba(244,67,54,0.13)" : h.mult < 2 ? "rgba(240,180,41,0.1)" : h.mult < 10 ? "rgba(0,230,118,0.1)" : "rgba(251,191,36,0.14)";
                const border = h.mult < 1.5 ? "rgba(244,67,54,0.38)" : h.mult < 2 ? "rgba(240,180,41,0.32)" : h.mult < 10 ? "rgba(0,230,118,0.32)" : "rgba(251,191,36,0.48)";
                return (
                  <motion.div key={h.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ background: bg, border: `1px solid ${border}`, color: col, borderRadius: 20, padding: "2px 10px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem" }}>
                    {h.mult.toFixed(2)}×
                  </motion.div>
                );
              })}
              {history.length === 0 && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No rounds yet</span>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
