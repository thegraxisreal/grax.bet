"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { CasinoChip, CHIPS } from "@/components/CasinoChip";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Matchup {
  gameId: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  winner: string | null;
  status: "pre" | "in" | "post";
  round: number;
  region: string;
  startTime: string;
}

interface UserBet {
  gameId: string;
  team: string;
  amount: number;
  paid: boolean;
  won: boolean | null;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYOUT = 1.9;

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite Eight",
  5: "Final Four",
  6: "Championship",
};

const REGION_ORDER = ["East", "West", "South", "Midwest", "National", "Tournament"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "TBD";
  }
}

function abbr(name: string) {
  // Abbreviate long team names for mobile
  return name.length > 22 ? name.split(" ").slice(-2).join(" ") : name;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--accent-green)",
        boxShadow: "0 0 6px var(--accent-green)",
        animation: "livePulse 1.4s ease-in-out infinite",
        marginRight: 5,
        flexShrink: 0,
      }}
    />
  );
}

interface GameCardProps {
  matchup: Matchup;
  bet: UserBet | undefined;
  selectedChip: number;
  onBet: (gameId: string, team: string) => void;
  placing: boolean;
  canBet: boolean;
}

function GameCard({ matchup, bet, selectedChip, onBet, placing, canBet }: GameCardProps) {
  const { gameId, team1, team2, team1Score, team2Score, winner, status, startTime } = matchup;

  const isLive = status === "in";
  const isDone = status === "post";
  const isPre = status === "pre";

  const betWon = bet?.paid && bet.won === true;
  const betLost = bet?.paid && bet.won === false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isLive
          ? "linear-gradient(135deg, #0d2a1a 0%, #0f1923 100%)"
          : "linear-gradient(135deg, #131e2b 0%, #0f1923 100%)",
        border: isLive
          ? "1px solid rgba(0,230,118,0.35)"
          : isDone
          ? "1px solid rgba(240,180,41,0.18)"
          : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        {isLive && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(0,230,118,0.15)",
              border: "1px solid rgba(0,230,118,0.4)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: "0.65rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--accent-green)",
            }}
          >
            <LiveDot /> LIVE
          </span>
        )}
        {isDone && (
          <span
            style={{
              background: "rgba(240,180,41,0.12)",
              border: "1px solid rgba(240,180,41,0.3)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: "0.65rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--accent-gold)",
            }}
          >
            FINAL
          </span>
        )}
        {isPre && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            {fmtTime(startTime)}
          </span>
        )}
      </div>

      {/* Teams + scores */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { name: team1, score: team1Score },
          { name: team2, score: team2Score },
        ].map(({ name, score }, i) => {
          const isWinner = isDone && winner === name;
          const isLoser = isDone && winner !== null && winner !== name;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: isWinner ? 700 : 500,
                  fontSize: "0.95rem",
                  color: isWinner
                    ? "var(--accent-gold)"
                    : isLoser
                    ? "rgba(255,255,255,0.35)"
                    : "var(--text-primary)",
                  letterSpacing: "0.02em",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isWinner && "🏆 "}
                {abbr(name)}
              </span>
              {(isLive || isDone) && (
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: isWinner
                      ? "var(--accent-gold)"
                      : isLoser
                      ? "rgba(255,255,255,0.35)"
                      : "var(--text-primary)",
                    minWidth: 28,
                    textAlign: "right",
                  }}
                >
                  {score}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Betting UI — only for pre-game with no existing bet */}
      {isPre && !bet && canBet && (
        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
          {[team1, team2].map((team) => (
            <button
              key={team}
              onClick={() => onBet(gameId, team)}
              disabled={placing}
              style={{
                flex: 1,
                background: "rgba(240,180,41,0.08)",
                border: "1px solid rgba(240,180,41,0.3)",
                borderRadius: 8,
                padding: "8px 6px",
                color: "var(--accent-gold)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.78rem",
                letterSpacing: "0.04em",
                cursor: placing ? "not-allowed" : "pointer",
                opacity: placing ? 0.5 : 1,
                transition: "background 0.15s, border-color 0.15s",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(240,180,41,0.18)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(240,180,41,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(240,180,41,0.08)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(240,180,41,0.3)";
              }}
            >
              ${selectedChip} on {abbr(team)}
            </button>
          ))}
        </div>
      )}

      {/* Existing bet display */}
      {bet && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 12px",
            borderRadius: 8,
            background: betWon
              ? "rgba(0,230,118,0.1)"
              : betLost
              ? "rgba(239,68,68,0.1)"
              : "rgba(255,255,255,0.05)",
            border: betWon
              ? "1px solid rgba(0,230,118,0.3)"
              : betLost
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.8rem",
              color: betWon
                ? "var(--accent-green)"
                : betLost
                ? "#ef4444"
                : "var(--text-secondary)",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {betWon ? "✓ WON" : betLost ? "✗ LOST" : "⏳"} ${bet.amount} on {abbr(bet.team)}
          </span>
          {betWon && (
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "var(--accent-green)",
                whiteSpace: "nowrap",
              }}
            >
              +${(bet.amount * PAYOUT).toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* No-auth bet prompt */}
      {isPre && !bet && !canBet && (
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            marginTop: 4,
            fontStyle: "italic",
          }}
        >
          Set a username to place bets
        </p>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SportsPage() {
  const { balance, subtractBalance, addBalance } = useBalance();
  const { username } = useUser();

  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBets, setUserBets] = useState<Record<string, UserBet>>({});
  const [selectedChip, setSelectedChip] = useState(5);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [placingGame, setPlacingGame] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch matchups (with auto-refresh every 30 s)
  const fetchMatchups = useCallback(async () => {
    try {
      const res = await fetch("/api/bracket");
      const data = await res.json();
      setMatchups(data.matchups ?? []);
      setError(null);
    } catch {
      setError("Could not load bracket data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchups();
    const iv = setInterval(fetchMatchups, 30_000);
    return () => clearInterval(iv);
  }, [fetchMatchups]);

  // Load bets + run client-side payout check
  useEffect(() => {
    if (!username || matchups.length === 0) return;

    const loadAndPay = async () => {
      try {
        const db = getDb();
        const uid = username.toLowerCase();
        const snap = await getDocs(collection(db, "users", uid, "bets"));
        const bets: Record<string, UserBet> = {};
        snap.forEach((d) => {
          bets[d.id] = d.data() as UserBet;
        });

        // Payout pass
        const paid: Record<string, UserBet> = {};
        const payoutMsg: string[] = [];
        for (const [gameId, bet] of Object.entries(bets)) {
          if (bet.paid) {
            paid[gameId] = bet;
            continue;
          }
          const matchup = matchups.find((m) => m.gameId === gameId);
          if (!matchup?.winner) {
            paid[gameId] = bet;
            continue;
          }
          const won = matchup.winner === bet.team;
          const updated: UserBet = { ...bet, paid: true, won };
          paid[gameId] = updated;
          await updateDoc(
            doc(db, "users", uid, "bets", gameId),
            { paid: true, won }
          );
          if (won) {
            const payout = Math.round(bet.amount * PAYOUT * 100) / 100;
            addBalance(payout);
            payoutMsg.push(`+$${payout.toFixed(2)} — ${bet.team}`);
            // Update Firestore balance too
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const cur = (userSnap.data().balance as number) ?? 0;
              await updateDoc(userRef, { balance: Math.round((cur + payout) * 100) / 100 });
            }
          }
        }
        setUserBets(paid);
        if (payoutMsg.length > 0) {
          setNotification("Payouts: " + payoutMsg.join(" · "));
          setTimeout(() => setNotification(null), 6000);
        }
      } catch (err) {
        console.error("loadAndPay error:", err);
      }
    };

    loadAndPay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, matchups.length]);

  const placeBet = useCallback(
    async (gameId: string, team: string) => {
      if (!username) return;
      if (balance < selectedChip) {
        setNotification("Not enough balance!");
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      if (userBets[gameId]) return;

      setPlacingGame(gameId);
      try {
        subtractBalance(selectedChip);
        const db = getDb();
        const uid = username.toLowerCase();
        const bet: UserBet = {
          gameId,
          team,
          amount: selectedChip,
          paid: false,
          won: null,
          timestamp: Date.now(),
        };
        await setDoc(doc(db, "users", uid, "bets", gameId), bet);

        // Deduct from Firestore balance
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const cur = (userSnap.data().balance as number) ?? 0;
          await updateDoc(userRef, {
            balance: Math.max(0, Math.round((cur - selectedChip) * 100) / 100),
          });
        }

        setUserBets((prev) => ({ ...prev, [gameId]: bet }));
        setNotification(`$${selectedChip} on ${team}!`);
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        console.error("placeBet error:", err);
        addBalance(selectedChip); // refund
        setNotification("Bet failed — balance refunded.");
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setPlacingGame(null);
      }
    },
    [username, balance, selectedChip, userBets, subtractBalance, addBalance]
  );

  // Group matchups by round, then region
  const rounds = Array.from(new Set(matchups.map((m) => m.round))).sort((a, b) => a - b);

  const displayed = activeRound
    ? matchups.filter((m) => m.round === activeRound)
    : matchups;

  const regions = Array.from(new Set(displayed.map((m) => m.region)))
    .sort((a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b));

  // Bet summary counts
  const allBets = Object.values(userBets);
  const pending = allBets.filter((b) => !b.paid);
  const won = allBets.filter((b) => b.paid && b.won === true);
  const lost = allBets.filter((b) => b.paid && b.won === false);

  const totalWon = won.reduce((s, b) => s + b.amount * PAYOUT, 0);
  const totalLost = lost.reduce((s, b) => s + b.amount, 0);

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "'Barlow', sans-serif",
        padding: "24px 24px 48px",
      }}
    >
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--accent-green); }
          50% { opacity: 0.4; box-shadow: 0 0 12px var(--accent-green); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Notification toast ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{
              position: "fixed",
              top: 70,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15,25,35,0.97)",
              border: "1px solid var(--accent-gold)",
              borderRadius: 10,
              padding: "10px 20px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--accent-gold)",
              letterSpacing: "0.06em",
              zIndex: 9999,
              whiteSpace: "nowrap",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: 0,
            lineHeight: 1,
            background: "linear-gradient(135deg, #f0b429 0%, #fcd34d 50%, #f0b429 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🏀 March Madness
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            marginTop: 6,
            letterSpacing: "0.04em",
          }}
        >
          Live bracket betting · 1.9× payout · NCAA Men&apos;s Tournament
        </p>
      </div>

      {/* ── Chip selector + stats row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 20,
          alignItems: "start",
          marginBottom: 28,
        }}
      >
        <CollapsibleBetSelector>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHIPS.map((chip) => (
              <div
                key={chip.value}
                onClick={() => setSelectedChip(chip.value)}
                style={{
                  outline:
                    selectedChip === chip.value
                      ? "2px solid var(--accent-gold)"
                      : "2px solid transparent",
                  outlineOffset: 3,
                  borderRadius: "50%",
                  transition: "outline 0.15s",
                  cursor: "pointer",
                }}
              >
                <CasinoChip
                  value={chip.value}
                  onClick={setSelectedChip}
                  disabled={balance < chip.value}
                />
              </div>
            ))}
          </div>
        </CollapsibleBetSelector>

        {/* Stats cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            {
              label: "Pending",
              value: pending.length,
              color: "var(--accent-gold)",
              detail: pending.length > 0 ? `$${pending.reduce((s, b) => s + b.amount, 0)} wagered` : "No bets",
            },
            {
              label: "Won",
              value: won.length,
              color: "var(--accent-green)",
              detail: won.length > 0 ? `+$${totalWon.toFixed(2)}` : "$0",
            },
            {
              label: "Lost",
              value: lost.length,
              color: "#ef4444",
              detail: lost.length > 0 ? `-$${totalLost.toFixed(2)}` : "$0",
            },
          ].map(({ label, value, color, detail }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "12px 18px",
                minWidth: 90,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.6rem",
                  color,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Round tabs ── */}
      {!loading && rounds.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <button
            onClick={() => setActiveRound(null)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: activeRound === null ? "var(--accent-gold)" : "rgba(255,255,255,0.1)",
              background: activeRound === null ? "rgba(240,180,41,0.15)" : "transparent",
              color: activeRound === null ? "var(--accent-gold)" : "var(--text-secondary)",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            All Games
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: activeRound === r ? "var(--accent-gold)" : "rgba(255,255,255,0.1)",
                background: activeRound === r ? "rgba(240,180,41,0.15)" : "transparent",
                color: activeRound === r ? "var(--accent-gold)" : "var(--text-secondary)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {ROUND_LABELS[r] ?? `Round ${r}`}
            </button>
          ))}
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "var(--text-muted)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "0.1em",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🏀</div>
          Loading bracket…
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "#ef4444",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && matchups.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "var(--text-muted)",
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
            No games scheduled right now
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            Check back when the tournament is live.
          </div>
        </div>
      )}

      {/* ── Game grid by region ── */}
      {!loading && displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {regions.map((region) => {
            const regionGames = displayed
              .filter((m) => m.region === region)
              .sort((a, b) => {
                // Live first, then pre, then post
                const order = { in: 0, pre: 1, post: 2 };
                return order[a.status] - order[b.status];
              });
            if (regionGames.length === 0) return null;

            const roundsInRegion = Array.from(new Set(regionGames.map((m) => m.round))).sort(
              (a, b) => a - b
            );

            return (
              <div key={region}>
                {/* Region header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: "1.15rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--accent-gold)",
                      margin: 0,
                    }}
                  >
                    {region} Region
                  </h2>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background:
                        "linear-gradient(to right, rgba(240,180,41,0.3), transparent)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {regionGames.length} game{regionGames.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Sub-group by round within region */}
                {roundsInRegion.map((r) => {
                  const roundGames = regionGames.filter((m) => m.round === r);
                  return (
                    <div key={r} style={{ marginBottom: 20 }}>
                      {activeRound === null && roundsInRegion.length > 1 && (
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            letterSpacing: "0.14em",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            marginBottom: 10,
                          }}
                        >
                          {ROUND_LABELS[r] ?? `Round ${r}`}
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(280px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {roundGames.map((matchup) => (
                          <GameCard
                            key={matchup.gameId}
                            matchup={matchup}
                            bet={userBets[matchup.gameId]}
                            selectedChip={selectedChip}
                            onBet={placeBet}
                            placing={placingGame === matchup.gameId}
                            canBet={!!username}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Your Bets Panel ── */}
      {allBets.length > 0 && (
        <div
          style={{
            marginTop: 48,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: "1rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              margin: "0 0 16px",
            }}
          >
            Your Bets
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allBets
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((bet) => {
                const matchup = matchups.find((m) => m.gameId === bet.gameId);
                const title = matchup
                  ? `${abbr(matchup.team1)} vs ${abbr(matchup.team2)}`
                  : `Game ${bet.gameId}`;
                const betWon = bet.paid && bet.won === true;
                const betLost = bet.paid && bet.won === false;
                return (
                  <div
                    key={bet.gameId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: betWon
                        ? "rgba(0,230,118,0.07)"
                        : betLost
                        ? "rgba(239,68,68,0.07)"
                        : "rgba(255,255,255,0.03)",
                      border: betWon
                        ? "1px solid rgba(0,230,118,0.2)"
                        : betLost
                        ? "1px solid rgba(239,68,68,0.2)"
                        : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>
                      {betWon ? "✅" : betLost ? "❌" : "⏳"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        ${bet.amount} on {abbr(bet.team)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        color: betWon
                          ? "var(--accent-green)"
                          : betLost
                          ? "#ef4444"
                          : "var(--accent-gold)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {betWon
                        ? `+$${(bet.amount * PAYOUT).toFixed(2)}`
                        : betLost
                        ? `-$${bet.amount.toFixed(2)}`
                        : `$${bet.amount} pending`}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
