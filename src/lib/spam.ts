"use client";

import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  where,
  type DocumentReference,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export const SPAM_SEARCH_TIMEOUT_MS = 15_000;
export const SPAM_ROUND_MS = 15_000;
export const SPAM_COUNTDOWN_MS = 3_000;
export const SPAM_HEARTBEAT_MS = 2_500;
const SPAM_HEARTBEAT_TIMEOUT_MS = 12_000;
const STARTING_BALANCE = 50;

type SpamPresence = "active" | "left" | "stale";
type SpamResult = "win" | "loss" | "tie" | "cancelled";
type SpamStatus = "countdown" | "live" | "settling" | "settled" | "cancelled";

interface SpamQueueDoc {
  username: string;
  usernameLower: string;
  clientId: string;
  bet: number;
  status: "waiting";
  createdAt: Timestamp;
  heartbeatAt: Timestamp;
}

export interface SpamHumanPlayer {
  kind: "human";
  username: string;
  clientId: string;
  bet: number;
  acceptedCount: number;
  rawCount: number;
  lastAcceptedAtMs: number;
  seq: number;
  finalSubmitted: boolean;
  presence: SpamPresence;
  heartbeatAt: Timestamp;
  payout: number;
  result?: SpamResult;
  balanceAfter?: number;
}

export interface SpamBotPlayer {
  kind: "bot";
  username: string;
  bet: number;
  acceptedCount: number;
  rawCount: number;
  payout: number;
  result?: SpamResult;
}

export type SpamPlayer = SpamHumanPlayer | SpamBotPlayer;

export interface SpamMatchDoc {
  game: "SPAM!";
  bet: number;
  pot: number;
  source: "pvp" | "bot";
  status: SpamStatus;
  participantIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  countdownStartedAt: Timestamp;
  roundStartedAt: Timestamp;
  roundEndsAt: Timestamp;
  players: Record<string, SpamPlayer>;
  settlement: {
    status: "pending" | "settled" | "cancelled";
    winnerKey: string | null;
    reason: "normal" | "tie" | "forfeit" | "cancelled";
    settledAt?: Timestamp;
  };
  bot?: {
    name: string;
    seed: number;
    winsTarget: boolean;
    baseCps: number;
    variance: number;
    aggression: number;
  };
}

interface UserDoc {
  username?: string;
  balance?: number;
  totalWinnings?: number;
  gamesPlayed?: number;
  activeSpamMatchId?: string;
  spamQueueBet?: number;
  spamQueueClientId?: string;
}

export interface SpamSyncState {
  balance: number;
  searching: boolean;
  queuedBet: number | null;
  matchId: string | null;
  waitStartedAtMs: number | null;
}

export interface SpamSearchState {
  state: "idle" | "searching" | "matched" | "settled";
  matchId: string | null;
  balance: number;
  waitStartedAtMs: number | null;
}

function dbRef(path: "users" | "spam_queue" | "spam_matches" | "feed", id: string) {
  return doc(getDb(), path, id);
}

function nowTs(nowMs = Date.now()) {
  return Timestamp.fromMillis(nowMs);
}

function normalizeUsername(username: string) {
  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(trimmed)) {
    throw new Error("Invalid username.");
  }
  return { username: trimmed, usernameLower: trimmed.toLowerCase() };
}

