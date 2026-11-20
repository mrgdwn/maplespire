# Wuxia Spire — Project TODO & Future Backlog

This backlog tracks planned features and retention mechanics reserved for upcoming milestones.

---

## 1. Character Look Customization (Basic)
- **Overview**: Allow players to personalize their Wanderer's visual appearance from the Camp Roster / Wanderer tab.
- **Planned Scope**:
  - **Customization Options**:
    - Hairstyle & Hair Color (Classic Wuxia topknot, flowing wanderer hair, daoist braid, monk/bald).
    - Robe / Garment Tint (Azure, Crimson, Snow White, Shadow Jade, Midnight Black).
    - Skin Tone & Accent Details (Headband, eye patch, straw conical hat tint).
  - **Technical Hooks**:
    - Extend `PlayerProfile` in `src/shared/types.ts` with a `customization` schema (e.g., `hairStyleId`, `hairColor`, `outfitTint`, `skinTone`).
    - Integrate with paperdoll renderer in `src/client/fx/pixelArt.ts` (`renderHeroPaperdollCanvas`) and Phaser sprite sheet generation in `src/client/scenes/DungeonScene.ts`.
    - Add a "Customize Look" modal or drawer inside the Camp Roster tab.

---

## 2. Daily Login Gear Reward Track (7-Day Retention Cycle)
- **Overview**: A multi-day streak reward calendar to boost retention, giving guaranteed high-tier equipment milestones.
- **Planned Milestone Progression**:
  - **Day 1**: 200 Silver Taels + 1 Golden Ascent Writ.
  - **Day 2**: 15 Spirit Shards + 2 Healing Elixir draughts.
  - **Day 3**: **Guaranteed Rare Gear Drop** (unidentified or class-tailored Rare weapon/armor with random prefix/suffix affixes).
  - **Day 4**: 350 Silver Taels + 25 Spirit Shards.
  - **Day 5**: 2 Golden Ascent Writs + 50 Refinement Stones.
  - **Day 6**: 500 Silver Taels + 50 Spirit Shards.
  - **Day 7**: **Guaranteed Legendary Gear of Choice** — opens an interactive Selector Modal allowing the player to handpick 1 Legendary item from the 48 Jin Yong Legendary Catalog for their chosen Wanderer class.
- **Technical Hooks**:
  - Store login streaks and last claim timestamp in `PlayerProfile` (and synchronize via Devvit Redis backend `/api/profile`).
  - Add Daily Login modal popup upon entering Camp if a reward is ready to claim.
  - Hook reward selection into `addItemToInventory` / `parseGearItem`.

---

## 3. Gaming UI Declutter & Readability Pass (Completed)
- **Zone A — In-Combat Arena (`src/client/scenes/DungeonScene.ts`)**:
  - [x] **1. Damage Number Hierarchy** (Dead Cells): Small muted normal hits, bold gold crits, punchy crimson-gold Meridian Shatter, cap concurrent floating texts, remove noisy proc text callouts (`ZAP!`, `ARC`, `VOID PULL!`, `DODGE!`, `NEGATED!`).
  - [x] **2. Single Boss HP Bar** (Archero / Survivor.io): Hide duplicate overhead HP bar & nameplate on bosses, relying solely on the top-center Boss HP bar.
  - [x] **3. Damage-Only Regular Mob Bars** (Archero / Vampire Survivors): Hide regular mob overhead HP bars until they take damage (Elites always visible).
  - [x] **4. Simplified Hero Aura** (Dead Cells / Vampire Survivors): Reduce stacked hero glow/aura circles to 1 subtle ground ring + orbiting passive motes.
  - [x] **10. Compact Shield/Status Pips** (Slay the Spire): Replace boss/elite floating status text (`PERMAFROST ARMOR!`, `SMOKE BOMB!`, `ENRAGE`, `MITOSIS SPLIT!`) with compact shield/status pips next to the HP bar.
