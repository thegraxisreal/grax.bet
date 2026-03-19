// Blackjack game logic

export type Suit = "c" | "d" | "h" | "s";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
  faceDown?: boolean;
}

export type GamePhase =
  | "betting"
  | "insurance"
  | "player"
  | "dealer"
  | "result";

export type HandResult =
  | "win"
  | "lose"
  | "push"
  | "blackjack"
  | "bust"
  | "in_progress";

export interface Hand {
  cards: Card[];
  bet: number;
  result?: HandResult;
  doubled?: boolean;
  split?: boolean;
}

export interface GameState {
  phase: GamePhase;
  deck: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Card[];
  currentBet: number;
  insuranceBet: number;
  insuranceResult?: "win" | "lose";
  message?: string;
}

const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const SUITS: Suit[] = ["c","d","h","s"];

export function buildDeck(numDecks = 6): Card[] {
  const deck: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function cardValue(rank: Rank): number {
  if (["T", "J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank, 10);
}

export function handTotal(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.faceDown) continue;
    total += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }
  let soft = false;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  if (aces > 0 && total <= 21) soft = true;
  return { total, soft };
}

export function handLabel(cards: Card[]): string {
  const { total, soft } = handTotal(cards);
  if (total > 21) return "BUST";
  if (soft && total < 21) return `Soft ${total}`;
  return String(total);
}

export function isBlackjack(cards: Card[]): boolean {
  return (
    cards.length === 2 &&
    cards.some(c => c.rank === "A") &&
    cards.some(c => ["T", "J", "Q", "K"].includes(c.rank))
  );
}

export function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = handTotal(cards);
  // Dealer hits soft 17
  if (total < 17) return true;
  if (total === 17 && soft) return true;
  return false;
}

export function canDouble(hand: Hand): boolean {
  return hand.cards.length === 2 && !hand.split;
}

export function canSplit(hand: Hand, playerHands: Hand[]): boolean {
  // Only 2 cards, same rank, max 1 split (max 2 hands total)
  if (hand.cards.length !== 2) return false;
  if (playerHands.length >= 2) return false;
  return cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank);
}

export function cardString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** Evaluate the result of a player hand vs dealer */
export function evaluateHand(
  playerHand: Hand,
  dealerCards: Card[]
): HandResult {
  const { total: pTotal } = handTotal(playerHand.cards);
  const { total: dTotal } = handTotal(dealerCards);
  const pBJ = isBlackjack(playerHand.cards) && !playerHand.split;
  const dBJ = isBlackjack(dealerCards);

  if (pTotal > 21) return "bust";
  if (dBJ && pBJ) return "push";
  if (dBJ) return "lose";
  if (pBJ) return "blackjack";
  if (pTotal > dTotal || dTotal > 21) return "win";
  if (pTotal === dTotal) return "push";
  return "lose";
}

/** Compute payout multiplier for a result */
export function payoutMultiplier(result: HandResult, doubled = false): number {
  const mult = doubled ? 2 : 1;
  switch (result) {
    case "blackjack": return 2.5; // 3:2 payout (returns 1 + 1.5)
    case "win":       return 2 * mult;
    case "push":      return 1 * mult;
    default:          return 0;
  }
}