function normalizeBet(bet: number) {
  const value = Math.round(Number(bet) * 100) / 100;
  if (!Number.isFinite(value) || value < 1) {
    throw new Error("Invalid bet.");
  }
  return value;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: number, offset = 0) {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHuman(player: SpamPlayer | undefined): player is SpamHumanPlayer {
  return Boolean(player && player.kind === "human");
}

function isBot(player: SpamPlayer | undefined): player is SpamBotPlayer {
  return Boolean(player && player.kind === "bot");
}

function setUserSpamFields(
  tx: Transaction,
  usernameLower: string,
  values: { matchId?: string | null; queueBet?: number | null; queueClientId?: string | null; balance?: number }
) {
  const update: Record<string, unknown> = {};
  if (values.balance !== undefined) update.balance = values.balance;
  update.activeSpamMatchId = values.matchId ?? deleteField();
  update.spamQueueBet = values.queueBet ?? deleteField();
  update.spamQueueClientId = values.queueClientId ?? deleteField();
  tx.set(dbRef("users", usernameLower), update, { merge: true });
}

async function listCandidateQueueIds(bet: number, self: string) {
  const snap = await getDocs(query(collection(getDb(), "spam_queue"), where("bet", "==", bet), limit(12)));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() as SpamQueueDoc }))
    .filter(({ id, data }) => id !== self && data.status === "waiting")
    .sort((left, right) => left.data.createdAt.toMillis() - right.data.createdAt.toMillis())
    .map(({ id }) => id);
}

async function pickBotName(excludeLower: string) {
  const fallback = ["TurboTodd", "ChipRiot", "MouseMafia", "SpaceBaron", "Clickzilla", "NeonNudge"];
  try {
    const snap = await getDocs(query(collection(getDb(), "users"), limit(100)));
    const leaderboardNames = snap.docs
      .map((docSnap) => ({
        username: (docSnap.data() as UserDoc).username ?? docSnap.id,
        balance: typeof docSnap.data().balance === "number" ? docSnap.data().balance : 0,
      }))
      .filter((entry) => entry.username.toLowerCase() !== excludeLower)
      .sort((left, right) => right.balance - left.balance)
      .slice(0, 50)
      .map((entry) => entry.username);

    if (leaderboardNames.length > 0) {
      return leaderboardNames[Math.floor(Math.random() * leaderboardNames.length)];
    }
  } catch {
    // Fall through.
  }
  return fallback[hashString(excludeLower) % fallback.length];
}

function buildBotConfig(matchId: string, botName: string) {
  const seed = hashString(`${matchId}:${botName}`);
  return {
    name: botName,
    seed,
    winsTarget: seeded(seed, 1) < 0.65,
    baseCps: 5.6 + seeded(seed, 2) * 2.8,
    variance: 0.35 + seeded(seed, 3) * 0.9,
    aggression: 0.6 + seeded(seed, 4) * 0.9,
  };
}

function computeBotCount(match: SpamMatchDoc, nowMs: number) {
  if (!match.bot) return 0;
  const botKey = match.participantIds.find((participantId) => isBot(match.players[participantId]));
  const humanKey = match.participantIds.find((participantId) => isHuman(match.players[participantId]));
  if (!botKey || !humanKey) return 0;

  const bot = match.players[botKey] as SpamBotPlayer;
  const human = match.players[humanKey] as SpamHumanPlayer;
  const elapsedSec = clamp((nowMs - match.roundStartedAt.toMillis()) / 1000, 0, SPAM_ROUND_MS / 1000);
  const humanRate = human.acceptedCount / Math.max(1.25, elapsedSec);
  const projectedHumanFinal = clamp(
    human.acceptedCount + humanRate * Math.max(0, SPAM_ROUND_MS / 1000 - elapsedSec),
    Math.max(human.acceptedCount, 18),
    280
  );
  const margin = 4 + Math.floor(seeded(match.bot.seed, 5) * 10);
  const floorScore = match.bot.baseCps * (SPAM_ROUND_MS / 1000);
  const desiredFinal = match.bot.winsTarget
    ? clamp(Math.max(projectedHumanFinal + margin, floorScore), human.acceptedCount, 300)
    : clamp(Math.max(6, projectedHumanFinal - margin), 4, Math.max(10, projectedHumanFinal));
  const progress = 1 - Math.pow(1 - elapsedSec / (SPAM_ROUND_MS / 1000), 1.08 + match.bot.aggression * 0.22);
  const wobble =
    Math.sin(elapsedSec * (1.4 + match.bot.variance) + match.bot.seed) * (1.8 + match.bot.variance * 1.7) +
    Math.cos(elapsedSec * 0.63 + match.bot.seed * 0.004) * 0.8;
  return Math.max(bot.acceptedCount, clamp(Math.floor(desiredFinal * progress + wobble), 0, Math.round(desiredFinal)));
}

