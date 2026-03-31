"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { logFeedEvent, logFeedHoldEvent } from "@/lib/feed";
import { fmtMoney } from "@/lib/format";
import BettingPanel from "./components/BettingPanel";
import GolfCanvas from "./components/GolfCanvas";
import ResultModal from "./components/ResultModal";
import { DEFAULT_HOLE } from "./lib/holes";
import { BetTarget, HoleResult } from "./lib/types";

type Phase = "betting" | "playing" | "result";

export default function GolfPage() {
  const { balance, subtractBalance, addBalance } = useBalance();
  const { username } = useUser();

  const hole = DEFAULT_HOLE;
  const [phase, setPhase] = useState<Phase>("betting");
  const [bet, setBet] = useState(2);
  const [target, setTarget] = useState<BetTarget>("under");
  const [result, setResult] = useState<HoleResult | null>(null);
  const [payout, setPayout] = useState(0);
  const [net, setNet] = useState(0);

  const previewScale = useMemo(() => 260 / hole.width, [hole.width]);

  const startGame = () => {
    const clampedBet = Math.max(0.5, Math.min(balance, Number.isFinite(bet) ? bet : 0));
    if (clampedBet <= 0 || clampedBet > balance) return;
    setBet(Math.round(clampedBet * 100) / 100);
    subtractBalance(clampedBet);
    setPhase("playing");
    setResult(null);
    setPayout(0);
    setNet(0);
  };

  const handleFinish = (strokes: number) => {
    const relation: HoleResult["relation"] = strokes < hole.par ? "under" : strokes > hole.par ? "over" : "par";

    const won = relation === target;
    const push = relation === "par";
    const multiplier = target === "under" ? 2.5 : 1.5;
    const payoutAmt = push ? bet : won ? bet * multiplier : 0;
    const netAmt = payoutAmt - bet;

    if (payoutAmt > 0) addBalance(payoutAmt);

    setResult({ strokes, par: hole.par, relation });
    setPayout(Math.round(payoutAmt * 100) / 100);
    setNet(Math.round(netAmt * 100) / 100);
    setPhase("result");

    if (username) {
      if (push) {
        logFeedHoldEvent(username, "golf", `Push at par (${strokes})`).catch(() => undefined);
      } else {
        logFeedEvent(username, "golf", Math.abs(netAmt), won ? "win" : "loss").catch(() => undefined);
      }
    }
  };

  const playAgain = () => {
    setPhase("betting");
    setResult(null);
  };

  return (
    <div className="h-full overflow-auto p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Retro Minigolf</p>
            <h1 className="text-4xl font-bold uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              /Golf
            </h1>
          </div>
          <Link href="/" className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
            Back to Lobby
          </Link>
        </div>

        <div className="mb-4 rounded border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          Balance: <strong className="text-emerald-300">{fmtMoney(balance)}</strong>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border p-4" style={{ background: "#08111f", borderColor: "#223147" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hole Preview</p>
            <svg viewBox={`0 0 ${hole.width} ${hole.height}`} className="mt-3 w-full rounded border border-slate-700 bg-green-900/20" style={{ imageRendering: "pixelated", height: `${hole.height * previewScale}px` }}>
              <rect x="0" y="0" width={hole.width} height={hole.height} fill="#0d3f26" />
              {hole.surfaces.map((surface) => (
                <rect
                  key={surface.id}
                  x={surface.x}
                  y={surface.y}
                  width={surface.w}
                  height={surface.h}
                  fill={surface.kind === "water" ? "#1d4ed8" : surface.kind === "sand" ? "#a07a42" : surface.kind === "rough" ? "#19552d" : "#1f6b3a"}
                />
              ))}
              {hole.walls.map((wall, index) => (
                <line key={index} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#4b5563" strokeWidth={8} />
              ))}
              {hole.obstacles.map((ob) =>
                ob.type === "rect" ? (
                  <rect key={ob.id} x={ob.x} y={ob.y} width={ob.w} height={ob.h} fill="#6b7280" />
                ) : (
                  <circle key={ob.id} cx={ob.center.x} cy={ob.center.y} r={ob.radius} fill="#6b7280" />
                )
              )}
              <circle cx={hole.tee.x} cy={hole.tee.y} r={hole.ballRadius} fill="#f8fafc" />
              <circle cx={hole.cup.x} cy={hole.cup.y} r={hole.cupRadius} fill="#111827" />
            </svg>
          </div>

          {phase === "betting" ? (
            <BettingPanel
              hole={hole}
              balance={balance}
              bet={bet}
              target={target}
              onBetChange={setBet}
              onTargetChange={setTarget}
              onStart={startGame}
            />
          ) : (
            <div className="rounded-xl border p-5 text-slate-300" style={{ background: "#08111f", borderColor: "#223147" }}>
              Launching full-screen play mode…
            </div>
          )}
        </div>
      </div>

      {phase === "playing" && (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
            <span>Full-Screen Golf Mode</span>
            <span>Bet {fmtMoney(bet)} · {target.toUpperCase()} PAR</span>
          </div>
          <div className="min-h-0 flex-1">
            <GolfCanvas key={`${phase}-${bet}-${target}`} hole={hole} onFinish={handleFinish} />
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <ResultModal result={result} target={target} bet={bet} payout={payout} net={net} onPlayAgain={playAgain} />
      )}
    </div>
  );
}
