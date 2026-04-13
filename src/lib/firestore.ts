import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface UserDoc {
  username: string;
  createdAt: Timestamp;
  balance: number;
  totalWinnings: number;
  gamesPlayed: number;
  favoriteGame: string;
  biggestWin: number;
  equippedTitleId: string | null;
  equippedFrameId: string | null;
  equippedCarId: string | null;
  equippedHouseId: string | null;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const ref = doc(getDb(), "users", username.toLowerCase());
  const snap = await getDoc(ref);
  return !snap.exists();
}

export async function createUser(username: string, startingBalance: number): Promise<void> {
  const ref = doc(getDb(), "users", username.toLowerCase());
  const userDoc: UserDoc = {
    username,
    createdAt: Timestamp.now(),
    balance: startingBalance,
    totalWinnings: 0,
    gamesPlayed: 0,
    favoriteGame: "",
    biggestWin: 0,
    equippedTitleId: null,
    equippedFrameId: null,
    equippedCarId: null,
    equippedHouseId: null,
  };
  await setDoc(ref, userDoc);
}

export async function getUser(username: string): Promise<UserDoc | null> {
  const ref = doc(getDb(), "users", username.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function updateUserBalance(username: string, balance: number): Promise<void> {
  const ref = doc(getDb(), "users", username.toLowerCase());
  await setDoc(ref, { balance }, { merge: true });
}
