"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { fmtMoney } from "@/lib/format";
import { logFeedEvent } from "@/lib/feed";
import { playCashoutWin, playLose, playWireCut } from "@/lib/sound";
import { getDb } from "@/lib/firebase";

type Phase = "idle" | "playing" | "transition" | "lost" | "cashed";

const FLOORS = 6;
const STARTING_BETS = [25, 50, 100, 200] as const;
const EMOJIS = ["🎲", "🧗", "🏰", "😂", "🫡", "😈", "💸"];

const randomPath = () => Array.from({ length: FLOORS }, () => Math.floor(Math.random() * 3));

function payoutForFloor(baseBet: number, floor: number) {
  return baseBet * 2 ** floor;
}

function Door({ state }: { state: "neutral" | "safe" | "bust" }) {
  const stroke = state === "safe" ? "#4b7f52" : state === "bust" ? "#8b3a3a" : "#6f6656";
  const panel = state === "safe" ? "#4f6a4f" : state === "bust" ? "#754242" : "#5a4f3e";
  return (
    <svg viewBox="0 0 130 190" fill="none" style={{ width: "100%", height: "100%" }}>
      <rect x="16" y="10" width="98" height="170" rx="12" fill="#3a3025" stroke={stroke} strokeWidth="4" />
      <rect x="28" y="24" width="74" height="64" rx="9" fill={panel} opacity="0.45" />
      <rect x="28" y="96" width="74" height="72" rx="9" fill={panel} opacity="0.45" />
      <circle cx="95" cy="98" r="5" fill={state === "safe" ? "#8ac08d" : state === "bust" ? "#de8d8d" : "#b9a991"} />
      {state === "safe" && <text x="64" y="162" textAnchor="middle" fontSize="24">✅</text>}
      {state === "bust" && <text x="64" y="162" textAnchor="middle" fontSize="24">💥</text>}
    </svg>
  );
}

