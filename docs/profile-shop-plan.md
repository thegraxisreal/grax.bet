# Profile + Shop Plan

This document is the working product and implementation plan for the profile, inventory, and shop part of `grax.bet`.

The goal is not to add grind systems like XP, streaks, or battle passes.
The goal is to give fake money a purpose, give users a public identity, and give chat/feed/leaderboard usernames somewhere meaningful to go.

## Product Goal

Build a lightweight social flex system where:

- users can own cosmetic/status items
- users can equip a small set of showcase items
- every username on the site can open a public profile
- winnings convert into visible identity instead of just a bigger number

This should feel like luxury/flex/chaos, not homework.

## Core Principles

- Keep it visual, simple, and status-heavy
- Do not turn this into an RPG inventory simulator
- Do not require progression systems like XP or streaks
- Do not launch with profile photo uploads
- Make every category have cheap, mid, and absurdly expensive items
- Make the profile page feel like a flex page, not a settings page
- Make usernames clickable from leaderboard, chat, and feed

## Why This Fits The Site

Current site strengths:

- multiple fast games
- live event layer
- chat/feed/social spectacle
- leaderboard and usernames

Current missing piece:

- balance has weak long-term purpose

Profiles + shop fix that without changing the core game loop.

## Scope Order

Build in this order:

1. Public profile page
2. Shop page
3. Inventory + equip system
4. Clickable usernames across the site
5. Small profile stats and showcase polish

Do not start with:

- profile image uploads
- trading
- auctions
- player housing interiors
- garages with multiple active cars
- gifting
- achievements/streak systems

## Launch Version

### Public Profile Page

Purpose:

- make every user have a public flex page
- show identity, wealth, and owned/equipped items

First version should show:

- username
- current balance
- equipped title/tag
- equipped profile frame
- equipped banner
- equipped car
- equipped house
- profile showcase section
- favorite game
- biggest win
- total games played
- total winnings

Optional later:

- recent big wins
- rarest owned item
- leaderboard position
- profile comments/reactions

### Shop

Purpose:

- give users something to spend money on
- keep fake money meaningful even outside live gameplay

First version:

- browsable shop page
- category filters
- item cards with price, rarity, preview
- buy button
- owned state
- equipped state if applicable

### Inventory

Purpose:

- let users see what they own and equip showcase items

First version:

- owned items by category
- equip one item per equip slot
- simple sorting: owned, equipped, price, rarity

## No Profile Photos At Launch

Decision:

- do not support profile photo uploads in v1

Why:

- moderation burden
- off-tone user content risk
- visual inconsistency
- takes focus away from shop/profile flex system

If added later:

- store image URL in Firestore only
- do not store raw images in app infra
- validate allowed domains or upload workflow
- add moderation rules before rollout

But this is explicitly not part of the first build.

## Identity Model

User identity should come from owned/equipped flex items, not avatars.

Primary identity surfaces:

- title/tag
- frame
- banner
- car
- house

Tone examples:

- classy luxury
- casino wealth
- goofy absurd flex
- game-specific status

Examples:

- `High Roller`
- `Card Shark`
- `Crash Addict`
- `Mines Demon`
- `Pit Boss`
- `Whale`
- `Bentley Boy`
- `Penthouse Owner`
- `Vault Keeper`

## Data Reality

The current economy has a median near the floor and massive whale outliers.

Implications:

- do not use mean pricing
- do not attempt precise economic balancing
- use price bands and rarity ladders
- every category needs reachable items and absurd whale items

Also fix bad balance data before shop logic depends on it:

- reject or clean `NaN`
- decide formatting rules for enormous balances
- make sure purchase logic handles large values safely

## Pricing Strategy

Use broad price bands across every category.

### Global Price Bands

- `Common`: `$50` to `$500`
- `Accessible`: `$1k` to `$25k`
- `Mid`: `$50k` to `$1M`
- `High`: `$2.5M` to `$100M`
- `Luxury`: `$250M` to `$10B`
- `Whale`: `$25B` to `$1T`
- `Absurd`: `$10T+`

Design rule:

- every category gets items in multiple bands
- every user should see:
- one item they can buy now
- one item they want next
- one item that feels impossible

## Initial Item Categories

Launch with four categories only:

1. Titles
2. Frames
3. Cars
4. Houses

Do not expand categories until the base loop works.

Good later categories:

- banners
- casino flex items
- table skins
- chip sets
- trophies

## Starter Catalog Structure

Each category should launch with around 8 items.

Recommended shape per category:

- 2 cheap items
- 2 accessible/mid items
- 2 aspirational items
- 2 whale/absurd items

### Example Titles

- Rookie: `$50`
- Lucky: `$500`
- Card Shark: `$5k`
- High Roller: `$100k`
- Table Boss: `$5M`
- Pit Boss: `$250M`
- Whale: `$50B`
- Money Printer: `$10T`

### Example Frames

- Bronze Frame: `$100`
- Neon Green Frame: `$2k`
- Gold Foil Frame: `$50k`
- Red Velvet Frame: `$750k`
- Diamond Pulse Frame: `$25M`
- Vault Edge Frame: `$1B`
- Private Jet Trim Frame: `$100B`
- Celestial Gold Frame: `$50T`

### Example Cars

- Rust Bucket: `$500`
- Street Coupe: `$15k`
- Blacked-Out SUV: `$250k`
- Track Charger: `$2M`
- Lamborghini: `$75M`
- Bugatti: `$5B`
- Gold Hypercar: `$500B`
- F1 Prototype: `$25T`

