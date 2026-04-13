import type { Timestamp } from "firebase/firestore";

export type ShopCategory = "titles" | "frames" | "cars" | "houses";

export type ShopRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  price: number;
  rarity: ShopRarity;
  description: string;
}

export interface OwnedItem {
  itemId: string;
  category: ShopCategory;
  purchasedAt: Timestamp;
  pricePaid: number;
}

export interface EquippedLoadout {
  equippedTitleId: string | null;
  equippedFrameId: string | null;
  equippedCarId: string | null;
  equippedHouseId: string | null;
}

export interface ShopProfile extends EquippedLoadout {
  balance: number;
}