function applyBotProgress(match: SpamMatchDoc, nowMs: number): SpamMatchDoc {
  if (!match.bot || (match.status !== "live" && match.status !== "settling" && match.status !== "settled")) {
    return match;
  }

  const botKey = match.participantIds.find((participantId) => isBot(match.players[participantId]));
  if (!botKey) return match;
  const nextCount = computeBotCount(match, nowMs);
  const current = match.players[botKey] as SpamBotPlayer;
  if (nextCount === current.acceptedCount) return match;

  return {
    ...match,
    players: {
      ...match.players,
      [botKey]: {
        ...current,
        acceptedCount: nextCount,
        rawCount: Math.max(current.rawCount, nextCount),
      },
    },
  };
}

function sanitizeEvents(lastAcceptedAtMs: number, input: number[]) {
  const accepted: number[] = [];
  let previous = lastAcceptedAtMs;
  const recent: number[] = [];

  for (const raw of input.slice(0, 180).sort((left, right) => left - right)) {
    const ts = Math.round(raw);
    if (!Number.isFinite(ts) || ts < 0 || ts > SPAM_ROUND_MS + 900) continue;
    if (ts <= previous || ts - previous < 18) continue;
    while (recent.length > 0 && ts - recent[0] > 220) {
      recent.shift();
    }
    if (recent.length >= 9) continue;
    accepted.push(ts);
    recent.push(ts);
    previous = ts;
  }

  return accepted;
}

function writeFeed(tx: Transaction, matchId: string, usernameLower: string, payload: Record<string, unknown>) {
  tx.set(dbRef("feed", `spam_${matchId}_${usernameLower}`), payload, { merge: true });
}

function getOpponentKey(match: SpamMatchDoc, usernameLower: string) {
  return match.participantIds.find((participantId) => participantId !== usernameLower) ?? null;
}

function maybeSetLive(match: SpamMatchDoc, nowMs: number): SpamMatchDoc {
  if (match.status === "countdown" && nowMs >= match.roundStartedAt.toMillis()) {
    return { ...match, status: "live", updatedAt: nowTs(nowMs) };
  }
  return match;
}

