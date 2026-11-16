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
