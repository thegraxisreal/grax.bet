import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
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
}

export type NextGameVoteOption = "tower_climb" | "treasure_chests" | "lucky_wheel" | "custom";

export interface NextGamePollDoc {
  totalVotes: number;
  votesByOption: Record<NextGameVoteOption, number>;
  updatedAt?: Timestamp;
}

export interface CustomSuggestionDoc {
  id: string;
  voterName: string;
  suggestion: string;
  createdAt: Timestamp;
}

const NEXT_GAME_POLL_REF = doc(getDb(), "site_polls", "next_game_vote");
const CUSTOM_SUGGESTIONS_COL = collection(getDb(), "site_polls", "next_game_vote", "custom_suggestions");

function makeDefaultPollDoc(): NextGamePollDoc {
  return {
    totalVotes: 0,
    votesByOption: {
      tower_climb: 0,
      treasure_chests: 0,
      lucky_wheel: 0,
      custom: 0,
    },
    updatedAt: Timestamp.now(),
  };
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

export function subscribeToNextGamePoll(
  onData: (poll: NextGamePollDoc) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    NEXT_GAME_POLL_REF,
    (snap) => {
      if (!snap.exists()) {
        onData(makeDefaultPollDoc());
        return;
      }
      const data = snap.data() as Partial<NextGamePollDoc>;
      onData({
        totalVotes: data.totalVotes ?? 0,
        votesByOption: {
          tower_climb: data.votesByOption?.tower_climb ?? 0,
          treasure_chests: data.votesByOption?.treasure_chests ?? 0,
          lucky_wheel: data.votesByOption?.lucky_wheel ?? 0,
          custom: data.votesByOption?.custom ?? 0,
        },
        updatedAt: data.updatedAt ?? Timestamp.now(),
      });
    },
    onError,
  );
}

export async function castNextGameVote(params: {
  option: NextGameVoteOption;
  voterName: string;
  customSuggestion?: string;
}): Promise<void> {
  await setDoc(
    NEXT_GAME_POLL_REF,
    {
      totalVotes: increment(1),
      updatedAt: Timestamp.now(),
      [`votesByOption.${params.option}`]: increment(1),
    },
    { merge: true },
  );

  const customSuggestion = params.customSuggestion?.trim();
  if (customSuggestion) {
    await addDoc(CUSTOM_SUGGESTIONS_COL, {
      voterName: params.voterName,
      suggestion: customSuggestion,
      createdAt: Timestamp.now(),
    });
  }
}

export async function listRecentCustomSuggestions(maxItems = 120): Promise<CustomSuggestionDoc[]> {
  const q = query(CUSTOM_SUGGESTIONS_COL, orderBy("createdAt", "desc"), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as {
      voterName?: string;
      suggestion?: string;
      createdAt?: Timestamp;
    };
    return {
      id: docSnap.id,
      voterName: data.voterName ?? "Anonymous",
      suggestion: data.suggestion ?? "",
      createdAt: data.createdAt ?? Timestamp.now(),
    };
  });
}