async function settleMatch(tx: Transaction, matchId: string, match: SpamMatchDoc, nowMs: number) {
  if (match.settlement.status === "settled" || match.settlement.status === "cancelled") {
    return match;
  }

  const working = applyBotProgress(maybeSetLive(match, nowMs), nowMs);
  const humanKeys = working.participantIds.filter((participantId) => isHuman(working.players[participantId]));
  const staleKeys = humanKeys.filter((key) => {
    const player = working.players[key] as SpamHumanPlayer;
    return player.presence === "left" || nowMs - player.heartbeatAt.toMillis() > SPAM_HEARTBEAT_TIMEOUT_MS;
  });
  const beforeRound = nowMs < working.roundStartedAt.toMillis();
  const roundOver = nowMs >= working.roundEndsAt.toMillis();
  const everyoneFinal = humanKeys.every((key) => (working.players[key] as SpamHumanPlayer).finalSubmitted);

  let reason: SpamMatchDoc["settlement"]["reason"] | null = null;
  let winnerKey: string | null = null;

  if (staleKeys.length > 0) {
    if (beforeRound) {
      reason = "cancelled";
    } else if (staleKeys.length === humanKeys.length) {
      reason = "tie";
    } else {
      winnerKey = humanKeys.find((key) => !staleKeys.includes(key)) ?? getOpponentKey(working, staleKeys[0] ?? "");
      reason = "forfeit";
    }
  } else if (roundOver || everyoneFinal) {
    reason = "normal";
  } else {
    tx.set(dbRef("spam_matches", matchId), working, { merge: true });
    return working;
  }

  if (reason === "normal") {
    const [leftKey, rightKey] = working.participantIds;
    const leftScore = working.players[leftKey]?.acceptedCount ?? 0;
    const rightScore = working.players[rightKey]?.acceptedCount ?? 0;
    if (leftScore === rightScore) {
      reason = "tie";
    } else {
      winnerKey = leftScore > rightScore ? leftKey : rightKey;
    }
  }

  const [firstKey, secondKey] = working.participantIds;
  const updatedPlayers: Record<string, SpamPlayer> = { ...working.players };

  for (const key of humanKeys) {
    const player = updatedPlayers[key] as SpamHumanPlayer;
    const userReference = dbRef("users", key);
    const userSnap = await tx.get(userReference);
    const user = (userSnap.data() ?? {}) as UserDoc;
    const currentBalance = Math.round((user.balance ?? 0) * 100) / 100;

    let payout = 0;
    let result: SpamResult = "loss";
    if (reason === "cancelled") {
      payout = player.bet;
      result = "cancelled";
    } else if (reason === "tie") {
      payout = player.bet;
      result = "tie";
    } else if (winnerKey === key) {
      payout = working.pot;
      result = "win";
    }

    const balanceAfter = Math.round((currentBalance + payout) * 100) / 100;
    const netProfit = Math.max(0, payout - player.bet);

    tx.set(
      userReference,
      {
        balance: balanceAfter,
        totalWinnings: Math.round((user.totalWinnings ?? 0) + netProfit),
        gamesPlayed: (user.gamesPlayed ?? 0) + (reason === "cancelled" ? 0 : 1),
        activeSpamMatchId: deleteField(),
        spamQueueBet: deleteField(),
        spamQueueClientId: deleteField(),
      },
      { merge: true }
    );

    updatedPlayers[key] = {
      ...player,
      payout,
      result,
      balanceAfter,
      presence: staleKeys.includes(key) ? "stale" : player.presence,
    };

    if (reason === "cancelled") {
      writeFeed(tx, matchId, key, {
        username: player.username,
        game: "SPAM!",
        result: "hold",
        note: "SPAM! match cancelled, bet refunded",
        timestamp: nowTs(nowMs),
      });
    } else if (reason === "tie") {
      writeFeed(tx, matchId, key, {
        username: player.username,
        game: "SPAM!",
        result: "hold",
        note: `tied ${(updatedPlayers[firstKey] as SpamPlayer)?.acceptedCount ?? 0}-${(updatedPlayers[secondKey] as SpamPlayer)?.acceptedCount ?? 0} on SPAM!`,
        timestamp: nowTs(nowMs),
      });
    } else if (result === "win") {
      writeFeed(tx, matchId, key, {
        username: player.username,
        game: "SPAM!",
        amount: netProfit,
        result: "win",
        timestamp: nowTs(nowMs),
      });
    } else {
      writeFeed(tx, matchId, key, {
        username: player.username,
        game: "SPAM!",
        amount: player.bet,
        result: "loss",
        timestamp: nowTs(nowMs),
      });
    }
  }

  for (const key of working.participantIds) {
    const player = updatedPlayers[key];
    if (!isBot(player)) continue;
    updatedPlayers[key] = {
      ...player,
      payout: winnerKey === key ? working.pot : 0,
      result:
        reason === "cancelled" ? "cancelled" : reason === "tie" ? "tie" : winnerKey === key ? "win" : "loss",
    };
  }

  const settled: SpamMatchDoc = {
    ...working,
    status: reason === "cancelled" ? "cancelled" : "settled",
    updatedAt: nowTs(nowMs),
    players: updatedPlayers,
    settlement: {
      status: reason === "cancelled" ? "cancelled" : "settled",
      reason,
      winnerKey,
      settledAt: nowTs(nowMs),
    },
  };

  tx.set(dbRef("spam_matches", matchId), settled, { merge: true });
  return settled;
}

