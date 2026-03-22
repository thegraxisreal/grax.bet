import { NextResponse } from "next/server";

export interface Matchup {
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

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=100";
const TOURNAMENTS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/tournaments";

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

export async function GET() {
  try {
    const [sbResult, tResult] = await Promise.allSettled([
      fetch(SCOREBOARD_URL, { next: { revalidate: 60 } }),
      fetch(TOURNAMENTS_URL, { next: { revalidate: 60 } }),
    ]);

    // Build round/region map from tournament bracket endpoint
    const tournamentMap: Record<string, { round: number; region: string }> = {};
    if (tResult.status === "fulfilled" && tResult.value.ok) {
      try {
        const tData = await tResult.value.json();
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
                if (id) {
                  tournamentMap[id] = { round: roundIdx + 1, region: regionName };
                }
              });
            });
          });
        }
      } catch {
        // tournament data is optional enrichment only
      }
    }

    if (sbResult.status !== "fulfilled" || !sbResult.value.ok) {
      return NextResponse.json({ matchups: [] });
    }

    const sbData = await sbResult.value.json();
    const events: any[] = sbData.events ?? [];

    const matchups: Matchup[] = events
      .map((event: any): Matchup | null => {
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

        // Round / region: tournament map first, then parse from notes
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

        // Status
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

        // Winner
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
        };
      })
      .filter((m): m is Matchup => m !== null);

    return NextResponse.json({ matchups });
  } catch (err) {
    console.error("[/api/bracket] Error:", err);
    return NextResponse.json(
      { matchups: [], error: "Failed to load bracket data" },
      { status: 500 }
    );
  }
}
