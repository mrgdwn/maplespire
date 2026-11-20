# Game Design Document: *Wuxia Spire*

## 1. Game Overview & Core Loop
* **Genre:** Side-Scrolling Auto-Battler Roguelite / Daily Grind RPG
* **Visual Style:** 2D Pixel Art (Chibi proportions featuring classical Wuxia martial arts robes and sect landscapes, vibrant parallax backgrounds, bouncy physics-based loot drops, and chunky floating damage numbers).
* **Target Session Length:** 2–4 minutes per day.

### The Daily Loop
1. **Login & Camp Prep (30–60 sec):** Claim daily streak/rested bonus, check today's Boss Theme & 2x Bounty Class, upgrade gear/stats, and select 1 of 4 classes.
2. **The 30-Floor Daily Spire Run (90–180 sec):** Side-scrolling auto-walk to the right. Clear waves of sect cultists across **Early Game (Floors 1–10)**, **Mid Game (Floors 11–20)**, and **Late Game (Floors 21–30)**, pausing after each clear to draft **1 of 3 random active or passive skills** (with 2 targeted card refreshes per draft).
3. **Boss Mutation Roll & Checkpoint Extractions:** Before fighting Hall Master Mini-Bosses and Cult Leaders, a **Boss Mutation Roulette** spins to roll a random combat affix. Defeating Cult Leaders on Floor 10 and Floor 20 offers optional **Extraction Checkpoints** where players can bank 100% of collected loot if low on HP.
4. **Daily Climax & Endless Spire:** Conquering the **Floor 30 Supreme Cult Leader** successfully finishes the Daily Dungeon (`cleared`), unlocking the **Altar of Fate Greed Gamble** for guaranteed Unique Legendaries and recording official leaderboard scores. In **Endless Spire Mode**, players can push past Floor 30 with stretched-out scaling into Floors 40, 50, 60+.

---

## 2. Classes & Roster System (4 Wuxia Classes)
Players maintain an **Account Roster** where all 4 martial classes live in the pixel camp. Leveling any class grants a permanent passive bonus (**Link Skill**) to all other classes.

| Class | Weapon / Attack Style | Primary Scaling Stats | Draft Synergy Focus | Account Link Skill (Per 10 Lvls) |
| :--- | :--- | :--- | :--- | :--- |
| **Blade** | 2H Heavy Saber (Cleave + Stun) | Max HP, Armor, Base ATK | Iron Cleave, Lifesteal, Cursed Buffs | +3% Max HP to all classes |
| **Scholar** | Qi Staff / Fan (Floating Cast + Spells) | Skill Haste, Cooldown, Elemental | Burn, Freeze, Chain Lightning | +3% Skill Damage to all classes |
| **Shadow** | Daggers / Flying Needles (Rapid Hits) | Crit Rate, Crit DMG, Attack Speed | Execute, Bleed, Bonus Gold Drops | +2% Crit Rate to all classes |
| **Archer** | Meridian Bow (Long-Range Volley) | Multi-Hit, Projectile Count, Dodge | On-Hit Procs, Evasion Buffs | +3% Attack Speed to all classes |

### Job Advancements (Visual + Mechanical Milestones)
* **Lv. 1 (Novice):** Basic pixel martial robe and starter weapon.
* **Lv. 15 (1st Job):** Unlocks 1 passive class trait + subtle weapon glow.
* **Lv. 35 (2nd Job):** Adds 3 **Prismatic Class Buffs** to their floor draft pool + upgraded armor sprite.
* **Lv. 60 (3rd Job):** Unlocks an active Ultimate cooldown skill + floating pixel aura/cape.

---

## 2.5 Wuxia Active Martial Arts, Passive Skills & Secret Synergies (14 Active Skills, 13 Passive Skills & Meta Tiering)

Every run allows players to draft up to **3 Active Skills** and **3 Passive Skills** on Floors 1–14 (expanding to **4 Active Slots** and **4 Passive Slots** on Floors 15+). Once an Active Martial Art reaches **Lv. 3+** alongside an awakened Passive Skill (**Lv. 1+**), a hidden **Peerless Secret Synergy** unlocks in the draft pool. Synergies are decoupled and multi-branching.

### Meta Tier List & Comprehensive Breakdown

#### S-Tier (Dominant Meta — Supreme Crowd Clear, Lethality, or Universal Defense)
* **Active Skills:**
  * **Great Shift of Heaven and Earth** (`art_great_shift` · Ming Cult Bright Summit Lineage): Expanding Qiankun vortex pulling enemies across the screen, deflecting projectiles, and reversing damage with counter-force (`1.45x` -> `4.20x ATK`).
  * **Western Toad Divine Stance** (`art_toad_stance` · White Camel Mountain Lineage): Explosive leaping concussive viridian shockwave (`1.75x` -> `4.80x ATK`) with guaranteed long stun, heavy knockback, and venom DoT.
  * **Dragon-Slaying Saber Cleave** (`art_dragon_saber` · Heavenly Saber Lineage): Highest raw burst multiplier in the game (`1.90x` -> `5.20x ATK`), wide armor-sundering ground fissure, and guaranteed stun. Pairs into the `4.40x` Heavenly Dominion synergy.
  * **18 Dragon-Subduing Palms** (`art_dragon_palm` · Beggar Sect Lineage): 5 piercing imperial golden dragon waves (`1.35x` -> `3.70x ATK`) with massive lane-clearing knockback and boss stagger.
  * **Six-Pulse Divine Sword** (`art_six_pulse` · Dali Royal Clan): Rapid-cadence (`1300ms`) royal laser lances (`1.25x` -> `3.45x ATK`) with infinite pierce and `840 px/s` velocity. Dominates both dense waves and ranged bosses.
  * **Shifting Stars Celestial Deflection** (`art_shifting_stars` · Gusu Murong Clan): 6 starlight counter-lances (`1.25x` -> `3.40x ATK`) at `1320ms` cooldown with homing starcraft deflection.
* **Passive Skills:**
  * **Great Shift of Heaven and Earth** (`qi_great_shift` · Bright Summit Sacred Order): `+42% Dodge`, `+74% ATK`, and `+380 Floor Barrier`. The ultimate hybrid offense/defense passive that ensures survival on Floor 30+.
  * **Tendon-Changing Divine Classic** (`qi_yi_jin_jing` · Shaolin Bodhidharma Hermitage): `+120% Max HP`, `+130 Armor`, and `+45% Dodge/Tenacity`. The ultimate diamond foundation in Chinese martial arts.
  * **Lingbo Ripple Microsteps** (`qi_lingbo_steps` · Carefree Immortal Cave): `+42% Dodge`, `+70% Speed`, and `+48% Cooldown Reduction`. Evasion cap enabler and halves active technique cooldowns.
  * **Nine-Yang Divine Sutra** (`qi_nine_yang` · Shaolin Sacred Scroll): `+75% Max HP`, `+78 Armor`, and `+360 Floor Barrier`. Unstoppable raw health and damage mitigation pool.
  * **Solitary Nine-Sword Sutra** (`qi_solitary_sword` · Sword Demon Hermitage): `+180% Crit DMG`, `+72% ATK`, and `+32% Crit Chance`. The premier offensive damage amplifier in the game.

