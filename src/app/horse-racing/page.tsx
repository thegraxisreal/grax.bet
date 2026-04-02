"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "betting" | "racing" | "result";

type HorseMeta = {
  id: number;
  name: string;
  tint: string;
  laneColor: string;
  labelColor: string;
};

type Runner = {
  id: number;
  strength: number;
  x: number;
  velocity: number;
  nextShiftAt: number;
  finishedAt: number | null;
};

const SPRITE_URL = "https://opengameart.org/sites/default/files/horse_run_cycle_0.png";
const FRAME_WIDTH = 82;
const FRAME_HEIGHT = 66;
const TOTAL_FRAMES = 5;
const HORSE_SCALE = 3.05;
const HORSE_WIDTH = FRAME_WIDTH * HORSE_SCALE;
const START_X = 16;
const FINISH_X = 1020;
const MIN_BET = 10;
const BET_STEP = 25;
const STARTING_BALANCE = 1000;

const HORSES: HorseMeta[] = [
  { id: 1, name: "Crimson Comet", tint: "hue-rotate(0deg) saturate(1.35) brightness(0.95)", laneColor: "rgba(28,61,95,0.85)", labelColor: "#ef4444" },
  { id: 2, name: "Azure Bolt", tint: "hue-rotate(195deg) saturate(1.25) brightness(0.97)", laneColor: "rgba(26,57,89,0.85)", labelColor: "#38bdf8" },
  { id: 3, name: "Emerald Dash", tint: "hue-rotate(110deg) saturate(1.3) brightness(0.95)", laneColor: "rgba(22,107,65,0.84)", labelColor: "#22c55e" },
  { id: 4, name: "Golden Flash", tint: "hue-rotate(35deg) saturate(1.45) brightness(1.02)", laneColor: "rgba(22,103,61,0.84)", labelColor: "#facc15" },
  { id: 5, name: "Violet Storm", tint: "hue-rotate(275deg) saturate(1.3) brightness(1)", laneColor: "rgba(20,99,58,0.84)", labelColor: "#c084fc" },
  { id: 6, name: "Shadow Drift", tint: "grayscale(1) brightness(1.08)", laneColor: "rgba(18,94,55,0.84)", labelColor: "#cbd5e1" },
];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

async function loadTransparentHorseSprite(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = SPRITE_URL;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(img);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const transparentImg = new Image();
      transparentImg.src = canvas.toDataURL("image/png");
      transparentImg.onload = () => resolve(transparentImg);
      transparentImg.onerror = () => resolve(img);
    };

    img.onerror = () => resolve(img);
  });
}

function formatMoney(v: number) {
  return `$${v.toFixed(2)}`;
}

