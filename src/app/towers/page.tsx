"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { CasinoChip } from "@/components/CasinoChip";
import { fmtMoney } from "@/lib/format";
import { logFeedEvent } from "@/lib/feed";
import { playCashoutWin, playLose, playWireCut } from "@/lib/sound";

type Phase = "idle" | "playing" | "lost" | "cashed";

interface Popup {
  id: number;
  text: string;
}

const FLOORS = 8;
const MULTIPLIERS = [1, 1.18, 1.42, 1.74, 2.12, 2.58, 3.15, 3.86, 4.8];
const EMOJIS = ["🚀", "🔥", "💎", "🎉", "⚡", "🤑", "🎯", "🏆"];

const randomSafePath = () => Array.from({ length: FLOORS }, () => Math.floor(Math.random() * 3));

function DoorSprite({ highlighted, busted, revealed }: { highlighted: boolean; busted: boolean; revealed: boolean }) {
  const glow = busted ? "#ef4444" : highlighted ? "#22c55e" : "#60a5fa";
  return (
    <svg viewBox="0 0 120 160" fill="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={`door-body-${glow}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>
      <rect x="18" y="10" width="84" height="138" rx="14" fill={`url(#door-body-${glow})`} stroke={glow} strokeWidth="4" />
      <rect x="30" y="24" width="60" height="64" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <circle cx="83" cy="84" r="4.5" fill={glow} />
      {revealed && highlighted && <text x="60" y="135" textAnchor="middle" fontSize="24">✅</text>}
      {revealed && busted && <text x="60" y="135" textAnchor="middle" fontSize="24">💥</text>}
    </svg>
  );
}

