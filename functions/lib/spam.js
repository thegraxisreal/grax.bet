"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepSpamMatches = exports.spamSyncState = exports.spamSubmitBurst = exports.spamCancel = exports.spamHeartbeat = exports.spamFindMatch = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;
const SPAM_GAME = "SPAM!";
const SEARCH_TIMEOUT_MS = 15000;
const COUNTDOWN_MS = 3000;
const ROUND_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 12000;
const MAX_BURST_EVENTS = 180;
const MIN_EVENT_GAP_MS = 18;
const BURST_WINDOW_MS = 220;
const BURST_WINDOW_LIMIT = 9;
function normalizeUsername(username) {
    if (typeof username !== "string")
        throw new functions.https.HttpsError("invalid-argument", "Username is required.");
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(trimmed)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid username.");
    }
    return { username: trimmed, usernameLower: trimmed.toLowerCase() };
}
function normalizeBet(bet) {
    const parsed = Number(bet);
    if (!Number.isFinite(parsed) || parsed < 1) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid bet.");
    }
    return Math.round(parsed * 100) / 100;
}
function normalizeClientId(clientId) {
    if (typeof clientId !== "string" || clientId.trim().length < 8) {
        throw new functions.https.HttpsError("invalid-argument", "Missing client id.");
    }
    return clientId.trim().slice(0, 64);
}
function queueRef(usernameLower) {
    return db.collection("spam_queue").doc(usernameLower);
}
function matchRef(matchId) {
    return db.collection("spam_matches").doc(matchId);
}
function userRef(usernameLower) {
    return db.collection("users").doc(usernameLower);
}
function nowTs(nowMs = Date.now()) {
    return Timestamp.fromMillis(nowMs);
}
function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function seeded(seed, offset = 0) {
    const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
    return value - Math.floor(value);
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function isHumanPlayer(player) {
    return Boolean(player && player.kind === "human");
}
function isBotPlayer(player) {
    return Boolean(player && player.kind === "bot");
}
function getHumanKeys(match) {
    return Object.entries(match.players)
        .filter(([, player]) => player.kind === "human")
        .map(([key]) => key);
}
function getOpponentKey(match, usernameLower) {
    return match.participantIds.find((key) => key !== usernameLower) ?? null;
}
async function pickBotName(excludeLower) {
    const fallbacks = [
        "TurboTodd",
        "ChipRiot",
        "MouseMafia",
        "SpaceBaron",
        "Clickzilla",
        "NeonNudge",
        "HotStreak77",
        "FrenzyFred",
    ];
    try {
        const snap = await db.collection("users").orderBy("totalWinnings", "desc").limit(25).get();
        const names = snap.docs
            .map((doc) => doc.data().username)
            .filter((name) => typeof name === "string" && name.trim().length > 0)
            .filter((name) => name.toLowerCase() !== excludeLower);
        if (names.length > 0) {
            const idx = hashString(`${excludeLower}:${names.length}`) % names.length;
            return names[idx];
        }
    }
    catch {
        // Fallback below.
    }
    const idx = hashString(excludeLower) % fallbacks.length;
    return fallbacks[idx];
}
function buildBotConfig(matchId, botName) {
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
function computeBotCount(match, nowMs) {
    if (!match.bot)
        return 0;
    const botKey = match.participantIds.find((id) => isBotPlayer(match.players[id]));
    const humanKey = match.participantIds.find((id) => isHumanPlayer(match.players[id]));
    if (!botKey || !humanKey)
        return 0;
    const bot = match.players[botKey];
    const human = match.players[humanKey];
    const roundStartMs = match.roundStartedAt.toMillis();
    const elapsedSec = clamp((nowMs - roundStartMs) / 1000, 0, ROUND_MS / 1000);
    const humanRate = human.acceptedCount / Math.max(1.25, elapsedSec);
    const projectedHumanFinal = clamp(human.acceptedCount + humanRate * Math.max(0, ROUND_MS / 1000 - elapsedSec), Math.max(human.acceptedCount, 18), 280);
    const margin = 4 + Math.floor(seeded(match.bot.seed, 5) * 10);
    const skillFloor = match.bot.baseCps * (ROUND_MS / 1000);
    const desiredFinal = match.bot.winsTarget
        ? clamp(Math.max(projectedHumanFinal + margin, skillFloor), human.acceptedCount, 300)
        : clamp(Math.max(6, projectedHumanFinal - margin), 4, Math.max(10, projectedHumanFinal));
    const progress = 1 - Math.pow(1 - elapsedSec / (ROUND_MS / 1000), 1.08 + match.bot.aggression * 0.22);
    const wobble = Math.sin(elapsedSec * (1.4 + match.bot.variance) + match.bot.seed) * (1.8 + match.bot.variance * 1.7) +
        Math.cos(elapsedSec * 0.63 + match.bot.seed * 0.004) * 0.8;
    return Math.max(bot.acceptedCount, clamp(Math.floor(desiredFinal * progress + wobble), 0, Math.round(desiredFinal)));
}
function applyBotProgress(match, nowMs) {
    if (!match.bot || (match.status !== "live" && match.status !== "settling" && match.status !== "settled")) {
        return match;
    }
    const botKey = match.participantIds.find((id) => isBotPlayer(match.players[id]));
    if (!botKey)
        return match;
    const nextCount = computeBotCount(match, nowMs);
    const current = match.players[botKey];
    if (nextCount === current.acceptedCount)
        return match;
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
function sanitizeEvents(lastAcceptedAtMs, input) {
    if (!Array.isArray(input)) {
        throw new functions.https.HttpsError("invalid-argument", "Event payload must be an array.");
    }
    const sorted = input
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.round(value))
        .filter((value) => value >= 0 && value <= ROUND_MS + 900)
        .sort((a, b) => a - b)
        .slice(0, MAX_BURST_EVENTS);
    const accepted = [];
    let previous = lastAcceptedAtMs;
    const recent = [];
    for (const ts of sorted) {
        if (ts <= previous)
            continue;
        if (ts - previous < MIN_EVENT_GAP_MS)
            continue;
        while (recent.length > 0 && ts - recent[0] > BURST_WINDOW_MS) {
            recent.shift();
        }
        if (recent.length >= BURST_WINDOW_LIMIT)
            continue;
        accepted.push(ts);
        recent.push(ts);
        previous = ts;
    }
    return accepted;
}
async function getUserBalance(usernameLower) {
    const snap = await userRef(usernameLower).get();
    if (!snap.exists)
        return 0;
    const user = snap.data();
    return Math.round((user.balance ?? 0) * 100) / 100;
}
function setUserQueueFields(tx, usernameLower, bet, clientId, matchId) {
    const update = {
        spamQueueBet: bet ?? FieldValue.delete(),
        spamQueueClientId: clientId ?? FieldValue.delete(),
        activeSpamMatchId: matchId ?? FieldValue.delete(),
    };
    tx.set(userRef(usernameLower), update, { merge: true });
}
function writeFeedEntry(tx, matchId, usernameLower, payload) {
    tx.set(db.collection("feed").doc(`spam_${matchId}_${usernameLower}`), payload, { merge: true });
}
async function settleMatch(tx, matchId, match, nowMs) {
    if (match.settlement.status === "settled" || match.settlement.status === "cancelled") {
        return match;
    }
    let working = applyBotProgress(match, nowMs);
    const humanKeys = getHumanKeys(working);
    const humanPlayers = humanKeys
        .map((key) => ({ key, player: working.players[key] }))
        .filter(({ player }) => player.kind === "human");
    const staleHumans = humanPlayers.filter(({ player }) => nowMs - player.heartbeatAt.toMillis() > HEARTBEAT_TIMEOUT_MS || player.presence === "left");
    const beforeRound = nowMs < working.roundStartedAt.toMillis();
    const roundOver = nowMs >= working.roundEndsAt.toMillis();
    const allHumansFinal = humanPlayers.every(({ player }) => player.finalSubmitted);
    let reason = null;
    let winnerKey = null;
    if (staleHumans.length > 0) {
        if (beforeRound) {
            reason = "cancelled";
        }
        else if (humanPlayers.length === 1) {
            winnerKey = getOpponentKey(working, humanPlayers[0].key);
            reason = "forfeit";
        }
        else if (staleHumans.length === humanPlayers.length) {
            reason = "tie";
        }
        else {
            winnerKey = humanPlayers.find(({ key }) => !staleHumans.some((stale) => stale.key === key))?.key ?? null;
            reason = "forfeit";
        }
    }
    else if (roundOver || allHumansFinal) {
        reason = "normal";
    }
    else {
        working = {
            ...working,
            status: nowMs >= working.roundEndsAt.toMillis() ? "settling" : working.status,
            updatedAt: nowTs(nowMs),
        };
        tx.set(matchRef(matchId), working, { merge: true });
        return working;
    }
    const updatedPlayers = { ...working.players };
    const settledAt = nowTs(nowMs);
    const [firstParticipantKey, secondParticipantKey] = working.participantIds;
    if (reason === "normal") {
        const [firstKey, secondKey] = working.participantIds;
        const first = updatedPlayers[firstKey];
        const second = updatedPlayers[secondKey];
        const firstCount = first.acceptedCount;
        const secondCount = second.acceptedCount;
        if (firstCount === secondCount) {
            reason = "tie";
        }
        else {
            winnerKey = firstCount > secondCount ? firstKey : secondKey;
        }
    }
    for (const key of Object.keys(updatedPlayers)) {
        const player = updatedPlayers[key];
        if (player.kind === "bot") {
            updatedPlayers[key] = {
                ...player,
                payout: winnerKey === key ? working.pot : 0,
                result: reason === "cancelled"
                    ? "cancelled"
                    : reason === "tie"
                        ? "tie"
                        : winnerKey === key
                            ? "win"
                            : "loss",
            };
            continue;
        }
        let payout = 0;
        let result = "loss";
        if (reason === "cancelled") {
            payout = player.bet;
            result = "cancelled";
        }
        else if (reason === "tie") {
            payout = player.bet;
            result = "tie";
        }
        else if (winnerKey === key) {
            payout = working.pot;
            result = "win";
        }
        else {
            payout = 0;
            result = "loss";
        }
        const userReference = userRef(key);
        const userSnap = await tx.get(userReference);
        const user = (userSnap.data() ?? {});
        const currentBalance = Math.round((user.balance ?? 0) * 100) / 100;
        const balanceAfter = Math.round((currentBalance + payout) * 100) / 100;
        const netProfit = Math.max(0, payout - player.bet);
        tx.set(userReference, {
            balance: balanceAfter,
            totalWinnings: FieldValue.increment(netProfit),
            gamesPlayed: FieldValue.increment(reason === "cancelled" ? 0 : 1),
            activeSpamMatchId: FieldValue.delete(),
            spamQueueBet: FieldValue.delete(),
            spamQueueClientId: FieldValue.delete(),
        }, { merge: true });
        updatedPlayers[key] = {
            ...player,
            payout,
            result,
            balanceAfter,
            presence: staleHumans.some((stale) => stale.key === key) ? "stale" : player.presence,
        };
        if (reason === "tie") {
            writeFeedEntry(tx, matchId, key, {
                username: player.username,
                game: SPAM_GAME,
                result: "hold",
                note: `tied ${updatedPlayers[firstParticipantKey]?.acceptedCount ?? 0}-${updatedPlayers[secondParticipantKey]?.acceptedCount ?? 0} on ${SPAM_GAME}`,
                timestamp: settledAt,
            });
        }
        else if (reason === "cancelled") {
            writeFeedEntry(tx, matchId, key, {
                username: player.username,
                game: SPAM_GAME,
                result: "hold",
                note: `${SPAM_GAME} match cancelled, bet refunded`,
                timestamp: settledAt,
            });
        }
        else if (result === "win") {
            writeFeedEntry(tx, matchId, key, {
                username: player.username,
                game: SPAM_GAME,
                amount: netProfit,
                result: "win",
                timestamp: settledAt,
            });
        }
        else {
            writeFeedEntry(tx, matchId, key, {
                username: player.username,
                game: SPAM_GAME,
                amount: player.bet,
                result: "loss",
                timestamp: settledAt,
            });
        }
    }
    const nextStatus = reason === "cancelled" ? "cancelled" : "settled";
    const settled = {
        ...working,
        status: nextStatus,
        updatedAt: settledAt,
        players: updatedPlayers,
        settlement: {
            status: nextStatus === "cancelled" ? "cancelled" : "settled",
            winnerKey,
            reason,
            settledAt,
        },
    };
    tx.set(matchRef(matchId), settled, { merge: true });
    return settled;
}
async function findOrCreateMatch(username, usernameLower, clientId, bet, allowBotFallback) {
    const userBalance = await getUserBalance(usernameLower);
    const nowMs = Date.now();
    const botCandidate = allowBotFallback ? await pickBotName(usernameLower) : null;
    return db.runTransaction(async (tx) => {
        const userReference = userRef(usernameLower);
        const queueReference = queueRef(usernameLower);
        const userSnap = await tx.get(userReference);
        if (!userSnap.exists) {
            throw new functions.https.HttpsError("failed-precondition", "User not found.");
        }
        const user = userSnap.data();
        const currentBalance = Math.round((user.balance ?? userBalance ?? 0) * 100) / 100;
        const existingQueueSnap = await tx.get(queueReference);
        const existingQueue = existingQueueSnap.exists ? existingQueueSnap.data() : null;
        if (typeof user.activeSpamMatchId === "string" && user.activeSpamMatchId) {
            return {
                state: "matched",
                matchId: user.activeSpamMatchId,
                balance: currentBalance,
                waitStartedAtMs: null,
            };
        }
        let nextBalance = currentBalance;
        if (!existingQueue) {
            if (currentBalance < bet) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient balance.");
            }
            nextBalance = Math.round((currentBalance - bet) * 100) / 100;
            tx.set(userReference, { balance: nextBalance }, { merge: true });
        }
        else if (existingQueue.bet !== bet) {
            const adjusted = Math.round((currentBalance + existingQueue.bet - bet) * 100) / 100;
            if (adjusted < 0) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient balance.");
            }
            nextBalance = adjusted;
            tx.set(userReference, { balance: nextBalance }, { merge: true });
        }
        const waitingSnap = await tx.get(db.collection("spam_queue").where("status", "==", "waiting").limit(20));
        const candidates = waitingSnap.docs
            .map((doc) => ({ id: doc.id, data: doc.data() }))
            .filter(({ id, data }) => id !== usernameLower && data.bet === bet)
            .filter(({ data }) => nowMs - data.heartbeatAt.toMillis() <= HEARTBEAT_TIMEOUT_MS)
            .sort((a, b) => a.data.createdAt.toMillis() - b.data.createdAt.toMillis());
        const matched = candidates[0];
        if (matched) {
            const createdAt = nowTs(nowMs);
            const roundStartedAt = nowTs(nowMs + COUNTDOWN_MS);
            const roundEndsAt = nowTs(nowMs + COUNTDOWN_MS + ROUND_MS);
            const matchId = db.collection("spam_matches").doc().id;
            const match = {
                game: SPAM_GAME,
                bet,
                pot: Math.round(bet * 2 * 100) / 100,
                source: "pvp",
                status: "countdown",
                participantIds: [matched.id, usernameLower],
                createdAt,
                updatedAt: createdAt,
                countdownStartedAt: createdAt,
                roundStartedAt,
                roundEndsAt,
                players: {
                    [matched.id]: {
                        kind: "human",
                        username: matched.data.username,
                        clientId: matched.data.clientId,
                        bet,
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
                        bet,
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
            tx.set(matchRef(matchId), match);
            tx.delete(queueReference);
            tx.delete(queueRef(matched.id));
            setUserQueueFields(tx, usernameLower, undefined, undefined, matchId);
            setUserQueueFields(tx, matched.id, undefined, undefined, matchId);
            return {
                state: "matched",
                matchId,
                balance: nextBalance,
                waitStartedAtMs: null,
            };
        }
        const queueDoc = {
            username,
            usernameLower,
            clientId,
            bet,
            status: "waiting",
            createdAt: existingQueue?.createdAt ?? nowTs(nowMs),
            heartbeatAt: nowTs(nowMs),
        };
        if (allowBotFallback && queueDoc.createdAt.toMillis() + SEARCH_TIMEOUT_MS <= nowMs && botCandidate) {
            const matchId = db.collection("spam_matches").doc().id;
            const botConfig = buildBotConfig(matchId, botCandidate);
            const createdAt = nowTs(nowMs);
            const roundStartedAt = nowTs(nowMs + COUNTDOWN_MS);
            const roundEndsAt = nowTs(nowMs + COUNTDOWN_MS + ROUND_MS);
            const match = {
                game: SPAM_GAME,
                bet,
                pot: Math.round(bet * 2 * 100) / 100,
                source: "bot",
                status: "countdown",
                participantIds: [usernameLower, `bot:${matchId}`],
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
                        bet,
                        acceptedCount: 0,
                        rawCount: 0,
                        lastAcceptedAtMs: 0,
                        seq: 0,
                        finalSubmitted: false,
                        presence: "active",
                        heartbeatAt: createdAt,
                        payout: 0,
                    },
                    [`bot:${matchId}`]: {
                        kind: "bot",
                        username: botConfig.name,
                        bet,
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
                bot: botConfig,
            };
            tx.set(matchRef(matchId), match);
            tx.delete(queueReference);
            setUserQueueFields(tx, usernameLower, undefined, undefined, matchId);
            return {
                state: "matched",
                matchId,
                balance: nextBalance,
                waitStartedAtMs: null,
            };
        }
        tx.set(queueReference, queueDoc);
        setUserQueueFields(tx, usernameLower, bet, clientId, null);
        return {
            state: "searching",
            matchId: null,
            balance: nextBalance,
            waitStartedAtMs: queueDoc.createdAt.toMillis(),
        };
    });
}
exports.spamFindMatch = functions.https.onCall(async (data) => {
    const { username, usernameLower } = normalizeUsername(data?.username);
    const bet = normalizeBet(data?.bet);
    const clientId = normalizeClientId(data?.clientId);
    return findOrCreateMatch(username, usernameLower, clientId, bet, false);
});
exports.spamHeartbeat = functions.https.onCall(async (data) => {
    const { username, usernameLower } = normalizeUsername(data?.username);
    const clientId = normalizeClientId(data?.clientId);
    const matchId = typeof data?.matchId === "string" ? data.matchId : null;
    if (matchId) {
        return db.runTransaction(async (tx) => {
            const matchReference = matchRef(matchId);
            const matchSnap = await tx.get(matchReference);
            if (!matchSnap.exists) {
                return { state: "idle", matchId: null, balance: await getUserBalance(usernameLower) };
            }
            let match = matchSnap.data();
            const me = match.players[usernameLower];
            if (!isHumanPlayer(me)) {
                return { state: "idle", matchId: null, balance: await getUserBalance(usernameLower) };
            }
            const nowMs = Date.now();
            match = {
                ...match,
                status: match.status === "countdown" && nowMs >= match.roundStartedAt.toMillis()
                    ? "live"
                    : match.status,
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
            const settled = await settleMatch(tx, matchId, match, nowMs);
            return {
                state: settled.status === "settled" || settled.status === "cancelled" ? "settled" : "matched",
                matchId,
                balance: await getUserBalance(usernameLower),
            };
        });
    }
    const userSnap = await userRef(usernameLower).get();
    const user = userSnap.exists ? userSnap.data() : null;
    const bet = user?.spamQueueBet ?? 0;
    if (!bet) {
        return { state: "idle", matchId: null, balance: Math.round((user?.balance ?? 0) * 100) / 100 };
    }
    return findOrCreateMatch(username, usernameLower, clientId, bet, true);
});
exports.spamCancel = functions.https.onCall(async (data) => {
    const { usernameLower } = normalizeUsername(data?.username);
    const clientId = normalizeClientId(data?.clientId);
    const matchId = typeof data?.matchId === "string" ? data.matchId : null;
    return db.runTransaction(async (tx) => {
        const userReference = userRef(usernameLower);
        const userSnap = await tx.get(userReference);
        const user = (userSnap.data() ?? {});
        const queueReference = queueRef(usernameLower);
        const queueSnap = await tx.get(queueReference);
        const balance = Math.round((user.balance ?? 0) * 100) / 100;
        if (queueSnap.exists) {
            const queue = queueSnap.data();
            if (queue.clientId === clientId) {
                tx.delete(queueReference);
                tx.set(userReference, { balance: Math.round((balance + queue.bet) * 100) / 100 }, { merge: true });
                setUserQueueFields(tx, usernameLower, undefined, undefined, null);
                return { state: "idle", matchId: null, balance: Math.round((balance + queue.bet) * 100) / 100 };
            }
        }
        const activeMatchId = matchId ?? user.activeSpamMatchId ?? null;
        if (!activeMatchId) {
            setUserQueueFields(tx, usernameLower, undefined, undefined, null);
            return { state: "idle", matchId: null, balance };
        }
        const matchReference = matchRef(activeMatchId);
        const matchSnap = await tx.get(matchReference);
        if (!matchSnap.exists) {
            setUserQueueFields(tx, usernameLower, undefined, undefined, null);
            return { state: "idle", matchId: null, balance };
        }
        const nowMs = Date.now();
        const match = matchSnap.data();
        const me = match.players[usernameLower];
        if (!isHumanPlayer(me)) {
            return { state: "idle", matchId: null, balance };
        }
        const marked = {
            ...match,
            updatedAt: nowTs(nowMs),
            players: {
                ...match.players,
                [usernameLower]: {
                    ...me,
                    heartbeatAt: nowTs(nowMs - HEARTBEAT_TIMEOUT_MS - 1),
                    presence: "left",
                    clientId,
                },
            },
        };
        await settleMatch(tx, activeMatchId, marked, nowMs);
        return { state: "idle", matchId: null, balance: await getUserBalance(usernameLower) };
    });
});
exports.spamSubmitBurst = functions.https.onCall(async (data) => {
    const { usernameLower } = normalizeUsername(data?.username);
    const clientId = normalizeClientId(data?.clientId);
    const matchId = typeof data?.matchId === "string" ? data.matchId : "";
    const seq = Number(data?.seq);
    const final = Boolean(data?.final);
    if (!matchId || !Number.isInteger(seq) || seq < 1) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid submit payload.");
    }
    return db.runTransaction(async (tx) => {
        const reference = matchRef(matchId);
        const snap = await tx.get(reference);
        if (!snap.exists) {
            throw new functions.https.HttpsError("not-found", "Match not found.");
        }
        let match = snap.data();
        const me = match.players[usernameLower];
        if (!isHumanPlayer(me)) {
            throw new functions.https.HttpsError("failed-precondition", "Player is not in this match.");
        }
        const nowMs = Date.now();
        if (match.status === "countdown" && nowMs >= match.roundStartedAt.toMillis()) {
            match = { ...match, status: "live" };
        }
        if (match.status !== "live" && match.status !== "settling" && match.status !== "countdown") {
            const settled = await settleMatch(tx, matchId, match, nowMs);
            return { acceptedCount: settled.players[usernameLower].acceptedCount, state: settled.status };
        }
        if (seq <= me.seq) {
            return { acceptedCount: me.acceptedCount, state: match.status };
        }
        const acceptedEvents = sanitizeEvents(me.lastAcceptedAtMs, data?.timestamps);
        const nextPlayer = {
            ...me,
            clientId,
            seq,
            finalSubmitted: final || me.finalSubmitted,
            heartbeatAt: nowTs(nowMs),
            presence: "active",
            rawCount: me.rawCount + (Array.isArray(data?.timestamps) ? Math.min(data.timestamps.length, MAX_BURST_EVENTS) : 0),
            acceptedCount: me.acceptedCount + acceptedEvents.length,
            lastAcceptedAtMs: acceptedEvents[acceptedEvents.length - 1] ?? me.lastAcceptedAtMs,
        };
        match = {
            ...match,
            updatedAt: nowTs(nowMs),
            players: {
                ...match.players,
                [usernameLower]: nextPlayer,
            },
        };
        match = applyBotProgress(match, nowMs);
        const settled = await settleMatch(tx, matchId, match, nowMs);
        const settledMe = settled.players[usernameLower];
        return {
            acceptedCount: settledMe.acceptedCount,
            state: settled.status,
            balance: settledMe.balanceAfter ?? null,
        };
    });
});
exports.spamSyncState = functions.https.onCall(async (data) => {
    const { usernameLower } = normalizeUsername(data?.username);
    const snap = await userRef(usernameLower).get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "User not found.");
    }
    const user = snap.data();
    return {
        balance: Math.round((user.balance ?? 0) * 100) / 100,
        searching: typeof user.spamQueueBet === "number" && user.spamQueueBet > 0,
        queuedBet: user.spamQueueBet ?? null,
        matchId: user.activeSpamMatchId ?? null,
    };
});
exports.sweepSpamMatches = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
    const nowMs = Date.now();
    const queueSnap = await db.collection("spam_queue").where("status", "==", "waiting").limit(50).get();
    for (const doc of queueSnap.docs) {
        const queue = doc.data();
        if (nowMs - queue.heartbeatAt.toMillis() <= HEARTBEAT_TIMEOUT_MS * 2)
            continue;
        await db.runTransaction(async (tx) => {
            const queueReference = queueRef(queue.usernameLower);
            const queueFresh = await tx.get(queueReference);
            if (!queueFresh.exists)
                return;
            const latest = queueFresh.data();
            if (nowMs - latest.heartbeatAt.toMillis() <= HEARTBEAT_TIMEOUT_MS * 2)
                return;
            const userReference = userRef(queue.usernameLower);
            const userSnap = await tx.get(userReference);
            const user = (userSnap.data() ?? {});
            const balance = Math.round((user.balance ?? 0) * 100) / 100;
            tx.delete(queueReference);
            tx.set(userReference, {
                balance: Math.round((balance + latest.bet) * 100) / 100,
                spamQueueBet: FieldValue.delete(),
                spamQueueClientId: FieldValue.delete(),
            }, { merge: true });
        });
    }
    const matchSnap = await db.collection("spam_matches").limit(50).get();
    for (const doc of matchSnap.docs) {
        const match = doc.data();
        if (match.status === "settled" || match.status === "cancelled")
            continue;
        await db.runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            if (!fresh.exists)
                return;
            const latest = fresh.data();
            if (latest.status === "settled" || latest.status === "cancelled")
                return;
            await settleMatch(tx, doc.id, latest, nowMs);
        });
    }
    return null;
});
//# sourceMappingURL=spam.js.map