async function runSearch(username: string, bet: number, clientId: string, allowBotFallback: boolean): Promise<SpamSearchState> {
  const { usernameLower } = normalizeUsername(username);
  const normalizedBet = normalizeBet(bet);
  const candidateIds = await listCandidateQueueIds(normalizedBet, usernameLower);
  const botName = allowBotFallback ? await pickBotName(usernameLower) : null;

  return runTransaction(getDb(), async (tx) => {
    const nowMs = Date.now();
    const userReference = dbRef("users", usernameLower);
    const queueReference = dbRef("spam_queue", usernameLower);
    const userSnap = await tx.get(userReference);
    const user = (userSnap.data() ?? {}) as UserDoc;
    const currentBalance = Math.round((user.balance ?? STARTING_BALANCE) * 100) / 100;
    const queueSnap = await tx.get(queueReference);
    const existingQueue = queueSnap.exists() ? (queueSnap.data() as SpamQueueDoc) : null;

    if (typeof user.activeSpamMatchId === "string" && user.activeSpamMatchId) {
      return { state: "matched", matchId: user.activeSpamMatchId, balance: currentBalance, waitStartedAtMs: null };
    }

    let nextBalance = currentBalance;
    let shouldWriteBalance = false;
    if (!existingQueue) {
      if (currentBalance < normalizedBet) throw new Error("Not enough balance.");
      nextBalance = Math.round((currentBalance - normalizedBet) * 100) / 100;
      shouldWriteBalance = true;
    } else if (existingQueue.bet !== normalizedBet) {
      const adjusted = Math.round((currentBalance + existingQueue.bet - normalizedBet) * 100) / 100;
      if (adjusted < 0) throw new Error("Not enough balance.");
      nextBalance = adjusted;
      shouldWriteBalance = true;
    }

    let matchedCandidate: { id: string; data: SpamQueueDoc } | null = null;
    for (const candidateId of candidateIds) {
      const candidateRef = dbRef("spam_queue", candidateId);
      const candidateSnap = await tx.get(candidateRef);
      if (!candidateSnap.exists()) continue;
      const candidate = candidateSnap.data() as SpamQueueDoc;
      if (candidate.status !== "waiting" || candidate.bet !== normalizedBet) continue;
      if (nowMs - candidate.heartbeatAt.toMillis() > SPAM_HEARTBEAT_TIMEOUT_MS) continue;
      matchedCandidate = { id: candidateId, data: candidate };
      break;
    }

    if (shouldWriteBalance) {
      tx.set(userReference, { balance: nextBalance }, { merge: true });
    }

    if (matchedCandidate) {
      const { id: candidateId, data: candidate } = matchedCandidate;
      const matchReference = doc(collection(getDb(), "spam_matches"));
      const createdAt = nowTs(nowMs);
      const roundStartedAt = nowTs(nowMs + SPAM_COUNTDOWN_MS);
      const roundEndsAt = nowTs(roundStartedAt.toMillis() + SPAM_ROUND_MS);

      const match: SpamMatchDoc = {
        game: "SPAM!",
        bet: normalizedBet,
        pot: Math.round(normalizedBet * 2 * 100) / 100,
        source: "pvp",
        status: "countdown",
        participantIds: [candidateId, usernameLower],
        createdAt,
        updatedAt: createdAt,
        countdownStartedAt: createdAt,
        roundStartedAt,
        roundEndsAt,
        players: {
          [candidateId]: {
            kind: "human",
            username: candidate.username,
            clientId: candidate.clientId,
            bet: normalizedBet,
            acceptedCount: 0,
            rawCount: 0,
            lastAcceptedAtMs: 0,
            seq: 0,
            finalSubmitted: false,
            presence: "active",
            heartbeatAt: createdAt,
            payout: 0,
          },
          [usernameLower]: {
            kind: "human",
            username,
            clientId,
            bet: normalizedBet,
            acceptedCount: 0,
            rawCount: 0,
            lastAcceptedAtMs: 0,
            seq: 0,
            finalSubmitted: false,
            presence: "active",
            heartbeatAt: createdAt,
            payout: 0,
          },
        },
        settlement: {
          status: "pending",
          winnerKey: null,
          reason: "normal",
        },
      };

      tx.set(matchReference, match);
      tx.delete(queueReference);
      tx.delete(dbRef("spam_queue", candidateId));
      setUserSpamFields(tx, usernameLower, { matchId: matchReference.id, queueBet: null, queueClientId: null });
      setUserSpamFields(tx, candidateId, { matchId: matchReference.id, queueBet: null, queueClientId: null });

      return { state: "matched", matchId: matchReference.id, balance: nextBalance, waitStartedAtMs: null };
    }

    const queueCreatedAt = existingQueue?.createdAt ?? nowTs(nowMs);
    if (allowBotFallback && queueCreatedAt.toMillis() + SPAM_SEARCH_TIMEOUT_MS <= nowMs && botName) {
      const matchReference = doc(collection(getDb(), "spam_matches"));
      const bot = buildBotConfig(matchReference.id, botName);
      const createdAt = nowTs(nowMs);
      const roundStartedAt = nowTs(nowMs + SPAM_COUNTDOWN_MS);
      const roundEndsAt = nowTs(roundStartedAt.toMillis() + SPAM_ROUND_MS);

      const match: SpamMatchDoc = {
        game: "SPAM!",
        bet: normalizedBet,
        pot: Math.round(normalizedBet * 2 * 100) / 100,
        source: "bot",
        status: "countdown",
        participantIds: [usernameLower, `bot:${matchReference.id}`],
        createdAt,
        updatedAt: createdAt,
        countdownStartedAt: createdAt,
        roundStartedAt,
        roundEndsAt,
        players: {
          [usernameLower]: {
            kind: "human",
            username,
            clientId,
            bet: normalizedBet,
            acceptedCount: 0,
            rawCount: 0,
            lastAcceptedAtMs: 0,
            seq: 0,
            finalSubmitted: false,
            presence: "active",
            heartbeatAt: createdAt,
            payout: 0,
          },
          [`bot:${matchReference.id}`]: {
            kind: "bot",
            username: bot.name,
            bet: normalizedBet,
            acceptedCount: 0,
            rawCount: 0,
            payout: 0,
          },
        },
        settlement: {
          status: "pending",
          winnerKey: null,
          reason: "normal",
        },
        bot,
      };

      tx.set(matchReference, match);
      tx.delete(queueReference);
      setUserSpamFields(tx, usernameLower, { matchId: matchReference.id, queueBet: null, queueClientId: null });
      return { state: "matched", matchId: matchReference.id, balance: nextBalance, waitStartedAtMs: null };
    }

    const queueDoc: SpamQueueDoc = {
      username,
      usernameLower,
      clientId,
      bet: normalizedBet,
      status: "waiting",
      createdAt: queueCreatedAt,
      heartbeatAt: nowTs(nowMs),
    };

    tx.set(queueReference, queueDoc);
    setUserSpamFields(tx, usernameLower, {
      queueBet: normalizedBet,
      queueClientId: clientId,
      matchId: null,
    });

    return {
      state: "searching",
      matchId: null,
      balance: nextBalance,
      waitStartedAtMs: queueDoc.createdAt.toMillis(),
    };
  });
}