#### A-Tier (Strong & Highly Reliable — Consistent DPS, Crowd Control, or High Sustain)
* **Active Skills:**
  * **Taiji Yin-Yang Swordplay** (`art_taiji_sword` · Wudang Mountain Lineage): Circular Taiji sword rays (`1.20x` -> `3.45x ATK`) with rapid `1200ms` cadence, pulling and deflecting frontal waves.
  * **Black-Iron Heavy Cleave** (`art_heavy_iron` · Sword Tomb Valley): Massive falling greatsword shockwave (`1.85x` -> `5.00x ATK`) with guaranteed stun and wide screen tremors.
  * **Tianshan Six-Yang Plum Hand** (`art_tianshan_six_yang` · Spirit Vulture Palace): Dual Yin-Yang plum palm bursts and Life-and-Death frost talismans (`1.35x` -> `3.65x ATK`) with chill DoT.
  * **Melancholic Soul-Severing Palm** (`art_ice_needle` · Eastern Sea Hermitage): Abyssal sea-tide palms (`1.55x` -> `4.20x ATK`) with chill and heavy knockback.
* **Passive Skills:**
  * **Pure Yang Boundless Sutra** (`qi_pure_yang` · Wudang Daoist Hermitage): `+78% Max HP`, `+88 Armor`, and `+52% Cooldown Reduction`. The premier defensive tank and skill haste engine.
  * **Little Boundless Formless Sutra** (`qi_xiao_wuxiang` · Carefree Sect Vault): `+74% ATK`, `+46% Crit Chance`, and `+54% Cooldown Reduction`. The premier technique amplifier.
  * **Northern Abyss Absorption Sutra** (`qi_star_absorb` · Carefree Ravine): `+28% Lifesteal`, `+115% Crit DMG`, and `+125% Gold Bonus`. Infinite sustain and gold economy.
  * **Nine-Yin True Sutra** (`qi_nine_yin` · Sacred Imperial Vault): `+74% ATK`, `+45% Crit Chance`, and `+58% Attack Speed`. High-tempo offensive stat suite.

#### B-Tier (Situational / Specialized Utility — Requires Targeted Build Investment)
* **Active Skills:**
  * **Jade Maiden Swordplay** (`art_jade_sword` · Ancient Tomb Lineage): High cadence (`1180ms`) and 6 homing blades (`1.10x` -> `3.00x ATK`), but lacks hard crowd control/stuns.
  * **Beggar Dog-Beating Staff** (`art_dog_staff` · Chief Rod Lineage): 360-degree adjacent emerald spin (`1.20x` -> `3.35x ATK`) with 255px whirlwind stun. Elite anti-melee defense, lower single-target boss burst.
  * **Peach Blossom Jade Flute** (`art_jade_flute` · Eastern Sea Pavilion): Ricocheting harmonic notes (`1.05x` -> `2.85x ATK`) with gold generation. Great mob clear, moderate boss damage.
  * **Flicking Finger Divine Thrum** (`art_tantan_finger` · Peach Blossom Isle): Compressed crimson spirit pellets (`1.30x` -> `3.60x ATK`) with contact detonation. High single-target shockwave, smaller AoE radius.
* **Passive Skills:**
  * **Jade Maiden Heart Sutra** (`qi_jade_maiden` · Ancient Tomb Chamber): `+58% CDR`, `+68% Speed`, and `+42% Crit Chance`. High cadence, but zero defensive HP/Armor.
  * **Ten-Dragon Sovereign Sutra** (`qi_dragon_elephant` · Western Peak Sanctuary): `+95% ATK`, `+92% Max HP`, and `+98 Armor`. Massive raw stats, but zero CDR or Dodge mobility.
  * **Eight-Trigram Harmony Sutra** (`qi_bagua_harmony` · Peach Blossom Isle): `+52% CDR`, `+66% Max HP`, and `+110% Gold Bonus`. Strong economy, lower direct combat scaling.
  * **Cloud-Step Sky Sutra** (`qi_heaven_earth` · Wudang Cloud Peak): `+56% CDR`, `+38% Dodge`, and `+58% Speed`. Solid mobility, but superseded by Lingbo Microsteps.

---

### Decoupled Non-1:1 Active & Passive Skill Synergy Matrix
Passive Skills are **not locked 1-to-1** with Active Skills. A single Active Skill can awaken **different secret synergies** depending on which Passive Skill you learn, and a single universal Passive Skill can empower multiple distinct Active Skills—faithfully reflecting the rich, interconnected martial world of Jin Yong's literature.

