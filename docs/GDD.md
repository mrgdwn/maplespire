# Game Design Document: *MapleSpire*

## 1. Game Overview & Core Loop
* **Genre:** Side-Scrolling Auto-Battler Roguelite / Daily Grind RPG
* **Visual Style:** 2D Pixel Art (Chibi proportions inspired by *MapleStory*, vibrant parallax backgrounds, bouncy physics-based loot drops, and chunky floating damage numbers).
* **Target Session Length:** 2–4 minutes per day.

### The Daily Loop
1. **Login & Camp Prep (30–60 sec):** Claim daily streak/rested bonus, check today's Boss Theme & 2x Bounty Class, upgrade gear/stats, and select 1 of 4 classes.
2. **The 10-Floor Dungeon Run (90–150 sec):** Side-scrolling auto-walk to the right. Clear waves of monsters on each floor, pausing after each clear to draft **1 of 3 random buffs** before advancing (with 2 targeted card refreshes per draft).
3. **Boss Mutation Roll & Extraction:** Before fighting the Floor 4 Mini-Boss and Floor 10 End Boss, a **Boss Mutation Roulette** spins to roll a random combat affix/variation for the boss. After Floor 4 and Floor 7, players can safely **Extract** with 100% of their loot, or push toward Floor 10. Dying forfeits 50% of unbanked loot.
4. **Post-Run Progression (30 sec):** Take the **Floor 10 Boss Greed Gamble** for a Unique Legendary, spend collected Gold/Shards/Cores on permanent upgrades, and log off until tomorrow's reset.

---

## 2. Classes & Roster System (4 Classes)
Players maintain an **Account Roster** where all 4 classes live in the pixel camp. Leveling any class grants a permanent passive bonus (**Link Skill**) to all other classes.

| Class | Weapon / Attack Style | Primary Scaling Stats | Draft Synergy Focus | Account Link Skill (Per 10 Lvls) |
| :--- | :--- | :--- | :--- | :--- |
| **Warrior** | 2H Greatsword (Cleave + Knockback) | Max HP, Armor, Base ATK | Thorns, Lifesteal, Cursed Buffs | +3% Max HP to all classes |
| **Mage** | Staff (Floating Cast + AoE Spells) | Skill Power, Cooldown, Elemental | Burn, Freeze, Chain Lightning | +3% Skill Damage to all classes |
| **Thief** | Claw / Stars (Dash + Rapid Hits) | Crit Rate, Crit DMG, Attack Speed | Execute, Bleed, Bonus Gold Drops | +2% Crit Rate to all classes |
| **Bowman** | Longbow + Pet Hawk (Multi-Shot Volley) | Multi-Hit, Projectile Count, Dodge | On-Hit Procs, Summon Buffs | +3% Attack Speed to all classes |

### Job Advancements (Visual + Mechanical Milestones)
* **Lv. 1 (Novice):** Basic pixel outfit and starter weapon.
* **Lv. 15 (1st Job):** Unlocks 1 passive class trait + subtle weapon glow.
* **Lv. 35 (2nd Job):** Adds 3 **Prismatic Class Buffs** to their floor draft pool + upgraded armor sprite.
* **Lv. 60 (3rd Job):** Unlocks an active Ultimate cooldown skill + floating pixel aura/cape.

---

## 3. Gear Tiers, Slots & The Boss Gamble

### Simplified 3-Tier Gear Economy
Every class has **4 Gear Slots**: **Weapon** (Class-specific), **Headgear**, **Top/Chest**, and **Cape/Accessory** (16 total gear categories).

| Tier | Color Code | Stat Multiplier | Weapon Sockets | Drop Source | Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal** | White / Gray | Base (1.0x) | 0 Sockets | Floors 1–6 Mobs | Filler gear. Dismantles into basic Weapon/Armor Shards. |
| **Rare** | Blue | Enhanced (1.5x) + 1 Random Affix | 1 Socket | Floor 4 Mini-Boss, Floor 7 Ambush | Solid mid-game gear. Core of daily progression. |
| **Legendary** | Orange / Gold | Massive (2.5x) + Unique Signature Effect | 2 Sockets | Floor 10 Daily Boss (Greed Gamble) | Always carries a **Unique Name** and build-defining passive. |

