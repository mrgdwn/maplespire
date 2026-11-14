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
    name: 'Crimson Yang Gem',
    colorHex: '#ff5722',
    colorInt: 0xff5722,
    effectText: 'Inflicts stacking Yang Burn DoT on every strike.',
  },
  {
    id: 'ice',
    name: 'Frost Yin Pearl',
    colorHex: '#00bcd4',
    colorInt: 0x00bcd4,
    effectText: 'Slows cultist footwork & attack speed by 15% per stack.',
  },
  {
    id: 'lightning',
    name: 'Heavenly Thunder Relic',
    colorHex: '#ffeb3b',
    colorInt: 0xffeb3b,
    effectText: 'Chance on hit to arc Qi lightning to 2-3 nearby cultists.',
  },
  {
    id: 'dark',
    name: 'Abyssal Venom Bead',
    colorHex: '#9c27b0',
    colorInt: 0x9c27b0,
    effectText: 'Shreds foe Iron-Shirt defense + applies stacking shadow DoT.',
  },
];

export const HYBRID_ELEMENTS: readonly HybridElementDefinition[] = [
  {
    elements: ['fire', 'lightning'],
    name: 'Plasma',
    colorHex: '#ff9800',
    effectText: 'Violent Qi-thunder detonations trigger on burning cultists.',
  },
  {
    elements: ['ice', 'dark'],
    name: 'Abyssal Frost',
    colorHex: '#3f51b5',
    effectText: 'Slows cultists while shredding Iron-Shirt defense & draining HP.',
  },
  {
    elements: ['fire', 'dark'],
    name: 'Hellfire',
    colorHex: '#e91e63',
    effectText: 'Yang Burn deals bonus damage based on missing foe armor.',
  },
  {
    elements: ['lightning', 'dark'],
    name: 'Void Storm',
    colorHex: '#7c4dff',
    effectText: 'Chain Qi arcs apply Abyssal armor shred to every cultist hit.',
  },
];