| Tier | Active Skill | Novel / Sect Origin | Paired Passive Skill | Awakened Secret Synergy | Synergy Signature Combat Effect |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **S** | **Great Shift of Heaven and Earth** | *Heavenly Sword* / Ming Cult Bright Summit | **Nine-Yang Divine Sutra** | **Bright Summit Supreme Qiankun Reversal** | Screen-wide golden Qiankun solar explosion (`4.25x ATK`) + `+25% ATK`, `+45 Armor`, `+200 Barrier` |
| **S** | **Western Toad Divine Stance** | *Condor 1 & 2* / White Camel Ouyang Feng | **Nine-Yin True Sutra** | **Reversed Nine-Yin Demonic Toad** | 5 leaping viridian venom-quake shockwaves (`4.60x ATK`, long stun) + `+32% ATK`, `+50% Crit DMG`, `+8% Lifesteal` |
| **S** | **Western Toad Divine Stance** | *Condor 1* / Brute Strength | **Ten-Dragon Sovereign Sutra** | **Ten-Dragon Toad Cataclysm** | Cataclysmic concussive toad leap (`4.90x ATK`) + `+38% ATK`, `+35 Armor`, `+25% Max HP` |
| **S** | **Dragon-Slaying Saber Cleave** | *Heavenly Sword* / Heavenly Saber | **Great Shift of Heaven and Earth** | **Heavenly Sword & Dragon Saber Dominion** | 5 dual shockwaves (`4.40x ATK`) + `+22% ATK`, `+12% Dodge`, `+45% Crit DMG` |
| **S** | **Taiji Yin-Yang Swordplay** | *Heavenly Sword* / Zhang Wuji Pure Solar | **Nine-Yang Divine Sutra** | **Nine-Yang Taiji Sun Sword** | 8 blazing Taiji Sun Sword arcs (`3.50x ATK`) + `+22% ATK`, `+18% CDR`, `+30 Armor` |
| **S** | **18 Dragon-Subduing Palms** | *Condor 1 & 2* / Beggar Sect | **Nine-Yin True Sutra** | **Nine-Yin True Dragon Sovereign** | 5 surging Yin-Yang Dragon Waves (`3.60x ATK`) + `+24% ATK`, `+15% Crit Chance`, `+18% Speed` |
| **S** | **18 Dragon-Subduing Palms** | *Demi-Gods* / Xiao Feng | **Tendon-Changing Divine Classic** | **Heroic Dragon Heaven-Shatterer** | 6 roaring golden dragon shockwaves (`4.10x ATK`) + `+30% ATK`, `+40 Armor`, `+30% Max HP` |
| **S** | **18 Dragon-Subduing Palms** | *Heavenly Sword* / Hidden Scroll | **Nine-Yang Divine Sutra** | **True Dragon Sovereign Palm** | 5 golden imperial dragon waves (`3.40x ATK`) + `+22% ATK`, `+25 Armor`, `+120 Floor Barrier` |
| **S** | **Six-Pulse Divine Sword** | *Demi-Gods* / Dali Royal Clan | **Northern Abyss Absorption Sutra** | **Six-Pulse Heaven-Piercing Array** | 8 piercing royal sword beams (`3.10x ATK`) + `+18% CDR`, `+18% Crit Chance`, `+20% Speed` |
| **S** | **Six-Pulse Divine Sword** | *Demi-Gods* / Duan Yu | **Lingbo Ripple Microsteps** | **Lingbo Celestial Six-Pulse Glide** | 8 swift untargetable royal sword lances (`3.25x ATK`) + `+20% Dodge`, `+20% CDR`, `+25% Speed` |
| **S** | **Shifting Stars Celestial Deflection** | *Demi-Gods* / Gusu Murong Clan | **Lingbo Ripple Microsteps** | **Celestial Ripple Return Stance** | 8 homing starlight counter-lances (`3.15x ATK`) + `+15% Dodge`, `+18% CDR`, `+22% Speed` |
| **S** | **Taiji Yin-Yang Swordplay** | *Heavenly Sword* / Zhang Wuji | **Great Shift of Heaven and Earth** | **Great Shift Taiji Reversal** | 8 spinning Taiji Reversal vortex blades (`3.35x ATK`) + `+15% Dodge`, `+20 Armor`, `+180 Barrier` |
| **A** | **Taiji Yin-Yang Swordplay** | *Heavenly Sword* / Wudang Zhang Sanfeng | **Pure Yang Boundless Sutra** | **Taiji Supreme Void Harmony** | 8 rotating Yin-Yang Void Blades (`3.20x ATK`) + `+25 Armor`, `+18% CDR`, `+20% Max HP` |
| **A** | **Black-Iron Heavy Cleave** | *Condor 2* / Sword Tomb Valley | **Solitary Nine-Sword Sutra** | **Nine-Sword Tomb Resonance** | 6 spectral orbiting blades and fissures (`4.20x ATK`) + `+55% Crit DMG`, `+24% ATK` |
| **A** | **Black-Iron Heavy Cleave** | *Condor 2* / Jinlun Strength | **Ten-Dragon Sovereign Sutra** | **Ten-Dragon Mountain-Crushing Cleave** | Devastating blunt earth-splitter (`4.80x ATK`, long stun) + `+35% ATK`, `+30 Armor`, `+25% Max HP` |
| **A** | **Tianshan Six-Yang Plum Hand** | *Demi-Gods* / Spirit Vulture Palace | **Little Boundless Formless Sutra** | **Eight Desolations Frost Sovereign** | 7 frost-flame plum storms (`3.30x ATK`) + `+20% ATK`, `+16% Crit Chance`, `+15% CDR` |
| **A** | **Tianshan Six-Yang Plum Hand** | *Demi-Gods* / Life-and-Death Talisman | **Northern Abyss Absorption Sutra** | **Spirit Vulture Ice-Talisman Sovereign** | 8 piercing frost-talisman volleys (`3.40x ATK`) + `+8% Lifesteal`, `+18% CDR`, `+25% Gold` |
| **A** | **Shifting Stars Celestial Deflection** | *Demi-Gods* / Formless Mimicry | **Little Boundless Formless Sutra** | **Boundless Stellar Mirror Reflection** | 8 ricocheting astral starlight beams (`3.30x ATK`) + `+22% ATK`, `+20% CDR`, `+15% Crit Chance` |
| **A** | **Melancholic Soul-Severing Palm** | *Condor 2* / Eastern Sea Hermitage | **Nine-Yin True Sutra** | **Sovereign Melancholic Sea-Tide Palm** | 5 abyssal Soul-Severing tidal palms (`3.85x ATK`) + `+6% Lifesteal`, `+20% ATK`, `+20 Armor` |
| **B** | **Jade Maiden Swordplay** | *Condor 2* / Ancient Tomb Lineage | **Jade Maiden Heart Sutra** | **Twin-Lotus Immortal Sword Array** | 6 phantom lotus blades (`2.75x ATK`) + `+18% Crit Chance`, `+20% Speed`, `+16% ATK` |
| **B** | **Beggar Dog-Beating Staff** | *Condor 1* / Chief Rod Lineage | **Cloud-Step Sky Sutra** | **Thirty-Six Forms: Heaven Under Staff** | Emerald whirlwind (`3.10x ATK`, wide stun) + `+15% Dodge`, `+15% CDR`, `+16% Speed` |
| **B** | **Peach Blossom Jade Flute** | *Condor 1* / Eastern Sea Pavilion | **Eight-Trigram Harmony Sutra** | **Azure Tide Peerless Symphony** | 6 chaining harmonic notes (`2.65x ATK`) + `+15% CDR`, `+30% Gold Bonus`, `+18% Max HP` |
| **B** | **Flicking Finger Divine Thrum** | *Condor 1* / Peach Blossom Isle | **Ten-Dragon Sovereign Sutra** | **Ten-Dragon Sovereign Finger Cannon** | 6 seismic crimson finger-cannons (`3.60x ATK`) + `+30% ATK`, `+35 Armor`, `+20% Max HP` |

---

### 2.6 Archetype Projectile Visual System & Ascended Celestial Halos

To maintain crisp pixel clarity and thematic consistency across all 14 martial arts, projectiles share core archetype geometries while possessing distinct per-character color palettes, outer borders, and sunlit rim lights:

1. **Palm Qi Strike Archetype (`ARCHETYPE_PALM_GRID`)**:
   - **Guo Jing (`art_dragon_palm`)**: Solar Amber & Dragon Flame palette (`#ea580c`, `#f59e0b`, `#fde047`, `#ffffff`) with deep crimson-dragon border (`#7c2d12`) and sunlit gold rim.
   - **Yang Guo (`art_ice_needle`)**: Sorrowful Abyssal Ocean Tide palette (`#312e81`, `#4338ca`, `#6366f1`, `#a5b4fc`, `#ffffff`) with midnight ocean border (`#1e1b4b`) and moonlit sea rim.
   - **Tianshan Plum Hand (`art_tianshan_six_yang`)**: Tianshan Plum Blossom Frost palette (`#9f1239`, `#be123c`, `#f43f5e`, `#fbcfe8`, `#ffffff`) with dark plum wine border (`#500724`) and petal rim.
   - **Western Toad Stance (`art_toad_stance`)**: White Camel Venom Jade palette (`#065f46`, `#047857`, `#10b981`, `#6ee7b7`, `#ffffff`) with toxic viper border (`#022c22`) and lime bile rim.

