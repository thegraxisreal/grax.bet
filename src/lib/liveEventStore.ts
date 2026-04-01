"use client";

import {
  Timestamp,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  collection,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { LiveEventDefinition } from "@/lib/liveEvents";
import { emitLocalFeedPayload } from "@/lib/feed";

export interface LiveEventEntry {
  id: string;
  eventId: string;
  username: string;
  game: string;
  score: number;
  bestMultiplier: number;
  bestAchievedAt: number;
  updatedAt: number;
  rewardTier: number | null;
  rewardAmount: number | null;
}

export interface UpsertPlinkoEventScoreResult {
  updated: boolean;
  entry: LiveEventEntry | null;
  previousBestScore: number | null;
  previousRank: number | null;
  currentRank: number | null;
}

const LIVE_EVENT_ENTRIES = "live_event_entries";

function entryDocId(eventId: string, username: string): string {
  return `${eventId}__${username.toLowerCase()}`;
}

function mapEntry(id: string, raw: Record<string, unknown>): LiveEventEntry {
  const bestAchievedAt = raw.bestAchievedAt instanceof Timestamp
    ? raw.bestAchievedAt.toMillis()
    : typeof raw.bestAchievedAt === "number"
      ? raw.bestAchievedAt
      : 0;
  const updatedAt = raw.updatedAt instanceof Timestamp
    ? raw.updatedAt.toMillis()
    : typeof raw.updatedAt === "number"
      ? raw.updatedAt
      : 0;

  return {
    id,
    eventId: String(raw.eventId ?? ""),
    username: String(raw.username ?? ""),
    game: String(raw.game ?? "Plinko"),
    score: typeof raw.score === "number" ? raw.score : 0,
    bestMultiplier: typeof raw.bestMultiplier === "number" ? raw.bestMultiplier : 0,
    bestAchievedAt,
    updatedAt,
    rewardTier: typeof raw.rewardTier === "number" ? raw.rewardTier : null,
    rewardAmount: typeof raw.rewardAmount === "number" ? raw.rewardAmount : null,
  };
}

function withRewardMetadata(entries: LiveEventEntry[], rewards: LiveEventDefinition["rewardMetadata"]): LiveEventEntry[] {
  return entries.map((entry, index) => {
    const reward = rewards.find((item) => item.place === index + 1);
    return {
      ...entry,
      rewardTier: reward ? reward.place : null,
      rewardAmount: reward ? reward.amount : null,
    };
  });
}

async function fetchLeaderboard(eventId: string, rewards: LiveEventDefinition["rewardMetadata"], size: number): Promise<LiveEventEntry[]> {
  const db = getDb();
  const leaderboardQuery = query(
    collection(db, LIVE_EVENT_ENTRIES),
    where("eventId", "==", eventId),
    orderBy("score", "desc"),
    orderBy("bestAchievedAt", "asc"),
    limit(size)
  );
  const snap = await getDocs(leaderboardQuery);
  return withRewardMetadata(
    snap.docs.map((entryDoc) => mapEntry(entryDoc.id, entryDoc.data() as Record<string, unknown>)),
    rewards
  );
}

export async function upsertPlinkoEventScore(
  event: LiveEventDefinition,
  username: string,
  multiplier: number,
  achievedAt: number
): Promise<UpsertPlinkoEventScoreResult> {
  const db = getDb();
  const ref = doc(db, LIVE_EVENT_ENTRIES, entryDocId(event.id, username));
  let previousBestScore: number | null = null;

  const updated = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (snap.exists()) {
      const current = mapEntry(snap.id, snap.data() as Record<string, unknown>);
      previousBestScore = current.score;
      if (multiplier < current.score) return false;
      if (multiplier === current.score && achievedAt >= current.bestAchievedAt) return false;
    }

    transaction.set(ref, {
      eventId: event.id,
      username,
      game: "Plinko",
      score: multiplier,
      bestMultiplier: multiplier,
      bestAchievedAt: Timestamp.fromMillis(achievedAt),
      updatedAt: serverTimestamp(),
      rewardTier: null,
      rewardAmount: null,
    }, { merge: true });
    return true;
  });

  const leaderboard = await fetchLeaderboard(event.id, event.rewardMetadata, 25);
  const entry = leaderboard.find((item) => item.username.toLowerCase() === username.toLowerCase()) ?? null;
  const currentRank = entry ? leaderboard.findIndex((item) => item.id === entry.id) + 1 : null;

  return {
    updated,
    entry,
    previousBestScore,
    previousRank: null,
    currentRank,
  };
}

export function subscribeEventLeaderboard(
  event: LiveEventDefinition,
  callback: (entries: LiveEventEntry[]) => void,
  size = 10
): Unsubscribe {
  const db = getDb();
  const leaderboardQuery = query(
    collection(db, LIVE_EVENT_ENTRIES),
    where("eventId", "==", event.id),
    orderBy("score", "desc"),
    orderBy("bestAchievedAt", "asc"),
    limit(size)
  );

  return onSnapshot(leaderboardQuery, (snap) => {
    callback(withRewardMetadata(
      snap.docs.map((entryDoc) => mapEntry(entryDoc.id, entryDoc.data() as Record<string, unknown>)),
      event.rewardMetadata
    ));
  });
}

export function subscribeRecentEventWinners(
  event: LiveEventDefinition | null,
  callback: (entries: LiveEventEntry[]) => void
): Unsubscribe {
  if (!event) {
    callback([]);
    return () => {};
  }
  return subscribeEventLeaderboard(event, callback, 3);
}

export async function getEventWinners(event: LiveEventDefinition): Promise<LiveEventEntry[]> {
  return fetchLeaderboard(event.id, event.rewardMetadata, 3);
}

export async function logLiveEventMoment(
  username: string,
  note: string,
  amount?: number
): Promise<void> {
  emitLocalFeedPayload({
    username,
    game: "Live Events",
    result: "hold",
    amount,
    note,
  });

  const db = getDb();
  await setDoc(doc(collection(db, "feed")), {
    username,
    game: "Live Events",
    result: "hold",
    note,
    ...(typeof amount === "number" ? { amount } : {}),
    timestamp: serverTimestamp(),
  });
}

export async function getLiveEventEntry(
  eventId: string,
  username: string
): Promise<LiveEventEntry | null> {
  const snap = await getDoc(doc(getDb(), LIVE_EVENT_ENTRIES, entryDocId(eventId, username)));
  if (!snap.exists()) return null;
  return mapEntry(snap.id, snap.data() as Record<string, unknown>);
}