export const LEGENDARY_CATALOG: readonly LegendaryDefinition[] = [
  // ======================== EXTERNAL MARTIAL RELICS (12) ========================
  {
    id: 'war_wep_ragnarok',
    name: 'Heaven-Sundering Dragon Sabre',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Every 3rd strike unleashes a sweeping Nine-Yang Qi wave.',
    cursedName: 'Cracked Yang Core',
    cursedText: 'Swing healing effects are reduced by 50% for this run.',
  },
  {
    id: 'war_wep_worldbreaker',
    name: 'Xuantie Mountain-Cleaver',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: '+150% Knockback; cultists slammed into walls take 2x damage.',
    cursedName: 'Leaden Iron Weight',
    cursedText: 'Attack Speed is slightly reduced by 10%.',
  },
  {
    id: 'war_wep_souldrinker',
    name: 'Blood-Drinking Demon Blade',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Restores 3% Max HP on every cultist defeated.',
    cursedName: 'Parched Edge',
    cursedText: 'You take 10% more damage from Hall Master mini-bosses.',
  },
  {
    id: 'war_head_unbroken',
    name: 'Mount Hua Unyielding Headband',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Gain +1% Attack for every 2% of missing HP.',
    cursedName: 'Rigid Focus',
    cursedText: 'Your Qinggong Dodge chance is reduced to 0%.',
  },
  {
    id: 'war_head_berserker',
    name: 'Blood-Moon Berserker Crown',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Automatically ignites Qi Frenzy at the start of every floor.',
    cursedName: 'Reckless Meridian',
    cursedText: 'Qi Frenzy duration is shortened by 1 second.',
  },
  {
    id: 'war_head_balrog',
    name: 'Golden Bell Sovereign Diadem',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Negates the first 3 hits taken on every floor.',
    cursedName: 'Scratched Seal',
    cursedText: 'Only negates the first 1 hit per floor.',
  },
  {
    id: 'war_top_volcanic',
    name: 'Nine-Yang Blazing War Robe',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Scorches all nearby melee cultists with constant Nine-Yang AoE burn.',
    cursedName: 'Heavy Ember Weave',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'war_top_titan',
    name: 'Iron-Guard Arhat Vestment',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Converts 50% of your Armor rating into bonus Base Attack.',
    cursedName: 'Bulky Plates',
    cursedText: 'Floor transitions take 0.5s longer.',
  },
  {
    id: 'war_top_dragonscale',
    name: 'Dragon-Scale Sovereign Mail',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Reflects 120% of blocked/mitigated damage back to attackers.',
    cursedName: 'Weathered Scales',
    cursedText: 'Armor rating gives 10% less passive defense.',
  },
  {
    id: 'war_cape_hundred',
    name: 'Hundred-Battles Banner Cloak',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'Gain a stacking +2% Damage buff for every floor cleared (up to +20%).',
    cursedName: 'Tattered Standard',
    cursedText: 'The max stacking damage cap is reduced to +10%.',
  },
  {
    id: 'war_cape_crimson',
    name: 'Shaolin Crimson Sect Cloak',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'All basic sect manuals drafted gain +50% increased stat effectiveness.',
    cursedName: 'Faded Silk',
    cursedText: 'Basic manual bonus effectiveness is reduced to +25%.',
  },
  {
    id: 'war_cape_aegis',
    name: 'Immortal Tortoise Qi Mantle',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'Grants a regenerating Qi barrier equal to 25% Max HP every floor.',
    cursedName: 'Leaking Barrier',
    cursedText: 'Qi barrier value is reduced to 15% Max HP.',
  },

  // ======================== INTERNAL QI RELICS (12) ========================
  {
    id: 'mage_wep_starlight',
    name: 'Jade Spirit Star-Calling Sword',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Basic attacks loose 3 homing starlight sword-qi bolts instead of 1.',
    cursedName: 'Flickering Meridian',
    cursedText: 'Every 10th technique has a slight cast delay.',
  },
  {
    id: 'mage_wep_abyssal',
    name: 'Northern Abyss Void Staff',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Techniques have a 20% chance to spawn a Qi vortex that pulls cultists together.',
    cursedName: 'Hollow Dantian',
    cursedText: 'Maximum HP is reduced by 15%.',
  },
  {
    id: 'mage_wep_glacial',
    name: 'Nine-Yin Frost Jade Flute',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Every strike chills cultists; chilled targets shatter in AoE frost on death.',
    cursedName: 'Chilled Fingerwork',
    cursedText: 'Base technique tempo is 10% slower.',
  },
  {
    id: 'mage_head_archmage',
    name: 'Wudang Taiji Daoist Crown',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Empowers drafted elemental & Qi techniques at +1 higher potency.',
    cursedName: 'Heavy Jade Crown',
    cursedText: 'Cooldowns are increased by a flat 5%.',
  },
  {
    id: 'mage_head_chaos',
    name: 'Kunlun Chaos Qi Hairpin',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Casting a Martial Art triggers a secondary Qi burst at 50% power.',
    cursedName: 'Erratic Pulse',
    cursedText: 'Secondary Qi burst power drops to 35%.',
  },
  {
    id: 'mage_head_sparks',
    name: 'Heavenly Thunder Cloud Circlet',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Chain Qi arcs bounce +4 additional times across the chamber.',
    cursedName: 'Grounding Silk',
    cursedText: 'Chain Qi arcs bounce 2 fewer times.',
  },
  {
    id: 'mage_top_frost',
    name: 'Pale-Jade Eternal Frost Robe',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Flash-freezes all cultists in the chamber for 2s when your HP drops below 30%.',
    cursedName: 'Thin Cold Weave',
    cursedText: 'Your Armor rating is reduced by 15%.',
  },
  {
    id: 'mage_top_astral',
    name: 'Eight-Trigram Astral Vestment',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Reduces all Active Martial Art cooldowns by 30%.',
    cursedName: 'Tangled Threads',
    cursedText: 'Technique activation delays are increased by 10%.',
  },
  {
    id: 'mage_top_phoenix',
    name: 'Vermilion Bird Nirvana Robe',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Revive once per spire delve with 50% HP and a massive Nine-Yang Qi nova.',
    cursedName: 'Scorched Plume',
    cursedText: 'Revive triggers with only 25% HP.',
  },
  {
    id: 'mage_cape_tome',
    name: 'Peach Blossom Floating Scriptures',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Summons 2 orbiting jade scrolls that automatically strike nearby cultists.',
    cursedName: 'Heavy Bamboo Scrolls',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'mage_cape_tempest',
    name: 'Tianma Falling-Star Cloak',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Every 10s, call down a Falling-Star palm barrage dealing massive AoE damage.',
    cursedName: 'Delayed Qi',
    cursedText: 'Barrage interval increases to every 14 seconds.',
  },
  {
    id: 'mage_cape_seraphim',
    name: 'Immortal Crane Cloud Wings',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Soar lightly via Cloud Qinggong, dodging 35% of ground melee strikes.',
    cursedName: 'Heavy Plumage',
    cursedText: 'Dodge chance is reduced to 20%.',
  },

  // ======================== SHADOW & TANG SECT RELICS (12) ========================
  {
    id: 'thief_wep_shadowfang',
    name: 'Twin Phantom Cicada Blades',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Every critical hit spawns a shadow afterimage that mimics your next strike.',
    cursedName: 'Fading Mirage',
    cursedText: 'Afterimage deals 25% less damage than your main strike.',
  },
  {
    id: 'thief_wep_phantom',
    name: 'Tang Sect Whispering Dagger',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Strikes ignore 60% of cultist Armor and inflict stacking Bleed.',
    cursedName: 'Shallow Groove',
    cursedText: 'Bleed duration is shortened by 1 second.',
  },
  {
    id: 'thief_wep_viper',
    name: 'White-Camel Five-Venom Claws',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Venom ticks can critically strike and spread to nearby cultists on kill.',
    cursedName: 'Diluted Venom',
    cursedText: 'Venom damage ticks 10% slower.',
  },
  {
    id: 'thief_head_eclipse',
    name: 'Night-Crow Eclipse Hood',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Guaranteed 100% Critical Hit Chance for the first 4 seconds of every floor.',
    cursedName: 'Fleeting Shadow',
    cursedText: 'Guaranteed Crit duration lasts for 2.5 seconds instead.',
  },
  {
    id: 'thief_head_bandana',
    name: 'Tang Sect Rainstorm Headband',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Hidden needles & Qi projectiles pierce through up to 3 cultists in a line.',
    cursedName: 'Worn Sash',
    cursedText: 'Hidden projectiles only pierce through up to 2 cultists.',
  },
  {
    id: 'thief_head_fox',
    name: 'Nine-Tailed Spirit Fox Mask',
    classId: 'thief',
    slot: 'headgear',
    signatureText: '+30% Dodge Chance; evading an attack triggers an instant counter-slash.',
    cursedName: 'Restricted Sight',
    cursedText: 'Counter-slash damage is reduced by 20%.',
  },
  {
    id: 'thief_top_silentstep',
    name: 'Ancient Tomb Cloud-Step Tunic',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Qinggong Dash glides instantly between foes with brief invulnerability.',
    cursedName: 'Stiff Silk',
    cursedText: 'Qinggong Dash cooldown is increased by 0.5 seconds.',
  },
  {
    id: 'thief_top_shadowweave',
    name: 'Night-Walker Brocade Jerkin',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Increases Critical Hit Damage by +100%.',
    cursedName: 'Frayed Seam',
    cursedText: 'Base Critical Hit Chance is reduced by 5%.',
  },
  {
    id: 'thief_top_goldvest',
    name: 'Golden Abacus Silk Vest',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Cultists drop +60% more Taels; gain +1% Damage per 1,000 Silver Taels held.',
    cursedName: 'Heavy Silver Bullion',
    cursedText: 'Movement speed is reduced by 5%.',
  },
  {
    id: 'thief_cape_afterimage',
    name: 'Thousand-Mirage Smoke Cloak',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Leaves behind explosive Tang thunder-powder decoys every time you dodge or dash.',
    cursedName: 'Damp Thunder-Powder',
    cursedText: 'Decoy blast radius is slightly smaller.',
  },
  {
    id: 'thief_cape_crimsonmoon',
    name: 'Crimson Moon Execution Scarf',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Executes normal cultists below 20% HP instantly.',
    cursedName: 'Lenient Edge',
    cursedText: 'Execute triggers on cultists below 10% HP.',
  },
  {
    id: 'thief_cape_batwing',
    name: 'Azure-Bat Blood Mantle',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Converts 15% of all Critical Damage dealt into vitality healing.',
    cursedName: 'Parched Wings',
    cursedText: 'Vitality conversion rate drops to 10%.',
  },

  // ======================== CONDOR & SWORD SOVEREIGN RELICS (12) ========================
  {
    id: 'bow_wep_galeforce',
    name: 'Mongol Steppe Twin-Eagle Bow',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Looses +2 additional projectiles in a spread on every basic attack.',
    cursedName: 'Crosswind String',
    cursedText: 'Spread projectiles have slight dispersion inaccuracy.',
  },
  {
    id: 'bow_wep_worldtree',
    name: 'Passionless Valley Vine Whip',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: '25% chance on hit to root cultists in thorns and sprout healing Qi buds.',
    cursedName: 'Dry Vines',
    cursedText: 'Thorn root duration is shortened to 1 second.',
  },
  {
    id: 'bow_wep_thunderbird',
    name: 'Thunder-Condor Iron Recurve',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Every 5th shot transforms into a piercing Heavenly Thunder Qi bolt.',
    cursedName: 'Static Delay',
    cursedText: 'Every 7th shot transforms instead of every 5th.',
  },
  {
    id: 'bow_head_feathered',
    name: 'White-Condor Plume Cap',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: '+40% Attack Speed and +20% Range on all Martial Art projectiles.',
    cursedName: 'Heavy Plume',
    cursedText: 'Attack Speed bonus is dialed back to +25%.',
  },
  {
    id: 'bow_head_beastmaster',
    name: 'Beast-Mountain Sovereign Crown',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Summons a second spectral Wolf guardian alongside your Condor.',
    cursedName: 'Restless Pup',
    cursedText: 'Spectral Wolf strikes 15% slower.',
  },
  {
    id: 'bow_head_hawkeye',
    name: 'Hundred-Pace Piercing Visor',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Damage increases by up to +80% based on distance to the cultist.',
    cursedName: 'Narrow Focus',
    cursedText: 'Maximum distance damage bonus caps at +50%.',
  },
  {
    id: 'bow_top_apexpredator',
    name: 'Divine Condor Companion Vest',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Your Condor & Wolf companions inherit 100% of your Crit Rate and Crit DMG.',
    cursedName: 'Distant Bond',
    cursedText: 'Companions inherit 75% of your stats instead.',
  },
  {
    id: 'bow_top_windrunner',
    name: 'Gale-Step Qinggong Tunic',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Every 3rd dodge unleashes a free volley of 5 homing Qi blades.',
    cursedName: 'Faltered Step',
    cursedText: 'Requires every 4th dodge to trigger the volley.',
  },
  {
    id: 'bow_top_camouflage',
    name: 'Misty Bamboo Stealth Cloak',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Cultists take 2 seconds longer to notice you when entering a floor.',
    cursedName: 'Rustling Leaves',
    cursedText: 'Stealth delay is reduced to 1 second.',
  },
  {
    id: 'bow_cape_endlesssky',
    name: 'Heavenly Quiver Cloud Mantle',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'On-hit elemental & relic triggers have double the chance to activate.',
    cursedName: 'Knotted Strings',
    cursedText: 'On-hit trigger chance bonus is reduced to +50%.',
  },
  {
    id: 'bow_cape_goldenfalcon',
    name: 'Golden Condor Plumage Cloak',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'Your Condor companion periodically drops Silver Taels and vitality orbs mid-fight.',
    cursedName: 'Greedy Raptor',
    cursedText: 'Drop frequency is slightly lowered.',
  },
  {
    id: 'bow_cape_sylvanspirit',
    name: 'Sacred Valley Spirit Mantle',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'All Esoteric Martial Manuals appear 2x more frequently when comprehending.',
    cursedName: 'Fading Spirit',
    cursedText: 'Esoteric manuals appear 1.5x more frequently.',
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
