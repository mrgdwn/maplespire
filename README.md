# Wuxia Spire

**Wuxia Spire** is a classical Jin Yong-inspired Wuxia martial-arts pixel-art roguelite and endless spire RPG built for the **Reddit Daily Game Competition 2026** using [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview), Phaser 4, React 19 + Meta Astryx UI, Hono, and TypeScript.

---

## Core Gameplay & Combat

- **Classless Wuxia Wanderer:** Every climb starts unarmed with foundational **Taiji Fist** strikes and **Qinggong Cloud-Step**, with zero class lockouts.
- **Controls:**
  - **Click / Tap Canvas:** Shatters an exposed **Qi Flaw** (`QI FLAW! [CLICK / Q]`), or grants `+HASTE!` (`+0.22s` attack advance & `-0.25s` cooldown) when no flaw is active.
  - **`Q`:** Triggers **Meridian Shatter** when a Qi Flaw is exposed, otherwise casts **Dantian Burst** (Active Skill).
  - **`Space` / `E`:** `Space` shatters an exposed Qi Flaw or performs **Qinggong Cloud-Step** dash; `E` performs **Qinggong Cloud-Step**.
  - **`W`:** Drinks a **Medicinal Vial** heal.
  - **HUD Controls:** Toggle **Auto-Skill**, switch **1x / 2x Speed**, or click **`Retreat (Keep Loot)`** at any floor to bank 100% of collected loot.
- **Interactive Qi Flaw Meridian Shatter (`Floor 20+`, Bosses, Hall Masters, Elites):** Enemies periodically expose a pulsing crimson-gold Qi Flaw ring (`2.6s` window). Striking with `Click` / `Q` / `Space` unleashes a **`3.5x ATK` guaranteed Crit** that pierces Hit-Shields, **breaks 3 Hit-Shield layers**, **stuns for `1.4s`**, **refunds 50% of active Martial Art & Dantian Burst cooldowns**, and drops `+8 × floor` Gold (`+1 Shard` on bosses).
- **100% Loot Retention:** Keep 100% of Gold, Shards, Boss Cores, and Equipment whether you extract mid-run, clear a Cult Leader checkpoint, or fall in battle.

---

## Martial Arts, Inner Qi & High-Realm Progression

Your build evolves organically as you ascend deeper (`src/shared/catalogs/wuxia.ts`):

| Floor Range | Active Martial Art Slots | Inner Qi Slots | Max Manual Level | High-Realm Breakthroughs |
| :--- | :---: | :---: | :---: | :--- |
| **Floors 1–10** | 3 | 3 | **Lv. 3 (Ultimate)** | Base + Ultimate projectile evolutions |
| **Floors 11–14** | 3 | 3 | **Lv. 4 (Grandmaster)** | Grandmaster visual & power Tier 3 |
| **Floors 15–20** | **4** | **4** | **Lv. 4 (Grandmaster)** | Expanded 8-slot martial loadout |
| **Floors 21+** | **4** | **4** | **Lv. 5 (Transcendent)** | Peak martial forms + Stackable Tribulation Scrolls once maxed |

### 3-Tier Projectile & Visual Evolution
Every Active Martial Art transforms visually across **Base (`Lv. 1–2`) → Ultimate (`Lv. 3`) → Grandmaster (`Lv. 4–5` & Awakened Synergies)** with bespoke evolved sprites, camera shake, Qinggong afterimages, shockwave rings, and multi-stage impacts.

### 14 Active Martial Arts & Decoupled Secret Synergies
Once an Active Martial Art reaches **Lv. 3+** alongside an awakened Passive Skill (**Lv. 1+**), a hidden **Peerless Synergy** card unlocks in drafts and is permanently recorded in your **Codex** (`???` until discovered). Synergies are decoupled—an active skill can awaken different synergies depending on which passive skill you master:

