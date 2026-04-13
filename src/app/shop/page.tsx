"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ItemArt from "@/components/shop/ItemArt";
import { useBalance } from "@/context/BalanceContext";
import { useUser } from "@/context/UserContext";
import { fmtDollar } from "@/lib/format";
import {
  getShopItem,
  SHOP_CATEGORY_LABELS,
  SHOP_ITEMS,
  SHOP_ITEMS_BY_CATEGORY,
} from "@/lib/shop/catalog";
import {
  equipShopItem,
  purchaseShopItem,
  subscribeInventory,
  subscribeShopProfile,
} from "@/lib/shop/firestore";
import type { OwnedItem, ShopCategory, ShopItem, ShopProfile, ShopRarity } from "@/lib/shop/types";

const CATEGORY_ORDER: ShopCategory[] = ["titles", "frames", "cars", "houses"];

const RARITY_STYLES: Record<ShopRarity, { label: string; color: string; bg: string; border: string }> = {
  common: { label: "Common", color: "#cbd5e1", bg: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.25)" },
  uncommon: { label: "Uncommon", color: "#86efac", bg: "rgba(34,197,94,0.14)", border: "rgba(34,197,94,0.25)" },
  rare: { label: "Rare", color: "#93c5fd", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.25)" },
  epic: { label: "Epic", color: "#d8b4fe", bg: "rgba(168,85,247,0.14)", border: "rgba(168,85,247,0.25)" },
  legendary: { label: "Legendary", color: "#fcd34d", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.25)" },
  mythic: { label: "Mythic", color: "#fda4af", bg: "rgba(244,63,94,0.16)", border: "rgba(244,63,94,0.28)" },
};

const SLOT_LABELS: Record<ShopCategory, string> = {
  titles: "Title",
  frames: "Frame",
  cars: "Car",
  houses: "House",
};

function getEquippedItemByCategory(profile: ShopProfile | null, category: ShopCategory) {
  if (!profile) return null;

  const itemId =
    category === "titles"
      ? profile.equippedTitleId
      : category === "frames"
        ? profile.equippedFrameId
        : category === "cars"
          ? profile.equippedCarId
          : profile.equippedHouseId;

  return itemId ? getShopItem(itemId) ?? null : null;
}