2. **Flying Sword Archetype (`ARCHETYPE_FLYING_SWORD_GRID`)**:
   - **Jade Maiden Swordplay (`art_jade_sword`)**: Pink tassel, cyan blade, crystal white edge with rose-jade border (`#4c0519`).
   - **Taiji Yin-Yang Sword (`art_taiji_sword`)**: Daoist gold tassel, Yin-Yang monochrome blade with electric cyan meridian core and deep night border (`#090d16`).

3. **Heavy Blade Archetype (`ARCHETYPE_HEAVY_BLADE_GRID`)**:
   - **Black-Iron Heavy Cleave (`art_heavy_iron`)**: Obsidian purple and lavender meteorite edge with deep void border (`#2e1065`).
   - **Dragon-Slaying Saber (`art_dragon_saber`)**: Ancient bronze hilt, amber gold and flame edge with Imperial dragon border (`#451a03`).

4. **Whirling Vortex Archetype (`ARCHETYPE_VORTEX_WHEEL_GRID`)**:
   - **Dog-Beating Staff (`art_dog_staff`)**: Emerald bamboo green and mint with dark bamboo forest border (`#064e3b`).
   - **Great Shift of Heaven and Earth (`art_great_shift`)**: Ming Cult Holy Fire radiant gold and blood crimson with solar border (`#450a0a`).
   - **Shifting Stars Deflection (`art_shifting_stars`)**: Gusu Murong celestial cosmos starlight with cosmic indigo border (`#1e1b4b`).

5. **Meridian Lance Archetype (`ARCHETYPE_MERIDIAN_LANCE_GRID`)**:
   - **Six-Pulse Divine Sword (`art_six_pulse`)**: Royal Dali electric cyan and bright gold with royal cyan border (`#164e63`).
   - **Flicking Finger Divine Thrum (`art_tantan_finger`)**: Solar meteor orange, ember sparks and golden core with solar border (`#7c2d12`).

6. **Ascended Celestial Halos & Aura Graphics**:
   - When an active martial art reaches **Ascended Tiers** (Ultimate Lv. 3+, Grandmaster Lv. 5+, or Transcendent Secret Synergy), the projectile is wrapped in an extra rotating celestial halo graphic:
     - `fx_ascended_halo_dragon`: 18x18 flaming dragon solar halo with 4 corner flame prongs.
     - `fx_ascended_halo_lotus`: 18x18 blooming crystal lotus halo with 4 cardinal petal points.
     - `fx_ascended_halo_bagua`: 16x16 octagonal Daoist Bagua seal halo with celestial trigram notches.
     - `fx_ascended_halo_venom`: 16x16 toxic jade shockwave halo.
     - `fx_ascended_halo_stellar`: 16x16 cosmic starlight astral halo.
   - The ascended halo tracks the projectile in real time, rotating smoothly and pulsing with celestial qi breathing animations (`1 + sin(phase) * 0.08`), scaling in intensity from Ultimate to Grandmaster and Transcendent.

---

### 2.7 Level Scaling Architecture (Early, Mid, Late & Endless Spire)

The spire progression is balanced across 4 distinct phases. **The Daily Dungeon journey aims to conclude at Level/Floor 30**, while **Endless Spire mode stretches out beyond Floor 30** with steady polynomial-exponential progression that avoids artificial brick walls:

| Phase | Levels / Floors | Realm Title | Mob HP Multiplier | Mob ATK Multiplier | Wave Size | Elite & Qi Shield Dynamics | Boss Milestones & Objectives |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Early Game** | **Levels 1–10** | *Outer Martial Courtyard* | `1.0 + (F - 1) * 0.08` | `1.0 + (F - 1) * 0.04` | 3–5 mobs | 0%–18% elite spawn; 0 hit shields. Teaches active skill usage. | 2 Hall Master mini-bosses + **Floor 10 Cult Leader Tier 1** (`4,800 HP`, `68 ATK`). First extraction checkpoint. |
| **Mid Game** | **Levels 11–20** | *Inner Sect Pagoda* | `1.72 * 1.10^(F - 10)` | `1.36 + (F - 10) * 0.08` | 4–6 mobs | 20%–35% elite spawn; 1–2 hit Qi Shields. Unlocks 4th active/inner slots and Lv. 4 Breakthrough. | 2 Hall Master mini-bosses + **Floor 20 Cult Leader Tier 2** (`26,000 HP`, `210 ATK`). Second extraction checkpoint. |
| **Late Game** | **Levels 21–30** | *Grandmaster Peak* | `4.46 * 1.10^(F - 20)` | `2.16 + (F - 20) * 0.12` | 5–7 mobs | 35%–50% elite spawn; 3–4 hit Qi Shields. Transcendent Lv. 5 breakthroughs & Secret Synergies. | F25 Mount Hua Dual Master Ambush + **Floor 30 Supreme Cult Leader Tier 3** (`95,000 HP`, `460 ATK`). **DAILY DUNGEON VICTORY!** |
| **Endless Spire** | **Levels 31+** | *Endless Heavenly Spire* | `11.57 * 1.045^(F - 30)` | `3.36 * 1.025^(F - 30)` | 6–8 mobs | 50%–65% elite spawn; multi-hit shields & mutations. Tests sustain, barriers, and DPS optimization. | Cult Leader checkpoints every 10 floors (F40: `165k HP`, F50: `285k HP`, F60: `480k HP`, scaling `1.5x` thereafter). Stretched out! |

#### Key Rules for Daily vs. Endless
1. **Daily Spire Mode (`mode: 'daily'`)**:
   - The run caps at **Floor 30**.
   - Defeating the Floor 30 Supreme Cult Leader completes the daily run with outcome `cleared`.
   - Clears record on the official Daily Leaderboard and trigger the 3-Boss Legendary reward track via the Altar of Fate.
2. **Endless Spire Mode (`mode: 'practice'` or Spire Delve)**:
   - Does NOT terminate at Floor 30.
   - After defeating Cult Leaders at Floor 30, 40, 50, etc., players receive an extraction prompt allowing them to either bank 100% of collected loot or ascend higher into stretched-out endless levels.
   - Mob HP scales at a steady `+4.5%` per floor, and Mob ATK scales at `+2.5%` per floor, allowing skilled players with optimized secret synergies and high-realm scrolls to push into high floor tiers without facing sudden mathematical walls.

---

## 3. Gear Tiers, Slots & The Boss Gamble

### Simplified 3-Tier Gear Economy
Every class has **4 Gear Slots**: **Weapon** (Class-specific), **Headgear**, **Top/Chest**, and **Cape/Accessory** (16 total gear categories).

