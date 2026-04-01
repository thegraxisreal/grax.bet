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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBracket = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
__exportStar(require("./spam"), exports);
admin.initializeApp();
const db = admin.firestore();
// ─── ESPN fetch helpers ───────────────────────────────────────────────────────
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=100";
const TOURNAMENTS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/tournaments";
const PAYOUT = 1.9;
function parseRound(text) {
    const t = text.toLowerCase();
    if (t.includes("first round") || t.includes("round of 64"))
        return 1;
    if (t.includes("second round") || t.includes("round of 32"))
        return 2;
    if (t.includes("sweet 16") || t.includes("sweet sixteen"))
        return 3;
    if (t.includes("elite 8") || t.includes("elite eight"))
        return 4;
    if (t.includes("final four"))
        return 5;
    if (t.includes("championship") || t.includes("national"))
        return 6;
    return 1;
}
function parseRegion(text) {
    const t = text.toLowerCase();
    if (t.includes("east"))
        return "East";
    if (t.includes("west"))
        return "West";
    if (t.includes("south"))
        return "South";
    if (t.includes("midwest") || t.includes("mid-west"))
        return "Midwest";
    if (t.includes("final four") || t.includes("national"))
        return "National";
    return "Tournament";
}
async function fetchBracketGames() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeFetch = globalThis.fetch ?? require("node-fetch");
    const [sbRes, tRes] = await Promise.allSettled([
        nodeFetch(SCOREBOARD_URL),
        nodeFetch(TOURNAMENTS_URL),
    ]);
    // Tournament enrichment map
    const tournamentMap = {};
    if (tRes.status === "fulfilled" && tRes.value.ok) {
        try {
            const tData = (await tRes.value.json());
            const tournaments = tData.tournaments ?? [];
            for (const t of tournaments) {
                const rounds = t.bracket?.rounds ?? [];
                rounds.forEach((round, roundIdx) => {
                    const groups = round.groups ?? round.seeds ?? [];
                    groups.forEach((group) => {
                        const regionName = group.name ?? "Tournament";
                        const matchups = group.matchups ?? group.competitions ?? [];
                        matchups.forEach((m) => {
                            const id = String(m.competitionId ?? m.id ?? "");
                            if (id)
                                tournamentMap[id] = { round: roundIdx + 1, region: regionName };
                        });
                    });
                });
            }
        }
        catch {
            // enrichment is optional
        }
    }
    if (sbRes.status !== "fulfilled" || !sbRes.value.ok) {
        return [];
    }
    const sbData = (await sbRes.value.json());
    const events = sbData.events ?? [];
    return events
        .map((event) => {
        const competition = event.competitions?.[0];
        if (!competition)
            return null;
        const competitors = competition.competitors ?? [];
        if (competitors.length < 2)
            return null;
        const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
        const gameId = String(event.id);
        const competitionId = String(competition.id ?? gameId);
        let round = 1;
        let region = "Tournament";
        if (tournamentMap[competitionId]) {
            ({ round, region } = tournamentMap[competitionId]);
        }
        else {
            const notes = event.notes ?? competition.notes ?? [];
            const headline = notes[0]?.headline ?? notes[0]?.text ?? competition.series?.title ?? "";
            if (headline) {
                round = parseRound(headline);
                region = parseRegion(headline);
            }
        }
        const statusName = competition.status?.type?.name ?? "STATUS_SCHEDULED";
        let status = "pre";
        if (statusName.includes("FINAL"))
            status = "post";
        else if (statusName.includes("PROGRESS") ||
            statusName.includes("HALFTIME") ||
            statusName.includes("HALF"))
            status = "in";
        const winnerComp = competitors.find((c) => c.winner === true);
        const winner = winnerComp
            ? winnerComp.team?.displayName ?? winnerComp.team?.name ?? null
            : null;
        return {
            gameId,
            team1: home.team?.displayName ?? home.team?.name ?? "TBD",
            team2: away.team?.displayName ?? away.team?.name ?? "TBD",
            team1Score: parseInt(home.score ?? "0", 10) || 0,
            team2Score: parseInt(away.score ?? "0", 10) || 0,
            winner,
            status,
            round,
            region,
            startTime: event.date ?? new Date().toISOString(),
            updatedAt: admin.firestore.Timestamp.now(),
        };
    })
        .filter((g) => g !== null);
}
// ─── Cloud Function: syncBracket ──────────────────────────────────────────────
exports.syncBracket = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    functions.logger.info("syncBracket started");
    let games;
    try {
        games = await fetchBracketGames();
    }
    catch (err) {
        functions.logger.error("Failed to fetch ESPN data:", err);
        return null;
    }
    if (games.length === 0) {
        functions.logger.info("No games returned from ESPN");
        return null;
    }
    const batch = db.batch();
    // Upsert each game into bracket_games collection
    // Track which games newly got a winner (for payout processing)
    const newlyFinished = [];
    await Promise.all(games.map(async (game) => {
        const ref = db.collection("bracket_games").doc(game.gameId);
        const existing = await ref.get();
        const prevWinner = existing.exists
            ? existing.data().winner
            : null;
        batch.set(ref, game, { merge: true });
        // Winner just became set
        if (game.winner && !prevWinner) {
            newlyFinished.push(game);
        }
    }));
    await batch.commit();
    functions.logger.info(`Upserted ${games.length} games`);
    // ── Payout pass for newly finished games ──────────────────────────────────
    for (const game of newlyFinished) {
        functions.logger.info(`Processing payouts for game ${game.gameId}, winner: ${game.winner}`);
        // Scan all users for bets on this game
        const usersSnap = await db.collection("users").get();
        await Promise.all(usersSnap.docs.map(async (userDoc) => {
            const betRef = userDoc.ref.collection("bets").doc(game.gameId);
            const betSnap = await betRef.get();
            if (!betSnap.exists)
                return;
            const bet = betSnap.data();
            if (bet.paid)
                return; // already processed
            const won = bet.team === game.winner;
            const updateData = { paid: true, won };
            await betRef.update(updateData);
            if (won) {
                const payout = Math.round(bet.amount * PAYOUT * 100) / 100;
                // Update Firestore balance
                await db.runTransaction(async (tx) => {
                    const userSnap = await tx.get(userDoc.ref);
                    if (!userSnap.exists)
                        return;
                    const currentBalance = userSnap.data().balance ?? 0;
                    tx.update(userDoc.ref, {
                        balance: Math.round((currentBalance + payout) * 100) / 100,
                        totalWinnings: admin.firestore.FieldValue.increment(payout),
                    });
                });
                functions.logger.info(`Paid out $${payout} to user ${userDoc.id} for game ${game.gameId}`);
            }
        }));
    }
    functions.logger.info("syncBracket complete");
    return null;
});
//# sourceMappingURL=index.js.map