export default function HorseRacingPage() {
  const [phase, setPhase] = useState<Phase>("betting");
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [bet, setBet] = useState(100);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [payout, setPayout] = useState(0);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [horseSpriteUrl, setHorseSpriteUrl] = useState(SPRITE_URL);

  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    loadTransparentHorseSprite().then((horseSprite) => {
      if (!active) return;
      setHorseSpriteUrl(horseSprite.src || SPRITE_URL);
    });

    return () => {
      active = false;
    };
  }, []);

  const [oddsByHorse, setOddsByHorse] = useState(() => {
    const raw = new Map<number, number>();
    HORSES.forEach((h) => raw.set(h.id, Number(rand(1.8, 4.4).toFixed(2))));
    return raw;
  });

  const placeAllIn = () => {
    if (balance <= 0) return;
    setBet(Number(balance.toFixed(2)));
  };

  const placeHalf = () => {
    if (balance <= 0) return;
    const half = Math.max(MIN_BET, Number((balance / 2).toFixed(2)));
    setBet(Number(Math.min(balance, half).toFixed(2)));
  };

  const adjustBet = (delta: number) => {
    setBet((curr) => {
      const next = Number((curr + delta).toFixed(2));
      return Math.max(MIN_BET, Math.min(balance, next));
    });
  };

  const stopAnimation = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };

  const runRace = (secretWinnerId: number) => {
    let mutableRunners = HORSES.map((h) => ({
      id: h.id,
      strength: rand(0.88, 1.2),
      x: START_X,
      velocity: rand(130, 185),
      nextShiftAt: rand(300, 800),
      finishedAt: null as number | null,
    }));

    const secretWinner = mutableRunners.find((r) => r.id === secretWinnerId);
    if (secretWinner) secretWinner.strength += 0.2;

    setRunners(mutableRunners.map((r) => ({ ...r })));

    lastTsRef.current = 0;

    const animate = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.045, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      mutableRunners = mutableRunners.map((runner) => {
        const justFinished = runner.finishedAt !== null;
        if (justFinished) return runner;

        let velocity = runner.velocity;
        let nextShiftAt = runner.nextShiftAt - dt * 1000;

        if (nextShiftAt <= 0) {
          const base = 146 * runner.strength;
          const wobble = rand(-34, 46);
          const secretBias = runner.id === secretWinnerId ? rand(6, 16) : rand(-8, 8);
          velocity = Math.max(95, base + wobble + secretBias);
          nextShiftAt = rand(300, 800);
        }

        const catchupBoost = runner.id === secretWinnerId ? Math.max(0, (runner.x - FINISH_X * 0.62) * 0.09) : 0;
        const nextX = Math.min(FINISH_X, runner.x + (velocity + catchupBoost) * dt);

        return {
          ...runner,
          x: nextX,
          velocity,
          nextShiftAt,
          finishedAt: nextX >= FINISH_X ? ts : null,
        };
      });

      setRunners(mutableRunners.map((r) => ({ ...r })));

      const finished = mutableRunners.filter((r) => r.finishedAt !== null);
      if (finished.length > 0) {
        const ordered = [...finished].sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
        const winner = ordered[0];

        stopAnimation();
        const didWinBet = selectedHorseId === winner.id;
        const payoutValue = didWinBet ? Number((bet * 2).toFixed(2)) : 0;

        setWinnerId(winner.id);
        setPayout(payoutValue);
        setBalance((curr) => Number((curr + payoutValue).toFixed(2)));
        setPhase("result");
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const startRace = () => {
    if (!selectedHorseId || bet <= 0 || bet > balance || phase === "racing") return;

    setBalance((curr) => Number((curr - bet).toFixed(2)));
    setWinnerId(null);
    setPayout(0);
    setPhase("racing");

    const secretStrengths = HORSES.map((h) => ({ id: h.id, weight: rand(0.8, 1.35) }));
    const sum = secretStrengths.reduce((acc, s) => acc + s.weight, 0);
    let pick = Math.random() * sum;
    let secretWinnerId = secretStrengths[0].id;
    for (const entry of secretStrengths) {
      pick -= entry.weight;
      if (pick <= 0) {
        secretWinnerId = entry.id;
        break;
      }
    }

    runRace(secretWinnerId);
  };

  const raceAgain = () => {
    stopAnimation();
    setPhase("betting");
    setRunners([]);
    setOddsByHorse(() => {
      const raw = new Map<number, number>();
      HORSES.forEach((h) => raw.set(h.id, Number(rand(1.8, 4.4).toFixed(2))));
      return raw;
    });
    setPayout(0);
    setWinnerId(null);
    if (balance > 0) {
      setBet((curr) => Number(Math.min(Math.max(MIN_BET, curr), balance).toFixed(2)));
    }
  };

  const selectedHorse = HORSES.find((h) => h.id === selectedHorseId);
  const winnerHorse = HORSES.find((h) => h.id === winnerId);

  return (
    <main style={{ padding: "20px", maxWidth: 1240, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: "1.95rem", fontWeight: 800 }}>Horse Racing</h1>
      <p style={{ margin: "8px 0 14px", color: "var(--text-muted)" }}>Pick a horse, place your bet, and watch the race at 60fps.</p>

      {phase !== "racing" && (
        <section className="lineup-panel">
          {HORSES.map((horse, idx) => (
            <button
              key={horse.id}
              type="button"
              className={`lineup-row ${selectedHorseId === horse.id ? "selected" : ""}`}
              onClick={() => setSelectedHorseId(horse.id)}
            >
              <div className="lane-bg" style={{ background: horse.laneColor }} />
              <div className="row-inner">
                <div className="left-col">
                  <div className="horse-num">#{horse.id}</div>
                  <div className="horse-name">{horse.name}</div>
                  <div className="horse-odds" style={{ color: horse.labelColor }}>
                    {oddsByHorse.get(horse.id)?.toFixed(2)}x odds
                  </div>
                </div>
                <div className="divider" />
                <div className="sprite-stage">
                  <div className="sprite-shadow" />
                  <div className="horse-run flip-right" style={{ filter: horse.tint }} />
                </div>
              </div>
              {idx !== HORSES.length - 1 && <div className="lane-rule" />}
            </button>
          ))}
        </section>
      )}

      {phase === "racing" && (
        <section className="race-view">
          {HORSES.map((horse, idx) => {
            const runner = runners.find((r) => r.id === horse.id);
            const x = runner?.x ?? START_X;
            return (
              <div key={horse.id} className="race-lane" style={{ background: horse.laneColor }}>
                <div className="race-label">#{horse.id} {horse.name}</div>
                <div className="finish-line" />
                <div className="race-sprite-wrap" style={{ transform: `translate(${x}px, -50%)` }}>
                  <div className="sprite-shadow" />
                  <div className="horse-run flip-right" style={{ filter: horse.tint }} />
                </div>
                {idx !== HORSES.length - 1 && <div className="lane-rule" />}
              </div>
            );
          })}
        </section>
      )}

      <section className="bet-panel">
        <div className="stat-box"><span>Balance</span><strong>{formatMoney(balance)}</strong></div>
        <div className="stat-box"><span>Bet Amount</span><strong>{formatMoney(bet)}</strong></div>
        <div className="stat-box"><span>Selected</span><strong>{selectedHorse ? selectedHorse.name : "None"}</strong></div>

        <div className="bet-actions">
          <button type="button" onClick={placeHalf}>HALF</button>
          <button type="button" onClick={placeAllIn}>ALL IN</button>
          <button type="button" onClick={() => adjustBet(-BET_STEP)}>- {BET_STEP}</button>
          <button type="button" onClick={() => adjustBet(BET_STEP)}>+ {BET_STEP}</button>
        </div>

        <button
          type="button"
          className="start-btn"
          disabled={phase !== "betting" || !selectedHorseId || bet <= 0 || bet > balance}
          onClick={startRace}
        >
          START RACE
        </button>

        {phase === "result" && winnerHorse && (
          <div className="result-box">
            <div>
              Winner: <strong style={{ color: winnerHorse.labelColor }}>{winnerHorse.name}</strong>
            </div>
            <div>
              {selectedHorseId === winnerHorse.id ? `You won ${formatMoney(payout)}!` : `You lost ${formatMoney(bet)}.`}
            </div>
            <button type="button" onClick={raceAgain}>Race Again</button>
          </div>
        )}
      </section>

      <style jsx>{`
        .lineup-panel, .race-view {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 18px 48px rgba(2, 8, 23, 0.4);
        }

        .lineup-row {
          width: 100%;
          position: relative;
          border: none;
          background: transparent;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }

        .lineup-row.selected {
          box-shadow: inset 0 0 0 2px rgba(56, 189, 248, 0.95), inset 0 0 24px rgba(56, 189, 248, 0.32);
        }

        .lane-bg {
          position: absolute;
          inset: 0;
        }

        .row-inner {
          position: relative;
          height: 106px;
          display: grid;
          grid-template-columns: 210px 12px 1fr;
          align-items: center;
          z-index: 1;
        }

        .left-col {
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .horse-num {
          font-size: 1.8rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1;
        }

        .horse-name {
          font-size: 0.96rem;
          letter-spacing: 0.08em;
          font-weight: 700;
          color: rgba(226,232,240,0.96);
          text-transform: uppercase;
        }

        .horse-odds {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          opacity: 0.95;
        }

        .divider {
          width: 4px;
          height: 72px;
          justify-self: center;
          background: repeating-linear-gradient(180deg, #f8fafc, #f8fafc 12px, #ef4444 12px, #ef4444 24px);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.26);
        }

        .sprite-stage {
          position: relative;
          display: flex;
          align-items: center;
          height: 100%;
          padding-left: 22px;
        }

        .horse-run {
          width: ${FRAME_WIDTH}px;
          height: ${FRAME_HEIGHT}px;
          background-image: url(${horseSpriteUrl});
          background-repeat: no-repeat;
          image-rendering: pixelated;
          animation: gallop 0.4s steps(${TOTAL_FRAMES}) infinite;
          transform-origin: center;
        }

        .flip-right {
          transform: scaleX(-1) scale(${HORSE_SCALE});
        }

        .sprite-shadow {
          position: absolute;
          width: 155px;
          height: 14px;
          left: 65px;
          bottom: 24px;
          background: rgba(2,6,23,0.35);
          border-radius: 999px;
          filter: blur(2px);
        }

        .lane-rule {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          border-bottom: 1px dashed rgba(255,255,255,0.2);
          z-index: 2;
        }

        .race-view {
          background: linear-gradient(180deg, #0d2239, #14532d 60%);
        }

        .race-lane {
          position: relative;
          height: 104px;
          overflow: hidden;
        }

        .race-label {
          position: absolute;
          left: 14px;
          top: 10px;
          z-index: 3;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(248,250,252,0.9);
          font-weight: 700;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }

        .finish-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: ${FINISH_X + HORSE_WIDTH * 0.15}px;
          width: 5px;
          background: repeating-linear-gradient(180deg, #fff, #fff 12px, #ef4444 12px, #ef4444 24px);
          opacity: 0.95;
          z-index: 2;
        }

        .race-sprite-wrap {
          position: absolute;
          left: 0;
          top: 50%;
          z-index: 2;
        }

        .bet-panel {
          margin-top: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(15,23,42,0.6);
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 10px;
        }

        .stat-box {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stat-box span {
          color: rgba(203,213,225,0.8);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .stat-box strong {
          color: #f8fafc;
          font-size: 1.05rem;
        }

        .bet-actions {
          grid-column: 1 / -1;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bet-actions button,
        .start-btn,
        .result-box button {
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 10px;
          background: rgba(15,23,42,0.78);
          color: #e2e8f0;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 9px 12px;
          cursor: pointer;
        }

        .bet-actions button:hover,
        .start-btn:hover,
        .result-box button:hover {
          border-color: rgba(56,189,248,0.8);
          background: rgba(30,41,59,0.9);
        }

        .start-btn {
          grid-column: 1 / -1;
          font-size: 0.95rem;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border-color: rgba(74,222,128,0.42);
          color: #f0fdf4;
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: rgba(30,41,59,0.6);
        }

        .result-box {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 12px;
          color: #f8fafc;
          flex-wrap: wrap;
        }

        @keyframes gallop {
          from { background-position: 0 0; }
          to { background-position: -${FRAME_WIDTH * TOTAL_FRAMES}px 0; }
        }

        @media (max-width: 1020px) {
          .row-inner {
            grid-template-columns: 180px 12px 1fr;
          }

          .horse-num {
            font-size: 1.45rem;
          }

          .flip-right {
            transform: scaleX(-1) scale(2.5);
          }

          .finish-line {
            left: 790px;
          }
        }
      `}</style>
    </main>
  );
}
