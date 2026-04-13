"use client";

import type { CSSProperties } from "react";
import type { ShopCategory, ShopItem, ShopRarity } from "@/lib/shop/types";

const RARITY_PALETTE: Record<ShopRarity, { glow: string; fill: string; stroke: string }> = {
  common: { glow: "rgba(148, 163, 184, 0.24)", fill: "#94a3b8", stroke: "#cbd5e1" },
  uncommon: { glow: "rgba(34, 197, 94, 0.24)", fill: "#22c55e", stroke: "#86efac" },
  rare: { glow: "rgba(59, 130, 246, 0.24)", fill: "#3b82f6", stroke: "#93c5fd" },
  epic: { glow: "rgba(168, 85, 247, 0.24)", fill: "#a855f7", stroke: "#d8b4fe" },
  legendary: { glow: "rgba(245, 158, 11, 0.24)", fill: "#f59e0b", stroke: "#fcd34d" },
  mythic: { glow: "rgba(244, 63, 94, 0.28)", fill: "#f43f5e", stroke: "#fda4af" },
};

function getAccent(category: ShopCategory) {
  if (category === "titles") return "#f0b429";
  if (category === "frames") return "#2dd4bf";
  if (category === "cars") return "#fb7185";
  return "#60a5fa";
}

function getLabel(item: ShopItem) {
  if (item.category === "titles") return item.name.slice(0, 3).toUpperCase();
  if (item.category === "frames") return "FX";
  if (item.category === "cars") return "GT";
  return "EST";
}

function getTheme(item: ShopItem) {
  const rarity = RARITY_PALETTE[item.rarity];
  const accent = getAccent(item.category);
  const seed = item.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const dash = 4 + (seed % 5);
  const rotate = (seed % 18) - 9;

  return { rarity, accent, dash, rotate };
}

