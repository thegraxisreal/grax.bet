# Profile + Shop Starter Catalog

This file is the v1 starter catalog for the `grax.bet` profile + shop system.

Use this with `docs/profile-shop-plan.md`.

The goals of this catalog:

- every category has items across multiple price ranges
- normal players can buy something early
- mid-tier players have steady aspiration targets
- whales still have impossible-looking flex purchases

This is a launch catalog, not the final economy.

## Catalog Rules

- Categories in v1: `titles`, `frames`, `cars`, `houses`
- Equip slots in v1: `1 title`, `1 frame`, `1 car`, `1 house`
- All items are cosmetic only
- No gameplay advantage
- No duplicate purchases
- Catalog should be static in code for v1

## Rarity Tiers

Use these rarity labels:

- `common`
- `uncommon`
- `rare`
- `epic`
- `legendary`
- `mythic`

Rarity should mainly affect presentation and perceived status, not mechanics.

## Titles

```ts
export const TITLE_ITEMS = [
  {
    id: "title-rookie",
    category: "titles",
    name: "Rookie",
    price: 50,
    rarity: "common",
    description: "You showed up with your first chip.",
  },
  {
    id: "title-lucky",
    category: "titles",
    name: "Lucky",
    price: 500,
    rarity: "common",
    description: "A little suspicious, but still believable.",
  },
  {
    id: "title-card-shark",
    category: "titles",
    name: "Card Shark",
    price: 5000,
    rarity: "uncommon",
    description: "A clean, classic casino flex.",
  },
  {
    id: "title-hot-table",
    category: "titles",
    name: "Hot Table",
    price: 25000,
    rarity: "uncommon",
    description: "The kind of person everyone watches.",
  },
  {
    id: "title-high-roller",
    category: "titles",
    name: "High Roller",
    price: 100000,
    rarity: "rare",
    description: "The obvious status purchase.",
  },
  {
    id: "title-crash-addict",
    category: "titles",
    name: "Crash Addict",
    price: 750000,
    rarity: "rare",
    description: "A little unwell, highly respected.",
  },
  {
    id: "title-mines-demon",
    category: "titles",
    name: "Mines Demon",
    price: 5000000,
    rarity: "epic",
    description: "Cold hands. No fear.",
  },
  {
    id: "title-pit-boss",
    category: "titles",
    name: "Pit Boss",
    price: 50000000,
    rarity: "epic",
    description: "The floor opens when you walk in.",
  },
  {
    id: "title-whale",
    category: "titles",
    name: "Whale",
    price: 1000000000,
    rarity: "legendary",
    description: "You move numbers more than chips.",
  },
  {
    id: "title-vault-keeper",
    category: "titles",
    name: "Vault Keeper",
    price: 25000000000,
    rarity: "legendary",
    description: "Balance no longer looks real.",
  },
  {
    id: "title-money-printer",
    category: "titles",
    name: "Money Printer",
    price: 1000000000000,
    rarity: "mythic",
    description: "Economically irresponsible.",
  },
  {
    id: "title-house-always-loses",
    category: "titles",
    name: "House Always Loses",
    price: 50000000000000,
    rarity: "mythic",
    description: "A title for the truly broken economy.",
  },
] as const;
```

## Frames

```ts
export const FRAME_ITEMS = [
  {
    id: "frame-bronze",
    category: "frames",
    name: "Bronze Trim",
    price: 100,
    rarity: "common",
    description: "A clean first upgrade.",
  },
  {
    id: "frame-neon-green",
    category: "frames",
    name: "Neon Green",
    price: 2000,
    rarity: "common",
    description: "Cheap and loud in the right way.",
  },
  {
    id: "frame-red-velvet",
    category: "frames",
    name: "Red Velvet",
    price: 15000,
    rarity: "uncommon",
    description: "Casino lounge energy.",
  },
  {
    id: "frame-black-gold",
    category: "frames",
    name: "Black Gold",
    price: 125000,
    rarity: "rare",
    description: "The first frame that feels expensive.",
  },
  {
    id: "frame-diamond-edge",
    category: "frames",
    name: "Diamond Edge",
    price: 2500000,
    rarity: "rare",
    description: "Sharp, icy, and excessive.",
  },
  {
    id: "frame-vault-door",
    category: "frames",
    name: "Vault Door",
    price: 50000000,
    rarity: "epic",
    description: "Looks like your profile is sealed shut.",
  },
  {
    id: "frame-private-jet-trim",
    category: "frames",
    name: "Private Jet Trim",
    price: 5000000000,
    rarity: "legendary",
    description: "Thin metal, huge flex.",
  },
  {
    id: "frame-emerald-fire",
    category: "frames",
    name: "Emerald Fire",
    price: 150000000000,
    rarity: "legendary",
    description: "Glows like a very bad decision.",
  },
  {
    id: "frame-celestial-gold",
    category: "frames",
    name: "Celestial Gold",
    price: 10000000000000,
    rarity: "mythic",
    description: "You are no longer on the normal market.",
  },
  {
    id: "frame-house-account",
    category: "frames",
    name: "House Account",
    price: 250000000000000,
    rarity: "mythic",
    description: "A frame for balances that stopped making sense.",
  },
] as const;
```

## Cars