| Active Skill | Origin / Sect | Primary Compatible Passive Skill | Awakened Secret Peerless Synergy |
| :--- | :--- | :--- | :--- |
| **Great Shift of Heaven and Earth** | Ming Cult Bright Summit | **Nine-Yang Divine Sutra** | **Bright Summit Supreme Qiankun Reversal** — Screen-wide solar reversal (`4.25x ATK`) + ATK/Armor/Barrier |
| **Western Toad Divine Stance** | White Camel Mountain | **Nine-Yin True Sutra** | **Reversed Nine-Yin Demonic Toad** — 5 leaping venom-quake shockwaves (`4.60x ATK`, long stun) + ATK/Crit DMG/Lifesteal |
| **18 Dragon-Subduing Palms** | Beggar Sect Lineage | **Nine-Yin True Sutra** | **Nine-Yin True Dragon Sovereign** — 5 Yin-Yang Dragon Waves (`3.60x ATK`) + ATK/Crit/Speed |
| **18 Dragon-Subduing Palms** (Xiao Feng) | Demi-Gods / Beggar Sect | **Tendon-Changing Divine Classic** | **Heroic Dragon Heaven-Shatterer** — 6 golden dragon shockwaves (`4.10x ATK`) + ATK/Armor/HP |
| **Dragon-Slaying Saber Cleave** | Heavenly Saber Lineage | **Great Shift of Heaven and Earth** | **Heavenly Sword & Dragon Saber Dominion** — Dual shockwaves (`4.40x ATK`) + ATK/Dodge/Crit DMG |
| **Taiji Yin-Yang Swordplay** | Wudang Mountain Lineage | **Pure Yang Boundless Sutra** | **Taiji Supreme Void Harmony** — 8 rotating Yin-Yang Void Blades (`3.20x ATK`) + Armor/CDR/HP |
| **Six-Pulse Divine Sword** | Dali Royal Clan | **Lingbo Ripple Microsteps** | **Lingbo Celestial Six-Pulse Glide** — 8 swift royal sword lances (`3.25x ATK`) + Dodge/CDR/Speed |
| **Six-Pulse Divine Sword** | Dali Royal Clan | **Northern Abyss Absorption Sutra** | **Six-Pulse Heaven-Piercing Array** — 8 piercing sword-Qi beams (`3.10x ATK`) + CDR/Crit |
| **Shifting Stars Celestial Deflection** | Gusu Murong Clan | **Lingbo Ripple Microsteps** | **Celestial Ripple Return Stance** — 8 homing starlight counter-lances (`3.15x ATK`) + Dodge/CDR/Speed |
| **Black-Iron Heavy Cleave** | Sword Tomb Valley | **Solitary Nine-Sword Sutra** | **Nine-Sword Tomb Resonance** — 6 spectral orbiting blades (`4.20x ATK`) + Crit DMG/ATK |
| **Tianshan Six-Yang Plum Hand** | Spirit Vulture Palace | **Little Boundless Formless Sutra** | **Eight Desolations Frost Sovereign** — 7 frost-flame plum storms (`3.30x ATK`) + ATK/Crit/CDR |
| **Melancholic Soul-Severing Palm** | Eastern Sea Hermitage | **Nine-Yin True Sutra** | **Sovereign Melancholic Sea-Tide Palm** — 5 abyssal Soul-Severing tidal palms (`3.85x ATK`) + Lifesteal/ATK/Armor |
| **Jade Maiden Swordplay** | Ancient Tomb Lineage | **Jade Maiden Heart Sutra** | **Twin-Lotus Immortal Sword Array** — 6 phantom blades (`2.75x ATK`) + Crit/Speed/ATK |
| **Beggar Dog-Beating Staff** | Chief Rod Lineage | **Cloud-Step Sky Sutra** | **Thirty-Six Forms: Heaven Under Staff** — Emerald whirlwind (`3.10x ATK`, wide stun) + Dodge/CDR |
| **Peach Blossom Jade Flute** | Eastern Sea Pavilion | **Eight-Trigram Harmony Sutra** | **Azure Tide Peerless Symphony** — 6 chaining harmonic notes (`2.65x ATK`) + CDR/Gold/HP |
| **Flicking Finger Divine Thrum** | Peach Blossom Isle | **Ten-Dragon Sovereign Sutra** | **Ten-Dragon Sovereign Finger Cannon** — 6 seismic AoE cannons (`3.60x ATK`) + ATK/Armor/HP |

Features 14 Active Skills, 13 Passive Skills, and 23 Secret Synergies. Passive Skills are decoupled and can empower multiple active skills.