export function getSpamClientId() {
  if (typeof window === "undefined") return "server";
  const key = "grax_spam_client_id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `spam_${crypto.randomUUID()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export async function spamSyncState(username: string): Promise<SpamSyncState> {
  const { usernameLower } = normalizeUsername(username);
  const userSnap = await getDoc(dbRef("users", usernameLower));
  const user = (userSnap.data() ?? {}) as UserDoc;
  let waitStartedAtMs: number | null = null;

  if (typeof user.spamQueueBet === "number" && user.spamQueueBet > 0) {
    const queueSnap = await getDoc(dbRef("spam_queue", usernameLower));
    if (queueSnap.exists()) {
      const queue = queueSnap.data() as SpamQueueDoc;
      waitStartedAtMs = queue.createdAt.toMillis();
    }
  }

  return {
    balance: Math.round((user.balance ?? STARTING_BALANCE) * 100) / 100,
    searching: typeof user.spamQueueBet === "number" && user.spamQueueBet > 0,
    queuedBet: user.spamQueueBet ?? null,
    matchId: user.activeSpamMatchId ?? null,
    waitStartedAtMs,
  };
}

export async function spamFindMatch(username: string, bet: number, clientId: string) {
  return runSearch(username, bet, clientId, false);
}

export async function spamHeartbeat(username: string, clientId: string, matchId?: string | null): Promise<SpamSearchState> {
  const { usernameLower } = normalizeUsername(username);

  if (matchId) {
    return runTransaction(getDb(), async (tx) => {
      const reference = dbRef("spam_matches", matchId);
      const snap = await tx.get(reference);
      if (!snap.exists()) {
        return { state: "idle", matchId: null, balance: (await spamSyncState(username)).balance, waitStartedAtMs: null };
      }

      const nowMs = Date.now();
      let match = snap.data() as SpamMatchDoc;
      const me = match.players[usernameLower];
      if (isHuman(me)) {
        match = {
          ...match,
          updatedAt: nowTs(nowMs),
          players: {
            ...match.players,
            [usernameLower]: {
              ...me,
              clientId,
              heartbeatAt: nowTs(nowMs),
              presence: "active",
            },
          },
        };
      }

      const settled = await settleMatch(tx, matchId, match, nowMs);
      const settledMe = settled.players[usernameLower];
      return {
        state: settled.status === "settled" || settled.status === "cancelled" ? "settled" : "matched",
        matchId,
        balance: isHuman(settledMe) && typeof settledMe.balanceAfter === "number"
          ? settledMe.balanceAfter
          : (await spamSyncState(username)).balance,
        waitStartedAtMs: null,
      };
    });
  }

  const current = await spamSyncState(username);
  if (!current.searching || typeof current.queuedBet !== "number") {
    return { state: "idle", matchId: null, balance: current.balance, waitStartedAtMs: null };
  }
  return runSearch(username, current.queuedBet, clientId, true);
}

