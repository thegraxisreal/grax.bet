import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface FeedPayload {
  username: string;
  game: string;
  amount?: number;
  result: "win" | "loss" | "hold";
  note?: string;
}

// Dispatches instantly to the local page so the current user sees their own
// result without waiting for Firestore round-trip (avoids race condition on
// first snapshot).
function dispatchLocal(payload: FeedPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("grax-feed", { detail: payload }));
}

export function emitLocalFeedPayload(payload: FeedPayload) {
  dispatchLocal(payload);
}

export async function logFeedEvent(
  username: string,
  game: string,
  amount: number, // net profit for wins, amount lost for losses — always positive
  result: "win" | "loss"
): Promise<void> {
  if (!username || amount <= 0) return;
  dispatchLocal({ username, game, amount, result });
  try {
    const db = getDb();
    await addDoc(collection(db, "feed"), {
      username,
      game,
      amount: Math.round(amount * 100) / 100,
      result,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Non-critical — never throw
  }
}

export async function logFeedHoldEvent(
  username: string,
  game: string,
  note: string
): Promise<void> {
  if (!username) return;
  const payload: FeedPayload = { username, game, result: "hold", note };
  dispatchLocal(payload);
  try {
    const db = getDb();
    await addDoc(collection(db, "feed"), {
      username,
      game,
      result: "hold",
      note,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Non-critical — never throw
  }
}
