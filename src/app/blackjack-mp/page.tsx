"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { CasinoChip } from "@/components/CasinoChip";
import CollapsibleBetSelector from "@/components/CollapsibleBetSelector";
import PlayingCard from "@/components/PlayingCard";
import { fmtMoney } from "@/lib/format";
import {
  MP_ACTING_MS,
  MP_BETTING_MS,
  MP_MAX_SEATS,
  MP_MIN_BET,
  MP_RESULTS_MS,
  autoBetOrRemove,
  clearTable,
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
  const [betInput, setBetInput] = useState<number>(MP_MIN_BET);
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

    let didLeave = false;
    const leave = () => {
      if (didLeave) return;
      didLeave = true;
    const leave = () => {
      void leaveTable(selectedTableId, username);
    };

    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      leave();
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
      if (selectedTable.activePlayer === username && player?.status === "acting" && elapsed >= MP_ACTING_MS) {
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

  const handleAddBet = useCallback((amount: number) => {
    setBetInput((current) => Math.max(MP_MIN_BET, Math.round((current + amount) * 100) / 100));
  }, []);

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

  const handleClearTable = useCallback(async () => {
    if (!selectedTableId) return;
    setBusy(true);
    setError(null);
    try {
      await clearTable(selectedTableId);
      setSelectedTableId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear table.");
    } finally {
      setBusy(false);
    }
  }, [selectedTableId]);

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
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "72vh" }}>
              <div className="bj-felt-table" style={{
                flex: 1,
                borderRadius: "160px 160px 0 0",
                background: "radial-gradient(ellipse at 50% 20%, #236b3b 0%, #1a5230 40%, #0e3b1c 100%)",
                border: "2px solid rgba(240,180,41,0.3)",
                borderBottom: "none",
                boxShadow: "0 0 60px rgba(0,0,0,0.8) inset, 0 0 30px rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 56, right: 24, display: "flex", gap: 8, zIndex: 8 }}>
                  {tableTimer && <div style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(240,180,41,0.15)", color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>{selectedTable.status === "playing" ? `Turn ${tableTimer}` : tableTimer}</div>}
                  <button type="button" onClick={() => void handleLeave()} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fecaca", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Leave</button>
                </div>

                <div style={{ paddingTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    Dealer {selectedTable.dealer.handValue ? `• ${selectedTable.dealer.faceDown ? "?" : selectedTable.dealer.handValue}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", minHeight: 120 }}>
                    {selectedTable.dealer.hand.length === 0 ? [0, 1].map((i) => (
                      <div key={i} style={{ width: 80, height: 120, borderRadius: 8, border: "2px dashed rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.15)" }} />
                    )) : selectedTable.dealer.hand.map((card, index) => (
                      <PlayingCard key={`${card.rank}${card.suit}${index}`} card={card} index={index} faceDown={selectedTable.dealer.faceDown && index === 1} />
                    ))}
                  </div>
                </div>

                <div style={{ margin: "12px 60px", height: 1, background: "linear-gradient(90deg, transparent, rgba(240,180,41,0.2), transparent)" }} />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, padding: "0 16px 16px" }}>
                  {Object.entries(selectedTable.players ?? {}).map(([playerName, player]) => (
                    <div key={playerName} style={{ borderRadius: 12, border: playerName === username ? "2px solid rgba(240,180,41,0.4)" : "1px solid rgba(255,255,255,0.1)", background: playerName === username ? "rgba(240,180,41,0.08)" : "rgba(0,0,0,0.2)", padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>{playerName}</div>
                        <div style={{ color: playerTone(player.status), fontSize: "0.85rem", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>{selectedTable.activePlayer === playerName && selectedTable.status === "playing" ? "acting" : player.status}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, minHeight: 96, flexWrap: "wrap" }}>
                        {player.hand.length === 0 ? [0, 1].map((i) => (
                          <div key={i} style={{ width: 64, height: 96, borderRadius: 8, border: "2px dashed rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.15)" }} />
                        )) : player.hand.map((card, index) => (
                          <PlayingCard key={`${playerName}-${card.rank}${card.suit}-${index}`} card={card} index={index} />
                        ))}
                      </div>
                      <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Bet ${fmtMoney(player.bet)} • {player.handValue || 0}
                        {selectedTable.status === "results" && player.status === "done" ? ` • Payout $${fmtMoney(player.payout)}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {me && (
                <div className="bj-controls" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedTable.status === "betting" ? (
                    <>
                      <CollapsibleBetSelector>
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                          {[1, 5, 10, 25].map((value) => (
                            <CasinoChip key={value} value={value} onClick={handleAddBet} disabled={value > balance} />
                          ))}
                        </div>
                      </CollapsibleBetSelector>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em" }}>$</span>
                          <input type="number" min={MP_MIN_BET} step="1" value={betInput || ""} onChange={(e) => setBetInput(Math.max(MP_MIN_BET, Number(e.target.value) || MP_MIN_BET))} style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", width: 60 }} />
                        </div>
                        <button type="button" className="btn-primary" disabled={busy || betInput > balance} onClick={() => void handlePlaceBet()} style={{ minWidth: 130 }}>PLACE BET</button>
                      </div>
                    </>
                  ) : selectedTable.status === "playing" ? (
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                      <button type="button" className="btn-action" disabled={busy || me.status !== "acting" || selectedTable.activePlayer !== username} onClick={() => void handleAction("hit")} style={{ minWidth: 100 }}>HIT</button>
                      <button type="button" className="btn-primary" disabled={busy || me.status !== "acting" || selectedTable.activePlayer !== username} onClick={() => void handleAction("stand")} style={{ minWidth: 100 }}>STAND</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--text-secondary)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Waiting for next betting window...
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside style={{ borderRadius: 24, padding: 20, background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 20 }}>
              <div style={{ marginBottom: 10, color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "1.1rem" }}>
                Table {selectedTable.tableNum} • {selectedTable.status}
              </div>
              {selectedTable.status === "playing" && selectedTable.activePlayer && (
                <div style={{ marginBottom: 12, color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Turn: {selectedTable.activePlayer}
                </div>
              )}
              <div style={{ marginBottom: 16, color: "var(--text-secondary)" }}>{seatedCount(selectedTable)} / {MP_MAX_SEATS} players seated</div>
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
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
                <button
                  type="button"
                  onClick={() => void handleClearTable()}
                  disabled={busy}
                  title="Emergency reset for stuck users"
                  style={{
                    border: "1px dashed rgba(248,113,113,0.45)",
                    background: "rgba(248,113,113,0.08)",
                    color: "#fca5a5",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    opacity: 0.85,
                  }}
                >
                  Clear Table
                </button>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
