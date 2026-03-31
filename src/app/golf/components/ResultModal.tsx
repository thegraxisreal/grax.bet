import { BetTarget, HoleResult } from "../lib/types";
import { fmtMoney } from "@/lib/format";

interface ResultModalProps {
  result: HoleResult;
  target: BetTarget;
  bet: number;
  payout: number;
  net: number;
  onPlayAgain: () => void;
}

export default function ResultModal({ result, target, bet, payout, net, onPlayAgain }: ResultModalProps) {
  const won = net > 0;
  const pushed = net === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-xl border p-6" style={{ background: "#0f172a", borderColor: "#334155" }}>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hole complete</p>
        <h2 className="mt-1 text-3xl font-bold uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {won ? "You Win" : pushed ? "Push" : "You Lose"}
        </h2>
        <p className="mt-3 text-slate-200">Strokes: <strong>{result.strokes}</strong> (Par {result.par}) · Bet: {target.toUpperCase()}</p>
        <div className="mt-4 space-y-1 text-sm text-slate-300">
          <p>Wager: {fmtMoney(bet)}</p>
          <p>Payout: {fmtMoney(payout)}</p>
          <p className="text-base font-semibold" style={{ color: won ? "#22c55e" : pushed ? "#eab308" : "#ef4444" }}>
            Net: {net >= 0 ? "+" : ""}{fmtMoney(net)}
          </p>
        </div>

        <button onClick={onPlayAgain} className="mt-6 w-full rounded bg-emerald-400 px-4 py-3 font-bold uppercase tracking-[0.2em] text-slate-950">
          Play Again
        </button>
      </div>
    </div>
  );
}
