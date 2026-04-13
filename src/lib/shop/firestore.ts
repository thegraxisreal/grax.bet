import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { getShopItem } from "@/lib/shop/catalog";
import type { EquippedLoadout, OwnedItem, ShopCategory, ShopProfile } from "@/lib/shop/types";

const EQUIPPED_FIELD_BY_CATEGORY: Record<ShopCategory, keyof EquippedLoadout> = {
  titles: "equippedTitleId",
  frames: "equippedFrameId",
  cars: "equippedCarId",
  houses: "equippedHouseId",
};

function userRef(username: string) {
  return doc(getDb(), "users", username.toLowerCase());
}

function inventoryRef(username: string, itemId: string) {
  return doc(getDb(), "users", username.toLowerCase(), "inventory", itemId);
}

export function subscribeShopProfile(
  username: string,
  callback: (profile: ShopProfile | null) => void,
) {
  return onSnapshot(userRef(username), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data();
    callback({
      balance: typeof data.balance === "number" ? data.balance : 0,
      equippedTitleId: typeof data.equippedTitleId === "string" ? data.equippedTitleId : null,
      equippedFrameId: typeof data.equippedFrameId === "string" ? data.equippedFrameId : null,
      equippedCarId: typeof data.equippedCarId === "string" ? data.equippedCarId : null,
      equippedHouseId: typeof data.equippedHouseId === "string" ? data.equippedHouseId : null,
    });
  });
}

export function subscribeInventory(
  username: string,
  callback: (items: OwnedItem[]) => void,
) {
  return onSnapshot(
    collection(getDb(), "users", username.toLowerCase(), "inventory"),
    (snapshot) => {
      const items = snapshot.docs.map((entry) => entry.data() as OwnedItem);
      callback(items);
    },
  );
}

export async function purchaseShopItem(username: string, itemId: string): Promise<{ balance: number }> {
  const item = getShopItem(itemId);
  if (!item) {
    throw new Error("That item does not exist.");
  }

  return runTransaction(getDb(), async (transaction) => {
    const userDocRef = userRef(username);
    const itemDocRef = inventoryRef(username, itemId);

    const [userSnapshot, itemSnapshot] = await Promise.all([
      transaction.get(userDocRef),
      transaction.get(itemDocRef),
    ]);

    if (!userSnapshot.exists()) {
      throw new Error("User not found.");
    }
    if (itemSnapshot.exists()) {
      throw new Error("You already own that item.");
    }

    const balance = typeof userSnapshot.data().balance === "number" ? userSnapshot.data().balance : 0;
    if (balance < item.price) {
      throw new Error("Not enough balance for that flex.");
    }

    const nextBalance = Math.round((balance - item.price) * 100) / 100;

    transaction.set(userDocRef, { balance: nextBalance }, { merge: true });
    transaction.set(itemDocRef, {
      itemId: item.id,
      category: item.category,
      purchasedAt: Timestamp.now(),
      pricePaid: item.price,
    } satisfies OwnedItem);

    return { balance: nextBalance };
  });
}

export async function equipShopItem(username: string, itemId: string): Promise<void> {
  const item = getShopItem(itemId);
  if (!item) {
    throw new Error("That item does not exist.");
  }

  await runTransaction(getDb(), async (transaction) => {
    const itemDocRef = inventoryRef(username, itemId);
    const ownedSnapshot = await transaction.get(itemDocRef);
    if (!ownedSnapshot.exists()) {
      throw new Error("You need to buy that item first.");
    }

    transaction.set(
      userRef(username),
      { [EQUIPPED_FIELD_BY_CATEGORY[item.category]]: item.id },
      { merge: true },
    );
  });
}