### Example Houses

- Tiny Apartment: `$1k`
- Suburban House: `$50k`
- Modern Villa: `$1M`
- Mansion: `$25M`
- Penthouse: `$1B`
- Island Estate: `$50B`
- Casino Tower: `$5T`
- Private Kingdom: `$100T`

## Equip Model

Keep equip rules simple.

Users can equip:

- 1 title
- 1 frame
- 1 car
- 1 house

Possible later:

- 1 banner
- 1 featured trophy

Do not allow multiple active items per slot in v1.

## Profile Layout

The profile should feel like a full flex card or hero page.

### Suggested Layout

Top hero section:

- large username
- equipped title
- big balance display
- banner background
- frame treatment

Primary showcase row:

- equipped car visual
- equipped house visual

Stats row:

- favorite game
- biggest win
- total winnings
- games played

Owned highlights:

- rarest owned item
- total owned items
- category counts

Action area:

- if viewing self: `Edit Showcase`, `Open Inventory`, `Open Shop`
- if viewing another user: `View Collection`

## Public Routing

Usernames should open public profiles from:

- leaderboard
- chat
- activity feed

Suggested route shape:

- `/u/[username]`

If the username does not exist:

- show a clean not-found state

## Firebase / Data Model

Keep this simple and explicit.

### Users Collection

Current user doc already includes:

- `username`
- `balance`
- `totalWinnings`
- `gamesPlayed`

Add profile-facing fields:

- `favoriteGame`
- `biggestWin`
- `equippedTitleId`
- `equippedFrameId`
- `equippedCarId`
- `equippedHouseId`
- `equippedBannerId` optional, later

### Owned Items

Recommended shape:

- subcollection: `users/{username}/inventory/{itemId}`

Fields:

- `itemId`
- `category`
- `purchasedAt`
- `pricePaid`

Alternative:

- store owned item IDs on user doc if inventory stays tiny

Recommendation:

- use subcollection for cleaner scaling and querying

### Shop Catalog

Recommended:

- static source-controlled catalog in app code first

Why:

- easier to iterate
- no admin tools required
- consistent pricing and previews

Later:

- move to Firestore if live rotation/admin editing becomes necessary

## Suggested Type Model

Useful app concepts:

- `ShopCategory`
- `ShopItem`
- `OwnedItem`
- `EquippedLoadout`
- `PublicProfile`

Each `ShopItem` should include:

- `id`
- `name`
- `category`
- `price`
- `rarity`
- `previewAsset`
- `description`
- `isLimited` optional

## Purchase Rules

Keep buying friction low.

Rules:

- users can buy an item if balance >= price
- buying subtracts balance immediately
- buying writes inventory record
- duplicate purchases should be blocked unless intentional
- equip can happen immediately after purchase

First version should not support:

- refunds
- reselling
- trading
- gifting

## UX Rules

- make shop previews visual, not text-heavy
- owned and equipped states must be obvious
- profile should load fast and feel premium
- category navigation should be simple
- do not bury the profile route

Important:

- the profile should not feel like settings
- the shop should not feel like ecommerce
- both should feel like status/flex surfaces

## Technical Sequence

### Phase 1: Foundation

- clean invalid leaderboard balance data
- define item catalog types
- create starter catalog in code
- add profile fields to user type/model

### Phase 2: Public Profiles

- add `/u/[username]`
- fetch public user data
- render hero, balance, stats, equipped items
- add clickable usernames from leaderboard/chat/feed

### Phase 3: Inventory + Equip

- create inventory fetch/write helpers
- create equip helpers
- create self inventory view
- show equipped state on profile

### Phase 4: Shop

- build category-based shop UI
- implement purchase flow
- update balance and inventory
- allow equip after purchase

### Phase 5: Polish

- better art/visuals for items
- profile animations
- rarity styling
- mobile polish
- loading/empty/error states

## Open Product Decisions

These should be decided before implementation gets deep:

1. Are item visuals hand-made cards/illustrations, emoji-based, or image assets?
2. Is the shop catalog static in code for v1?
3. Do users equip a banner in v1 or leave that for later?
4. Should users be able to see another player’s full inventory or only equipped items?
5. Should there be limited-time items at launch or only permanent items?

Recommended answers:

1. Start with code/static visual cards, not user-uploaded media
2. Yes, static catalog in code for v1
3. Optional; can ship after titles/frames/cars/houses
4. Start with equipped items + owned counts, not full inventory dump
5. No limited items at launch

## What To Avoid

- no XP bars
- no streak system
- no achievement wall as the main loop
- no complicated item stats
- no gameplay advantages from items
- no profile photos at launch
- no trading economy at launch
- no giant inventory management UI

## Success Criteria

This feature is successful if:

- users spend balance on cosmetics/status items
- usernames feel more meaningful across the site
- public profiles become something users click into
- whales still have aspirational purchases
- normal players can afford early items quickly
- the system increases identity without adding chores

## Starter Prompt For AI

Use this when continuing implementation with AI:

> Build the profile + shop system for `grax.bet` using the plan in `docs/profile-shop-plan.md`. Keep the feature lightweight and status-focused. Do not add XP, streaks, or profile photo uploads. Start with public profiles, a static in-code shop catalog, inventory/equip support for titles/frames/cars/houses, and clickable usernames across leaderboard/chat/feed. Preserve the current site tone and visual language.

