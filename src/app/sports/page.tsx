"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { fmtMoney } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Matchup {
  gameId: string;
  team1: string;
  team2: string;
  team1Logo: string;
  team2Logo: string;
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

interface PublicBet {
  gameId: string;
  username: string;
  team: string;
  amount: number;
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

// Avatar color from username hash
const AVATAR_PALETTE = [
  "#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa",
  "#f472b6", "#38bdf8", "#fb923c", "#4ade80", "#e879f9",
];

function avatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ─── Persisted result queue (survives reload) ─────────────────────────────────

type NSResult =
  | { type: "win"; team: string; payout: number }
  | { type: "loss"; scoringTeam: string; amount: number };

const NS_RESULTS_KEY = "grax_ns_results";

function loadNSResults(): NSResult[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(NS_RESULTS_KEY) ?? "[]") as NSResult[]; }
  catch { return []; }
}
function saveNSResults(arr: NSResult[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NS_RESULTS_KEY, JSON.stringify(arr));
}
function enqueueNSResult(r: NSResult) {
  const arr = loadNSResults();
  arr.push(r);
  saveNSResults(arr);
}
function dequeueNSResult(): NSResult | null {
  const arr = loadNSResults();
  if (arr.length === 0) return null;
  const [first, ...rest] = arr;
  saveNSResults(rest);
  return first;
}

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

