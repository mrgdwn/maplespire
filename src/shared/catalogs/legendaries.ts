import type { ClassId, ElementId, GearSlot } from '../types.ts';

export type LegendaryDefinition = {
  id: string;
  name: string;
  classId: ClassId;
  slot: GearSlot;
  signatureText: string;
  cursedName: string;
  cursedText: string;
};

export type ElementDefinition = {
  id: ElementId;
  name: string;
  colorHex: string;
  colorInt: number;
  effectText: string;
};

export type HybridElementDefinition = {
  elements: readonly [ElementId, ElementId];
  name: string;
  colorHex: string;
  effectText: string;
};

export const ELEMENT_CATALOG: readonly ElementDefinition[] = [
  {
    id: 'fire',
    name: 'Fire Gem',
    colorHex: '#ff5722',
    colorInt: 0xff5722,
    effectText: 'Applies stacking Burn DoT on every hit.',
  },
  {
    id: 'ice',
    name: 'Ice Gem',
    colorHex: '#00bcd4',
    colorInt: 0x00bcd4,
    effectText: 'Slows enemy movement & attack speed by 15% per stack.',
  },
  {
    id: 'lightning',
    name: 'Lightning Gem',
    colorHex: '#ffeb3b',
    colorInt: 0xffeb3b,
    effectText: 'Chance on hit to chain damage to 2-3 nearby foes.',
  },
  {
    id: 'dark',
    name: 'Dark Gem',
    colorHex: '#9c27b0',
    colorInt: 0x9c27b0,
    effectText: 'Shreds enemy armor rating + applies stacking shadow DoT.',
  },
];

export const HYBRID_ELEMENTS: readonly HybridElementDefinition[] = [
  {
    elements: ['fire', 'lightning'],
    name: 'Plasma',
    colorHex: '#ff9800',
    effectText: 'Thermal explosions trigger on burning targets.',
  },
  {
    elements: ['ice', 'dark'],
    name: 'Abyssal Frost',
    colorHex: '#3f51b5',
    effectText: 'Slows enemies while shredding armor & draining HP.',
  },
  {
    elements: ['fire', 'dark'],
    name: 'Hellfire',
    colorHex: '#e91e63',
    effectText: 'Burn deals bonus damage based on missing armor.',
  },
  {
    elements: ['lightning', 'dark'],
    name: 'Void Storm',
    colorHex: '#7c4dff',
    effectText: 'Chain arcs apply Dark armor shred to every target hit.',
  },
];

