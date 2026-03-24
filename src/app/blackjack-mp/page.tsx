"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import PlayingCard from "@/components/PlayingCard";
import { fmtMoney } from "@/lib/format";
import {
  MP_ACTING_MS,
  MP_BETTING_MS,
  MP_MAX_SEATS,
  MP_MIN_BET,
  MP_RESULTS_MS,
  autoBetOrRemove,
  getLobbyStatus,
  joinTable,
  leaveTable,
  placeBet,
  playerAction,
  resetTableForNextRound,
  resolveDealer,
  seedMultiplayerTables,
  seatedCount,
  startRound,
  subscribeTables,
  type MpPlayerState,
  type MpTableDoc,
} from "@/lib/mpBlackjack";

function playerTone(status: MpPlayerState["status"]) {
  switch (status) {
    case "done":
      return "var(--accent-gold)";
    case "bust":
      return "#f87171";
    case "stand":
      return "var(--accent-green)";
    case "acting":
      return "var(--text-primary)";
    default:
      return "var(--text-secondary)";
  }
}

export default function MultiplayerBlackjackPage() {
  const { username } = useUser();
  const { balance, addBalance, subtractBalance } = useBalance();
  const [tables, setTables] = useState<MpTableDoc[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [betInput, setBetInput] = useState(String(MP_MIN_BET));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const previousBetRef = useRef<Record<string, number>>({});
  const settledRoundsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void seedMultiplayerTables();
    const unsub = subscribeTables((nextTables) => {
      setTables(nextTables);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedTable = useMemo(
    () => tables.find((table) => `table-${table.tableNum}` === selectedTableId) ?? null,
    [selectedTableId, tables]
  );

  const me = selectedTable && username ? selectedTable.players?.[username] : undefined;
  const isSeated = Boolean(me);

  useEffect(() => {
    if (!selectedTableId || !username || !isSeated) return;

    const leave = () => {
      void leaveTable(selectedTableId, username);
    };

    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [isSeated, selectedTableId, username]);

  useEffect(() => {
    if (!selectedTable || !username || !selectedTableId) return;
    const player = selectedTable.players?.[username];
    if (!player) return;

    previousBetRef.current[selectedTableId] = player.bet;

    if (selectedTable.status === "results" && selectedTable.roundStartedAt) {
      const roundKey = `${selectedTableId}:${selectedTable.roundStartedAt.toMillis()}`;
      if (player.status === "done" && !settledRoundsRef.current.has(roundKey)) {
        settledRoundsRef.current.add(roundKey);
        if (player.payout > 0) addBalance(player.payout);
      }
    }
  }, [addBalance, selectedTable, selectedTableId, username]);

  useEffect(() => {
    if (!selectedTable || !username) return;
    const player = selectedTable.players?.[username];
    const started = selectedTable.roundStartedAt?.toMillis() ?? 0;
    const elapsed = started ? now - started : 0;

    if (selectedTable.status === "betting" && started && elapsed >= MP_BETTING_MS) {
      const activeCount = Object.values(selectedTable.players ?? {}).filter((p) => p.bet > 0).length;
      if (player && player.bet <= 0) {
        if (balance >= MP_MIN_BET) {
          subtractBalance(MP_MIN_BET);
          previousBetRef.current[`table-${selectedTable.tableNum}`] = MP_MIN_BET;
          void autoBetOrRemove(`table-${selectedTable.tableNum}`, username, true);
        } else {
          void autoBetOrRemove(`table-${selectedTable.tableNum}`, username, false);
        }
      } else if (activeCount > 0) {
        void startRound(`table-${selectedTable.tableNum}`);
      }
    }

    if (selectedTable.status === "playing") {
      if (player?.status === "acting" && elapsed >= MP_ACTING_MS) {
        void playerAction(`table-${selectedTable.tableNum}`, username, "stand");
      }
      const everyoneDone = Object.values(selectedTable.players ?? {})
        .filter((p) => p.bet > 0)
        .every((p) => p.status === "stand" || p.status === "bust" || p.status === "done");
      if (everyoneDone) {
        void resolveDealer(`table-${selectedTable.tableNum}`);
      }
    }

    if (selectedTable.status === "results" && started && elapsed >= MP_RESULTS_MS) {
      void resetTableForNextRound(`table-${selectedTable.tableNum}`);
    }
  }, [balance, now, selectedTable, subtractBalance, username]);

  const handleJoin = useCallback(async (tableId: string) => {
    if (!username) return;
    setBusy(true);
    setError(null);
    try {
      await joinTable(tableId, username);
      setSelectedTableId(tableId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join table.");
    } finally {
      setBusy(false);
    }
  }, [username]);

  const handleLeave = useCallback(async () => {
    if (!selectedTableId || !username) return;
    setBusy(true);
    try {
      await leaveTable(selectedTableId, username);
      previousBetRef.current[selectedTableId] = 0;
      setSelectedTableId(null);
    } finally {
      setBusy(false);
    }
  }, [selectedTableId, username]);

  const handlePlaceBet = useCallback(async () => {
    if (!selectedTableId || !username) return;
    const parsed = Number(betInput);
    if (!Number.isFinite(parsed) || parsed < MP_MIN_BET) {
      setError(`Minimum bet is $${MP_MIN_BET}.`);
      return;
    }
    const previousBet = me?.bet ?? 0;
    const delta = parsed - previousBet;
    if (delta > balance) {
      setError("You do not have enough balance for that bet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (delta > 0) subtractBalance(delta);
      if (delta < 0) addBalance(-delta);
      previousBetRef.current[selectedTableId] = parsed;
      await placeBet(selectedTableId, username, parsed);
    } catch (err) {
      if (delta > 0) addBalance(delta);
      if (delta < 0) subtractBalance(-delta);
      previousBetRef.current[selectedTableId] = previousBet;
      setError(err instanceof Error ? err.message : "Could not place bet.");
    } finally {
      setBusy(false);
    }
  }, [addBalance, balance, betInput, me?.bet, selectedTableId, subtractBalance, username]);

  const handleAction = useCallback(async (action: "hit" | "stand") => {
    if (!selectedTableId || !username) return;
    setBusy(true);
    try {
      await playerAction(selectedTableId, username, action);
      await resolveDealer(selectedTableId);
    } finally {
      setBusy(false);
    }
  }, [selectedTableId, username]);

  const tableTimer = useMemo(() => {
    if (!selectedTable?.roundStartedAt) return null;
    const elapsed = now - selectedTable.roundStartedAt.toMillis();
    const duration = selectedTable.status === "betting"
      ? MP_BETTING_MS
      : selectedTable.status === "playing"
        ? MP_ACTING_MS
        : selectedTable.status === "results"
          ? MP_RESULTS_MS
          : 0;
    if (!duration) return null;
    return `${Math.ceil(Math.max(0, duration - elapsed) / 1000)}s`;
  }, [now, selectedTable]);

  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px 56px", background: "radial-gradient(circle at top, rgba(240,180,41,0.12), transparent 35%), var(--bg-primary)", color: "var(--text-primary)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.82rem" }}>grax.bet</div>
            <h1 style={{ margin: "6px 0 8px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(2rem, 5vw, 3.4rem)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Multiplayer Blackjack</h1>
            <p style={{ color: "var(--text-secondary)", maxWidth: 780, margin: 0 }}>Three permanent tables, shared live through Firestore. Sit down, bet, act on your own hand, and let the dealer settle the whole table automatically.</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Balance: <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>${fmtMoney(balance)}</span>
            </div>
            <Link href="/blackjack" style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", textDecoration: "none", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>← Solo Blackjack</Link>
          </div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", color: "#fecaca" }}>{error}</div>}

        {!selectedTable ? (
          <>
            <div style={{ marginBottom: 18, color: "var(--text-muted)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.14em" }}>Choose a table</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
              {tables.map((table) => {
                const tableId = `table-${table.tableNum}`;
                const status = getLobbyStatus(table);
                return (
                  <button key={tableId} type="button" disabled={busy || seatedCount(table) >= MP_MAX_SEATS} onClick={() => void handleJoin(tableId)} style={{ textAlign: "left", background: "linear-gradient(180deg, rgba(21,34,50,0.95), rgba(10,16,24,0.95))", border: "1px solid rgba(240,180,41,0.18)", borderRadius: 20, padding: 22, cursor: "pointer", boxShadow: "0 18px 40px rgba(0,0,0,0.3)", opacity: seatedCount(table) >= MP_MAX_SEATS ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.6rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)" }}>Table {table.tableNum}</div>
                        <div style={{ color: "var(--text-secondary)" }}>{seatedCount(table)} / {MP_MAX_SEATS} players</div>
                      </div>
                      <span style={{ padding: "6px 10px", borderRadius: 999, background: status === "Waiting" ? "rgba(255,255,255,0.08)" : "rgba(240,180,41,0.12)", color: status === "Waiting" ? "var(--text-secondary)" : "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.8rem" }}>{status}</span>
                    </div>
                    <div style={{ minHeight: 96, borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "radial-gradient(circle at top, rgba(240,180,41,0.16), transparent 45%), rgba(255,255,255,0.03)", display: "grid", placeItems: "center", color: "var(--text-muted)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      {status === "Waiting" ? "Seats open • Join anytime" : `Round ${table.status}`}
                    </div>
                  </button>
                );
              })}
            </div>
            {loading && <p style={{ color: "var(--text-muted)" }}>Loading tables...</p>}
          </>
        ) : selectedTable ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>
            <div style={{ borderRadius: 24, padding: 24, background: "linear-gradient(180deg, rgba(16,25,35,0.98), rgba(9,15,22,0.98))", border: "1px solid rgba(240,180,41,0.15)", boxShadow: "0 20px 50px rgba(0,0,0,0.38)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
                <div>
                  <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.12em" }}>Table {selectedTable.tableNum}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{seatedCount(selectedTable)} / {MP_MAX_SEATS} players seated</div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.06)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", color: selectedTable.status === "playing" ? "var(--accent-gold)" : "var(--text-secondary)" }}>{selectedTable.status}</div>
                  {tableTimer && <div style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(240,180,41,0.12)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>Timer {tableTimer}</div>}
                  <button type="button" onClick={() => void handleLeave()} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fecaca", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Leave</button>
                </div>
              </div>

              <div style={{ marginBottom: 28, padding: 20, borderRadius: 20, background: "radial-gradient(circle at center, rgba(24,78,49,0.45), rgba(8,24,16,0.85))", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ marginBottom: 10, color: "var(--text-muted)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.16em" }}>Dealer {selectedTable.dealer.handValue ? `• ${selectedTable.dealer.faceDown ? "?" : selectedTable.dealer.handValue}` : ""}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {selectedTable.dealer.hand.length > 0 ? selectedTable.dealer.hand.map((card, index) => <PlayingCard key={`${card.rank}${card.suit}${index}`} card={card} index={index} faceDown={selectedTable.dealer.faceDown && index === 1} />) : <div style={{ color: "var(--text-muted)" }}>Waiting for bets...</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {Object.entries(selectedTable.players ?? {}).map(([playerName, player]) => (
                  <div key={playerName} style={{ borderRadius: 18, padding: 18, background: playerName === username ? "rgba(240,180,41,0.08)" : "rgba(255,255,255,0.03)", border: playerName === username ? "1px solid rgba(240,180,41,0.35)" : "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.15rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{playerName}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>Bet ${fmtMoney(player.bet)} • {player.handValue || 0}</div>
                      </div>
                      <span style={{ color: playerTone(player.status), fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>{player.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 124, alignItems: "center" }}>
                      {player.hand.length > 0 ? player.hand.map((card, index) => <PlayingCard key={`${playerName}-${card.rank}${card.suit}-${index}`} card={card} index={index} />) : <div style={{ color: "var(--text-muted)" }}>No cards dealt yet.</div>}
                    </div>
                    {selectedTable.status === "results" && player.status === "done" && (
                      <div style={{ marginTop: 12, color: player.payout > 0 ? "var(--accent-green)" : "#fca5a5", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Payout: ${fmtMoney(player.payout)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {me && (
                <div style={{ marginTop: 24, padding: 18, borderRadius: 18, background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your controls</div>
                      <div style={{ color: "var(--text-secondary)" }}>Auto-bet minimum after 15s. Auto-stand after 20s.</div>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>Current bet ${fmtMoney(me.bet)}</div>
                  </div>

                  {selectedTable.status === "betting" ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input value={betInput} onChange={(e) => setBetInput(e.target.value)} type="number" min={MP_MIN_BET} step="1" style={{ width: 140, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }} />
                      <button type="button" disabled={busy} onClick={() => void handlePlaceBet()} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(240,180,41,0.45)", background: "rgba(240,180,41,0.12)", color: "var(--accent-gold)", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Place Bet</button>
                    </div>
                  ) : selectedTable.status === "playing" ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" disabled={busy || me.status !== "acting"} onClick={() => void handleAction("hit")} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--text-primary)", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Hit</button>
                      <button type="button" disabled={busy || me.status !== "acting"} onClick={() => void handleAction("stand")} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(240,180,41,0.45)", background: "rgba(240,180,41,0.12)", color: "var(--accent-gold)", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Stand</button>
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-secondary)" }}>Waiting for the table to cycle to the next betting window.</div>
                  )}
                </div>
              )}
            </div>

            <aside style={{ borderRadius: 24, padding: 20, background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 20 }}>
              <div style={{ marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Players</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Object.entries(selectedTable.players ?? {}).map(([playerName, player]) => (
                  <div key={`sidebar-${playerName}`} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 12, alignItems: "start", padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", background: playerName === username ? "rgba(240,180,41,0.18)" : "rgba(255,255,255,0.09)", color: playerName === username ? "var(--accent-gold)" : "var(--text-primary)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>{playerName.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>{playerName}</span>
                        <span style={{ color: playerTone(player.status), fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", fontSize: "0.82rem", letterSpacing: "0.08em" }}>{player.status}</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: 4 }}>Bet ${fmtMoney(player.bet)}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>Hand {player.handValue || 0} • {player.hand.length} cards</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
