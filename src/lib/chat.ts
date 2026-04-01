import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: Timestamp;
  type?: "win";
  game?: string;
  amount?: number;
}

const CHAT_COLLECTION = "global_chat";
const MAX_MESSAGES = 100;

export async function sendChatMessage(username: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || !username) return;
  await addDoc(collection(getDb(), CHAT_COLLECTION), {
    username,
    text: trimmed.slice(0, 300),
    timestamp: Timestamp.now(),
  });
}

export async function sendWinAnnouncement(username: string, game: string, amount: number): Promise<void> {
  if (!username) return;
  await addDoc(collection(getDb(), CHAT_COLLECTION), {
    username,
    text: `won $${amount % 1 === 0 ? amount : amount.toFixed(2)} on ${game}`,
    type: "win",
    game,
    amount,
    timestamp: Timestamp.now(),
  });
}

export async function sendCustomChatAnnouncement(username: string, text: string): Promise<void> {
  if (!username || !text.trim()) return;
  await addDoc(collection(getDb(), CHAT_COLLECTION), {
    username,
    text: text.trim().slice(0, 300),
    timestamp: Timestamp.now(),
  });
}

export function subscribeChat(callback: (messages: ChatMessage[]) => void): Unsubscribe {
  const q = query(
    collection(getDb(), CHAT_COLLECTION),
    orderBy("timestamp", "desc"),
    limit(MAX_MESSAGES)
  );
  return onSnapshot(q, (snap) => {
    const messages: ChatMessage[] = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChatMessage, "id">) }))
      .reverse();
    callback(messages);
  });
}