export const LEGENDARY_CATALOG: readonly LegendaryDefinition[] = [
  // ======================== WARRIOR (12) ========================
  {
    id: 'war_wep_ragnarok',
    name: "Ragnarok's Edge",
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Every 3rd swing unleashes a screen-wide magma wave.',
    cursedName: 'Blood Warmth',
    cursedText: 'Swing heals are reduced by 50% for this run.',
  },
  {
    id: 'war_wep_worldbreaker',
    name: 'The World-Breaker',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: '+150% Knockback; enemies slammed into walls take 2x damage.',
    cursedName: 'Heavy Iron',
    cursedText: 'Attack Speed is slightly reduced by 10%.',
  },
  {
    id: 'war_wep_souldrinker',
    name: 'Soul-Drinker Claymore',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Restores 3% Max HP on every enemy kill.',
    cursedName: 'Thirsty Blade',
    cursedText: 'You take 10% more damage from elite mini-bosses.',
  },
  {
    id: 'war_head_unbroken',
    name: 'Helm of the Unbroken Wall',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Gain +1% Attack for every 2% of missing HP.',
    cursedName: 'Tunnel Vision',
    cursedText: 'Your Dodge chance is reduced to 0%.',
  },
  {
    id: 'war_head_berserker',
    name: 'Horned Crown of the Berserker',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Automatically triggers Rage mode at the start of every floor.',
    cursedName: 'Short Fuse',
    cursedText: 'Rage duration is shortened by 1 second.',
  },
  {
    id: 'war_head_balrog',
    name: 'Ironclad Visor of Balrog',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Negates the first 3 hits taken on every floor.',
    cursedName: 'Scratched Visor',
    cursedText: 'Only negates the first 1 hit per floor.',
  },
  {
    id: 'war_top_volcanic',
    name: 'Cuirass of the Volcanic Core',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Deals constant AoE burn damage to all nearby melee enemies.',
    cursedName: 'Warm Air',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'war_top_titan',
    name: 'Plate of the Fallen Titan',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Converts 50% of your Armor rating into bonus Base Attack.',
    cursedName: 'Heavy Plating',
    cursedText: 'Floor transitions take 0.5s longer.',
  },
  {
    id: 'war_top_dragonscale',
    name: 'Dragonscale Mail',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Reflects 120% of blocked/mitigated damage back to attackers.',
    cursedName: 'Shedding',
    cursedText: 'Armor rating gives 10% less passive defense.',
  },
  {
    id: 'war_cape_hundred',
    name: 'Cape of the Hundred Battles',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'Gain a stacking +2% Damage buff for every floor cleared (up to +20%).',
    cursedName: 'Fatigued',
    cursedText: 'The max stacking damage cap is reduced to +10%.',
  },
  {
    id: 'war_cape_crimson',
    name: 'Crimson Banner of War',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'All Bronze buffs drafted gain +50% increased effectiveness.',
    cursedName: 'Faded Banner',
    cursedText: 'Bronze buffs only gain +25% effectiveness.',
  },
  {
    id: 'war_cape_aegis',
    name: 'Aegis Cloak of the Guardian',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'Grants a regenerating shield equal to 25% Max HP every floor.',
    cursedName: 'Leaky Shield',
    cursedText: 'Shield value is reduced to 15% Max HP.',
  },

  // ======================== MAGE (12) ========================
  {
    id: 'mage_wep_starlight',
    name: 'Starlight Weaver',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Basic attacks fire 3 homing cosmic bolts instead of 1.',
    cursedName: 'Flickering Stars',
    cursedText: 'Every 10th cast has a slight delay.',
  },
  {
    id: 'mage_wep_abyssal',
    name: 'Staff of the Abyssal Void',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Spells have a 20% chance to spawn a black hole that groups enemies.',
    cursedName: 'Drafty Void',
    cursedText: 'Maximum HP is reduced by 15%.',
  },
  {
    id: 'mage_wep_glacial',
    name: 'Glacial Scepter of El Nath',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Every spell chills enemies; chilled targets shatter for AoE damage on death.',
    cursedName: 'Chilled Hands',
    cursedText: 'Base casting speed is 10% slower.',
  },
  {
    id: 'mage_head_archmage',
    name: 'Crown of the Archmage',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'All Elemental buffs drafted start at +1 level higher.',
    cursedName: 'Heavy Crown',
    cursedText: 'Cooldowns are increased by a flat 5%.',
  },
  {
    id: 'mage_head_chaos',
    name: "Witch's Pointed Hat of Chaos",
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Casting a spell triggers a random secondary spell at 50% power.',
    cursedName: 'Unstable Brim',
    cursedText: 'Secondary spell power drops to 35%.',
  },
  {
    id: 'mage_head_sparks',
    name: 'Circlet of Infinite Sparks',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Chain Lightning bounces +4 additional times across the screen.',
    cursedName: 'Ground Leak',
    cursedText: 'Chain Lightning bounces 2 fewer times.',
  },
  {
    id: 'mage_top_frost',
    name: 'Robes of Eternal Frost',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Freezes all enemies on screen for 2 seconds when your HP drops below 30%.',
    cursedName: 'Chilly Draft',
    cursedText: 'Your armor rating is reduced by 15%.',
  },
  {
    id: 'mage_top_astral',
    name: 'Astral Silk Vestments',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Reduces all active skill cooldowns by 30%.',
    cursedName: 'Tangled Threads',
    cursedText: 'Skill cast delays are increased by 10%.',
  },
  {
    id: 'mage_top_phoenix',
    name: 'Phoenix Feather Tunic',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Revive once per daily run with 50% HP and a massive fire nova.',
    cursedName: 'Singed Feathers',
    cursedText: 'Revive triggers with only 25% HP.',
  },
  {
    id: 'mage_cape_tome',
    name: 'Tome of Floating Runes',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Summons 2 orbiting pixel books that automatically zap nearby foes.',
    cursedName: 'Heavy Tome',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'mage_cape_tempest',
    name: 'Cloak of the Arcane Tempest',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Every 10 seconds, call down a meteor storm dealing massive AoE damage.',
    cursedName: 'Delayed Storm',
    cursedText: 'Meteor interval is increased to every 14 seconds.',
  },
  {
    id: 'mage_cape_seraphim',
    name: 'Wings of the Seraphim',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Hover higher, dodging 35% of all ground-based melee attacks.',
    cursedName: 'Heavy Wings',
    cursedText: 'Dodge chance is reduced to 20%.',
  },

  // ======================== THIEF (12) ========================
  {
    id: 'thief_wep_shadowfang',
    name: 'Shadowfang Twins',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Every critical hit spawns a shadow clone that mimics your next attack.',
    cursedName: 'Fading Shadow',
    cursedText: 'Clone deals 25% less damage than your main strike.',
  },
  {
    id: 'thief_wep_phantom',
    name: 'The Phantom Whisper',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Attacks ignore 60% of enemy Armor and apply stacking Bleed.',
    cursedName: 'Whispering Echo',
    cursedText: 'Bleed duration is shortened by 1 second.',
  },
  {
    id: 'thief_wep_viper',
    name: 'Venomous Viper Claws',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Poison ticks can critically strike and spread to nearby enemies on death.',
    cursedName: 'Diluted Venom',
    cursedText: 'Poison damage ticks 10% slower.',
  },
  {
    id: 'thief_head_eclipse',
    name: "Assassin's Hood of the Eclipse",
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Guaranteed 100% Critical Hit Chance for the first 4 seconds of every floor.',
    cursedName: 'Partial Eclipse',
    cursedText: 'Crit duration lasts for 2.5 seconds instead.',
  },
  {
    id: 'thief_head_bandana',
    name: 'Bandana of the Night Lord',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Throwing stars/daggers pierce through up to 3 enemies in a line.',
    cursedName: 'Worn Bandana',
    cursedText: 'Stars only pierce through up to 2 enemies.',
  },
  {
    id: 'thief_head_fox',
    name: 'Mask of the Silent Fox',
    classId: 'thief',
    slot: 'headgear',
    signatureText: '+30% Dodge Chance; dodging an attack triggers an instant counter-slash.',
    cursedName: 'Restricted Vision',
    cursedText: 'Counter-slash damage is reduced by 20%.',
  },
  {
    id: 'thief_top_silentstep',
    name: 'Tunic of the Silent Step',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Dash instantly between enemies, gaining brief invulnerability frames.',
    cursedName: 'Stiff Fabric',
    cursedText: 'Dash cooldown is increased by 0.5 seconds.',
  },
  {
    id: 'thief_top_shadowweave',
    name: 'Shadow-Weave Jerkin',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Increases Critical Hit Damage by +100%.',
    cursedName: 'Loose Threads',
    cursedText: 'Base Critical Hit Chance is reduced by 5%.',
  },
  {
    id: 'thief_top_goldvest',
    name: 'Gold-Threaded Vest',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Enemies drop +60% more Gold; gain +1% Damage per 1,000 Gold held.',
    cursedName: 'Heavy Gold',
    cursedText: 'Movement speed is reduced by 5%.',
  },
  {
    id: 'thief_cape_afterimage',
    name: 'Cloak of a Thousand Afterimages',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Leaves behind explosive decoys every time you dodge or dash.',
    cursedName: 'Damp Powder',
    cursedText: 'Decoy explosion radius is slightly smaller.',
  },
  {
    id: 'thief_cape_crimsonmoon',
    name: 'Scarf of the Crimson Moon',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Executes normal enemies below 20% HP instantly.',
    cursedName: 'Lenient Threshold',
    cursedText: 'Execute triggers on enemies below 10% HP.',
  },
  {
    id: 'thief_cape_batwing',
    name: 'Bat-Wing Mantle',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Converts 15% of all Critical Damage dealt into healing.',
    cursedName: 'Thirsty Wings',
    cursedText: 'Conversion rate drops to 10%.',
  },

  // ======================== BOWMAN (12) ========================
  {
    id: 'bow_wep_galeforce',
    name: 'Gale-Force Greatbow',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Fires +2 additional arrows in a spread on every single shot.',
    cursedName: 'Crosswind',
    cursedText: 'Spread arrows have slight spread inaccuracy.',
  },
  {
    id: 'bow_wep_worldtree',
    name: 'The World-Tree Branch',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Arrows have a 25% chance to root enemies in vines and sprout healing buds.',
    cursedName: 'Dry Vines',
    cursedText: 'Root duration is shortened to 1 second.',
  },
  {
    id: 'bow_wep_thunderbird',
    name: "Thunderbird's Recurve",
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Every 5th arrow transforms into a piercing lightning bolt.',
    cursedName: 'Static Delay',
    cursedText: 'Every 7th arrow transforms instead of every 5th.',
  },
  {
    id: 'bow_head_feathered',
    name: "Ranger's Feathered Cap",
    classId: 'bowman',
    slot: 'headgear',
    signatureText: '+40% Attack Speed and +20% Range on all projectiles.',
    cursedName: 'Heavy Plume',
    cursedText: 'Attack Speed bonus is dialed back to +25%.',
  },
  {
    id: 'bow_head_beastmaster',
    name: 'Crown of the Beastmaster',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Summons a second spectral Wolf companion alongside your Hawk.',
    cursedName: 'Disobedient Pup',
    cursedText: 'Spectral wolf attacks 15% slower.',
  },
  {
    id: 'bow_head_hawkeye',
    name: 'Hawkeye Visor',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Damage increases by up to +80% based on how far away the enemy is.',
    cursedName: 'Narrow Focus',
    cursedText: 'Maximum distance damage bonus caps at +50%.',
  },
  {
    id: 'bow_top_apexpredator',
    name: 'Vest of the Apex Predator',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Your companions inherit 100% of your Critical Rate and Critical Damage.',
    cursedName: 'Distant Pack',
    cursedText: 'Companions inherit 75% of your stats instead.',
  },
  {
    id: 'bow_top_windrunner',
    name: "Windrunner's Tunic",
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Every 3rd dodge fires a free volley of 5 homing arrows.',
    cursedName: 'Stumbled Step',
    cursedText: 'Requires every 4th dodge to trigger the volley.',
  },
  {
    id: 'bow_top_camouflage',
    name: 'Camouflage Leaf Cloak',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Enemies take 2 seconds longer to aggro onto you when entering a floor.',
    cursedName: 'Rustling Leaves',
    cursedText: 'Aggro delay is reduced to 1 second.',
  },
  {
    id: 'bow_cape_endlesssky',
    name: 'Quiver of the Endless Sky',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'On-hit buff triggers have double the chance to activate.',
    cursedName: 'Tangled Strings',
    cursedText: 'On-hit trigger chance bonus is reduced to +50%.',
  },
  {
    id: 'bow_cape_goldenfalcon',
    name: "Golden Falcon's Plumage",
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'Your Hawk companion periodically drops Gold coins and HP orbs mid-fight.',
    cursedName: 'Greedy Bird',
    cursedText: 'Drop frequency is slightly lowered.',
  },
  {
    id: 'bow_cape_sylvanspirit',
    name: 'Sylvan Spirit Mantle',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'All Silver-tier buffs in your draft pool appear 2x more frequently.',
    cursedName: 'Fading Spirit',
    cursedText: 'Silver buffs appear 1.5x more frequently.',
  },
];

export const getLegendaryById = (id: string | null): LegendaryDefinition | null => {
  if (!id) return null;
  return LEGENDARY_CATALOG.find((item) => item.id === id) ?? null;
};

export const getLegendariesForClass = (classId: ClassId): LegendaryDefinition[] =>
  LEGENDARY_CATALOG.filter((item) => item.classId === classId);

export const getHybridElement = (sockets: readonly ElementId[]): HybridElementDefinition | null => {
  if (sockets.length < 2) return null;
  const first = sockets[0];
  const second = sockets[1];
  if (!first || !second || first === second) return null;
  return (
    HYBRID_ELEMENTS.find(
      (h) =>
        (h.elements[0] === first && h.elements[1] === second) ||
        (h.elements[0] === second && h.elements[1] === first)
    ) ?? null
  );
};