- **Zone B — Combat HUD Controls (`src/client/ui/OverlayManager.ts`, `src/client/game.css`)**:
  - [x] **5. Auto-Combat Smart Medallions** (Vampire Survivors / Brotato): Hide `Q` medallion when `Auto-Skill: ON`; reveal it when `Auto-Skill: OFF`.
  - [x] **6. Subtle Idle Fade** (Vampire Survivors / Hades): Dim bottom-right medallions and `Skills` pill to ~68% opacity while fighting, brightening to 100% on hover/focus or when `R` (Ult) is ready.
- **Zone C — Skill Draft & Build Readability (`src/client/ui/OverlayManager.ts`, `src/client/game.css`)**:
  - [x] **7. Whole-Card Clickable Drafts + Highlighted Numbers** (Hades): Remove `Learn Skill` buttons, make entire cards clickable, and highlight stat numbers (`+35%`, `4.2x`, `1.4s`) in bold gold/emerald.
  - [x] **8. Visual Level Pips** (Archero / Survivor.io): Replace `Lv. X/Y` text on draft cards and Skills drawer with visual level dots (pulsing gold dot for next upgrade level).
  - [x] **9. Clean Synergy Callout & Slim Draft Header** (Hades Duo Boons): Remove `"Equipped Skills:"` chip bar from draft modal, condense header to `Floor X · Active Y/Z · Passive A/B`, and highlight synergy-compatible cards with a glowing `SYNERGY` tag.

---

## 4. Camp Equipment Revamp & Jin Yong Relic Purity (Completed)
- [x] **1. Pure Jin Yong Relic Pass (`src/shared/catalogs/legendaries.ts`)**: Replace the 4 Gu Long holdovers (`Little Li`, `Lu Xiaofeng`, `Tang Clan`, `Chu Liuxiang`) with authentic Jin Yong relics (`Ice-Soul Silver Needles`, `Linghu Chong Wanderer Headband`, `Ancient Tomb Jade-Bee Hood`, `Yang Guo Human-Skin Mask`) and Wuxia-ize legacy hybrid names while keeping IDs save-compatible.
- [x] **2. Archero / Survivor.io Camp Equipment Screen (`src/client/ui/OverlayManager.ts`, `src/client/game.css`)**: Symmetrical 4-slot paperdoll showcase, slot-filterable icon-tile bag grid, 1-tap `Equip Best`, and inline stat-delta comparison card (`▲ +PWR` / `▼ -PWR`).

---

## 5. Daily vs. Endless Retention Loop, Login Streaks & Currency Sinks (Completed)
- [x] **1. Daily Spire (30F) vs. Endless Spire (31F+)**:
  - Daily Spire: `1.6x` Gold/Shards reward rate, **Daily Chests at F10 / F20 / F30**, **1 Rotating Daily Sect Decree**, and **1 Daily Mastery Bounty** (bonus Spirit Shards).
  - Endless Spire: Flatter scaling gradient past F30 (`1.045x` HP, `1.025x` ATK per floor) and lower reward rate (`0.65x`) as a relaxed build sandbox & Personal Best chase.
- [x] **2. Escalating Login Streak & Milestones (with 1 Grace Day/Week)**:
  - 7-Day Repeating Cycle: Day 1 Silver+Ticket, Day 2 Shards, **Day 3 Guaranteed Rare Gear**, Day 4 Silver+Shards, Day 5 Tickets+Core, Day 6 Silver+Shards, **Day 7 Slot-Choice Pristine Legendary** (`Weapon` / `Crown` / `Robe` / `Mantle`).
  - Long-Streak Milestones: **Day 14 Choose 1-of-3 Legendaries in Chosen Slot**, **Day 21 Free Cursed Relic Purification + Shards**, **Day 30 Grandmaster Selector (Handpick Any 1 of 48 Jin Yong Legendaries)**.
- [x] **3. Streamlined Currency Sinks (Zero Shop)**:
  - **Gold (farming & runs)** → Buy **Permanent Passive Stats** (`ATK`, `Max HP`, `Armor`, `Crit Rate`, `Crit DMG`, `Dodge`, `Cooldown Haste`, `Gold Find`).
  - **Spirit Shards (dismantling gear & Daily Bounties)** → Upgrade **Gear Slot Levels** (`Weapon`, `Crown`, `Robe`, `Mantle`, `+10%` gear power per level) + Purify Cursed Relics.