export default function TowersPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [bet, setBet] = useState(0);
  const [pendingBet, setPendingBet] = useState(0);
  const [floor, setFloor] = useState(0);
  const [safePath, setSafePath] = useState<number[]>(() => randomSafePath());
  const [revealedDoor, setRevealedDoor] = useState<number | null>(null);
  const [pickedDoor, setPickedDoor] = useState<number | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const currentMultiplier = useMemo(() => MULTIPLIERS[floor] ?? MULTIPLIERS[MULTIPLIERS.length - 1], [floor]);
  const potentialPayout = useMemo(() => Math.round(bet * currentMultiplier * 100) / 100, [bet, currentMultiplier]);

  const addPopup = (text: string) => {
    const id = Date.now() + Math.random();
    setPopups((prev) => [...prev, { id, text }]);
    window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 2800);
  };

  const startRound = () => {
    if (phase === "playing") return;
    if (pendingBet <= 0 || pendingBet > balance) return;

    subtractBalance(pendingBet);
    registerBet();
    setBet(pendingBet);
    setFloor(0);
    setSafePath(randomSafePath());
    setRevealedDoor(null);
    setPickedDoor(null);
    setLastNet(null);
    setPhase("playing");
  };

  const finishLoss = () => {
    setPhase("lost");
    unregisterBet();
    setLastNet(-bet);
    playLose();
    if (username) logFeedEvent(username, "Towers", bet, "loss");
    addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${username ?? "Player"} got trapped on floor ${floor + 1}.`);
  };

  const cashout = () => {
    if (phase !== "playing") return;
    const payout = potentialPayout;
    addBalance(payout);
    unregisterBet();
    playCashoutWin();
    const net = Math.round((payout - bet) * 100) / 100;
    setLastNet(net);
    setPhase("cashed");
    if (username && net > 0) logFeedEvent(username, "Towers", net, "win");
    addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${username ?? "Player"} cashed out $${fmtMoney(payout)} on floor ${floor + 1}!`);
  };

  const chooseDoor = (door: number) => {
    if (phase !== "playing" || revealedDoor !== null) return;
    const safeDoor = safePath[floor];
    const wonStep = safeDoor === door;

    setPickedDoor(door);
    setRevealedDoor(safeDoor);

    window.setTimeout(() => {
      if (!wonStep) {
        finishLoss();
      } else {
        playWireCut();
        const nextFloor = floor + 1;
        setFloor(nextFloor);
        addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} Safe pick! Up to floor ${nextFloor + 1}.`);

        if (nextFloor >= FLOORS) {
          const finalPayout = Math.round(bet * MULTIPLIERS[FLOORS] * 100) / 100;
          addBalance(finalPayout);
          unregisterBet();
          setLastNet(Math.round((finalPayout - bet) * 100) / 100);
          setPhase("cashed");
          playCashoutWin();
          const perfectRunNet = Math.round((finalPayout - bet) * 100) / 100;
          if (username && perfectRunNet > 0) logFeedEvent(username, "Towers", perfectRunNet, "win");
          addPopup(`🏆 PERFECT RUN! ${username ?? "Player"} cleared all towers for $${fmtMoney(finalPayout)}.`);
        }
      }
      setRevealedDoor(null);
      setPickedDoor(null);
    }, 520);
  };

  const resetRound = () => {
    setPhase("idle");
    setBet(0);
    setFloor(0);
    setSafePath(randomSafePath());
    setRevealedDoor(null);
    setPickedDoor(null);
  };

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      // ignore fullscreen errors silently
    }
  };

  return (
    <div
      ref={stageRef}
      style={{
        minHeight: "calc(100vh - 76px)",
        borderRadius: 16,
        padding: "18px",
        background: "radial-gradient(circle at top, #1a2e48 0%, #0c1520 45%, #070d16 100%)",
        border: "1px solid rgba(96,165,250,0.25)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Towers</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>Pick the safe door. Climb for bigger multipliers.</div>
        </div>
        <button type="button" onClick={toggleFullscreen} style={{ border: "1px solid rgba(96,165,250,0.4)", background: "rgba(15,23,42,0.8)", color: "var(--text-primary)", borderRadius: 10, padding: "10px 12px", fontWeight: 700, cursor: "pointer" }}>
          {fullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ background: "rgba(10,16,28,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${FLOORS}, minmax(0, 1fr))`, gap: 6, marginBottom: 14 }}>
            {Array.from({ length: FLOORS }, (_, i) => (
              <div key={i} style={{ height: 10, borderRadius: 999, background: i < floor ? "linear-gradient(90deg,#22c55e,#4ade80)" : "rgba(148,163,184,0.25)", boxShadow: i < floor ? "0 0 10px rgba(34,197,94,0.45)" : "none" }} />
            ))}
          </div>

          <motion.div key={floor} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {[0, 1, 2].map((door) => {
                const safeDoor = revealedDoor;
                const isSafe = safeDoor === door;
                const isPicked = pickedDoor === door;
                const busted = revealedDoor !== null && isPicked && !isSafe;
                return (
                  <motion.button
                    whileHover={phase === "playing" ? { y: -3, scale: 1.01 } : undefined}
                    whileTap={phase === "playing" ? { scale: 0.98 } : undefined}
                    key={door}
                    type="button"
                    disabled={phase !== "playing" || revealedDoor !== null}
                    onClick={() => chooseDoor(door)}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.3)",
                      background: "linear-gradient(180deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))",
                      padding: 8,
                      cursor: phase === "playing" ? "pointer" : "default",
                      minHeight: 175,
                    }}
                  >
                    <DoorSprite highlighted={isSafe} busted={busted} revealed={revealedDoor !== null} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div style={{ background: "rgba(10,16,28,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, padding: 16, display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Balance</span><strong>${fmtMoney(balance)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Bet</span><strong>${fmtMoney(phase === "playing" ? bet : pendingBet)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Floor</span><strong>{Math.min(floor + 1, FLOORS)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Multiplier</span><strong>x{currentMultiplier.toFixed(2)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Cashout Value</span><strong style={{ color: "#4ade80" }}>${fmtMoney(potentialPayout)}</strong></div>
          </div>

          {phase !== "playing" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: 8, fontSize: "0.82rem" }}>Select your bet</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[1, 5, 10, 25, 50, 100].map((chip) => (
                  <CasinoChip key={chip} value={chip} onClick={(v) => setPendingBet((prev) => Math.max(0, Math.min(balance, prev + v)))} disabled={balance <= 0} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setPendingBet(0)} style={{ borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "transparent", color: "var(--text-secondary)", padding: "6px 10px", cursor: "pointer" }}>Clear</button>
                <button type="button" onClick={() => setPendingBet(Math.min(balance, Math.max(1, Math.floor(balance / 2))))} style={{ borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "transparent", color: "var(--text-secondary)", padding: "6px 10px", cursor: "pointer" }}>Half</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={startRound} disabled={phase === "playing" || pendingBet <= 0 || pendingBet > balance} style={{ border: 0, borderRadius: 10, background: "linear-gradient(180deg,#22c55e,#15803d)", color: "white", fontWeight: 800, padding: "11px 12px", cursor: phase === "playing" ? "not-allowed" : "pointer", opacity: phase === "playing" ? 0.6 : 1 }}>
              {phase === "playing" ? "Round Active" : "Start Climb"}
            </button>
            <button type="button" onClick={cashout} disabled={phase !== "playing"} style={{ border: 0, borderRadius: 10, background: "linear-gradient(180deg,#f59e0b,#b45309)", color: "white", fontWeight: 800, padding: "11px 12px", cursor: phase === "playing" ? "pointer" : "not-allowed", opacity: phase === "playing" ? 1 : 0.5 }}>
              Cash Out ${fmtMoney(potentialPayout)}
            </button>
            {(phase === "lost" || phase === "cashed") && (
              <button type="button" onClick={resetRound} style={{ border: "1px solid rgba(96,165,250,0.38)", borderRadius: 10, background: "rgba(15,23,42,0.8)", color: "white", fontWeight: 700, padding: "10px 12px", cursor: "pointer" }}>
                Play Again
              </button>
            )}
          </div>

          {lastNet !== null && (
            <div style={{ marginTop: 6, borderRadius: 10, border: "1px solid rgba(148,163,184,0.24)", background: "rgba(15,23,42,0.7)", padding: "10px 12px", color: lastNet >= 0 ? "#4ade80" : "#fb7185", fontWeight: 700 }}>
              {lastNet >= 0 ? `Nice run! Net +$${fmtMoney(lastNet)}` : `Busted. Net -$${fmtMoney(Math.abs(lastNet))}`}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        <div style={{ position: "fixed", right: 14, bottom: 18, display: "grid", gap: 8, zIndex: 50, width: "min(420px, calc(100vw - 24px))" }}>
          {popups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              style={{
                background: "rgba(15,23,42,0.92)",
                border: "1px solid rgba(96,165,250,0.35)",
                borderRadius: 10,
                padding: "10px 12px",
                color: "#dbeafe",
                fontWeight: 600,
                boxShadow: "0 8px 24px rgba(2,6,23,0.4)",
              }}
            >
              {popup.text}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
