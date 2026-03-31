import { BetTarget, HoleConfig } from "../lib/types";
import { fmtMoney } from "@/lib/format";

interface BettingPanelProps {
  hole: HoleConfig;
  balance: number;
  bet: number;
  target: BetTarget;
  onBetChange: (value: number) => void;
  onTargetChange: (target: BetTarget) => void;
  onStart: () => void;
}

export default function BettingPanel({ hole, balance, bet, target, onBetChange, onTargetChange, onStart }: BettingPanelProps) {
  const odds = target === "under" ? 2.5 : 1.5;

  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hole {hole.name} · Par {hole.par}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Bet Amount</p>
          <input
            type="number"
            min={0.5}
            max={balance}
            step={0.5}
            value={bet}
            onChange={(e) => onBetChange(Number(e.target.value))}
            className="mt-2 w-full rounded border bg-slate-950 px-3 py-2 text-slate-100"
            style={{ borderColor: "#334155" }}
          />
          <p className="mt-2 text-xs text-slate-400">Balance: {fmtMoney(balance)}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pick Your Bet</p>
          <div className="mt-2 flex gap-2">
            {(["under", "over"] as const).map((entry) => (
              <button
                key={entry}
                onClick={() => onTargetChange(entry)}
                className="flex-1 rounded border px-3 py-2 text-sm font-semibold uppercase tracking-widest"
                style={{
                  borderColor: target === entry ? "#f0b429" : "#334155",
                  background: target === entry ? "rgba(240,180,41,0.2)" : "#020617",
                }}
              >
                {entry} par
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-300">Odds: {odds}x ({target === "under" ? "Harder" : "Safer"})</p>
        </div>
      </div>
      <button onClick={onStart} className="mt-5 w-full rounded bg-emerald-400 px-4 py-3 font-bold uppercase tracking-[0.2em] text-slate-950">
        Place Bet + Start
      </button>
    </div>
  );
}