export async function spamCancel(username: string, clientId: string, matchId?: string | null): Promise<SpamSearchState> {
  const { usernameLower } = normalizeUsername(username);

  return runTransaction(getDb(), async (tx) => {
    const userReference = dbRef("users", usernameLower);
    const queueReference = dbRef("spam_queue", usernameLower);
    const userSnap = await tx.get(userReference);
    const user = (userSnap.data() ?? {}) as UserDoc;
    const balance = Math.round((user.balance ?? STARTING_BALANCE) * 100) / 100;
    const queueSnap = await tx.get(queueReference);

    if (queueSnap.exists()) {
      const queue = queueSnap.data() as SpamQueueDoc;
      if (queue.clientId === clientId) {
        tx.delete(queueReference);
        setUserSpamFields(tx, usernameLower, {
          balance: Math.round((balance + queue.bet) * 100) / 100,
          matchId: null,
          queueBet: null,
          queueClientId: null,
        });
        return {
          state: "idle",
          matchId: null,
          balance: Math.round((balance + queue.bet) * 100) / 100,
          waitStartedAtMs: null,
        };
      }
    }

    const activeMatchId = matchId ?? user.activeSpamMatchId ?? null;
    if (!activeMatchId) {
      setUserSpamFields(tx, usernameLower, { matchId: null, queueBet: null, queueClientId: null });
      return { state: "idle", matchId: null, balance, waitStartedAtMs: null };
    }

    const matchReference = dbRef("spam_matches", activeMatchId);
    const matchSnap = await tx.get(matchReference);
    if (!matchSnap.exists()) {
      setUserSpamFields(tx, usernameLower, { matchId: null, queueBet: null, queueClientId: null });
      return { state: "idle", matchId: null, balance, waitStartedAtMs: null };
    }

    const match = matchSnap.data() as SpamMatchDoc;
    const me = match.players[usernameLower];
    if (!isHuman(me)) {
      return { state: "idle", matchId: null, balance, waitStartedAtMs: null };
    }

    const nowMs = Date.now();
    const nextMatch: SpamMatchDoc = {
      ...match,
      updatedAt: nowTs(nowMs),
      players: {
        ...match.players,
        [usernameLower]: {
          ...me,
          clientId,
          presence: "left",
          heartbeatAt: nowTs(nowMs - SPAM_HEARTBEAT_TIMEOUT_MS - 10),
        },
      },
    };

    const settled = await settleMatch(tx, activeMatchId, nextMatch, nowMs);
    const settledMe = settled.players[usernameLower];
    return {
      state: "idle",
      matchId: null,
      balance: isHuman(settledMe) && typeof settledMe.balanceAfter === "number" ? settledMe.balanceAfter : balance,
      waitStartedAtMs: null,
    };
  });
}

