import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface FeedPayload {
  username: string;
  game: string;
  amount: number;
  result: "win" | "loss";
}

// Dispatches instantly to the local page so the current user sees their own
// result without waiting for Firestore round-trip (avoids race condition on
// first snapshot).
function dispatchLocal(payload: FeedPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("grax-feed", { detail: payload }));
}

export async function logFeedEvent(
  username: string,
  game: string,
  amount: number,        // net profit for wins, amount lost for losses — always positive
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
