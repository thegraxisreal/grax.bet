// ── Slots game logic ────────────────────────────────────────────────────────

export type SlotSymbol = "🔔" | "🍀" | "🍊" | "🎯" | "💎" | "👑" | "💰" | "⭐";

export const ALL_SYMBOLS: SlotSymbol[] = [
  "🔔", "🍀", "🍊", "🎯", "💎", "👑", "💰", "⭐",
];

export const SYMBOL_LABELS: Record<SlotSymbol, string> = {
  "🔔": "Bell",
  "🍀": "Clover",
  "🍊": "Orange",
  "🎯": "Target",
  "💎": "Diamond",
  "👑": "Crown",
  "💰": "Money Bag",
  "⭐": "Star",
};

// Higher weight = more common
const WEIGHTS: Record<SlotSymbol, number> = {
  "🔔": 40,
  "🍀": 40,
  "🍊": 40,
  "🎯": 40,
  "💎": 20,
  "👑": 20,
  "💰": 10,
  "⭐": 10,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0); // 220

export const RARE_SYMBOLS = new Set<SlotSymbol>(["💰", "⭐"]);
export const MID_SYMBOLS = new Set<SlotSymbol>(["💎", "👑"]);

// Base payout multipliers on the bet amount
const PAYOUT_TABLE: Record<number, Record<SlotSymbol, number>> = {
  3: {
    "🔔": 2.5, "🍀": 2.5, "🍊": 2.5, "🎯": 2.5,
    "💎": 2.5, "👑": 2.5, "💰": 2.5, "⭐": 2.5,
  },
  4: {
    "🔔": 8, "🍀": 8, "🍊": 8, "🎯": 8,
    "💎": 8, "👑": 8, "💰": 8, "⭐": 8,
  },
  5: {
    "🔔": 30, "🍀": 30, "🍊": 30, "🎯": 30,
    "💎": 30, "👑": 30,
    "💰": 50, "⭐": 50, // rare symbols pay more on 5-of-a-kind
  },
};

function weightedRandom(): SlotSymbol {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const [sym, weight] of Object.entries(WEIGHTS)) {
    r -= weight;
    if (r <= 0) return sym as SlotSymbol;
  }
  return "🔔";
}

// ── Win-frequency table ──────────────────────────────────────────────────────
// Each spin rolls a single die and may force a guaranteed win on a random row.
// This gives players frequent exciting hits without pure-luck drought.
//
//  ~1/15  (6.7%)  → forced 5-of-a-kind  (jackpot)
//  ~2/15  (13.3%) → forced 4-of-a-kind
//  ~4/15  (26.7%) → forced 3-of-a-kind
//  ~53%            → pure random (organic wins still possible)
//
// Total forced-win rate: ~46.7% of spins  (feel free to tune these thresholds)

const P_5OAK = 1 / 15;          // ≈ 6.67%
const P_4OAK = P_5OAK + 2 / 15; // ≈ 20.0%
const P_3OAK = P_4OAK + 4 / 15; // ≈ 46.7%

function forceRow(
  grid: SlotSymbol[][],
  row: number,
  matchCount: number, // how many reels (from left) share the same symbol
): void {
  const sym = weightedRandom();
  for (let reel = 0; reel < matchCount; reel++) {
    grid[reel][row] = sym;
  }
  // The remaining reels get a DIFFERENT symbol so we don't accidentally extend
  for (let reel = matchCount; reel < 5; reel++) {
    let candidate = weightedRandom();
    while (candidate === sym) candidate = weightedRandom();
    grid[reel][row] = candidate;
  }
}

// Generate the 5×4 result grid (5 reels, 4 rows each)
export function generateResults(): SlotSymbol[][] {
  // Start with a fully random grid
  const grid: SlotSymbol[][] = Array.from({ length: 5 }, () =>
    Array.from({ length: 4 }, () => weightedRandom())
  );

  const roll = Math.random();
  const row = Math.floor(Math.random() * 4); // random payline to bless

  if (roll < P_5OAK) {
    forceRow(grid, row, 5);
  } else if (roll < P_4OAK) {
    forceRow(grid, row, 4);
  } else if (roll < P_3OAK) {
    forceRow(grid, row, 3);
  }
  // else: pure random result — still has organic win chance

  return grid;
}

// Build a reel animation strip: randomCount random symbols followed by the 4 result symbols
export function buildStrip(result: SlotSymbol[], randomCount = 28): SlotSymbol[] {
  const random = Array.from({ length: randomCount }, () => weightedRandom());
  return [...random, ...result];
}

export interface WinLine {
  row: number;           // 0-3 which row
  symbol: SlotSymbol;
  count: number;         // 3, 4, or 5
  multiplier: number;    // effective multiplier on the bet
  payout: number;        // dollar payout
  reelIndices: number[]; // which reels matched (always starts from 0)
}

// Check all 4 rows for left-to-right consecutive wins
// results: results[reelIndex][rowIndex]
export function checkWins(results: SlotSymbol[][], bet: number): WinLine[] {
  const wins: WinLine[] = [];

  for (let row = 0; row < 4; row++) {
    const rowSymbols = results.map((reel) => reel[row]);
    const first = rowSymbols[0];

    let count = 1;
    while (count < 5 && rowSymbols[count] === first) count++;

    if (count >= 3) {
      const baseMultiplier = PAYOUT_TABLE[count]?.[first] ?? 0;
      // Rare 5-of-a-kind gets 2× bonus → 100× total
      const multiplier =
        count === 5 && RARE_SYMBOLS.has(first)
          ? baseMultiplier * 2
          : baseMultiplier;

      wins.push({
        row,
        symbol: first,
        count,
        multiplier,
        payout: Math.round(multiplier * bet * 100) / 100,
        reelIndices: Array.from({ length: count }, (_, i) => i),
      });
    }
  }

  return wins;
}

export function calculateTotalPayout(wins: WinLine[]): number {
  return Math.round(wins.reduce((sum, w) => sum + w.payout, 0) * 100) / 100;
}

// Describe the win for display
export function winLabel(win: WinLine): string {
  const countWord = ["", "", "", "3×", "4×", "5×"][win.count];
  const isRareBig = win.count === 5 && RARE_SYMBOLS.has(win.symbol);
  return isRareBig
    ? `${countWord} ${win.symbol} × 2 BONUS`
    : `${countWord} ${win.symbol}`;
}