function BettorRow({
  bet,
  color,
  isCurrentUser,
  reverse,
}: {
  bet: PublicBet;
  color: string;
  isCurrentUser: boolean;
  reverse?: boolean;
}) {
  const initials = bet.username.slice(0, 2).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, x: reverse ? 8 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 5,
        flexDirection: reverse ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: `${color}1a`,
          border: `1.5px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.6rem",
          fontWeight: 800,
          color,
          flexShrink: 0,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.04em",
          ...(isCurrentUser
            ? { boxShadow: `0 0 8px ${color}55`, borderColor: color }
            : {}),
        }}
      >
        {initials}
      </div>
      <span
        style={{
          fontSize: "0.78rem",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: isCurrentUser ? 700 : 500,
          color: isCurrentUser ? "var(--text-primary)" : "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {isCurrentUser ? "You" : bet.username}
        {isCurrentUser && (
          <span style={{ color, marginLeft: 4, fontSize: "0.6rem" }}>★</span>
        )}
      </span>
      <span
        style={{
          fontSize: "0.78rem",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          color,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ${bet.amount}
      </span>
    </motion.div>
  );
}

const TEAM1_COLOR = "#60a5fa";
const TEAM2_COLOR = "#f87171";

function BetsBoard({
  matchup,
  publicBets,
  currentUser,
}: {
  matchup: Matchup;
  publicBets: PublicBet[];
  currentUser: string | null;
}) {
  const [open, setOpen] = useState(false);

  const team1Bets = publicBets.filter((b) => b.team === matchup.team1);
  const team2Bets = publicBets.filter((b) => b.team === matchup.team2);
  const team1Total = team1Bets.reduce((s, b) => s + b.amount, 0);
  const team2Total = team2Bets.reduce((s, b) => s + b.amount, 0);
  const total = team1Total + team2Total;
  const totalBettors = team1Bets.length + team2Bets.length;

  const team1Pct = total > 0 ? Math.round((team1Total / total) * 100) : 50;
  const team2Pct = 100 - team1Pct;

  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 10,
        marginTop: 6,
      }}
    >
      {total === 0 ? (
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            textAlign: "center",
            fontStyle: "italic",
            margin: 0,
            fontFamily: "'Barlow', sans-serif",
          }}
        >
          No community bets yet
        </p>
      ) : (
        <>
          {/* Consensus bar */}
          <div
            style={{
              height: 7,
              borderRadius: 4,
              overflow: "hidden",
              display: "flex",
              marginBottom: 8,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <motion.div
              animate={{ width: `${team1Pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${TEAM1_COLOR}cc, ${TEAM1_COLOR})`,
                borderRadius: "4px 0 0 4px",
              }}
            />
            <motion.div
              animate={{ width: `${team2Pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${TEAM2_COLOR}, ${TEAM2_COLOR}cc)`,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>

          {/* Summary row (clickable toggle) */}
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: TEAM1_COLOR,
              }}
            >
              {team1Pct}% · {team1Bets.length}👤 · ${team1Total}
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.62rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                flexShrink: 0,
                padding: "2px 8px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {totalBettors} bettor{totalBettors !== 1 ? "s" : ""} {open ? "▲" : "▼"}
            </span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: TEAM2_COLOR,
              }}
            >
              ${team2Total} · {team2Bets.length}👤 · {team2Pct}%
            </span>
          </button>

          {/* Expanded bettor list */}
          <AnimatePresence>
            {open && (
              <motion.div
                key="bettor-list"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Team 1 column */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: "0.63rem",
                        fontWeight: 800,
                        color: TEAM1_COLOR,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingBottom: 4,
                        borderBottom: `1px solid ${TEAM1_COLOR}30`,
                      }}
                    >
                      {abbr(matchup.team1)}
                    </div>
                    {team1Bets.length === 0 ? (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        No bets
                      </span>
                    ) : (
                      [...team1Bets]
                        .sort((a, b) => b.amount - a.amount)
                        .map((bet) => (
                          <BettorRow
                            key={bet.username}
                            bet={bet}
                            color={avatarColor(bet.username)}
                            isCurrentUser={
                              bet.username.toLowerCase() ===
                              currentUser?.toLowerCase()
                            }
                          />
                        ))
                    )}
                  </div>

                  {/* Team 2 column */}
                  <div>
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: "0.63rem",
                        fontWeight: 800,
                        color: TEAM2_COLOR,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingBottom: 4,
                        borderBottom: `1px solid ${TEAM2_COLOR}30`,
                      }}
                    >
                      {abbr(matchup.team2)}
                    </div>
                    {team2Bets.length === 0 ? (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                          display: "block",
                          textAlign: "right",
                        }}
                      >
                        No bets
                      </span>
                    ) : (
                      [...team2Bets]
                        .sort((a, b) => b.amount - a.amount)
                        .map((bet) => (
                          <BettorRow
                            key={bet.username}
                            bet={bet}
                            color={avatarColor(bet.username)}
                            isCurrentUser={
                              bet.username.toLowerCase() ===
                              currentUser?.toLowerCase()
                            }
                            reverse
                          />
                        ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

interface GameCardProps {
  matchup: Matchup;
  bet: UserBet | undefined;
  betAmount: number;
  onBet: (gameId: string, team: string, teamLogo: string, opponent: string) => void;
  onNextScore: (gameId: string, team: string, t1: number, t2: number) => void;
  placing: boolean;
  canBet: boolean;
  publicBets: PublicBet[];
  currentUser: string | null;
  nextScoreBet: { team: string; amount: number } | undefined;
}

function GameCard({
  matchup,
  bet,
  betAmount,
  onBet,
  onNextScore,
  placing,
  canBet,
  publicBets,
  currentUser,
  nextScoreBet,
}: GameCardProps) {
  const { gameId, team1, team2, team1Logo, team2Logo, team1Score, team2Score, winner, status, startTime } = matchup;

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
          { name: team1, score: team1Score, logo: team1Logo },
          { name: team2, score: team2Score, logo: team2Logo },
        ].map(({ name, score, logo }, i) => {
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
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={name}
                  width={26}
                  height={26}
                  style={{
                    objectFit: "contain",
                    flexShrink: 0,
                    opacity: isLoser ? 0.3 : 1,
                    filter: isLoser ? "grayscale(1)" : "none",
                    transition: "opacity 0.2s",
                  }}
                />
              )}
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
          {[
            { name: team1, logo: team1Logo, opp: team2 },
            { name: team2, logo: team2Logo, opp: team1 },
          ].map(({ name: team, logo, opp }) => (
            <button
              key={team}
              onClick={() => onBet(gameId, team, logo, opp)}
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
              {betAmount > 0 ? `$${betAmount} on ${abbr(team)}` : `Bet on ${abbr(team)}`}
            </button>
          ))}
        </div>
      )}

      {/* Who scores next — live games only */}
      {isLive && canBet && (
        <div style={{
          marginTop: 4,
          padding: "10px 12px",
          borderRadius: 8,
          background: "rgba(0,230,118,0.04)",
          border: "1px solid rgba(0,230,118,0.15)",
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--accent-green)",
            marginBottom: 8,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}>
            <span style={{ animation: "livePulse 1.4s ease-in-out infinite", display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", boxShadow: "0 0 6px var(--accent-green)" }} />
            Who scores next?
          </div>
          {nextScoreBet ? (
            <div style={{
              fontSize: "0.78rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--accent-green)",
              fontWeight: 600,
            }}>
              ⏳ ${nextScoreBet.amount} on {abbr(nextScoreBet.team)}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { name: team1, logo: team1Logo },
                { name: team2, logo: team2Logo },
              ].map(({ name, logo }) => (
                <button
                  key={name}
                  onClick={() => onNextScore(gameId, name, team1Score, team2Score)}
                  disabled={betAmount <= 0}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "rgba(0,230,118,0.06)",
                    border: "1px solid rgba(0,230,118,0.25)",
                    borderRadius: 7,
                    padding: "7px 6px",
                    color: "var(--accent-green)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    cursor: betAmount <= 0 ? "not-allowed" : "pointer",
                    opacity: betAmount <= 0 ? 0.45 : 1,
                    overflow: "hidden",
                    transition: "background 0.15s",
                  }}
                  title={betAmount <= 0 ? "Set a bet amount first" : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logo && <img src={logo} alt={name} width={16} height={16} style={{ objectFit: "contain", flexShrink: 0 }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{abbr(name)}</span>
                </button>
              ))}
            </div>
          )}
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
              +${fmtMoney(bet.amount * PAYOUT)}
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

      {/* Community bets board */}
      <BetsBoard
        matchup={matchup}
        publicBets={publicBets}
        currentUser={currentUser}
      />
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
  const [publicBets, setPublicBets] = useState<Record<string, PublicBet[]>>({});
  const [betAmount, setBetAmount] = useState(0);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [placingGame, setPlacingGame] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [nextScoreWin, setNextScoreWin] = useState<{ team: string; payout: number } | null>(null);
  const [nextScoreLoss, setNextScoreLoss] = useState<{ scoringTeam: string; amount: number } | null>(null);
  const [nextScoreBets, setNextScoreBets] = useState<Record<string, { team: string; amount: number; timestamp: number; t1AtBet?: number; t2AtBet?: number }>>({});
  const prevScoresRef = useRef<Record<string, { t1: number; t2: number }>>({});
  const nextScoreBetsRef = useRef<Record<string, { team: string; amount: number; timestamp: number; t1AtBet?: number; t2AtBet?: number }>>({});
  const usernameRef = useRef<string | null>(null);
  const [confirmBet, setConfirmBet] = useState<{
    gameId: string;
    team: string;
    teamLogo: string;
    opponent: string;
    amount: number;
  } | null>(null);

  // Keep refs in sync so fetchMatchups always reads current values without deps
  useEffect(() => { nextScoreBetsRef.current = nextScoreBets; }, [nextScoreBets]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Fetch matchups (with auto-refresh every 30 s)
  const fetchMatchups = useCallback(async () => {
    try {
      const res = await fetch("/api/bracket", { cache: "no-store" });
      const data = await res.json();
      const fresh: Matchup[] = data.matchups ?? [];
      setMatchups(fresh);
      setError(null);

      // Detect score changes → settle next-score bets
      const currentNSBets = nextScoreBetsRef.current;
      const updatedNSBets = { ...currentNSBets };
      let toastMsg: string | null = null;
      for (const m of fresh) {
        if (m.status !== "in") continue;
        const prevS = prevScoresRef.current[m.gameId];
        if (!prevS) continue;
        const bet = updatedNSBets[m.gameId];
        if (!bet) continue;
        const t1Scored = m.team1Score > prevS.t1;
        const t2Scored = m.team2Score > prevS.t2;
        if (!t1Scored && !t2Scored) continue;
        const scoringTeam = t1Scored && t2Scored ? null : t1Scored ? m.team1 : m.team2;
        let payout = 0;
        if (scoringTeam === null) {
          payout = bet.amount;
          addBalance(payout);
          toastMsg = `Push! $${bet.amount} refunded.`;
        } else if (bet.team === scoringTeam) {
          payout = Math.round(bet.amount * PAYOUT * 100) / 100;
          addBalance(payout);
          toastMsg = `⚡ Next score WIN! +$${fmtMoney(payout)}`;
          setNextScoreWin({ team: bet.team, payout });
        } else {
          toastMsg = `⚡ Next score lost — ${scoringTeam} scored.`;
          setNextScoreLoss({ scoringTeam: scoringTeam!, amount: bet.amount });
        }
        delete updatedNSBets[m.gameId];
        // Settle in Firestore
        (async (gameId: string, payoutAmt: number) => {
          try {
            const db = getDb();
            const uid = usernameRef.current?.toLowerCase();
            if (!uid) return;
            await deleteDoc(doc(db, "users", uid, "next_score_bets", gameId));
            if (payoutAmt > 0) {
              const userRef = doc(db, "users", uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const cur = (userSnap.data().balance as number) ?? 0;
                await updateDoc(userRef, { balance: Math.round((cur + payoutAmt) * 100) / 100 });
              }
            }
          } catch (e) { console.error("settle next-score error:", e); }
        })(m.gameId, payout);
      }
      setNextScoreBets(updatedNSBets);
      if (toastMsg) {
        setNotification(toastMsg);
        setTimeout(() => setNotification(null), 4000);
      }

      // Update prev scores for live games
      for (const m of fresh) {
        if (m.status === "in") {
          prevScoresRef.current[m.gameId] = { t1: m.team1Score, t2: m.team2Score };
        }
      }
    } catch {
      setError("Could not load bracket data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [addBalance]);

  useEffect(() => {
    fetchMatchups();
    const iv = setInterval(fetchMatchups, 30_000);
    return () => clearInterval(iv);
  }, [fetchMatchups]);

  // Live subscription to all public bets
  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, "public_bets"), (snap) => {
      const grouped: Record<string, PublicBet[]> = {};
      snap.forEach((d) => {
        const bet = d.data() as PublicBet;
        if (!grouped[bet.gameId]) grouped[bet.gameId] = [];
        grouped[bet.gameId].push(bet);
      });
      setPublicBets(grouped);
    });
    return () => unsub();
  }, []);

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
          await updateDoc(doc(db, "users", uid, "bets", gameId), { paid: true, won });
          if (won) {
            const payout = Math.round(bet.amount * PAYOUT * 100) / 100;
            addBalance(payout);
            payoutMsg.push(`+$${fmtMoney(payout)} — ${bet.team}`);
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

        // Load next-score bets + settle any that scored while user was away
        const nsSnap = await getDocs(collection(db, "users", uid, "next_score_bets"));
        const nsBets: Record<string, { team: string; amount: number; timestamp: number; t1AtBet?: number; t2AtBet?: number }> = {};
        nsSnap.forEach((d) => {
          nsBets[d.id] = d.data() as { team: string; amount: number; timestamp: number; t1AtBet?: number; t2AtBet?: number };
        });

        // Away settlement: check each loaded bet against current scores
        const activeBets: typeof nsBets = {};
        for (const [gameId, nsBet] of Object.entries(nsBets)) {
          const m = matchups.find((mx) => mx.gameId === gameId);
          // Only try to settle if we have score snapshots and a live game
          if (!m || m.status !== "in" || nsBet.t1AtBet == null || nsBet.t2AtBet == null) {
            activeBets[gameId] = nsBet;
            continue;
          }
          const t1Scored = m.team1Score > nsBet.t1AtBet;
          const t2Scored = m.team2Score > nsBet.t2AtBet;
          if (!t1Scored && !t2Scored) {
            activeBets[gameId] = nsBet;
            continue;
          }
          // Score changed while away — settle
          const scoringTeam = t1Scored && t2Scored ? null : t1Scored ? m.team1 : m.team2;
          let awayPayout = 0;
          if (scoringTeam === null) {
            awayPayout = nsBet.amount;
            addBalance(awayPayout);
          } else if (nsBet.team === scoringTeam) {
            awayPayout = Math.round(nsBet.amount * PAYOUT * 100) / 100;
            addBalance(awayPayout);
            enqueueNSResult({ type: "win", team: nsBet.team, payout: awayPayout });
          } else {
            enqueueNSResult({ type: "loss", scoringTeam: scoringTeam!, amount: nsBet.amount });
          }
          await deleteDoc(doc(db, "users", uid, "next_score_bets", gameId));
          if (awayPayout > 0) {
            const userRef2 = doc(db, "users", uid);
            const userSnap2 = await getDoc(userRef2);
            if (userSnap2.exists()) {
              const cur2 = (userSnap2.data().balance as number) ?? 0;
              await updateDoc(userRef2, { balance: Math.round((cur2 + awayPayout) * 100) / 100 });
            }
          }
        }
        setNextScoreBets(activeBets);

        // Show any queued away results (win or loss popups)
        const pending0 = dequeueNSResult();
        if (pending0) {
          if (pending0.type === "win") setNextScoreWin({ team: pending0.team, payout: pending0.payout });
          else setNextScoreLoss({ scoringTeam: pending0.scoringTeam, amount: pending0.amount });
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
      if (betAmount <= 0) {
        setNotification("Select a bet amount first!");
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      if (balance < betAmount) {
        setNotification("Not enough balance!");
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      if (userBets[gameId]) return;

      setPlacingGame(gameId);
      try {
        subtractBalance(betAmount);
        const db = getDb();
        const uid = username.toLowerCase();
        const bet: UserBet = {
          gameId,
          team,
          amount: betAmount,
          paid: false,
          won: null,
          timestamp: Date.now(),
        };
        await setDoc(doc(db, "users", uid, "bets", gameId), bet);

        const publicBet: PublicBet = {
          gameId,
          username,
          team,
          amount: betAmount,
          timestamp: Date.now(),
        };
        await setDoc(doc(db, "public_bets", `${gameId}_${uid}`), publicBet);

        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const cur = (userSnap.data().balance as number) ?? 0;
          await updateDoc(userRef, {
            balance: Math.max(0, Math.round((cur - betAmount) * 100) / 100),
          });
        }

        setUserBets((prev) => ({ ...prev, [gameId]: bet }));
        setNotification(`$${betAmount} on ${team}!`);
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        console.error("placeBet error:", err);
        addBalance(betAmount);
        setNotification("Bet failed — balance refunded.");
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setPlacingGame(null);
      }
    },
    [username, balance, betAmount, userBets, subtractBalance, addBalance]
  );

  const placeNextScoreBet = useCallback(
    async (gameId: string, team: string, t1AtBet: number, t2AtBet: number) => {
      if (!username || betAmount <= 0 || balance < betAmount || nextScoreBets[gameId]) return;
      subtractBalance(betAmount);
      const entry = { team, amount: betAmount, timestamp: Date.now(), t1AtBet, t2AtBet };
      setNextScoreBets((prev) => ({ ...prev, [gameId]: entry }));
      setNotification(`⚡ $${betAmount} on ${team} to score next!`);
      setTimeout(() => setNotification(null), 3000);
      try {
        const db = getDb();
        const uid = username.toLowerCase();
        await setDoc(doc(db, "users", uid, "next_score_bets", gameId), { gameId, team, amount: betAmount, timestamp: Date.now(), t1AtBet, t2AtBet });
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const cur = (userSnap.data().balance as number) ?? 0;
          await updateDoc(userRef, { balance: Math.max(0, Math.round((cur - betAmount) * 100) / 100) });
        }
      } catch (err) {
        console.error("placeNextScoreBet error:", err);
      }
    },
    [username, betAmount, balance, nextScoreBets, subtractBalance]
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

  const nextScoreList = Object.values(nextScoreBets);
  const pendingWagered = pending.reduce((s, b) => s + b.amount, 0)
    + nextScoreList.reduce((s, b) => s + b.amount, 0);
  const pendingCount = pending.length + nextScoreList.length;

  // Total community action across all games
  const allPublicBets = Object.values(publicBets).flat();
  const communityTotal = allPublicBets.reduce((s, b) => s + b.amount, 0);
  const communityBettors = new Set(allPublicBets.map((b) => b.username.toLowerCase())).size;

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

      {/* ── Win / Loss overlays ── */}
      <AnimatePresence>
        {nextScoreWin && (
          <motion.div
            key="ns-win"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setNextScoreWin(null);
              setTimeout(() => {
                const next = dequeueNSResult();
                if (next) {
                  if (next.type === "win") setNextScoreWin({ team: next.team, payout: next.payout });
                  else setNextScoreLoss({ scoringTeam: next.scoringTeam, amount: next.amount });
                }
              }, 350);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 20000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            {/* Green glow flood */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at center, rgba(0,230,118,0.25) 0%, rgba(0,230,118,0.08) 50%, transparent 80%)",
                animation: "glow-pulse 0.6s ease-in-out infinite alternate",
              }}
            />
            {/* Win card */}
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(145deg, #061a0e, #0a2414)",
                border: "2px solid var(--accent-green)",
                borderRadius: 24,
                padding: "40px 48px 32px",
                textAlign: "center",
                boxShadow: "0 0 60px rgba(0,230,118,0.5), 0 0 120px rgba(0,230,118,0.2), 0 24px 60px rgba(0,0,0,0.8)",
                position: "relative",
                cursor: "default",
              }}
            >
              <div style={{ fontSize: "3.5rem", marginBottom: 8 }}>⚡</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: "2rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--accent-green)",
                marginBottom: 4,
                textShadow: "0 0 20px rgba(0,230,118,0.8)",
              }}>
                SCORED NEXT!
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1rem",
                color: "rgba(255,255,255,0.6)",
                marginBottom: 20,
                letterSpacing: "0.04em",
              }}>
                {nextScoreWin.team}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: "3.5rem",
                color: "var(--accent-green)",
                letterSpacing: "0.03em",
                textShadow: "0 0 30px rgba(0,230,118,0.9)",
                lineHeight: 1,
                marginBottom: 28,
              }}>
                +${fmtMoney(nextScoreWin.payout)}
              </div>
              <button
                onClick={() => {
                  setNextScoreWin(null);
                  setTimeout(() => {
                    const next = dequeueNSResult();
                    if (next) {
                      if (next.type === "win") setNextScoreWin({ team: next.team, payout: next.payout });
                      else setNextScoreLoss({ scoringTeam: next.scoringTeam, amount: next.amount });
                    }
                  }, 350);
                }}
                style={{
                  background: "var(--accent-green)",
                  color: "#061a0e",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 40px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: "1rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(0,230,118,0.5)",
                }}
              >
                GOT IT
              </button>
            </motion.div>
          </motion.div>
        )}

        {nextScoreLoss && (
          <motion.div
            key="ns-loss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setNextScoreLoss(null);
              setTimeout(() => {
                const next = dequeueNSResult();
                if (next) {
                  if (next.type === "win") setNextScoreWin({ team: next.team, payout: next.payout });
                  else setNextScoreLoss({ scoringTeam: next.scoringTeam, amount: next.amount });
                }
              }, 350);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 20000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at center, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.07) 50%, transparent 80%)",
              }}
            />
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(145deg, #1a0606, #240a0a)",
                border: "2px solid #ef4444",
                borderRadius: 24,
                padding: "40px 48px 32px",
                textAlign: "center",
                boxShadow: "0 0 60px rgba(239,68,68,0.5), 0 0 120px rgba(239,68,68,0.2), 0 24px 60px rgba(0,0,0,0.8)",
                position: "relative",
                cursor: "default",
              }}
            >
              <div style={{ fontSize: "3.5rem", marginBottom: 8 }}>💀</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: "2rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#ef4444",
                marginBottom: 4,
                textShadow: "0 0 20px rgba(239,68,68,0.8)",
              }}>
                WRONG TEAM
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "1rem",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 20,
                letterSpacing: "0.04em",
              }}>
                {nextScoreLoss.scoringTeam} scored
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: "3.5rem",
                color: "#ef4444",
                letterSpacing: "0.03em",
                textShadow: "0 0 30px rgba(239,68,68,0.9)",
                lineHeight: 1,
                marginBottom: 28,
              }}>
                -${nextScoreLoss.amount}
              </div>
              <button
                onClick={() => {
                  setNextScoreLoss(null);
                  setTimeout(() => {
                    const next = dequeueNSResult();
                    if (next) {
                      if (next.type === "win") setNextScoreWin({ team: next.team, payout: next.payout });
                      else setNextScoreLoss({ scoringTeam: next.scoringTeam, amount: next.amount });
                    }
                  }, 350);
                }}
                style={{
                  background: "#ef4444",
                  color: "#1a0606",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 40px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: "1rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(239,68,68,0.5)",
                }}
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}

        {confirmBet && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmBet(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(145deg, #131e2b 0%, #0f1923 100%)",
                border: "1px solid rgba(240,180,41,0.3)",
                borderRadius: 18,
                padding: "32px 28px 24px",
                maxWidth: 360,
                width: "100%",
                boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(240,180,41,0.06)",
                textAlign: "center",
              }}
            >
              {/* Team logo */}
              {confirmBet.teamLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={confirmBet.teamLogo}
                  alt={confirmBet.team}
                  width={72}
                  height={72}
                  style={{ objectFit: "contain", marginBottom: 16 }}
                />
              ) : (
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏀</div>
              )}

              {/* Headline */}
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: "1.4rem",
                letterSpacing: "0.04em",
                color: "var(--text-primary)",
                marginBottom: 6,
                textTransform: "uppercase",
              }}>
                {abbr(confirmBet.team)}
              </div>
              <div style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginBottom: 20,
                letterSpacing: "0.02em",
              }}>
                vs {abbr(confirmBet.opponent)}
              </div>

              {/* Bet summary pill */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(240,180,41,0.1)",
                border: "1px solid rgba(240,180,41,0.35)",
                borderRadius: 100,
                padding: "8px 20px",
                marginBottom: 24,
              }}>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: "var(--accent-gold)",
                  letterSpacing: "0.03em",
                }}>
                  ${confirmBet.amount}
                </span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>
                  to win ${fmtMoney(confirmBet.amount * PAYOUT)}
                </span>
              </div>

              {/* Confirm question */}
              <p style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}>
                Place <strong style={{ color: "var(--text-primary)" }}>${confirmBet.amount}</strong> on{" "}
                <strong style={{ color: "var(--accent-gold)" }}>{abbr(confirmBet.team)}</strong>?
              </p>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmBet(null)}
                  style={{
                    flex: 1,
                    padding: "11px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    placeBet(confirmBet.gameId, confirmBet.team);
                    setConfirmBet(null);
                  }}
                  style={{
                    flex: 2,
                    padding: "11px",
                    borderRadius: 10,
                    border: "1px solid rgba(240,180,41,0.5)",
                    background: "linear-gradient(135deg, rgba(240,180,41,0.2), rgba(240,180,41,0.08))",
                    color: "var(--accent-gold)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    boxShadow: "0 0 20px rgba(240,180,41,0.1)",
                  }}
                >
                  Confirm Bet
                </button>
              </div>
            </motion.div>
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

        {/* Community stats bar */}
        {communityBettors > 0 && (
          <div
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: "0.75rem",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.06em",
              color: "var(--text-secondary)",
            }}
          >
            <span>
              <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>
                {communityBettors}
              </span>{" "}
              bettors active
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
            <span>
              <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>
                ${fmtMoney(communityTotal)}
              </span>{" "}
              wagered total
            </span>
          </div>
        )}
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
          {/* Chips — click to add */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHIPS.map((chip) => (
              <CasinoChip
                key={chip.value}
                value={chip.value}
                onClick={() => {
                  if (balance >= betAmount + chip.value) setBetAmount(prev => prev + chip.value);
                }}
                disabled={balance < betAmount + chip.value}
              />
            ))}
          </div>

          {/* Total + custom input row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            {/* Running total */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "1.6rem",
              color: betAmount > 0 ? "var(--accent-gold)" : "var(--text-muted)",
              minWidth: 64,
              letterSpacing: "0.02em",
              transition: "color 0.2s",
            }}>
              ${betAmount}
            </div>

            {/* Custom input */}
            <input
              type="number"
              min={0}
              max={balance}
              placeholder="Custom"
              value=""
              onChange={(e) => {
                const v = Math.max(0, Math.min(balance, parseInt(e.target.value) || 0));
                setBetAmount(v);
                e.target.value = "";
              }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "6px 10px",
                color: "var(--text-primary)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                width: 90,
                outline: "none",
              }}
            />

            {/* Clear */}
            {betAmount > 0 && (
              <button
                onClick={() => setBetAmount(0)}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 7,
                  padding: "5px 10px",
                  color: "#ef4444",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                CLEAR
              </button>
            )}
          </div>
        </CollapsibleBetSelector>

        {/* Stats cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            {
              label: "Pending",
              value: pendingCount,
              color: "var(--accent-gold)",
              detail: pendingCount > 0 ? `$${pendingWagered} wagered` : "No bets",
            },
            {
              label: "Won",
              value: won.length,
              color: "var(--accent-green)",
              detail: won.length > 0 ? `+$${fmtMoney(totalWon)}` : "$0",
            },
            {
              label: "Lost",
              value: lost.length,
              color: "#ef4444",
              detail: lost.length > 0 ? `-$${fmtMoney(totalLost)}` : "$0",
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
          <div style={{ fontSize: "0.85rem" }}>Check back when the tournament is live.</div>
        </div>
      )}

      {/* ── Game grid by region ── */}
      {!loading && displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {regions.map((region) => {
            const regionGames = displayed
              .filter((m) => m.region === region)
              .sort((a, b) => {
                const order = { in: 0, pre: 1, post: 2 };
                return order[a.status] - order[b.status];
              });
            if (regionGames.length === 0) return null;

            const roundsInRegion = Array.from(
              new Set(regionGames.map((m) => m.round))
            ).sort((a, b) => a - b);

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
                      background: "linear-gradient(to right, rgba(240,180,41,0.3), transparent)",
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
                          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {roundGames.map((matchup) => (
                          <GameCard
                            key={matchup.gameId}
                            matchup={matchup}
                            bet={userBets[matchup.gameId]}
                            betAmount={betAmount}
                            onBet={(gameId, team, teamLogo, opponent) =>
                              setConfirmBet({ gameId, team, teamLogo, opponent, amount: betAmount })
                            }
                            onNextScore={placeNextScoreBet}
                            placing={placingGame === matchup.gameId}
                            canBet={!!username}
                            publicBets={publicBets[matchup.gameId] ?? []}
                            currentUser={username}
                            nextScoreBet={nextScoreBets[matchup.gameId]}
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
                        ? `+$${fmtMoney(bet.amount * PAYOUT)}`
                        : betLost
                        ? `-$${fmtMoney(bet.amount)}`
                        : `$${fmtMoney(bet.amount)} pending`}
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