| Tier | Color Code | Stat Multiplier | Weapon Sockets | Drop Source | Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal** | White / Gray | Base (1.0x) | 0 Sockets | Floors 1–6 Mobs | Filler gear. Dismantles into basic Weapon/Armor Shards. |
| **Rare** | Blue | Enhanced (1.5x) + 1 Random Affix | 1 Socket | Floor 4 Mini-Boss, Floor 7 Ambush | Solid mid-game gear. Core of daily progression. |
| **Legendary** | Orange / Gold | Massive (2.5x) + Unique Signature Effect | 2 Sockets | Floor 10 Daily Boss (Greed Gamble) | Always carries a **Unique Name** and build-defining passive. |

### Boss Rewards & The "Greed Gamble"
Clearing each 10-floor bracket (Floor 10, Floor 20, Floor 30, and every 10 floors in Endless Spire) guarantees a **Unique Named Legendary** for your active class via **The Altar of Fate** (awarding up to 3 guaranteed Legendaries on a full 30-Floor Daily Spire clear):
* **The Free Roll:** You get **1 Free Roll** to purify the drop.
  * **Success:** You receive the pristine Legendary item glowing with gold particles.
  * **Failure:** You still keep the Legendary item and its full signature power, but it rolls a **Tuned Cursed Penalty** (a mild tactical trade-off rather than a run-ruining drawback).
* **Purification Grind:** Players can visit **The Sanctum** in camp and spend dismantled gear shards to eventually cleanse Cursed Legendaries into pristine trophies.

---

## 4. Complete Unique Legendary Catalog (48 Items)

### Warrior (2H Greatsword & Heavy Plate)
| Gear Slot | Unique Legendary Name | Signature Effect (Pristine) | Tuned Cursed Penalty |
| :--- | :--- | :--- | :--- |
| **Weapon** | **Ragnarok’s Edge** | Every 3rd swing unleashes a screen-wide magma wave. | **Blood Warmth:** Swing heals are reduced by 50% for this run. |
| **Weapon** | **The World-Breaker** | +150% Knockback; enemies slammed into walls take 2x damage. | **Heavy Iron:** Attack Speed is slightly reduced by 10%. |
| **Weapon** | **Soul-Drinker Claymore** | Restores 3% Max HP on every enemy kill. | **Thirsty Blade:** You take 10% more damage from elite mini-bosses. |
| **Headgear** | **Helm of the Unbroken Wall** | Gain +1% Attack for every 2% of missing HP. | **Tunnel Vision:** Your Dodge chance is reduced to 0%. |
| **Headgear** | **Horned Crown of the Berserker** | Automatically triggers Rage mode at the start of every floor. | **Short Fuse:** Rage duration is shortened by 1 second. |
| **Headgear** | **Ironclad Visor of Balrog** | Negates the first 3 hits taken on every floor. | **Scratched Visor:** Only negates the first 1 hit per floor. |
| **Top** | **Cuirass of the Volcanic Core** | Deals constant AoE burn damage to all nearby melee enemies. | **Warm Air:** Your movement speed is reduced by 5%. |
| **Top** | **Plate of the Fallen Titan** | Converts 50% of your Armor rating into bonus Base Attack. | **Heavy Plating:** Floor transitions take 0.5s longer. |
| **Top** | **Dragonscale Mail** | Reflects 120% of blocked/mitigated damage back to attackers. | **Shedding:** Armor rating gives 10% less passive defense. |
| **Cape** | **Cape of the Hundred Battles** | Gain a stacking +2% Damage buff for every floor cleared (up to +20%). | **Fatigued:** The max stacking damage cap is reduced to +10%. |
| **Cape** | **Crimson Banner of War** | All Bronze buffs drafted gain +50% increased effectiveness. | **Faded Banner:** Bronze buffs only gain +25% effectiveness. |
| **Cape** | **Aegis Cloak of the Guardian** | Grants a regenerating shield equal to 25% Max HP every floor. | **Leaky Shield:** Shield value is reduced to 15% Max HP. |

### Mage (Elemental Staff & Mystical Robes)
| Gear Slot | Unique Legendary Name | Signature Effect (Pristine) | Tuned Cursed Penalty |
| :--- | :--- | :--- | :--- |
| **Weapon** | **Starlight Weaver** | Basic attacks fire 3 homing cosmic bolts instead of 1. | **Flickering Stars:** Every 10th cast has a slight delay. |
| **Weapon** | **Staff of the Abyssal Void** | Spells have a 20% chance to spawn a black hole that groups enemies. | **Drafty Void:** Maximum HP is reduced by 15%. |
| **Weapon** | **Glacial Scepter of El Nath** | Every spell chills enemies; chilled targets shatter for AoE damage on death. | **Chilled Hands:** Base casting speed is 10% slower. |
| **Headgear** | **Crown of the Archmage** | All Elemental buffs drafted start at +1 level higher. | **Heavy Crown:** Cooldowns are increased by a flat 5%. |
| **Headgear** | **Witch’s Pointed Hat of Chaos** | Casting a spell triggers a random secondary spell at 50% power. | **Unstable Brim:** Secondary spell power drops to 35%. |
| **Headgear** | **Circlet of Infinite Sparks** | Chain Lightning bounces +4 additional times across the screen. | **Ground Leak:** Chain Lightning bounces 2 fewer times. |
| **Top** | **Robes of Eternal Frost** | Freezes all enemies on screen for 2 seconds when your HP drops below 30%. | **Chilly Draft:** Your armor rating is reduced by 15%. |
| **Top** | **Astral Silk Vestments** | Reduces all active skill cooldowns by 30%. | **Tangled Threads:** Skill cast delays are increased by 10%. |
| **Top** | **Phoenix Feather Tunic** | Revive once per daily run with 50% HP and a massive fire nova. | **Singed Feathers:** Revive triggers with only 25% HP. |
| **Cape** | **Tome of Floating Runes** | Summons 2 orbiting pixel books that automatically zap nearby foes. | **Heavy Tome:** Your movement speed is reduced by 5%. |
| **Cape** | **Cloak of the Arcane Tempest** | Every 10 seconds, call down a meteor storm dealing massive AoE damage. | **Delayed Storm:** Meteor interval is increased to every 14 seconds. |
| **Cape** | **Wings of the Seraphim** | Hover higher, dodging 35% of all ground-based melee attacks. | **Heavy Wings:** Dodge chance is reduced to 20%. |