### 10 Stackable High-Realm Enlightenment Scrolls
Available once manuals are maxed (or late-floor breakthroughs) to keep **Floor 30+** runs dynamic, including three scrolls with active combat triggers:
- **Left-Right Mutual Hands (左右互搏):** `+14% ATK`, `+5% CDR`, and `+25% chance/stack` (up to `75%`) to **Double-Cast** any Martial Art.
- **Nine-Heavens Tribulation Lightning (九天雷劫):** `+18% ATK`, `+7% Crit Rate`, `+25% Crit DMG`, plus calls down a **Heaven Lightning Pillar every 3.5s** (`260% ATK × stacks` AoE + stun).
- **Dugu Nine Swords — Shield-Breaker (獨孤九劍):** `+12% ATK`, `+8% Crit`, `+25% Crit DMG`, `+15%` Boss damage per stack, and shatters **`+1` extra Boss Hit-Shield layer per hit per stack**.
- Plus 7 additional stackable scrolls (*Eight-Meridian Overdrive*, *Golden Core Tempering*, *Crimson Lotus Blood Sutra*, *Nine-Heavens Cloud Stride*, *Immortal Jade Bone Forging*, *Four-Seas Merchant Decree*, *Supreme Sovereign Qi Domain*).

---

## Endless Cult Spire & Boss Encounters

Realms rotate every 3 floors across **5 Wuxia Cult Sects** (`src/shared/catalogs/biomes.ts`), featuring **15 unique Hall Master Mini-Bosses** and **15 rotating Cult Leaders**:

1. **White Camel Venom Cult** — *Split-Shadow Art* (Mitosis clones at 50% HP)
2. **Ancient Tomb Frost Sect** — *Cold Jade Qi Veil* (Regenerating hit-shields every 10s)
3. **Ming Flame Lotus Cult** — *Scorching Yang Aura* (Periodic AoE fire qi pressure)
4. **Blood Blade Demon Sect** — *Ghostly Footwork* (Shadow smoke evasion bursts)
5. **Heavenly Dragon Pagoda** — *Bloodline Surge* (`+15%` strike speed every 5s)

- **Boss Cadence:**
  - **Every 10th Floor (`10, 20, 30, 40...`):** Cult Leader Grand Bosses (scales indefinitely until you retreat or fall).
  - **2 Deterministic Hall Masters per 10-Floor Bracket:** Ambush floors inside each bracket with Boss Mutation Roulette.
  - **Mount Hua Summit (`Floors 25, 35, 45...`):** Spawns **two distinct Hall Masters simultaneously** with 2 roulette mutations and double Relic Chest spoils.

### Level Scaling Architecture (Early, Mid, Late & Endless Spire)

- **Early Game (Levels 1–10 · Outer Martial Courtyard):** `HP: 1.0 + (F-1)*0.08`, `ATK: 1.0 + (F-1)*0.04`. 3–5 mobs/wave. Floor 10 Cult Leader Tier 1 (4,800 HP). First optional extraction checkpoint.
- **Mid Game (Levels 11–20 · Inner Sect Pagoda):** `HP: 1.72 * 1.10^(F-10)`, `ATK: 1.36 + (F-10)*0.08`. 4–6 mobs/wave. Unlocks 4th active/inner slots and Lv. 4 Breakthroughs. Floor 20 Cult Leader Tier 2 (26,000 HP). Second optional extraction checkpoint.
- **Late Game (Levels 21–30 · Grandmaster Peak):** `HP: 4.46 * 1.10^(F-20)`, `ATK: 2.16 + (F-20)*0.12`. 5–7 mobs/wave. Transcendent breakthroughs & Secret Synergies. Floor 25 Mount Hua Dual Master Ambush. **Floor 30 Supreme Cult Leader Tier 3 (95,000 HP) completes the Daily Dungeon!**
- **Endless Spire (Levels 31+ · Endless Heavenly Spire):** Stretched-out scaling with `HP: 11.57 * 1.06^(F-30)` and `ATK: 3.36 * 1.035^(F-30)`. Extraction checkpoints continue every 10 floors (Floor 40: 165k HP, Floor 50: 285k HP, Floor 60: 480k HP), providing an enduring high-floor progression curve without artificial mathematical brick walls.
- **6 Boss Mutations:** `Golden-Gilded`, `Juggernaut`, `Hasted`, `Vampiric`, `Volatile`, `Twin-Soul`.

---

## Jin Yong Legendary Weapons & Camp Progression

