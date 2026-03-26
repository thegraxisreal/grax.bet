import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  buildDeck,
  dealerShouldHit,
  evaluateHand,
  handTotal,
  payoutMultiplier,
  shuffleDeck,
  type Card,
  type Hand,
} from "@/lib/blackjack";
import { getDb } from "@/lib/firebase";

export const MP_TABLE_IDS = ["table-1", "table-2", "table-3"] as const;
export const MP_MIN_BET = 1;
export const MP_MAX_SEATS = 5;
export const MP_BETTING_MS = 15_000;
export const MP_ACTING_MS = 20_000;
export const MP_RESULTS_MS = 5_000;
export const HEARTBEAT_INTERVAL_MS = 8_000;
export const HEARTBEAT_TIMEOUT_MS = 20_000;

export type MpTableStatus = "betting" | "playing" | "resolving" | "results";
export type MpPlayerStatus = "betting" | "waiting" | "acting" | "stand" | "bust" | "done";

export interface MpPlayerState {
  bet: number;
  hand: Card[];
  handValue: number;
  status: MpPlayerStatus;
  payout: number;
  joinedAt: Timestamp;
  lastHeartbeat?: Timestamp;
}

export interface MpDealerState {
  hand: Card[];
  handValue: number;
  faceDown: boolean;
}

export interface MpTableDoc {
  tableNum: number;
  status: MpTableStatus;
  players: Record<string, MpPlayerState>;
  activePlayer: string | null;
  dealer: MpDealerState;
  roundStartedAt: Timestamp | null;
  updatedAt?: Timestamp;
}

function tableRef(tableId: string) {
  return doc(getDb(), "mp_tables", tableId);
}

function emptyDealer(): MpDealerState {
  return { hand: [], handValue: 0, faceDown: false };
}

function createTableDoc(tableNum: number): MpTableDoc {
  return {
    tableNum,
    status: "betting",
    players: {},
    activePlayer: null,
    dealer: emptyDealer(),
    roundStartedAt: null,
    updatedAt: Timestamp.now(),
  };
}

function clonePlayers(players: Record<string, MpPlayerState> | undefined) {
  return { ...(players ?? {}) };
}

function drawCard(deck: Card[], faceDown = false): [Card, Card[]] {
  const [card, ...rest] = deck;
  return [{ ...card, faceDown }, rest];
}

function activePlayers(players: Record<string, MpPlayerState>) {
  return Object.entries(players).filter(([, player]) => player.bet > 0);
}

function nextPlayerToAct(
  players: Record<string, MpPlayerState>,
  fromJoinedAt?: Timestamp
): string | null {
  const ordered = Object.entries(players)
    .filter(([, player]) => player.bet > 0 && (player.status === "waiting" || player.status === "acting"))
    .sort(([, a], [, b]) => a.joinedAt.toMillis() - b.joinedAt.toMillis());

  if (ordered.length === 0) return null;
  if (!fromJoinedAt) return ordered[0][0];

  return ordered.find(([, player]) => player.joinedAt.toMillis() > fromJoinedAt.toMillis())?.[0] ?? ordered[0][0];
}

export async function seedMultiplayerTables(): Promise<void> {
  await Promise.all(
    MP_TABLE_IDS.map(async (tableId, index) => {
      const ref = tableRef(tableId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, createTableDoc(index + 1));
      }
    })
  );
}

export function subscribeTables(callback: (tables: MpTableDoc[]) => void): Unsubscribe {
  const unsubs = MP_TABLE_IDS.map((tableId) =>
    onSnapshot(tableRef(tableId), (snap) => {
      latestTables.set(tableId, snap.exists() ? (snap.data() as MpTableDoc) : createTableDoc(Number(tableId.split("-")[1])));
      callback(MP_TABLE_IDS.map((id, index) => latestTables.get(id) ?? createTableDoc(index + 1)));
    })
  );

  return () => {
    unsubs.forEach((unsub) => unsub());
    latestTables.clear();
  };
}

const latestTables = new Map<string, MpTableDoc>();

export function subscribeTable(tableId: string, callback: (table: MpTableDoc | null) => void): Unsubscribe {
  return onSnapshot(tableRef(tableId), (snap) => {
    callback(snap.exists() ? (snap.data() as MpTableDoc) : null);
  });
}