### Thief (Claw/Daggers & Shadow Gear)
| Gear Slot | Unique Legendary Name | Signature Effect (Pristine) | Tuned Cursed Penalty |
| :--- | :--- | :--- | :--- |
| **Weapon** | **Shadowfang Twins** | Every critical hit spawns a shadow clone that mimics your next attack. | **Fading Shadow:** Clone deals 25% less damage than your main strike. |
| **Weapon** | **The Phantom Whisper** | Attacks ignore 60% of enemy Armor and apply stacking Bleed. | **Whispering Echo:** Bleed duration is shortened by 1 second. |
| **Weapon** | **Venomous Viper Claws** | Poison ticks can critically strike and spread to nearby enemies on death. | **Diluted Venom:** Poison damage ticks 10% slower. |
| **Headgear** | **Assassin’s Hood of the Eclipse** | Guaranteed 100% Critical Hit Chance for the first 4 seconds of every floor. | **Partial Eclipse:** Crit duration lasts for 2.5 seconds instead. |
| **Headgear** | **Bandana of the Night Lord** | Throwing stars/daggers pierce through up to 3 enemies in a line. | **Worn Bandana:** Stars only pierce through up to 2 enemies. |
| **Headgear** | **Mask of the Silent Fox** | +30% Dodge Chance; dodging an attack triggers an instant counter-slash. | **Restricted Vision:** Counter-slash damage is reduced by 20%. |
| **Top** | **Tunic of the Silent Step** | Dash instantly between enemies, gaining brief invulnerability frames. | **Stiff Fabric:** Dash cooldown is increased by 0.5 seconds. |
| **Top** | **Shadow-Weave Jerkin** | Increases Critical Hit Damage by +100%. | **Loose Threads:** Base Critical Hit Chance is reduced by 5%. |
| **Top** | **Gold-Threaded Vest** | Enemies drop +60% more Gold; gain +1% Damage per 1,000 Gold held. | **Heavy Gold:** Movement speed is reduced by 5%. |
| **Cape** | **Cloak of a Thousand Afterimages** | Leaves behind explosive decoys every time you dodge or dash. | **Damp Powder:** Decoy explosion radius is slightly smaller. |
| **Cape** | **Scarf of the Crimson Moon** | Executes normal enemies below 20% HP instantly. | **Lenient Threshold:** Execute triggers on enemies below 10% HP. |
| **Cape** | **Bat-Wing Mantle** | Converts 15% of all Critical Damage dealt into healing. | **Thirsty Wings:** Conversion rate drops to 10%. |

### Bowman (Longbow & Ranger Gear)
| Gear Slot | Unique Legendary Name | Signature Effect (Pristine) | Tuned Cursed Penalty |
| :--- | :--- | :--- | :--- |
| **Weapon** | **Gale-Force Greatbow** | Fires +2 additional arrows in a spread on every single shot. | **Crosswind:** Spread arrows have slight spread inaccuracy. |
| **Weapon** | **The World-Tree Branch** | Arrows have a 25% chance to root enemies in vines and sprout healing buds. | **Dry Vines:** Root duration is shortened to 1 second. |
| **Weapon** | **Thunderbird’s Recurve** | Every 5th arrow transforms into a piercing lightning bolt. | **Static Delay:** Every 7th arrow transforms instead of every 5th. |
| **Headgear** | **Ranger’s Feathered Cap** | +40% Attack Speed and +20% Range on all projectiles. | **Heavy Plume:** Attack Speed bonus is dialed back to +25%. |
| **Headgear** | **Crown of the Beastmaster** | Summons a second spectral Wolf companion alongside your Hawk. | **Disobedient Pup:** Spectral wolf attacks 15% slower. |
| **Headgear** | **Hawkeye Visor** | Damage increases by up to +80% based on how far away the enemy is. | **Narrow Focus:** Maximum distance damage bonus caps at +50%. |
| **Top** | **Vest of the Apex Predator** | Your companions inherit 100% of your Critical Rate and Critical Damage. | **Distant Pack:** Companions inherit 75% of your stats instead. |
| **Top** | **Windrunner’s Tunic** | Every 3rd dodge fires a free volley of 5 homing arrows. | **Stumbled Step:** Requires every 4th dodge to trigger the volley. |
| **Top** | **Camouflage Leaf Cloak** | Enemies take 2 seconds longer to aggro onto you when entering a floor. | **Rustling Leaves:** Aggro delay is reduced to 1 second. |
| **Cape** | **Quiver of the Endless Sky** | On-hit buff triggers have double the chance to activate. | **Tangled Strings:** On-hit trigger chance bonus is reduced to +50%. |
| **Cape** | **Golden Falcon’s Plumage** | Your Hawk companion periodically drops Gold coins and HP orbs mid-fight. | **Greedy Bird:** Drop frequency is slightly lowered. |
| **Cape** | **Sylvan Spirit Mantle** | All Silver-tier buffs in your draft pool appear 2x more frequently. | **Fading Spirit:** Silver buffs appear 1.5x more frequently. |

---

## 5. Future Expansion: Weapon Element Slots (Pure Build Perks)

### Weapon Element Sockets
* **Socket Counts:** Normal Weapons (0), Rare Weapons (1), Legendary Weapons (2).
* **No Elemental Counters:** Weapon elements are purely additional offensive/utility buffs for your weapon. Bosses never resist or counter specific elements, so players simply pick and upgrade the element that best fits their class and favorite playstyle.

| Element | Visual Particle Color | Primary Combat Effect | Dual-Socket Hybrid Synergies (Legendary Weapons) |
| :--- | :--- | :--- | :--- |
| **Fire** | Crimson / Orange | Applies stacking **Burn DoT** on every hit. | **Fire + Lightning (*Plasma*):** Thermal explosions on burning targets. |
| **Ice** | Cyan / Ice Blue | Slows enemy movement & attack speed by 15%/stack. | **Ice + Dark (*Abyssal Frost*):** Slows while shredding armor & draining HP. |
| **Lightning** | Electric Yellow | Chance on hit to **Chain** damage to 2–3 nearby foes. | **Fire + Dark (*Hellfire*):** Burn deals bonus damage based on missing armor. |
| **Dark** | Deep Purple | Shreds enemy armor rating + applies stacking shadow DoT. | **Lightning + Dark (*Void Storm*):** Chain arcs apply Dark armor shred. |

---

## 6. Daily Dungeon Architecture: Correlated Bosses & Mutation Roulette

### 1. The 5 Correlated Mini-Boss & End Boss Pairings
To prevent weekly predictability while giving players tactical clarity, the dungeon rotates through **5 Themed Biomes**. The **Floor 4 Mini-Boss** acts as a juvenile/lieutenant version of the **Floor 10 End Boss**, previewing its core mechanic so you can draft counter-buffs on Floors 5–9.