export default function ShopPage() {
  const { username, isLoading: userLoading } = useUser();
  const { balance, setBalance } = useBalance();
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("titles");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    const stopProfile = subscribeShopProfile(username, setProfile);
    const stopInventory = subscribeInventory(username, setInventory);

    return () => {
      stopProfile();
      stopInventory();
    };
  }, [username]);

  const ownedIds = useMemo(() => new Set(inventory.map((entry) => entry.itemId)), [inventory]);
  const categoryItems = SHOP_ITEMS_BY_CATEGORY[selectedCategory];
  const visibleItems = ownedOnly
    ? categoryItems.filter((item) => ownedIds.has(item.id))
    : categoryItems;
  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    categoryItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    categoryItems[0] ??
    null;
  const loadout = {
    titles: getEquippedItemByCategory(profile, "titles"),
    frames: getEquippedItemByCategory(profile, "frames"),
    cars: getEquippedItemByCategory(profile, "cars"),
    houses: getEquippedItemByCategory(profile, "houses"),
  };
  const stats = useMemo(() => {
    const cheapest = SHOP_ITEMS.reduce((min, item) => (item.price < min.price ? item : min), SHOP_ITEMS[0]);
    const impossible = SHOP_ITEMS.reduce((max, item) => (item.price > max.price ? item : max), SHOP_ITEMS[0]);
    return {
      ownedCount: inventory.length,
      equippedCount: [
        profile?.equippedTitleId,
        profile?.equippedFrameId,
        profile?.equippedCarId,
        profile?.equippedHouseId,
      ].filter(Boolean).length,
      cheapest,
      impossible,
    };
  }, [inventory.length, profile]);

  const canInteract = Boolean(username);

  useEffect(() => {
    if (!selectedItemId || !categoryItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(categoryItems[0]?.id ?? null);
    }
  }, [categoryItems, selectedItemId]);

  useEffect(() => {
    if (ownedOnly && selectedItemId && !visibleItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(visibleItems[0]?.id ?? categoryItems[0]?.id ?? null);
    }
  }, [ownedOnly, visibleItems, selectedItemId, categoryItems]);

  async function handlePurchase(item: ShopItem) {
    if (!username) return;
    setWorkingItemId(item.id);
    setNotice(null);
    try {
      const result = await purchaseShopItem(username, item.id);
      setBalance(result.balance);
      setNotice(`${item.name} added to your collection.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Purchase failed.");
    } finally {
      setWorkingItemId(null);
    }
  }

  async function handleEquip(item: ShopItem) {
    if (!username) return;
    setWorkingItemId(item.id);
    setNotice(null);
    try {
      await equipShopItem(username, item.id);
      setNotice(`${item.name} equipped.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Equip failed.");
    } finally {
      setWorkingItemId(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100%",
        background:
          "radial-gradient(circle at top left, rgba(240,180,41,0.14), transparent 28%), radial-gradient(circle at top right, rgba(244,114,182,0.12), transparent 24%), linear-gradient(180deg, #0f1923 0%, #09111b 100%)",
        padding: "28px 20px 48px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minWidth: 0 }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(15,25,35,0.92), rgba(16,31,48,0.82))",
              border: "1px solid rgba(240,180,41,0.18)",
              borderRadius: 24,
              padding: 24,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: -80,
                background: "conic-gradient(from 180deg at 50% 50%, rgba(240,180,41,0.12), transparent, rgba(251,113,133,0.12), transparent, rgba(96,165,250,0.1), transparent)",
                filter: "blur(28px)",
              }}
            />
            <div style={{ position: "relative", display: "grid", gap: 16 }}>
              <div>
                <div style={{ color: "var(--accent-gold)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Browse Collection
                </div>
                <h1 style={{ marginTop: 4, fontSize: "clamp(2rem, 5vw, 3.6rem)", lineHeight: 0.96 }}>
                  The Shop
                </h1>
                <p style={{ marginTop: 10, maxWidth: 620, color: "var(--text-secondary)", fontSize: "1rem" }}>
                  Pick a category, compare the flex, and preview how it changes your profile before you buy or equip it.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {CATEGORY_ORDER.map((category) => (
                  <button
                    key={category}
                    className="btn-action"
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      ...(selectedCategory === category
                        ? {
                            background: "rgba(0,230,118,0.12)",
                            borderColor: "rgba(0,230,118,0.4)",
                            color: "var(--accent-green)",
                          }
                        : {}),
                    }}
                  >
                    {SHOP_CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn-action"
                  onClick={() => setOwnedOnly((current) => !current)}
                  style={{
                    background: ownedOnly ? "rgba(240,180,41,0.12)" : undefined,
                    borderColor: ownedOnly ? "rgba(240,180,41,0.38)" : undefined,
                    color: ownedOnly ? "var(--accent-gold)" : undefined,
                  }}
                >
                  {ownedOnly ? "Showing Owned" : "Show Owned Only"}
                </button>
                <div style={{ ...heroStatCard, minWidth: 150 }}>
                  <div style={heroStatLabel}>Balance</div>
                  <div style={{ ...heroStatValue, color: "var(--accent-gold)", fontSize: "1.35rem" }}>{fmtDollar(profile?.balance ?? balance)}</div>
                </div>
                <div style={{ ...heroStatCard, minWidth: 110 }}>
                  <div style={heroStatLabel}>Owned</div>
                  <div style={{ ...heroStatValue, fontSize: "1.35rem" }}>{stats.ownedCount}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {notice && (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "12px 16px",
              color: "var(--text-primary)",
            }}
          >
            {notice}
          </div>
        )}

        {!canInteract && !userLoading && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
              color: "var(--text-secondary)",
            }}
          >
            Pick a username first, then the shop unlocks.
          </div>
        )}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {visibleItems.map((item, index) => {
            const rarityStyle = RARITY_STYLES[item.rarity];
            const owned = ownedIds.has(item.id);
            const equipped =
              item.id === profile?.equippedTitleId ||
              item.id === profile?.equippedFrameId ||
              item.id === profile?.equippedCarId ||
              item.id === profile?.equippedHouseId;
            const buying = workingItemId === item.id;

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02, duration: 0.24 }}
                onClick={() => setSelectedItemId(item.id)}
                style={{
                  background: "linear-gradient(180deg, rgba(18,30,45,0.95), rgba(11,19,29,0.95))",
                  border:
                    selectedItemId === item.id
                      ? "1px solid rgba(240,180,41,0.42)"
                      : equipped
                        ? "1px solid rgba(0,230,118,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 22,
                  padding: 18,
                  display: "grid",
                  gap: 12,
                  boxShadow:
                    selectedItemId === item.id
                      ? "0 18px 42px rgba(240,180,41,0.09)"
                      : equipped
                        ? "0 18px 40px rgba(0,230,118,0.08)"
                        : "0 16px 34px rgba(0,0,0,0.22)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ ...pill, background: rarityStyle.bg, borderColor: rarityStyle.border, color: rarityStyle.color }}>
                    {rarityStyle.label}
                  </div>
                  {owned && (
                    <div style={{ ...pill, borderColor: equipped ? "rgba(0,230,118,0.32)" : "rgba(255,255,255,0.12)", color: equipped ? "var(--accent-green)" : "var(--text-secondary)" }}>
                      {equipped ? "Equipped" : "Owned"}
                    </div>
                  )}
                </div>

                <ItemArt item={item} />

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <h3 style={{ fontSize: "1.4rem", lineHeight: 0.95 }}>{item.name}</h3>
                    <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.18rem", fontWeight: 700 }}>
                      {fmtDollar(item.price)}
                    </div>
                  </div>
                  <p style={{ marginTop: 8, color: "var(--text-secondary)", minHeight: 42 }}>{item.description}</p>
                  {!owned && (profile?.balance ?? balance) < item.price && (
                    <p style={{ marginTop: 8, color: "#fda4af", fontSize: "0.86rem" }}>
                      Need {fmtDollar(item.price - (profile?.balance ?? balance))} more
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {!owned ? (
                    <button
                      className="btn-primary"
                      disabled={!canInteract || buying || (profile?.balance ?? balance) < item.price}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handlePurchase(item);
                      }}
                      style={{ flex: 1 }}
                    >
                      {buying ? "Buying..." : (profile?.balance ?? balance) < item.price ? "Too Expensive" : "Buy Now"}
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={!canInteract || buying || equipped}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleEquip(item);
                      }}
                      style={{ flex: 1 }}
                    >
                      {equipped ? "Equipped" : buying ? "Equipping..." : "Equip"}
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </section>

        {visibleItems.length === 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 24,
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No owned items in this category yet.
          </div>
        )}
          </div>

          <div
            style={{
              background: "linear-gradient(160deg, rgba(15,25,35,0.9), rgba(19,35,54,0.84))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 22,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={panelLabel}>Your Profile</div>
                <h2 style={{ marginTop: 2, fontSize: "1.4rem" }}>
                  {username ?? "Guest Viewer"}
                </h2>
                <p style={{ marginTop: 6, color: "var(--text-secondary)" }}>
                  Current flex loadout and selected shop preview.
                </p>
              </div>
              <div style={{ ...pill, color: "var(--accent-gold)", borderColor: "rgba(240,180,41,0.3)" }}>
                {loadout.titles?.name ?? "No Title"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {CATEGORY_ORDER.map((category) => {
                const equipped = loadout[category];
                const isSelectedSlot = category === selectedCategory;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      ...miniCard,
                      textAlign: "left",
                      cursor: "pointer",
                      border: isSelectedSlot
                        ? "1px solid rgba(0,230,118,0.38)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: isSelectedSlot
                        ? "rgba(0,230,118,0.08)"
                        : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={panelLabel}>{SLOT_LABELS[category]}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: equipped ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {equipped?.name ?? `No ${SLOT_LABELS[category]}`}
                    </div>
                    <div style={{ color: equipped ? "var(--text-secondary)" : "var(--text-muted)", fontSize: "0.86rem" }}>
                      {equipped ? equipped.description : `Browse ${SHOP_CATEGORY_LABELS[category].toLowerCase()} to fill this slot.`}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={panelLabel}>Selected {SLOT_LABELS[selectedCategory]}</div>
                  <h3 style={{ marginTop: 2, fontSize: "1.18rem" }}>
                    {selectedItem?.name ?? `No ${SLOT_LABELS[selectedCategory]} Available`}
                  </h3>
                </div>
                <div style={{ ...pill, color: "var(--accent-green)", borderColor: "rgba(0,230,118,0.3)" }}>
                  {SHOP_CATEGORY_LABELS[selectedCategory]}
                </div>
              </div>

              {selectedItem ? (
                <>
                  <ItemArt item={selectedItem} size="hero" />
                  <p style={{ color: "var(--text-secondary)" }}>{selectedItem.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ ...pill, background: RARITY_STYLES[selectedItem.rarity].bg, borderColor: RARITY_STYLES[selectedItem.rarity].border, color: RARITY_STYLES[selectedItem.rarity].color }}>
                      {RARITY_STYLES[selectedItem.rarity].label}
                    </div>
                    <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>
                      {fmtDollar(selectedItem.price)}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    minHeight: 180,
                    borderRadius: 18,
                    border: "1px dashed rgba(255,255,255,0.15)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Nothing to preview in this filter state.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={miniCard}>
                <div style={panelLabel}>Owned</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{stats.ownedCount} items</div>
                <div style={{ color: "var(--text-secondary)" }}>{stats.equippedCount}/4 equipped</div>
              </div>
              <div style={miniCard}>
                <div style={panelLabel}>Next Reachable</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{stats.cheapest.name}</div>
                <div style={{ color: "var(--accent-gold)" }}>{fmtDollar(stats.cheapest.price)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const heroStatCard = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "14px 16px",
} satisfies CSSProperties;

const heroStatLabel = {
  color: "var(--text-muted)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const heroStatValue = {
  marginTop: 5,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "1.7rem",
  fontWeight: 700,
} satisfies CSSProperties;

const panelLabel = {
  color: "var(--text-muted)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const miniCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "14px 16px",
  display: "grid",
  gap: 4,
} satisfies CSSProperties;

const pill = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} satisfies CSSProperties;