### The Floor 10 Boss Reward: The "Greed Gamble"
Clearing Floor 10 guarantees a **Unique Named Legendary** for your active class via **The Altar of Fate**:
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
| **🔥 Fire** | Crimson / Orange | Applies stacking **Burn DoT** on every hit. | **Fire + Lightning (*Plasma*):** Thermal explosions on burning targets. |
| **❄️ Ice** | Cyan / Ice Blue | Slows enemy movement & attack speed by 15%/stack. | **Ice + Dark (*Abyssal Frost*):** Slows while shredding armor & draining HP. |
| **⚡ Lightning** | Electric Yellow | Chance on hit to **Chain** damage to 2–3 nearby foes. | **Fire + Dark (*Hellfire*):** Burn deals bonus damage based on missing armor. |
| **🌑 Dark** | Deep Purple | Shreds enemy armor rating + applies stacking shadow DoT. | **Lightning + Dark (*Void Storm*):** Chain arcs apply Dark armor shred. |

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
| **💰 Golden-Gilded** | Shiny gold tint + coin sparkles | Boss takes +15% more damage and drops showers of bonus Gold every 10% HP lost. | Jackpot roll! Pure loot pinata. |
| **🛡️ Juggernaut** | Giant size (+25% sprite scale) | +30% Max HP and heavy knockback resistance, but attacks 20% slower. | Longer fight; rewards sustained DPS. |
| **⚡ Hasted** | Blue wind trails + rapid animation | +30% Attack Speed and shorter skill cooldowns, but -20% Max HP. | Fast, frantic glass-cannon brawl. |
| **🦇 Vampiric** | Crimson bat aura | Boss heals for 15% of the damage it deals to you. | Punishes face-tanking; rewards Dodge/Shields. |
| **💣 Volatile** | Glowing orange cracks | Periodically spawns ticking magma bombs on the floor that explode after 2s. | Adds timing/burst windows to the fight. |
| **👯 Twin-Soul** | Faint purple spectral shadow | Boss spawns at 65% HP alongside a weaker spectral copy (35% HP) at the same time. | Turns a single-target boss into a 2-target fight. |

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

#### 🟫 Bronze Tier (Foundational Stat Boosts — Stackable)
1. **Sharpened Edge:** +18% Base Attack.
2. **Swift Strikes:** +18% Attack Speed.
3. **Hearty Constitution:** +25% Max HP (and heals for the gained amount).
4. **Iron Skin:** +20% Armor Rating.
5. **Keen Eye:** +12% Critical Hit Chance.
6. **Lethal Precision:** +35% Critical Hit Damage.
7. **Windwalker:** +12% Dodge Chance.
8. **Greed Charm:** +25% Gold dropped by monsters.

#### ⬜ Silver Tier (Conditional & Proc Triggers)
1. **Static Discharge:** Every 4th basic attack unleashes a chain lightning bolt to 2 nearby enemies.
2. **Vampiric Touch:** Heal for 2% of your Max HP every time you land a Critical Hit (0.5s internal cooldown).
3. **Second Wind:** Restore 12% Max HP immediately upon clearing each floor.
4. **Serrated Wounds:** Attacks apply a Bleed dealing 15% of your Base Attack per second for 3s (stacks up to 5x).
5. **Frostbite Aura:** Enemies within melee range are slowed by 20% and take +12% more damage.
6. **Multishot / Echo Strike:** Basic attacks have a 25% chance to strike twice.
7. **Thornmail Plating:** Reflect 80% of your Armor rating as damage whenever an enemy hits you.
8. **Battle Momentum:** Killing an enemy grants +5% Attack Speed for 3 seconds (stacks up to 5x).

#### 🟨 Gold Tier (Build-Defining Mechanics)
1. **Stormcaller’s Conduit:** Critical hits trigger a sky-bolt that strikes all enemies in a small radius for 120% Attack.
2. **Fortress of Might:** Converts 50% of your current Armor rating into bonus Base Attack.
3. **Executioner’s Verdict:** Instantly execute non-boss enemies below 18% HP; deal +30% damage to bosses below 30% HP.
4. **Overclocked Core:** Reduces all active skill and proc cooldowns by 30%.
5. **Mid-Run Midas:** Gain +1% All Damage for every 500 Gold collected during the current run.
6. **Glass Tempest:** +45% Attack Speed and +25% Crit Damage, if you have not taken damage in the last 3 seconds.
7. **Aegis Bastion:** Gain a regenerating shield equal to 30% of your Max HP at the start of every floor.
8. **Elemental Overload:** Weapon Element effects (Burn, Ice, Lightning, Dark) trigger twice as fast and deal +50% bonus damage.

#### 🟪 Cursed Tier (High-Risk / High-Reward Pacts)
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