| # | Daily Theme & Parallax Art | Floor 4 Mini-Boss (The Preview) | Floor 10 End Boss (The Climax) | Shared Core Mechanic |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Slime King’s Bog**<br>*(Lush Forest / Mushroom Ruins)* | **Royal Gel-Guard**<br>*(Giant Armored Slime)* | **King Mush-Slime**<br>*(Colossal Crowned Slime)* | **Mitosis:** Splits into 2 smaller slimes at 50% HP. Rewards **AoE / Cleave / Chain** buffs. |
| **2** | **El Nath Glacial Spire**<br>*(Snowy Peaks / Ice Cavern)* | **Frostfang Yeti**<br>*(Ice-Throwing Ape)* | **Cryo-Wyrm Zakum**<br>*(Ancient Ice Dragon)* | **Permafrost Armor:** Gains a thick ice shield every 10s broken by **Rapid Hits / Attack Speed**. |
| **3** | **Perion Volcanic Caldera**<br>*(Magma Crags / Obsidian Forge)* | **Magma Golem**<br>*(Molten Rock Construct)* | **Ignis, Lord of Cinders**<br>*(Flaming Balrog Demon)* | **Overheat Aura:** Radiates constant tick damage to nearby heroes. Rewards **Lifesteal, Shields, or Dodge**. |
| **4** | **Kerning Shadow Alley**<br>*(Neon Rooftops / Midnight Fog)* | **Phantom Enforcer**<br>*(Dual-Blade Ninja)* | **Kage, The Eclipse Reaper**<br>*(Shadow Assassin Master)* | **Smoke Bomb:** Gains +50% Dodge for 3s periodically. Rewards **Guaranteed Hit, DoT, or Multi-Hit** buffs. |
| **5** | **Temple of Time Ruins**<br>*(Floating Clockwork / Starlight)* | **Chrono-Sentinel**<br>*(Clockwork Knight)* | **Papulatus Prime**<br>*(Dimensional Time Lord)* | **Enrage Timer:** Gains +15% Attack Speed every 5s the fight lasts. Pure **Single-Target DPS** check. |

### 2. Pre-Fight Boss Variation: The "Boss Mutation Roulette"
Right before the **Floor 4 Mini-Boss** and **Floor 10 End Boss** drop into the arena, a quick slot-reel spins over their health bar to roll **1 random Boss Mutation** for that specific encounter—ensuring even familiar bosses play out differently from run to run:

| Rolled Mutation | Visual Tell on Boss Sprite | Combat Variation Effect | Risk / Reward Twist |
| :--- | :--- | :--- | :--- |
| **Golden-Gilded** | Shiny gold tint + coin sparkles | Boss takes +15% more damage and drops showers of bonus Gold every 10% HP lost. | Jackpot roll! Pure loot pinata. |
| **Juggernaut** | Giant size (+25% sprite scale) | +30% Max HP and heavy knockback resistance, but attacks 20% slower. | Longer fight; rewards sustained DPS. |
| **Hasted** | Blue wind trails + rapid animation | +30% Attack Speed and shorter skill cooldowns, but -20% Max HP. | Fast, frantic glass-cannon brawl. |
| **Vampiric** | Crimson bat aura | Boss heals for 15% of the damage it deals to you. | Punishes face-tanking; rewards Dodge/Shields. |
| **Volatile** | Glowing orange cracks | Periodically spawns ticking magma bombs on the floor that explode after 2s. | Adds timing/burst windows to the fight. |
| **Twin-Soul** | Faint purple spectral shadow | Boss spawns at 65% HP alongside a weaker spectral copy (35% HP) at the same time. | Turns a single-target boss into a 2-target fight. |

---

## 7. The 3-Buff Floor Draft System

### Draft Mechanics & Targeted Card Refresh
* **Draft Timing:** Triggered after clearing **Floors 1 through 9** (9 total drafts per full run).
* **Targeted Card Refreshes (2 Per Round):** Each draft screen displays **3 Buff Cards** (Left, Center, Right). Every round of buffs grants **2 Refresh Charges**.
  * Instead of rerolling the whole hand, players click a small **"Refresh" icon directly on a specific card** to replace *only* that slot while keeping the other two cards locked in.
  * *Strategic Depth:* Players can lock a good Silver synergy card on the left, then spend their 2 refreshes fishing for a Gold or Cursed combo card in the right slot. (Unused refreshes do not carry over to the next floor, encouraging active use every round!).
* **Camp Banish Pool:** Players can permanently **Banish** up to 5 unwanted Bronze buffs at the Alchemy Altar in camp.

### Dynamic Tier Appearance Rates (By Floor Bracket)
As you climb deeper into the dungeon, Bronze buffs phase out and high-tier Silver, Gold, and Cursed cards become much more frequent:

| Floor Bracket | Bronze (Common) | Silver (Uncommon) | Gold (Rare) | Cursed (High-Risk) |
| :--- | :---: | :---: | :---: | :---: |
| **Floors 1–3 (Early Run)** | **65%** | **25%** | **8%** | **2%** |
| **Floors 4–6 (Mid Run)** | **45%** | **35%** | **15%** | **5%** |
| **Floors 7–9 (Late Run)** | **25%** | **40%** | **25%** | **10%** *(Floor 7 guarantees 1 Cursed slot)* |

---

### Starter Buff Pool Catalog (32 Core Buffs)

#### Bronze Tier (Foundational Stat Boosts — Stackable)
1. **Sharpened Edge:** +18% Base Attack.
2. **Swift Strikes:** +18% Attack Speed.
3. **Hearty Constitution:** +25% Max HP (and heals for the gained amount).
4. **Iron Skin:** +20% Armor Rating.
5. **Keen Eye:** +12% Critical Hit Chance.
6. **Lethal Precision:** +35% Critical Hit Damage.
7. **Windwalker:** +12% Dodge Chance.
8. **Greed Charm:** +25% Gold dropped by monsters.

#### Silver Tier (Conditional & Proc Triggers)
1. **Static Discharge:** Every 4th basic attack unleashes a chain lightning bolt to 2 nearby enemies.
2. **Vampiric Touch:** Heal for 2% of your Max HP every time you land a Critical Hit (0.5s internal cooldown).
3. **Second Wind:** Restore 12% Max HP immediately upon clearing each floor.
4. **Serrated Wounds:** Attacks apply a Bleed dealing 15% of your Base Attack per second for 3s (stacks up to 5x).
5. **Frostbite Aura:** Enemies within melee range are slowed by 20% and take +12% more damage.
6. **Multishot / Echo Strike:** Basic attacks have a 25% chance to strike twice.
7. **Thornmail Plating:** Reflect 80% of your Armor rating as damage whenever an enemy hits you.
8. **Battle Momentum:** Killing an enemy grants +5% Attack Speed for 3 seconds (stacks up to 5x).

#### Gold Tier (Build-Defining Mechanics)
1. **Stormcaller’s Conduit:** Critical hits trigger a sky-bolt that strikes all enemies in a small radius for 120% Attack.
2. **Fortress of Might:** Converts 50% of your current Armor rating into bonus Base Attack.
3. **Executioner’s Verdict:** Instantly execute non-boss enemies below 18% HP; deal +30% damage to bosses below 30% HP.
4. **Overclocked Core:** Reduces all active skill and proc cooldowns by 30%.
5. **Mid-Run Midas:** Gain +1% All Damage for every 500 Gold collected during the current run.
6. **Glass Tempest:** +45% Attack Speed and +25% Crit Damage, if you have not taken damage in the last 3 seconds.
7. **Aegis Bastion:** Gain a regenerating shield equal to 30% of your Max HP at the start of every floor.
8. **Elemental Overload:** Weapon Element effects (Burn, Ice, Lightning, Dark) trigger twice as fast and deal +50% bonus damage.