```ts
export const CAR_ITEMS = [
  {
    id: "car-rust-bucket",
    category: "cars",
    name: "Rust Bucket",
    price: 500,
    rarity: "common",
    description: "Barely starts. Strong aura.",
  },
  {
    id: "car-street-coupe",
    category: "cars",
    name: "Street Coupe",
    price: 15000,
    rarity: "common",
    description: "A reasonable first flex.",
  },
  {
    id: "car-blacked-out-suv",
    category: "cars",
    name: "Blacked-Out SUV",
    price: 250000,
    rarity: "uncommon",
    description: "Looks expensive from any distance.",
  },
  {
    id: "car-track-charger",
    category: "cars",
    name: "Track Charger",
    price: 2500000,
    rarity: "rare",
    description: "For users who want to look fast in chat.",
  },
  {
    id: "car-gwagon",
    category: "cars",
    name: "G-Wagon",
    price: 12000000,
    rarity: "rare",
    description: "Heavy, square, obvious.",
  },
  {
    id: "car-lamborghini",
    category: "cars",
    name: "Lamborghini",
    price: 75000000,
    rarity: "epic",
    description: "The first truly shameless purchase.",
  },
  {
    id: "car-bugatti",
    category: "cars",
    name: "Bugatti",
    price: 5000000000,
    rarity: "legendary",
    description: "Extremely efficient money vaporization.",
  },
  {
    id: "car-gold-hypercar",
    category: "cars",
    name: "Gold Hypercar",
    price: 500000000000,
    rarity: "legendary",
    description: "Subtle in all the wrong ways.",
  },
  {
    id: "car-f1-prototype",
    category: "cars",
    name: "F1 Prototype",
    price: 25000000000000,
    rarity: "mythic",
    description: "Built for users who no longer live on roads.",
  },
  {
    id: "car-casino-limo-fleet",
    category: "cars",
    name: "Casino Limo Fleet",
    price: 1000000000000000,
    rarity: "mythic",
    description: "Not one car. A fleet. Naturally.",
  },
] as const;
```

## Houses

```ts
export const HOUSE_ITEMS = [
  {
    id: "house-studio-apartment",
    category: "houses",
    name: "Studio Apartment",
    price: 1000,
    rarity: "common",
    description: "Small, honest, and indoors.",
  },
  {
    id: "house-suburban-home",
    category: "houses",
    name: "Suburban Home",
    price: 50000,
    rarity: "common",
    description: "A respectable early flex.",
  },
  {
    id: "house-modern-loft",
    category: "houses",
    name: "Modern Loft",
    price: 750000,
    rarity: "uncommon",
    description: "Glass walls and poor financial judgment.",
  },
  {
    id: "house-hillside-villa",
    category: "houses",
    name: "Hillside Villa",
    price: 5000000,
    rarity: "rare",
    description: "A profile upgrade that actually lands.",
  },
  {
    id: "house-mansion",
    category: "houses",
    name: "Mansion",
    price: 50000000,
    rarity: "rare",
    description: "The first house that screams money.",
  },
  {
    id: "house-penthouse",
    category: "houses",
    name: "Penthouse",
    price: 1000000000,
    rarity: "epic",
    description: "Proper skyline flex.",
  },
  {
    id: "house-island-estate",
    category: "houses",
    name: "Island Estate",
    price: 100000000000,
    rarity: "legendary",
    description: "Expensive enough to feel fake.",
  },
  {
    id: "house-casino-tower",
    category: "houses",
    name: "Casino Tower",
    price: 5000000000000,
    rarity: "legendary",
    description: "At this point you are the skyline.",
  },
  {
    id: "house-private-kingdom",
    category: "houses",
    name: "Private Kingdom",
    price: 100000000000000,
    rarity: "mythic",
    description: "You stopped buying homes and started buying geography.",
  },
  {
    id: "house-moon-vault-palace",
    category: "houses",
    name: "Moon Vault Palace",
    price: 10000000000000000,
    rarity: "mythic",
    description: "A home for players who broke the concept of scale.",
  },
] as const;
```

## Combined Catalog Shape

Recommended code structure:

```ts
export const SHOP_ITEMS = [
  ...TITLE_ITEMS,
  ...FRAME_ITEMS,
  ...CAR_ITEMS,
  ...HOUSE_ITEMS,
] as const;
```

Recommended shared item type:

```ts
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
```

## UI Notes Per Category

Titles:

- display next to username
- should be concise
- avoid titles that are too long

Frames:

- apply to profile hero or profile card container
- use rarity styling heavily here

Cars:

- show in a dedicated showcase card
- should feel flashy and obvious

Houses:

- show as backdrop or separate showcase card
- should communicate scale/status quickly

## Economy Notes

This catalog intentionally spans from `$50` to absurd numbers.

Why:

- median users need reachable purchases
- mid-tier users need multiple aspiration steps
- whales need ultra-luxury sinks

Do not use exact economy math to decide these values.
Use feel, spacing, and desire.

## Recommended Purchase Psychology

Each category should contain:

- a first purchase users can make almost immediately
- a second item that feels like progress
- a middle item that feels meaningful
- a luxury item that feels elite
- a whale item that feels stupid
- a mythic item that feels impossible

## Optional Future Additions

Good later additions after this catalog works:

- banners
- chip sets
- vaults
- private tables
- yachts
- trophies
- joke items
- limited event cosmetics

Not for launch.

## Starter Prompt For AI

Use this when implementing the catalog:

> Use `docs/profile-shop-plan.md` and `docs/profile-shop-catalog.md` as the source of truth. Implement the starter shop catalog exactly from the catalog doc, using a static in-code item list for titles, frames, cars, and houses. Preserve the pricing ladder and rarity structure.