- **Zero Elemental Gear Sockets:** All equipment is pure martial gear (`maxSockets: 0`, `sockets: []`) across `weapon`, `headgear`, `top`, and `cape` slots.
- **48 Legendary Relics (`src/shared/catalogs/legendaries.ts`):** Features **12 iconic weapons from Jin Yong's novels** (with 50% weapon drop weighting and floor-scaled Power `42 + 2.8/floor` above F10):
  - *Dragon-Slaying Saber (屠龍刀)*, *Xuantie Heavy Iron Sword (玄鐵重劍)*, *Golden Serpent Sword (金蛇劍)*
  - *Heaven-Reliant Sword (倚天劍)*, *Dog-Beating Bamboo Staff (打狗棒)*, *Green-Jade Peach Blossom Flute (碧玉簫)*
  - *Gentleman & Lady Twin Swords (君子淑女劍)*, *Cold-Iron Black Sword (墨劍)*, *White-Camel Serpent Staff (怪蛇杖)*
  - *Mongol Iron-Horn Great Bow (哲別鐵胎弓)*, *Gold-Bell Soft Silk Ribbon (金鈴索)*, *Five Sacred Wheels of Dharma (金剛五輪)*
  - Plus iconic treasures including *Soft Hedgehog Armor (軟蝟甲)*, *Wumu Military Treatise (武穆遺書)*, and *Nine-Yin Sacred Scripture (九陰真經)*.
- **Drop Rules & Altar of Fate Purification:** Defeating any Cult Leader guarantees 1 floor-scaled Legendary Relic (`10+` cleared floors trigger the **Altar of Fate 50/50 Purification Gamble** at run end); Hall Master floors (`F6+`) carry a `35%` chance to drop a bonus Legendary Relic (`65%` Pristine rate on extra drops).
- **Camp Hub Tabs (`OverlayManager.ts`):**
  - **`Hero`:** View/equip gear across 4 slots + 60-slot Inventory Bag + bulk/individual dismantling into Shards.
  - **`Upgrades`:** **Sect Forge** (`+10%`/level slot tempering + Normal auto-dismantle toggle), **The Sanctum** (purify Cursed Legendaries with Shards + Boss Cores), **Alchemy Altar** (unlock slots & banish Bronze buffs), and **Meridian Tempering** (account-wide `%` ATK, HP, Gold, Crit DMG).
  - **`Codex`:** Discovery log for Peerless Synergies, Martial Manual evolution tiers (`Lv.1 / Lv.3 / Lv.5`), and the 48-item Legendary Codex.
  - **`Leaderboard`:** Daily Ranked Challenge leaderboard (`daily:YYYY-MM-DD`).

---

## Tech Stack & Architecture

- **Platform:** [Devvit Web](https://developers.reddit.com/) (`@devvit/web`, `@devvit/start` `0.15.3`)
- **Client:** [Phaser](https://phaser.io/) `4.2.1` + React `19` + Meta Astryx UI (`@astryxdesign/core`) + Vite `8` + TypeScript `6`
- **Server:** [Hono](https://hono.dev/) `4` REST endpoints (`/api/init`, `/api/run/start`, `/api/run/complete`, `/api/camp/action`, `/api/share-comment`) + Devvit Redis (`@devvit/web/server`)
- **Prerequisites:** Node.js `>=24.0.0` and a Reddit Developer account

## Getting Started & Scripts

1. Install dependencies:
   ```bash
   npm install
   ```
2. Log in to Reddit CLI:
   ```bash
   npm run login
   ```
3. Ensure `"name"` in `devvit.json` matches your registered Devvit app slug on [developers.reddit.com](https://developers.reddit.com/new) (currently `"wuxia-spire"`).
4. Start live playtesting on your test subreddit:
   ```bash
   npm run dev
   ```

### Available Commands
- `npm run dev` — Start Devvit live playtest (`devvit playtest`)
- `npm run build` — Build production client (`dist/client`) and server (`dist/server`) bundles
- `npm run test:types` — Run TypeScript compiler check (`tsc --build`)
- `npm run lint` — Run ESLint across `src/**/*.{ts,tsx}`
- `npm run test:unit` — Run all unit test suites (`src/server/buffs.test.ts`, `src/server/gameLogic.test.ts`, `src/server/wuxia.test.ts`)
- `npm run deploy` — Typecheck, lint, and upload to Reddit (`devvit upload`)
- `npm run launch` — Deploy and publish (`devvit publish`)