#### Cursed Tier (High-Risk / High-Reward Pacts)
1. **Pact of Carnage:** **+75% All Damage dealt**, *but you take +20% increased damage from all sources.*
2. **Bloodlust Frenzy:** **+60% Attack Speed and +10% Lifesteal**, *but your Max HP is reduced by 25%.*
3. **Gilded Avarice:** **Monsters drop 2x Gold and +1 additional Loot Chest on boss clear**, *but enemies have +25% Max HP.*
4. **Reckless Gamble:** **+40% Critical Hit Chance**, *but non-critical hits deal 50% less damage.*
5. **Fasting Vow:** **Gain +20% All Damage per floor cleared**, *but floor-clear healing and potions are disabled for 3 floors.*
6. **Berserker’s Tunnel Vision:** **+85% Base Attack**, *but your Dodge Chance and Armor are reduced by 30%.*
7. **Volatile Soul:** **You explode for massive AoE damage every 5 seconds**, *but each pulse drains 2% of your current HP.*
8. **Double-Edged Fate:** **Upgrades 1 random equipped buff to Gold tier immediately**, *but adds +1 random Boss Mutation to the Floor 10 End Boss.*

---

## 8. Meta-Progression & Daily Retention
* **Camp Buildings:**
  1. **Blacksmith:** Dismantle Normal/Rare drops into Shards to level up gear slots.
  2. **The Sanctum:** Spend Shards + Boss Cores to **Purify** Cursed Legendaries into Pristine versions.
  3. **Alchemy Altar:** Unlock new Silver/Gold/Cursed draft buffs, upgrade Banish slots, and fuse Elemental Gems.
  4. **Legion Board:** Spend Gold for infinite incremental account stats (*+1% Base ATK*, *+1% Gold Gain*).
* **Daily Retention & Anti-Burnout:**
  * **Daily Class Bounty:** One random class gets **2x EXP & +25% Gold** each day.
  * **Rested Aura:** Missing days banks up to 3 days of **2x Loot** so players never feel punished for taking a break.
  * **7-Day Streak:** Awards 1 **Golden Ticket** (allows 1 extra bonus dungeon run whenever desired).

---

## 9. Finalized Combat Math, Job Advancements & Reddit Daily Competition Layer

### 1. Daily UTC Reset & Deterministic Seed (`YYYY-MM-DD`)
* Every day at `00:00 UTC`, the server hashes the `YYYY-MM-DD` date key to deterministically select **1 of 5 Biomes** and **1 of 4 2x Bounty Classes** so all Redditors face the same daily dungeon challenge.
* **Run Modes:**
  * **Official Daily Ranked Run (1/day + Golden Tickets):** Eligible for the **Daily Leaderboard** and the **Floor 10 Greed Gamble** (guaranteed Unique Named Legendary).
  * **Practice / Grind Runs (Unlimited):** Available after completing the Daily Run; awards full EXP, Gold, Shards, and Normal/Rare gear drops up to Floor 10 so players can keep leveling their Roster & Link Skills.

### 2. Concrete Base Stats, Combat Formulas & Active Skills
* **Armor Mitigation:** $\text{Damage Taken Multiplier} = \frac{100}{100 + \max(0, \text{Effective Armor})}$
* **Critical Strike Damage:** $\text{Crit Damage} = \text{Hit Damage} \times (1.5 + \text{Bonus Crit DMG})$
* **Active Combat HUD:** Auto-walk and auto-attack paired with a clickable **Class Active / Ultimate Skill** (8–10s cooldown), **Healing Potion** (1 charge/floor, restores 35% Max HP, 10s cooldown, disabled during *Fasting Vow*), and **1x / 2x Speed** toggle.

| Class | Base HP | Base ATK | ATK/s | Base Armor | Crit % | Crit DMG | Dodge % | Active Skill (Lv. 1 → Lv. 60 Ultimate) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Warrior** | 220 | 24 | 1.1 | 30 | 10% | 150% | 5% | **Earthshatter Slam** → **Berserker Cataclysm** (250%→450% AoE cleave + stun) |
| **Mage** | 140 | 28 | 1.2 | 12 | 15% | 160% | 10% | **Arcane Nova** → **Genesis Meteor** (300%→520% screen-wide elemental blast) |
| **Thief** | 150 | 20 | 1.8 | 15 | 25% | 175% | 20% | **Shadow Assault** → **Night Lord's Shuriken Storm** (4→8 rapid crit-boosted strikes + invuln dash) |
| **Bowman** | 160 | 21 | 1.6 | 18 | 18% | 160% | 15% | **Arrow Rain** → **Phoenix Hurricane** (8→16 arrows + empowers Pet Hawk) |

### 3. Job Advancements & 12 Prismatic Class Buffs
* **Lv. 15 (1st Job Passive):**
  * **Warrior (*Unyielding Grit*):** Regenerate 1.5% Max HP/sec and +20% Knockback.
  * **Mage (*Elemental Resonance*):** Every 3rd cast applies random Burn, Chill, or Shock.
  * **Thief (*Opportunist*):** +25% damage to bleeding, poisoned, or full-HP targets.
  * **Bowman (*Hawk Eye Companion*):** Pet Hawk strikes every 1.5s for 60% ATK.
* **Lv. 35 (2nd Job — 3 Prismatic Class Buffs each):**
  * **Warrior:** *Blood Shield* (overhealing converts to shield), *Titan Cleave* (+40% AoE reach & +25% Boss DMG), *Undying Rage* (+1.5% ATK per 1% missing HP).
  * **Mage:** *Tri-Elemental Mastery* (+35% Skill DMG & dual bolts), *Spell Echo* (30% chance to double-cast Active Skill), *Mana Barrier* (start each floor with 25% Max HP arcane shield).
  * **Thief:** *Shadow Partner* (all attacks deal a 35% shadow echo hit), *Fatal Venom* (poison/bleed stacks tick 2x faster), *Coin Toss Barrage* (spend tiny Gold bursts for +40% Crit DMG).
  * **Bowman:** *Split-Arrow Mastery* (+2 piercing arrows per shot), *Spectral Pack* (summons Spirit Wolf companion), *Sniper's Mark* (every 3rd shot deals guaranteed 200% Crit).
* **Lv. 60 (3rd Job Ultimate):** Upgrades Active Skill into its Ultimate form and unlocks a floating pixel aura/cape.

### 4. Camp Economy Formulas
* **EXP Curve:** $\text{EXP to Next Level} = \lfloor 100 \times \text{Level}^{1.35} \rfloor$
* **Blacksmith Slot Upgrade:** `+10% slot stats per level`. Cost: `10 + slotLevel * 6` Shards and `60 + slotLevel * 45` Gold.
* **The Sanctum Purification:** Cleanse any Cursed Legendary into Pristine (`25 Shards + 2 Boss Cores`).
* **Alchemy Altar Banish Slots:** Up to 5 slots (`100g → 250g → 500g → 1000g → 2000g`).
* **Legion Board:** Infinite incremental nodes (`+1% Base ATK`, `+1% Max HP`, `+1% Gold Gain`, `+1% Crit DMG`), cost $\lfloor 50 \times 1.25^{\text{level}} \rfloor$ Gold.

