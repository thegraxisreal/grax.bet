"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { emitLocalFeedPayload } from "@/lib/feed";
import {
  SPAM_HEARTBEAT_MS,
  SPAM_ROUND_MS,
  SPAM_SEARCH_TIMEOUT_MS,
  getSpamClientId,
  spamCancel,
  spamFindMatch,
  spamHeartbeat,
  spamSubmitBurst,
  spamSyncState,
  subscribeSpamMatch,
  type SpamHumanPlayer,
  type SpamMatchDoc,
  type SpamPlayer,
} from "@/lib/spam";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeBetInput(value: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return clamp(Math.floor(value), 1, Math.max(1, Math.floor(max)));
}

export default function SpamPage() {
  const { username } = useUser();
  const { balance, setBalance, registerBet, unregisterBet } = useBalance();
  const [bet, setBet] = useState(5);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchStartedAtMs, setSearchStartedAtMs] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<SpamMatchDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pendingCount, setPendingCount] = useState(0);

  const clientIdRef = useRef("");
  const pendingRef = useRef<number[]>([]);
  const seqRef = useRef(0);
  const finalSentRef = useRef(false);
  const lockRef = useRef(false);
  const appliedSettlementRef = useRef<Set<string>>(new Set());
  const searchingRef = useRef(false);
  const matchIdRef = useRef<string | null>(null);

  useEffect(() => {
    clientIdRef.current = getSpamClientId();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setBusy(true);
    setError(null);

    void spamSyncState(username)
      .then((state) => {
        if (cancelled) return;
        setBalance(state.balance);
        if (typeof state.queuedBet === "number" && state.queuedBet > 0) {
          setBet(state.queuedBet);
        }
        setSearching(state.searching && !state.matchId);
        setSearchStartedAtMs(state.waitStartedAtMs);
        setMatchId(state.matchId);
      })
      .catch((caught) => {
        if (!cancelled) setError(formatError(caught));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setBalance, username]);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      return;
    }
    return subscribeSpamMatch(matchId, (nextMatch) => {
      setMatch(nextMatch);
      if (!nextMatch) {
        setMatchId(null);
        setSearching(false);
      }
    });
  }, [matchId]);

  const usernameLower = username?.toLowerCase() ?? "";
  const me = (match?.players?.[usernameLower] as SpamHumanPlayer | undefined) ?? null;
  const opponentKey = match?.participantIds.find((participantId) => participantId !== usernameLower) ?? null;
  const opponent = (opponentKey ? match?.players?.[opponentKey] : null) as SpamPlayer | null;
  const activeLock = searching || (!!match && match.status !== "settled" && match.status !== "cancelled");

  useEffect(() => {
    searchingRef.current = searching;
  }, [searching]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    if (activeLock && !lockRef.current) {
      lockRef.current = true;
      registerBet();
      return;
    }
    if (!activeLock && lockRef.current) {
      lockRef.current = false;
      unregisterBet();
    }
  }, [activeLock, registerBet, unregisterBet]);

  useEffect(() => () => {
    if (lockRef.current) {
      lockRef.current = false;
      unregisterBet();
    }
  }, [unregisterBet]);

  useEffect(() => {
    if (!match || !me || !matchId) return;
    if ((match.status !== "settled" && match.status !== "cancelled") || appliedSettlementRef.current.has(matchId)) return;
    if (typeof me.balanceAfter !== "number") return;

    appliedSettlementRef.current.add(matchId);
    setBalance(me.balanceAfter);

    if (me.result === "win") {
      emitLocalFeedPayload({
        username: me.username,
        game: "SPAM!",
        amount: Math.max(0, me.payout - me.bet),
        result: "win",
      });
    } else if (me.result === "loss") {
      emitLocalFeedPayload({
        username: me.username,
        game: "SPAM!",
        amount: me.bet,
        result: "loss",
      });
    } else {
      emitLocalFeedPayload({
        username: me.username,
        game: "SPAM!",
        result: "hold",
        note: me.result === "cancelled" ? "SPAM! match cancelled, bet refunded" : "SPAM! tie, bet returned",
      });
    }
  }, [match, matchId, me, setBalance]);

  useEffect(() => {
    if (!username || (!searching && !matchId)) return;
    const interval = window.setInterval(() => {
      void spamHeartbeat(username, clientIdRef.current, matchId)
        .then((state) => {
          setBalance(state.balance);
          if (state.matchId) {
            setMatchId(state.matchId);
            setSearching(false);
          } else {
            setSearching(state.state === "searching");
            setSearchStartedAtMs(state.waitStartedAtMs);
          }
        })
        .catch(() => {});
    }, SPAM_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [matchId, searching, setBalance, username]);

  const flushPending = useCallback(async (final = false) => {
    if (!username || !matchId) return;
    const batch = pendingRef.current.splice(0, pendingRef.current.length);
    if (batch.length === 0 && !final) return;
    setPendingCount(0);

    const seq = seqRef.current + 1;
    seqRef.current = seq;

    try {
      const result = await spamSubmitBurst(username, clientIdRef.current, matchId, seq, batch, final);
      if (typeof result.balance === "number") {
        setBalance(result.balance);
      }
      if (final) {
        finalSentRef.current = true;
      }
    } catch {
      pendingRef.current = [...batch, ...pendingRef.current];
      setPendingCount(pendingRef.current.length);
    }
  }, [matchId, setBalance, username]);

  useEffect(() => {
    if (!match || match.status !== "live") return;
    const interval = window.setInterval(() => {
      void flushPending(false);
    }, 600);
    return () => window.clearInterval(interval);
  }, [flushPending, match]);

  useEffect(() => {
    if (!match || !me || match.status !== "live" || finalSentRef.current) return;
    if (now < match.roundEndsAt.toMillis()) return;
    void flushPending(true);
  }, [flushPending, match, me, now]);

  useEffect(() => {
    if (!match || !me || match.status !== "live") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      const elapsed = Date.now() - match.roundStartedAt.toMillis();
      pendingRef.current.push(clamp(elapsed, 0, SPAM_ROUND_MS + 500));
      setPendingCount(pendingRef.current.length);
      if (pendingRef.current.length >= 14) {
        void flushPending(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flushPending, match, me]);

  useEffect(() => {
    if (!username) return;
    const leave = () => {
      if (!searchingRef.current && !matchIdRef.current) return;
      void spamCancel(username, clientIdRef.current, matchIdRef.current).catch(() => {});
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [username]);

  useEffect(() => {
    if (!match || match.status !== "countdown") return;
    pendingRef.current = [];
    setPendingCount(0);
    seqRef.current = 0;
    finalSentRef.current = false;
  }, [match]);

  async function startSearch() {
    if (!username) return;
    setBusy(true);
    setError(null);
    try {
      const state = await spamFindMatch(username, bet, clientIdRef.current);
      setBalance(state.balance);
      setSearching(state.state === "searching");
      setSearchStartedAtMs(state.waitStartedAtMs);
      setMatchId(state.matchId);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function leaveMatch() {
    if (!username) return;
    setBusy(true);
    setError(null);
    try {
      const state = await spamCancel(username, clientIdRef.current, matchId);
      setBalance(state.balance);
      setSearching(false);
      setSearchStartedAtMs(null);
      setMatchId(null);
      setMatch(null);
      pendingRef.current = [];
      setPendingCount(0);
      seqRef.current = 0;
      finalSentRef.current = false;
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(false);
    }
  }

  function registerTap() {
    if (!match || !me || match.status !== "live") return;
    const elapsed = Date.now() - match.roundStartedAt.toMillis();
    pendingRef.current.push(clamp(elapsed, 0, SPAM_ROUND_MS + 500));
    setPendingCount(pendingRef.current.length);
    if (pendingRef.current.length >= 14) {
      void flushPending(false);
    }
  }

  const countdown = match ? clamp(Math.ceil((match.roundStartedAt.toMillis() - now) / 1000), 0, 3) : 0;
  const remaining = match ? clamp(Math.ceil((match.roundEndsAt.toMillis() - now) / 1000), 0, 15) : 15;
  const searchRemaining = searchStartedAtMs
    ? clamp(Math.ceil((searchStartedAtMs + SPAM_SEARCH_TIMEOUT_MS - now) / 1000), 0, 15)
    : 15;
  const myCount = (me?.acceptedCount ?? 0) + pendingCount;
  const theirCount = opponent?.acceptedCount ?? 0;
  const headline = searching
    ? `Searching... ${searchRemaining}s`
    : match?.status === "countdown"
      ? `Starting in ${Math.max(1, countdown)}`
      : match?.status === "live"
        ? `${remaining}s left`
        : me?.result === "win"
          ? "You won"
          : me?.result === "loss"
            ? "You lost"
            : me?.result === "cancelled"
              ? "Match cancelled"
              : me?.result === "tie"
                ? "Tie"
                : "SPAM!";

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "24px 16px 40px",
        background: "linear-gradient(180deg, #09121b 0%, #0f1923 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <section
          style={{
            borderRadius: 20,
            padding: "20px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "3rem", letterSpacing: "0.08em" }}>
            SPAM!
          </div>
          <div style={{ color: "var(--text-secondary)", marginTop: 6 }}>
            Hit `Space` or tap the big pad for 15 seconds. Higher total takes the full pot.
          </div>
        </section>

        <section
          style={{
            borderRadius: 20,
            padding: "18px 20px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "0.74rem" }}>
              Bet
            </label>
            <input
              data-spam-ignore="true"
              type="number"
              min={1}
              step={1}
              value={bet}
              onChange={(event) => setBet(sanitizeBetInput(Number(event.target.value), balance))}
              disabled={busy || searching || Boolean(matchId)}
              style={{
                width: 120,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#0b1620",
                color: "var(--text-primary)",
                padding: "10px 12px",
              }}
            />
            <button
              data-spam-ignore="true"
              className="btn-action"
              disabled={busy || searching || Boolean(matchId) || balance < 1}
              onClick={() => setBet(sanitizeBetInput(Math.floor(balance / 2), balance))}
            >
              Half
            </button>
            <button
              data-spam-ignore="true"
              className="btn-action"
              disabled={busy || searching || Boolean(matchId) || balance < 1}
              onClick={() => setBet(sanitizeBetInput(balance, balance))}
            >
              All In
            </button>
            {!searching && !matchId ? (
              <button className="btn-primary" disabled={busy || !username || bet > balance} onClick={() => void startSearch()}>
                Find Match
              </button>
            ) : (
              <button className="btn-action" disabled={busy} onClick={() => void leaveMatch()}>
                Leave
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "var(--text-secondary)" }}>
            <div>Balance: <span style={{ color: "var(--text-primary)" }}>{formatMoney(balance)}</span></div>
            <div>Pot: <span style={{ color: "var(--text-primary)" }}>{formatMoney((match?.pot ?? bet * 2) || 0)}</span></div>
            <div>Status: <span style={{ color: "var(--text-primary)" }}>{headline}</span></div>
          </div>

          {error && (
            <div style={{ color: "#fca5a5", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, padding: "10px 12px" }}>
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ borderRadius: 18, padding: "18px", background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.18)" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              You
            </div>
            <div style={{ fontSize: "1.3rem", marginTop: 4 }}>{username ?? "Guest"}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "4rem", lineHeight: 1, marginTop: 8 }}>
              {myCount}
            </div>
          </div>

          <div style={{ borderRadius: 18, padding: "18px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Opponent
            </div>
            <div style={{ fontSize: "1.3rem", marginTop: 4 }}>
              {opponent?.username ?? "Waiting..."}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "4rem", lineHeight: 1, marginTop: 8 }}>
              {theirCount}
            </div>
          </div>
        </section>

        <button
          type="button"
          onPointerDown={registerTap}
          disabled={!match || match.status !== "live"}
          style={{
            borderRadius: 24,
            minHeight: 260,
            border: "1px solid rgba(255,255,255,0.08)",
            background: match?.status === "live" ? "linear-gradient(180deg, #1d4f3a 0%, #123123 100%)" : "linear-gradient(180deg, #12202c 0%, #0c1520 100%)",
            color: "var(--text-primary)",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(2rem, 8vw, 4rem)",
            letterSpacing: "0.08em",
            cursor: match?.status === "live" ? "pointer" : "default",
            boxShadow: match?.status === "live" ? "0 0 36px rgba(0,230,118,0.12)" : "none",
          }}
        >
          {match?.status === "live" ? "TAP HERE OR HIT SPACE" : "WAITING"}
        </button>

        <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.7 }}>
          Searching, matching, countdowns, scores, and settlement all run through Firebase document transactions.
        </div>
      </div>

      {match?.status === "countdown" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(6,12,18,0.92)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: 520,
            }}
          >
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "clamp(2.8rem, 10vw, 5rem)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-primary)",
              }}
            >
              Player Found!
            </div>
            <div
              style={{
                marginTop: 18,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "clamp(5rem, 18vw, 9rem)",
                lineHeight: 1,
                color: "var(--accent-green)",
                textShadow: "0 0 28px rgba(0,230,118,0.2)",
              }}
            >
              {Math.max(1, countdown)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