function TitleArt({ item }: { item: ShopItem }) {
  const { rarity, accent, rotate } = getTheme(item);

  return (
    <>
      <defs>
        <linearGradient id={`${item.id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(240,180,41,0.34)" />
          <stop offset="100%" stopColor="rgba(15,25,35,0.2)" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="172" height="92" rx="20" fill={`url(#${item.id}-bg)`} stroke={accent} strokeOpacity="0.55" />
      <rect x="24" y="28" width="144" height="64" rx="14" fill="rgba(7, 17, 28, 0.8)" stroke={rarity.stroke} />
      <path d={`M36 60 H156`} stroke={rarity.fill} strokeWidth="2" opacity="0.55" />
      <path d={`M56 42 L68 30 L80 42`} stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M112 42 L124 30 L136 42`} stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text
        x="96"
        y="68"
        textAnchor="middle"
        fill={rarity.stroke}
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 24,
          letterSpacing: "0.22em",
          fontWeight: 800,
          transform: `rotate(${rotate}deg)`,
          transformOrigin: "96px 60px",
        }}
      >
        {getLabel(item)}
      </text>
    </>
  );
}

function FrameArt({ item }: { item: ShopItem }) {
  const { rarity, accent, dash } = getTheme(item);

  return (
    <>
      <rect x="20" y="18" width="152" height="84" rx="24" fill="rgba(9, 18, 29, 0.82)" stroke={rarity.fill} strokeWidth="3" strokeDasharray={`${dash} ${dash + 2}`} />
      <rect x="34" y="30" width="124" height="60" rx="16" fill="rgba(255,255,255,0.03)" stroke={accent} strokeOpacity="0.7" />
      <circle cx="48" cy="44" r="5" fill={rarity.fill} />
      <circle cx="144" cy="44" r="5" fill={rarity.fill} />
      <circle cx="48" cy="76" r="5" fill={rarity.fill} />
      <circle cx="144" cy="76" r="5" fill={rarity.fill} />
      <path d="M64 60 H128" stroke={rarity.stroke} strokeWidth="2" opacity="0.7" />
      <path d="M96 42 V78" stroke={accent} strokeWidth="2" opacity="0.45" />
      <text x="96" y="66" textAnchor="middle" fill={rarity.stroke} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, letterSpacing: "0.18em", fontWeight: 700 }}>
        FRAME
      </text>
    </>
  );
}

function CarArt({ item }: { item: ShopItem }) {
  const { rarity, accent, rotate } = getTheme(item);

  return (
    <>
      <path d="M34 76 L48 52 H130 L154 62 L166 76 Z" fill="rgba(7,17,28,0.8)" stroke={rarity.stroke} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M58 52 L74 38 H122 L136 52 Z" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="58" cy="78" r="12" fill="#09111c" stroke={rarity.fill} strokeWidth="3" />
      <circle cx="140" cy="78" r="12" fill="#09111c" stroke={rarity.fill} strokeWidth="3" />
      <circle cx="58" cy="78" r="4" fill={accent} />
      <circle cx="140" cy="78" r="4" fill={accent} />
      <path d="M48 66 H146" stroke={rarity.fill} strokeWidth="2" opacity="0.5" />
      <text
        x="98"
        y="46"
        textAnchor="middle"
        fill={rarity.stroke}
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 14,
          letterSpacing: "0.2em",
          fontWeight: 700,
          transform: `rotate(${rotate}deg)`,
          transformOrigin: "98px 44px",
        }}
      >
        {getLabel(item)}
      </text>
    </>
  );
}

function HouseArt({ item }: { item: ShopItem }) {
  const { rarity, accent, dash } = getTheme(item);

  return (
    <>
      <path d="M32 58 L96 20 L160 58" fill="none" stroke={rarity.stroke} strokeWidth="3" strokeLinejoin="round" />
      <rect x="46" y="58" width="100" height="42" rx="6" fill="rgba(7,17,28,0.82)" stroke={accent} strokeWidth="2" />
      <rect x="88" y="68" width="18" height="32" rx="4" fill={accent} fillOpacity="0.18" stroke={accent} />
      <rect x="60" y="70" width="16" height="14" rx="4" fill={rarity.fill} fillOpacity="0.2" stroke={rarity.fill} strokeDasharray={`${dash} ${dash}`} />
      <rect x="116" y="70" width="16" height="14" rx="4" fill={rarity.fill} fillOpacity="0.2" stroke={rarity.fill} strokeDasharray={`${dash} ${dash}`} />
      <path d="M26 100 H166" stroke={rarity.fill} strokeWidth="2" opacity="0.38" />
      <circle cx="148" cy="36" r="8" fill={accent} fillOpacity="0.2" stroke={accent} />
    </>
  );
}

function artForCategory(item: ShopItem) {
  if (item.category === "titles") return <TitleArt item={item} />;
  if (item.category === "frames") return <FrameArt item={item} />;
  if (item.category === "cars") return <CarArt item={item} />;
  return <HouseArt item={item} />;
}

export default function ItemArt({
  item,
  size = "card",
}: {
  item: ShopItem;
  size?: "card" | "hero";
}) {
  const { rarity } = getTheme(item);
  const style: CSSProperties =
    size === "hero"
      ? { width: "100%", maxWidth: 360, filter: `drop-shadow(0 16px 28px ${rarity.glow})` }
      : { width: "100%", filter: `drop-shadow(0 10px 18px ${rarity.glow})` };

  return (
    <svg viewBox="0 0 192 120" style={style} aria-hidden="true">
      <rect x="4" y="4" width="184" height="112" rx="28" fill="rgba(255,255,255,0.03)" stroke={rarity.stroke} strokeOpacity="0.32" />
      <circle cx="28" cy="22" r="3" fill={rarity.fill} opacity="0.8" />
      <circle cx="164" cy="96" r="3" fill={rarity.fill} opacity="0.55" />
      {artForCategory(item)}
    </svg>
  );
}
