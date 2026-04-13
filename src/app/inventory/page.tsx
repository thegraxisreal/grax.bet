"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ItemArt from "@/components/shop/ItemArt";
import { useUser } from "@/context/UserContext";
import { fmtDollar } from "@/lib/format";
import { getShopItem, SHOP_CATEGORY_LABELS } from "@/lib/shop/catalog";
import { equipShopItem, subscribeInventory, subscribeShopProfile } from "@/lib/shop/firestore";
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

function getEquippedId(profile: ShopProfile | null, category: ShopCategory) {
  if (!profile) return null;
  if (category === "titles") return profile.equippedTitleId;
  if (category === "frames") return profile.equippedFrameId;
  if (category === "cars") return profile.equippedCarId;
  return profile.equippedHouseId;
}

function getEquippedItem(profile: ShopProfile | null, category: ShopCategory) {
  const itemId = getEquippedId(profile, category);
  return itemId ? getShopItem(itemId) ?? null : null;
}

export default function InventoryPage() {
  const { username, isLoading: userLoading } = useUser();
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("titles");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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

  const inventoryItems = useMemo(() => {
    return inventory
      .map((entry) => {
        const item = getShopItem(entry.itemId);
        if (!item) return null;
        return { ...entry, item };
      })
      .filter((entry): entry is OwnedItem & { item: ShopItem } => entry !== null)
      .sort((a, b) => b.pricePaid - a.pricePaid);
  }, [inventory]);

  const categoryItems = inventoryItems.filter((entry) => entry.category === selectedCategory);
  const selectedEntry =
    categoryItems.find((entry) => entry.itemId === selectedItemId) ??
    categoryItems[0] ??
    null;

  const loadout = {
    titles: getEquippedItem(profile, "titles"),
    frames: getEquippedItem(profile, "frames"),
    cars: getEquippedItem(profile, "cars"),
    houses: getEquippedItem(profile, "houses"),
  };

  useEffect(() => {
    if (!selectedItemId || !categoryItems.some((entry) => entry.itemId === selectedItemId)) {
      setSelectedItemId(categoryItems[0]?.itemId ?? null);
    }
  }, [categoryItems, selectedItemId]);

  const categoryCounts = useMemo(() => {
    return CATEGORY_ORDER.reduce<Record<ShopCategory, number>>((acc, category) => {
      acc[category] = inventoryItems.filter((entry) => entry.category === category).length;
      return acc;
    }, { titles: 0, frames: 0, cars: 0, houses: 0 });
  }, [inventoryItems]);

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
          "radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 24%), radial-gradient(circle at top right, rgba(240,180,41,0.1), transparent 28%), linear-gradient(180deg, #0f1923 0%, #09111b 100%)",
        padding: "28px 20px 48px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 20 }}>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.95fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(15,25,35,0.92), rgba(16,31,48,0.82))",
              border: "1px solid rgba(56,189,248,0.18)",
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
                background: "conic-gradient(from 180deg at 50% 50%, rgba(56,189,248,0.12), transparent, rgba(240,180,41,0.12), transparent)",
                filter: "blur(28px)",
              }}
            />
            <div style={{ position: "relative", display: "grid", gap: 16 }}>
              <div>
                <div style={{ color: "#38bdf8", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Owned Collection
                </div>
                <h1 style={{ marginTop: 4, fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 0.96 }}>
                  Inventory
                </h1>
                <p style={{ marginTop: 10, maxWidth: 620, color: "var(--text-secondary)", fontSize: "1rem" }}>
                  Everything you already own, grouped by slot, with quick equip controls and a profile preview on the right.
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
                            background: "rgba(56,189,248,0.12)",
                            borderColor: "rgba(56,189,248,0.4)",
                            color: "#7dd3fc",
                          }
                        : {}),
                    }}
                  >
                    {SHOP_CATEGORY_LABELS[category]} ({categoryCounts[category]})
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ ...heroStatCard, minWidth: 150 }}>
                  <div style={heroStatLabel}>Owned</div>
                  <div style={{ ...heroStatValue, color: "#7dd3fc", fontSize: "1.35rem" }}>{inventoryItems.length}</div>
                </div>
                <div style={{ ...heroStatCard, minWidth: 150 }}>
                  <div style={heroStatLabel}>Equipped</div>
                  <div style={{ ...heroStatValue, fontSize: "1.35rem" }}>
                    {[profile?.equippedTitleId, profile?.equippedFrameId, profile?.equippedCarId, profile?.equippedHouseId].filter(Boolean).length}/4
                  </div>
                </div>
                <div style={{ ...heroStatCard, minWidth: 180 }}>
                  <div style={heroStatLabel}>Current Balance</div>
                  <div style={{ ...heroStatValue, color: "var(--accent-gold)", fontSize: "1.35rem" }}>
                    {fmtDollar(profile?.balance ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(160deg, rgba(15,25,35,0.9), rgba(19,35,54,0.84))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding: 22,
              display: "grid",
              gap: 14,
              position: "sticky",
              top: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={panelLabel}>Your Profile</div>
                <h2 style={{ marginTop: 2, fontSize: "1.4rem" }}>{username ?? "Guest Viewer"}</h2>
                <p style={{ marginTop: 6, color: "var(--text-secondary)" }}>
                  Current loadout and selected inventory item preview.
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
                      border: isSelectedSlot ? "1px solid rgba(56,189,248,0.38)" : "1px solid rgba(255,255,255,0.08)",
                      background: isSelectedSlot ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={panelLabel}>{SLOT_LABELS[category]}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: equipped ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {equipped?.name ?? `No ${SLOT_LABELS[category]}`}
                    </div>
                    <div style={{ color: equipped ? "var(--text-secondary)" : "var(--text-muted)", fontSize: "0.86rem" }}>
                      {equipped ? equipped.description : `Nothing equipped in this slot yet.`}
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
                    {selectedEntry?.item.name ?? `No ${SHOP_CATEGORY_LABELS[selectedCategory]} Owned`}
                  </h3>
                </div>
                <div style={{ ...pill, color: "#7dd3fc", borderColor: "rgba(56,189,248,0.32)" }}>
                  {SHOP_CATEGORY_LABELS[selectedCategory]}
                </div>
              </div>

              {selectedEntry ? (
                <>
                  <ItemArt item={selectedEntry.item} size="hero" />
                  <p style={{ color: "var(--text-secondary)" }}>{selectedEntry.item.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ ...pill, background: RARITY_STYLES[selectedEntry.item.rarity].bg, borderColor: RARITY_STYLES[selectedEntry.item.rarity].border, color: RARITY_STYLES[selectedEntry.item.rarity].color }}>
                      {RARITY_STYLES[selectedEntry.item.rarity].label}
                    </div>
                    <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>
                      Bought for {fmtDollar(selectedEntry.pricePaid)}
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
                  No items in this category yet. Buy one in the shop first.
                </div>
              )}
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

        {!username && !userLoading && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
              color: "var(--text-secondary)",
            }}
          >
            Pick a username first, then inventory unlocks.
          </div>
        )}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {categoryItems.map((entry, index) => {
            const item = entry.item;
            const rarityStyle = RARITY_STYLES[item.rarity];
            const equipped = getEquippedId(profile, item.category) === item.id;
            const loading = workingItemId === item.id;

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
                      ? "1px solid rgba(56,189,248,0.42)"
                      : equipped
                        ? "1px solid rgba(0,230,118,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 22,
                  padding: 18,
                  display: "grid",
                  gap: 12,
                  boxShadow:
                    selectedItemId === item.id
                      ? "0 18px 42px rgba(56,189,248,0.08)"
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
                  <div style={{ ...pill, borderColor: equipped ? "rgba(0,230,118,0.32)" : "rgba(255,255,255,0.12)", color: equipped ? "var(--accent-green)" : "var(--text-secondary)" }}>
                    {equipped ? "Equipped" : "Owned"}
                  </div>
                </div>

                <ItemArt item={item} />

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <h3 style={{ fontSize: "1.4rem", lineHeight: 0.95 }}>{item.name}</h3>
                    <div style={{ color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem", fontWeight: 700 }}>
                      {fmtDollar(entry.pricePaid)}
                    </div>
                  </div>
                  <p style={{ marginTop: 8, color: "var(--text-secondary)", minHeight: 42 }}>{item.description}</p>
                </div>

                <button
                  className="btn-primary"
                  disabled={loading || equipped || !username}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleEquip(item);
                  }}
                  style={{ width: "100%" }}
                >
                  {equipped ? "Equipped" : loading ? "Equipping..." : "Equip"}
                </button>
              </motion.article>
            );
          })}
        </section>

        {categoryItems.length === 0 && (
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
            You do not own any {SHOP_CATEGORY_LABELS[selectedCategory].toLowerCase()} yet.
          </div>
        )}
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