export async function spamSubmitBurst(
  username: string,
  clientId: string,
  matchId: string,
  seq: number,
  timestamps: number[],
  final = false
) {
  const { usernameLower } = normalizeUsername(username);
  return runTransaction(getDb(), async (tx) => {
    const reference = dbRef("spam_matches", matchId);
    const snap = await tx.get(reference);
    if (!snap.exists()) throw new Error("Match not found.");

    const nowMs = Date.now();
    let match = snap.data() as SpamMatchDoc;
    const me = match.players[usernameLower];
    if (!isHuman(me)) throw new Error("Player not found.");

    if (seq <= me.seq) {
      return { acceptedCount: me.acceptedCount, state: match.status, balance: me.balanceAfter ?? null };
    }

    const accepted = sanitizeEvents(me.lastAcceptedAtMs, timestamps);
    match = {
      ...match,
      updatedAt: nowTs(nowMs),
      players: {
        ...match.players,
        [usernameLower]: {
          ...me,
          clientId,
          seq,
          finalSubmitted: final || me.finalSubmitted,
          heartbeatAt: nowTs(nowMs),
          presence: "active",
          rawCount: me.rawCount + timestamps.length,
          acceptedCount: me.acceptedCount + accepted.length,
          lastAcceptedAtMs: accepted[accepted.length - 1] ?? me.lastAcceptedAtMs,
        },
      },
    };

    const settled = await settleMatch(tx, matchId, match, nowMs);
    const settledMe = settled.players[usernameLower] as SpamHumanPlayer;
    return {
      acceptedCount: settledMe.acceptedCount,
      state: settled.status,
      balance: settledMe.balanceAfter ?? null,
    };
  });
}

export function subscribeSpamMatch(matchId: string, callback: (match: SpamMatchDoc | null) => void): Unsubscribe {
  return onSnapshot(dbRef("spam_matches", matchId), (snap) => {
    callback(snap.exists() ? (snap.data() as SpamMatchDoc) : null);
  });
}

export async function clearSpamQueueDoc(username: string) {
  const { usernameLower } = normalizeUsername(username);
  await deleteDoc(dbRef("spam_queue", usernameLower));
}

export function getSpamMatchRef(matchId: string): DocumentReference {
  return dbRef("spam_matches", matchId);
}
