import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export async function logFeedEvent(
  username: string,
  game: string,
  amount: number,        // net profit for wins, amount lost for losses — always positive
  result: "win" | "loss"
): Promise<void> {
  if (!username || amount <= 0) return;
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