export default function TowersPage() {
  const { balance, addBalance, subtractBalance, registerBet, unregisterBet } = useBalance();
  const { username } = useUser();

  const [phase, setPhase] = useState<Phase>("idle");
  const [baseBet, setBaseBet] = useState<number>(25);
  const [bet, setBet] = useState(0);
  const [floor, setFloor] = useState(0);
  const [path, setPath] = useState<number[]>(() => randomPath());
  const [selectedDoor, setSelectedDoor] = useState<number | null>(null);
  const [revealedDoor, setRevealedDoor] = useState<number | null>(null);
  const [transitionText, setTransitionText] = useState<string>("");
  const [popups, setPopups] = useState<Array<{ id: number; text: string }>>([]);
  const [leaderboardNames, setLeaderboardNames] = useState<string[]>([]);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const names = snap.docs.map((d) => d.id).filter(Boolean).slice(0, 25);
      setLeaderboardNames(names);
    });
    return () => unsub();
  }, []);

  const nextValue = useMemo(() => payoutForFloor(bet || baseBet, floor + 1), [bet, baseBet, floor]);
  const cashoutValue = useMemo(() => payoutForFloor(bet || baseBet, floor), [bet, baseBet, floor]);

  const addPopup = (text: string) => {
    const id = Date.now() + Math.random();
    setPopups((p) => [...p, { id, text }]);
    window.setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 2400);
  };

  const randomLoadingText = () => {
    const randomName = leaderboardNames[Math.floor(Math.random() * leaderboardNames.length)] ?? "that leaderboard demon";
    const lines = [
      "Keep climbing!",
      "Ok maybe stop now...",
      "Your palms are sweating.",
      `Have you ever met ${randomName}?`,
      "This is definitely the safe one.",
      "Trust your gut. Or don't.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  };

  const startGame = () => {
    if (phase === "playing" || phase === "transition") return;
    if (baseBet > balance) return;
    subtractBalance(baseBet);
    registerBet();
    setBet(baseBet);
    setFloor(0);
    setPath(randomPath());
    setSelectedDoor(null);
    setRevealedDoor(null);
    setPhase("playing");
  };

  const setHalfBet = () => {
    const half = Math.max(25, Math.floor(balance / 2 / 25) * 25);
    setBaseBet(Math.min(half, balance));
  };

  const setAllInBet = () => {
    const allIn = Math.max(25, Math.floor(balance / 25) * 25);
    setBaseBet(Math.min(allIn, balance));
  };

  const settleLoss = () => {
    setPhase("lost");
    unregisterBet();
    playLose();
    if (username) logFeedEvent(username, "Towers", bet, "loss");
    addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} Busted on floor ${floor + 1}.`);
  };

  const cashout = () => {
    if (phase !== "playing") return;
    const payout = cashoutValue;
    const net = payout - bet;
    addBalance(payout);
    unregisterBet();
    setPhase("cashed");
    playCashoutWin();
    if (username && net > 0) logFeedEvent(username, "Towers", net, "win");
    addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} Cashed out $${fmtMoney(payout)}.`);
  };

  const pickDoor = (door: number) => {
    if (phase !== "playing") return;
    const safeDoor = path[floor];
    const won = door === safeDoor;
    setSelectedDoor(door);
    setRevealedDoor(safeDoor);
    setTransitionText(randomLoadingText());
    setPhase("transition");

    window.setTimeout(() => {
      if (!won) {
        settleLoss();
      } else {
        playWireCut();
        const nextFloor = floor + 1;
        setFloor(nextFloor);
        addPopup(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} Nice. Value now $${fmtMoney(payoutForFloor(bet, nextFloor))}.`);
        if (nextFloor >= FLOORS) {
          const payout = payoutForFloor(bet, FLOORS);
          addBalance(payout);
          unregisterBet();
          setPhase("cashed");
          playCashoutWin();
          const net = payout - bet;
          if (username && net > 0) logFeedEvent(username, "Towers", net, "win");
          addPopup(`🏆 Perfect run! $${fmtMoney(payout)} paid.`);
        } else {
          setPhase("playing");
        }
      }
      setSelectedDoor(null);
      setRevealedDoor(null);
    }, 700);
  };

  const reset = () => {
    setPhase("idle");
    setFloor(0);
    setSelectedDoor(null);
    setRevealedDoor(null);
    setTransitionText("");
    setPath(randomPath());
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: "-18px",
        padding: "12px",
        background: "radial-gradient(circle at top, #2a261f 0%, #17130f 46%, #0f0c09 100%)",
        color: "#f0e6d8",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: "0.78rem", opacity: 0.75, letterSpacing: "0.12em", textTransform: "uppercase" }}>Towers • Fullscreen Mode</div>
        {phase === "playing" && (
          <div style={{ fontSize: "0.78rem", opacity: 0.7 }}>Live Run</div>
        )}
      </div>

      {(phase === "playing" || phase === "transition") && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Floor {Math.min(floor + 1, FLOORS)} / {FLOORS}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: "0.78rem", opacity: 0.9 }}>Now: <strong>${fmtMoney(cashoutValue)}</strong></div>
            <div style={{ fontSize: "0.78rem", opacity: 0.75 }}>Next: ${fmtMoney(nextValue)}</div>
            <button
              type="button"
              onClick={cashout}
              disabled={phase !== "playing"}
              style={{
                border: 0,
                borderRadius: 9,
                padding: "7px 10px",
                fontWeight: 800,
                fontSize: "0.78rem",
                cursor: phase === "playing" ? "pointer" : "not-allowed",
                background: "linear-gradient(180deg,#bc8e62,#8c6444)",
                color: "#fff",
                opacity: phase === "playing" ? 1 : 0.55,
              }}
            >
              Cash Out
            </button>
          </div>
        </div>
      )}

      {phase !== "playing" && phase !== "transition" && (
        <div style={{ display: "grid", placeItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: 4 }}>
            {STARTING_BETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBaseBet(amount)}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "5px 9px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  color: amount === baseBet ? "#1b1712" : "#f0e6d8",
                  background: amount === baseBet ? "#d9b88f" : "transparent",
                }}
              >
                ${amount}
              </button>
            ))}
            <button
              type="button"
              onClick={setHalfBet}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                color: "#f0e6d8",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              Half
            </button>
            <button
              type="button"
              onClick={setAllInBet}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                color: "#1b1712",
                background: "#d9b88f",
              }}
            >
              All In
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, minHeight: phase === "playing" || phase === "transition" ? "calc(100vh - 120px)" : "calc(100vh - 210px)", alignItems: "stretch" }}>
        {[0, 1, 2].map((door) => {
          const isSafe = revealedDoor === door;
          const isBust = selectedDoor === door && revealedDoor !== door;
          const state: "neutral" | "safe" | "bust" = isSafe ? "safe" : isBust ? "bust" : "neutral";
          const isSliding = phase === "transition";

          return (
            <motion.button
              key={door}
              type="button"
              onClick={() => pickDoor(door)}
              disabled={phase !== "playing"}
              initial={false}
              animate={{ y: isSliding ? 62 : 0, opacity: phase === "lost" ? 0.7 : 1 }}
              transition={{ duration: 0.23, ease: "easeOut" }}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "linear-gradient(180deg, rgba(62,49,35,0.96), rgba(33,25,18,0.98))",
                padding: 7,
                cursor: phase === "playing" ? "pointer" : "default",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 30px rgba(0,0,0,0.28)",
              }}
            >
              <Door state={state} />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {phase === "transition" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(8,6,5,0.42)",
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              style={{
                background: "rgba(34,26,19,0.92)",
                border: "1px solid rgba(217,184,143,0.4)",
                borderRadius: 12,
                padding: "12px 18px",
                fontSize: "1.15rem",
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              {transitionText}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "idle" || phase === "lost" || phase === "cashed") && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 14,
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "rgba(20,15,11,0.95)",
              border: "1px solid rgba(217,184,143,0.32)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>Balance ${fmtMoney(balance)} · Bet ${fmtMoney(baseBet)}</div>
            <button
              type="button"
              onClick={phase === "idle" ? startGame : reset}
              style={{ border: 0, borderRadius: 10, padding: "8px 12px", background: "#d9b88f", color: "#231b14", fontWeight: 800, cursor: "pointer" }}
            >
              {phase === "idle" ? `Start $${baseBet}` : "Play Again"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: "fixed", right: 12, bottom: 12, display: "grid", gap: 6, width: "min(340px, calc(100vw - 24px))", zIndex: 50 }}>
        <AnimatePresence>
          {popups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              style={{
                background: "rgba(29,22,16,0.95)",
                border: "1px solid rgba(217,184,143,0.35)",
                borderRadius: 10,
                padding: "8px 10px",
                fontWeight: 600,
              }}
            >
              {popup.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
