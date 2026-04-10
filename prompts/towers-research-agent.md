# Prompt: Research Agent for Towers Sprites + UI Concepts

You are a **research + prototyping agent** helping build a web casino-style game named **Towers**.

## Game context
- Towers core loop: each floor presents **3 doors**.
- Exactly one door is safe.
- If player picks safe door, they climb to next floor and multiplier increases.
- If player picks wrong door, run ends.
- Player can cash out between floors.

## Your mission
Find high-quality **publicly available GitHub repositories** that contain game-ready visual assets (sprites, SVGs, UI packs, icons, FX) suitable for Towers, then generate a standalone HTML demo that previews multiple UI styles using those assets.

## Hard requirements
1. **Source quality + legality**
   - Only include assets from public repos with clear licenses (MIT, Apache-2.0, CC0, CC-BY, or equivalent game-friendly license).
   - Exclude assets with ambiguous or restrictive licensing.
   - For every selected source, provide: repo URL, asset path(s), license type, and attribution requirements.

2. **Asset format**
   - Prioritize SVG and sprite sheets (PNG/WebP okay if quality is high).
   - Prefer packs that include: doors, backgrounds, particles/VFX, UI frames, buttons, gems/coins, and typography options.

3. **Deliverables**
   - `asset-catalog.json` with at least 15 candidate assets grouped by category.
   - `shortlist.md` with top 5 curated combinations (each combination = coherent visual style).
   - `towers-ui-explorer.html` that renders multiple Towers UI concepts and lets the user pick one.

4. **HTML demo behavior**
   - Show at least **4 UI concepts** side-by-side (e.g., Neon Cyber, Fantasy Temple, Minimal Glass, Arcade Retro).
   - Each concept must display:
     - tower progress indicator (floors)
     - 3 clickable doors
     - multiplier/cashout panel
     - outcome area (safe/bust)
   - Include a **"Select this style"** button for each concept.
   - Persist chosen style in `localStorage` under key `towers.selectedStyle`.
   - Show selected style summary at top.
   - Keep demo fully static (plain HTML/CSS/JS, no build step).

5. **Implementation details for HTML**
   - Use CSS variables per theme for rapid recoloring.
   - Structure as reusable component functions in vanilla JS.
   - Add keyboard accessibility (tab focus + Enter/Space to pick doors).
   - Mobile responsive down to 360px width.

6. **Output format**
   Return exactly:
   1) A brief research summary.
   2) `asset-catalog.json` (code block)
   3) `shortlist.md` (code block)
   4) Full `towers-ui-explorer.html` (code block)
   5) A final checklist confirming license verification for every chosen source.

## Selection rubric
Score each candidate 1-5 on:
- Visual quality
- Style fit for risk/reward casino gameplay
- Asset completeness
- License safety
- Ease of integration in a Next.js web app

Prefer assets with strong readability at small sizes and high contrast for fast gameplay feedback.
