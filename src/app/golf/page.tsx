"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { fmtMoney } from "@/lib/format";
import GolfCanvas from "./components/GolfCanvas";
import { HOLES } from "./lib/holes";
import { HoleConfig, RoundResult } from "./lib/types";

type Phase = "select" | "playing" | "result";

export default function GolfPage() {
  const { balance, subtractBalance, addBalance } = useBalance();
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState(0);
  const [stake, setStake] = useState(2);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [payout, setPayout] = useState(0);

  const hole = HOLES[selected];
  const stakeClamped = useMemo(() => Math.max(0.5, Math.min(balance, stake || 0)), [balance, stake]);

  const start = () => {
    if (stakeClamped <= 0 || stakeClamped > balance) return;
    subtractBalance(stakeClamped);
    setStake(stakeClamped);
    setPayout(0);
    setResult(null);
    setPhase("playing");
  };

  const finishRound = (round: RoundResult) => {
    const resolved = { ...round, won: true };
    setResult(resolved);
    const win = Math.round(stake * hole.multiplier * 100) / 100;
    addBalance(win);
    setPayout(win);
    setPhase("result");
  };

  const quit = () => {
    addBalance(stake);
    setResult(null);
    setPayout(0);
    setPhase("select");
  };

  const reset = () => {
    setPhase("select");
    setResult(null);
    setPayout(0);
  };

  return (
    <div className="h-full overflow-auto p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Retro Minigolf</p>
            <h1 className="text-4xl font-bold uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>/Golf</h1>
          </div>
          <Link href="/" className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">Back to Lobby</Link>
        </div>

        {phase === "select" && (
          <>
            <div className="mb-4 rounded border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              Balance: <strong className="text-emerald-300">{fmtMoney(balance)}</strong>
            </div>

            <div className="mb-4 rounded-xl border p-4" style={{ background: "#08111f", borderColor: "#223147" }}>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Choose Your Level</p>
              <div className="grid gap-3 md:grid-cols-3">
                {HOLES.map((h, idx) => (
                  <button
                    key={h.id}
                    onClick={() => setSelected(idx)}
                    className="rounded border p-2 text-left"
                    style={{ borderColor: selected === idx ? "#f0b429" : "#334155", background: selected === idx ? "rgba(240,180,41,0.12)" : "#0b1220" }}
                  >
                    <LevelPreview hole={h} />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-300">{h.name}</p>
                    <p className="text-[11px] text-slate-400">{h.multiplier}x multiplier</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: "#08111f", borderColor: "#223147" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Play Amount (No betting side pick)</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <input
                  type="number"
                  min={0.5}
                  max={balance}
                  step={0.5}
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-40 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
                <button onClick={start} className="rounded bg-emerald-400 px-4 py-2 font-bold uppercase tracking-widest text-slate-950">Play Level ({hole.multiplier}x)</button>
              </div>
            </div>
          </>
        )}

        {phase === "playing" && (
          <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
              <span>{hole.name} · Multiplier {hole.multiplier}x</span>
              <button onClick={quit} className="rounded border border-rose-500 px-2 py-1 text-rose-300">Quit</button>
            </div>
            <div className="min-h-0 flex-1">
              <GolfCanvas hole={hole} onFinish={finishRound} />
            </div>
          </div>
        )}

        {phase === "result" && result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-md rounded-xl border p-6" style={{ background: "#0f172a", borderColor: "#334155" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Level Result</p>
              <h2 className="mt-1 text-3xl font-bold uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {result.won ? "Hole Cleared" : "Round Lost"}
              </h2>
              <p className="mt-3 text-slate-200">{hole.name} · Strokes {result.strokes}</p>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>Play amount: {fmtMoney(stake)}</p>
                <p>Multiplier: {hole.multiplier}x</p>
                <p className="font-semibold" style={{ color: result.won ? "#22c55e" : "#ef4444" }}>
                  {result.won ? `Payout: ${fmtMoney(payout)}` : `Lost: ${fmtMoney(stake)}`}
                </p>
              </div>
              <button onClick={reset} className="mt-6 w-full rounded bg-emerald-400 px-4 py-3 font-bold uppercase tracking-[0.2em] text-slate-950">Choose Another Level</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LevelPreview({ hole }: { hole: HoleConfig }) {
  return (
    <svg viewBox={`0 0 ${hole.width} ${hole.height}`} className="h-24 w-full rounded" style={{ imageRendering: "pixelated", background: hole.theme.bg }}>
      <rect x="0" y="0" width={hole.width} height={hole.height} fill={hole.theme.bg} />
      {hole.surfaces.map((surface) => (
        <rect
          key={surface.id}
          x={surface.x}
          y={surface.y}
          width={surface.w}
          height={surface.h}
          fill={surface.kind === "lava" ? hole.theme.lava : surface.kind === "sand" ? hole.theme.sand : surface.kind === "rough" ? hole.theme.rough : hole.theme.fairway}
        />
      ))}
      {hole.walls.map((wall, i) => <line key={i} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke={hole.theme.wall} strokeWidth="10" />)}
      <circle cx={hole.tee.x} cy={hole.tee.y} r={hole.ballRadius * 1.2} fill="#f8fafc" />
      <circle cx={hole.cup.x} cy={hole.cup.y} r={hole.cupRadius} fill="#111827" />
    </svg>
  );
}
