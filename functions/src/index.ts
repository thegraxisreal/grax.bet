import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ─── Types ───────────────────────────────────────────────────────────────────

interface BracketGame {
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
  updatedAt: admin.firestore.Timestamp;
}

interface UserBet {
  gameId: string;
  team: string;
  amount: number;
  paid: boolean;
  won: boolean | null;
  timestamp: number;
}

// ─── ESPN fetch helpers ───────────────────────────────────────────────────────

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=100";
const TOURNAMENTS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/tournaments";
const PAYOUT = 1.9;

function parseRound(text: string): number {
  const t = text.toLowerCase();
  if (t.includes("first round") || t.includes("round of 64")) return 1;
  if (t.includes("second round") || t.includes("round of 32")) return 2;
  if (t.includes("sweet 16") || t.includes("sweet sixteen")) return 3;
  if (t.includes("elite 8") || t.includes("elite eight")) return 4;
  if (t.includes("final four")) return 5;
  if (t.includes("championship") || t.includes("national")) return 6;
  return 1;
}

function parseRegion(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("east")) return "East";
  if (t.includes("west")) return "West";
  if (t.includes("south")) return "South";
  if (t.includes("midwest") || t.includes("mid-west")) return "Midwest";
  if (t.includes("final four") || t.includes("national")) return "National";
  return "Tournament";
}

async function fetchBracketGames(): Promise<BracketGame[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeFetch = (globalThis as any).fetch ?? require("node-fetch");

  const [sbRes, tRes] = await Promise.allSettled([
    nodeFetch(SCOREBOARD_URL) as Promise<Response>,
    nodeFetch(TOURNAMENTS_URL) as Promise<Response>,
  ]);

  // Tournament enrichment map
  const tournamentMap: Record<string, { round: number; region: string }> = {};
  if (tRes.status === "fulfilled" && (tRes.value as Response).ok) {
    try {
      const tData = await (tRes.value as Response).json();
      const tournaments: any[] = tData.tournaments ?? [];
      for (const t of tournaments) {
        const rounds: any[] = t.bracket?.rounds ?? [];
        rounds.forEach((round: any, roundIdx: number) => {
          const groups: any[] = round.groups ?? round.seeds ?? [];
          groups.forEach((group: any) => {
            const regionName: string = group.name ?? "Tournament";
            const matchups: any[] = group.matchups ?? group.competitions ?? [];
            matchups.forEach((m: any) => {
              const id = String(m.competitionId ?? m.id ?? "");
              if (id) tournamentMap[id] = { round: roundIdx + 1, region: regionName };
            });
          });
        });
      }
    } catch {
      // enrichment is optional
    }
  }

  if (sbRes.status !== "fulfilled" || !(sbRes.value as Response).ok) {
    return [];
  }

  const sbData = await (sbRes.value as Response).json();
  const events: any[] = sbData.events ?? [];

  return events
    .map((event: any): BracketGame | null => {
      const competition = event.competitions?.[0];
      if (!competition) return null;
      const competitors: any[] = competition.competitors ?? [];
      if (competitors.length < 2) return null;

      const home =
        competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
      const away =
        competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];

      const gameId = String(event.id);
      const competitionId = String(competition.id ?? gameId);

      let round = 1;
      let region = "Tournament";
      if (tournamentMap[competitionId]) {
        ({ round, region } = tournamentMap[competitionId]);
      } else {
        const notes: any[] = event.notes ?? competition.notes ?? [];
        const headline: string =
          notes[0]?.headline ?? notes[0]?.text ?? competition.series?.title ?? "";
        if (headline) {
          round = parseRound(headline);
          region = parseRegion(headline);
        }
      }

      const statusName: string =
        competition.status?.type?.name ?? "STATUS_SCHEDULED";
      let status: "pre" | "in" | "post" = "pre";
      if (statusName.includes("FINAL")) status = "post";
      else if (
        statusName.includes("PROGRESS") ||
        statusName.includes("HALFTIME") ||
        statusName.includes("HALF")
      )
        status = "in";

      const winnerComp = competitors.find((c: any) => c.winner === true);
      const winner: string | null = winnerComp
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
    .filter((g): g is BracketGame => g !== null);
}

// ─── Cloud Function: syncBracket ──────────────────────────────────────────────

export const syncBracket = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    functions.logger.info("syncBracket started");

    let games: BracketGame[];
    try {
      games = await fetchBracketGames();
    } catch (err) {
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
    const newlyFinished: BracketGame[] = [];

    await Promise.all(
      games.map(async (game) => {
        const ref = db.collection("bracket_games").doc(game.gameId);
        const existing = await ref.get();

        const prevWinner: string | null = existing.exists
          ? (existing.data() as BracketGame).winner
          : null;

        batch.set(ref, game, { merge: true });

        // Winner just became set
        if (game.winner && !prevWinner) {
          newlyFinished.push(game);
        }
      })
    );

    await batch.commit();
    functions.logger.info(`Upserted ${games.length} games`);

    // ── Payout pass for newly finished games ──────────────────────────────────
    for (const game of newlyFinished) {
      functions.logger.info(
        `Processing payouts for game ${game.gameId}, winner: ${game.winner}`
      );

      // Scan all users for bets on this game
      const usersSnap = await db.collection("users").get();

      await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const betRef = userDoc.ref.collection("bets").doc(game.gameId);
          const betSnap = await betRef.get();
          if (!betSnap.exists) return;

          const bet = betSnap.data() as UserBet;
          if (bet.paid) return; // already processed

          const won = bet.team === game.winner;
          const updateData: Partial<UserBet> = { paid: true, won };
          await betRef.update(updateData);

          if (won) {
            const payout = Math.round(bet.amount * PAYOUT * 100) / 100;
            // Update Firestore balance
            await db.runTransaction(async (tx) => {
              const userSnap = await tx.get(userDoc.ref);
              if (!userSnap.exists) return;
              const currentBalance =
                (userSnap.data() as { balance: number }).balance ?? 0;
              tx.update(userDoc.ref, {
                balance: Math.round((currentBalance + payout) * 100) / 100,
                totalWinnings: admin.firestore.FieldValue.increment(payout),
              });
            });
            functions.logger.info(
              `Paid out $${payout} to user ${userDoc.id} for game ${game.gameId}`
            );
          }
        })
      );
    }

    functions.logger.info("syncBracket complete");
    return null;
  });