export async function joinTable(tableId: string, username: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    const table = snap.exists() ? (snap.data() as MpTableDoc) : createTableDoc(Number(tableId.split("-")[1]));
    const players = clonePlayers(table.players);

    if (!players[username] && Object.keys(players).length >= MP_MAX_SEATS) {
      throw new Error("That table is full.");
    }

    players[username] = players[username] ?? {
      bet: 0,
      hand: [],
      handValue: 0,
      status: "betting",
      payout: 0,
      joinedAt: Timestamp.now(),
    };

    tx.set(
      ref,
      {
        ...table,
        players,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function leaveTable(tableId: string, username: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;
    const players = clonePlayers(table.players);
    if (!players[username]) return;
    delete players[username];

    const activeCount = activePlayers(players).length;
    const resetRound = Object.keys(players).length === 0 || activeCount === 0;

    tx.set(
      ref,
      {
        players,
        status: resetRound ? "betting" : table.status,
        activePlayer: resetRound ? null : (table.activePlayer === username ? nextPlayerToAct(players) : table.activePlayer),
        dealer: resetRound ? emptyDealer() : table.dealer,
        roundStartedAt: resetRound ? null : (table.activePlayer === username ? Timestamp.now() : table.roundStartedAt),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function placeBet(tableId: string, username: string, amount: number): Promise<void> {
  const bet = Math.max(MP_MIN_BET, Math.round(amount * 100) / 100);

  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Table not found.");
    const table = snap.data() as MpTableDoc;
    const players = clonePlayers(table.players);
    const player = players[username];
    if (!player) throw new Error("Join the table first.");
    if (table.status !== "betting") throw new Error("Betting is closed for this round.");

    players[username] = {
      ...player,
      bet,
      hand: [],
      handValue: 0,
      payout: 0,
      status: "betting",
    };

    tx.set(
      ref,
      {
        players,
        roundStartedAt: table.roundStartedAt ?? Timestamp.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function startRound(tableId: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;
    if (table.status !== "betting") return;

    const seatedEntries = Object.entries(table.players ?? {});
    const bettingEntries = seatedEntries.filter(([, player]) => player.bet > 0);
    if (bettingEntries.length === 0) return;

    let deck = shuffleDeck(buildDeck(6));
    const players = clonePlayers(table.players);

    for (const [username, player] of bettingEntries) {
      const [c1, d1] = drawCard(deck);
      const [c2, d2] = drawCard(d1);
      deck = d2;
      const hand = [c1, c2];
      const value = handTotal(hand).total;
      players[username] = {
        ...player,
        hand,
        handValue: value,
        payout: 0,
        status: value >= 21 ? (value > 21 ? "bust" : "stand") : "waiting",
      };
    }

    const firstToAct = nextPlayerToAct(players);
    if (firstToAct) {
      players[firstToAct] = {
        ...players[firstToAct],
        status: "acting",
      };
    }

    const [d1, d2a] = drawCard(deck);
    const [d2, deckAfter] = drawCard(d2a, true);
    const dealerHand = [d1, d2];
    const dealerValue = handTotal([d1]).total;

    tx.set(
      ref,
      {
        players,
        dealer: {
          hand: dealerHand,
          handValue: dealerValue,
          faceDown: true,
        },
        status: "playing",
        activePlayer: firstToAct,
        roundStartedAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    void deckAfter;
  });
}

export async function autoBetOrRemove(tableId: string, username: string, canAfford: boolean): Promise<void> {
  if (canAfford) {
    await placeBet(tableId, username, MP_MIN_BET);
    return;
  }
  await leaveTable(tableId, username);
}

export async function playerAction(tableId: string, username: string, action: "hit" | "stand"): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;
    if (table.status !== "playing") return;

    const players = clonePlayers(table.players);
    const player = players[username];
    if (!player || player.status !== "acting" || table.activePlayer !== username) return;

    if (action === "stand") {
      players[username] = { ...player, status: "stand" };
    } else {
      let deck = shuffleDeck(buildDeck(6));
      const usedCards = [
        ...Object.values(players).flatMap((entry) => entry.hand),
        ...(table.dealer?.hand ?? []),
      ];
      if (usedCards.length < deck.length) {
        const usedStrings = new Set(usedCards.map((card) => `${card.rank}${card.suit}`));
        deck = deck.filter((card) => !usedStrings.has(`${card.rank}${card.suit}`));
        deck = shuffleDeck(deck);
      }
      const [card] = drawCard(deck);
      const hand = [...player.hand, card];
      const value = handTotal(hand).total;
      players[username] = {
        ...player,
        hand,
        handValue: value,
        status: value > 21 ? "bust" : value === 21 ? "stand" : "acting",
      };
    }
    let activePlayer: string | null = table.activePlayer;
    const current = players[username];
    if (!current || current.status === "stand" || current.status === "bust") {
      const currentJoinedAt = current?.joinedAt ?? player.joinedAt;
      activePlayer = nextPlayerToAct(players, currentJoinedAt);
      if (activePlayer) {
        players[activePlayer] = {
          ...players[activePlayer],
          status: "acting",
        };
      }
    }

    tx.set(ref, { players, activePlayer, roundStartedAt: activePlayer !== table.activePlayer ? Timestamp.now() : table.roundStartedAt, updatedAt: serverTimestamp() }, { merge: true });
  });
}

function allPlayersDone(players: Record<string, MpPlayerState>) {
  const active = activePlayers(players);
  return active.length > 0 && active.every(([, player]) => player.status === "stand" || player.status === "bust" || player.status === "done");
}

export async function resolveDealer(tableId: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;
    if (table.status !== "playing" && table.status !== "resolving") return;
    const players = clonePlayers(table.players);
    if (!allPlayersDone(players)) return;

    let dealerHand: Card[] = (table.dealer?.hand ?? []).map((card) => ({ ...card, faceDown: false }));
    while (dealerShouldHit(dealerHand)) {
      const deck = shuffleDeck(buildDeck(6)).filter((candidate) => {
        const used = [...Object.values(players).flatMap((player) => player.hand), ...dealerHand];
        return !used.some((card) => card.rank === candidate.rank && card.suit === candidate.suit);
      });
      const [card] = drawCard(deck);
      dealerHand = [...dealerHand, card];
    }

    const dealerValue = handTotal(dealerHand).total;
    for (const [username, player] of Object.entries(players)) {
      if (player.bet <= 0) continue;
      const hand: Hand = { cards: player.hand, bet: player.bet };
      const result = evaluateHand(hand, dealerHand);
      const payout = Math.round(player.bet * payoutMultiplier(result) * 100) / 100;
      players[username] = {
        ...player,
        handValue: handTotal(player.hand).total,
        payout,
        status: "done",
      };
    }

    tx.set(
      ref,
      {
        players,
        dealer: {
          hand: dealerHand,
          handValue: dealerValue,
          faceDown: false,
        },
        status: "results",
        activePlayer: null,
        roundStartedAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function resetTableForNextRound(tableId: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;
    if (table.status !== "results") return;

    const players = Object.fromEntries(
      Object.entries(table.players ?? {}).map(([username, player]) => [
        username,
        {
          ...player,
          bet: 0,
          hand: [],
          handValue: 0,
          payout: 0,
          status: "betting" as const,
        },
      ])
    );

    tx.set(
      ref,
      {
        players,
        dealer: emptyDealer(),
        status: "betting",
        activePlayer: null,
        roundStartedAt: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function clearTable(tableId: string): Promise<void> {
  await runTransaction(getDb(), async (tx) => {
    const ref = tableRef(tableId);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const table = snap.data() as MpTableDoc;

    tx.set(
      ref,
      {
        ...table,
        players: {},
        dealer: emptyDealer(),
        status: "betting",
        activePlayer: null,
        roundStartedAt: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export function getLobbyStatus(table: MpTableDoc): "Waiting" | "In Progress" {
  const hasActiveRound = table.status !== "betting" || Object.values(table.players ?? {}).some((player) => player.bet > 0 || player.hand.length > 0);
  return hasActiveRound ? "In Progress" : "Waiting";
}

export function getRoundTimeRemaining(table: MpTableDoc): number {
  if (!table.roundStartedAt) return 0;
  const elapsed = Date.now() - table.roundStartedAt.toMillis();
  const duration = table.status === "betting" ? MP_BETTING_MS : table.status === "playing" ? MP_ACTING_MS : table.status === "results" ? MP_RESULTS_MS : 0;
  return Math.max(0, duration - elapsed);
}

export function seatedCount(table: MpTableDoc): number {
  return Object.keys(table.players ?? {}).length;
}

export async function sendHeartbeat(tableId: string, username: string): Promise<void> {
  try {
    await updateDoc(tableRef(tableId), {
      [`players.${username}.lastHeartbeat`]: serverTimestamp(),
    });
  } catch {
    // Player may have already left — ignore
  }
}
