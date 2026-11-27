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
  id: string;
  elements: readonly [ElementId, ElementId];
  name: string;
  displayName: string;
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
    id: 'plasma',
    elements: ['fire', 'lightning'],
    name: 'Plasma',
    displayName: 'Nine-Yang Lightning',
    colorHex: '#ff9800',
    effectText: 'Violent Qi-thunder detonations trigger on burning cultists.',
  },
  {
    id: 'abyssal_frost',
    elements: ['ice', 'dark'],
    name: 'Abyssal Frost',
    displayName: 'Cold-Jade Frost',
    colorHex: '#3f51b5',
    effectText: 'Slows cultists while shredding Iron-Shirt defense & draining HP.',
  },
  {
    id: 'hellfire',
    elements: ['fire', 'dark'],
    name: 'Hellfire',
    displayName: 'Crimson Lotus Flame',
    colorHex: '#e91e63',
    effectText: 'Yang Burn deals bonus damage based on missing foe armor.',
  },
  {
    id: 'void_storm',
    elements: ['lightning', 'dark'],
    name: 'Void Storm',
    displayName: 'Abyssal Qi Storm',
    colorHex: '#7c4dff',
    effectText: 'Chain Qi arcs apply Abyssal armor shred to every cultist hit.',
  },
];

export const LEGENDARY_CATALOG: readonly LegendaryDefinition[] = [
  // ======================== EXTERNAL MARTIAL RELICS (11) ========================
  {
    id: 'war_wep_ragnarok',
    name: 'Dragon-Slaying Saber',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Supreme Under Heaven, the Dragon Saber commands — every 3rd strike unleashes a sweeping Nine-Yang flame wave.',
    cursedName: 'Heavy Spirit Rebuke',
    cursedText: 'Swing healing effects are reduced by 50% for this run.',
  },
  {
    id: 'war_wep_worldbreaker',
    name: 'Black-Iron Heavy Sword',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Great skill requires no craft — sixty-four catties of meteoric dark iron: +150% Knockback; wall-slammed foes take 2x damage.',
    cursedName: 'Leaden Iron Weight',
    cursedText: 'Attack Speed is slightly reduced by 10%.',
  },
  {
    id: 'war_wep_souldrinker',
    name: 'Golden Serpent Sword',
    classId: 'warrior',
    slot: 'weapon',
    signatureText: 'Golden Serpent Lord Xia Xueyi’s serpentine blade — coils past enemy blocks and restores 3% Max HP per cultist defeated.',
    cursedName: 'Parched Serpent',
    cursedText: 'You take 10% more damage from Hall Master mini-bosses.',
  },
  {
    id: 'war_head_unbroken',
    name: 'Dugu Sword-Intent Crown',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'The undefeated Sword Devil’s resolve: Gain +1% Attack for every 2% of missing HP.',
    cursedName: 'Rigid Sword-Heart',
    cursedText: 'Your Cloud-Step Dodge chance is reduced to 0%.',
  },
  {
    id: 'war_head_berserker',
    name: 'Blood-Blade Demon Monarch Crest',
    classId: 'warrior',
    slot: 'headgear',
    signatureText: 'Blood Blade Grandmaster’s ruthless crest: automatically ignites Battle Frenzy at the start of every floor.',
    cursedName: 'Meridian Frenzy Toll',
    cursedText: 'Battle Frenzy duration is shortened by 1 second.',
  },
  {
    id: 'war_top_volcanic',
    name: 'Nine-Yang Blazing Battle Robe',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Woven with raw Nine-Yang inner heat: radiates searing solar Qi around you, damaging all nearby cultists.',
    cursedName: 'Heavy Yang Swelter',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'war_top_titan',
    name: 'Shaolin 72 Arts Kasaya',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Sacred Buddhist kasaya of the Bodhidharma Hall: converts 50% of your Armor rating into bonus Base Attack.',
    cursedName: 'Heavy Cloth Weight',
    cursedText: 'Floor transitions take 0.5s longer.',
  },
  {
    id: 'war_top_dragonscale',
    name: 'Peach Blossom Soft Hedgehog Armor',
    classId: 'warrior',
    slot: 'top',
    signatureText: 'Huang Rong’s gold-wire barbed hedgehog vest: reflects 120% of mitigated damage back to attackers.',
    cursedName: 'Bent Needle Quills',
    cursedText: 'Armor rating gives 10% less passive defense.',
  },
  {
    id: 'war_cape_hundred',
    name: 'Book of Wumu',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'General Yue Fei’s legendary military treatise hidden inside the Dragon Saber: +2% Damage per floor cleared (up to +20%).',
    cursedName: 'Faded War Strategy',
    cursedText: 'The max stacking damage cap is reduced to +10%.',
  },
  {
    id: 'war_cape_crimson',
    name: 'Beggar Sect Nine-Pocket Patchwork Mantle',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'The revered 9-pocket mantle of elder Beggar chiefs: all basic sect manuals drafted gain +50% increased stat effectiveness.',
    cursedName: 'Frayed Beggar Patch',
    cursedText: 'Basic manual bonus effectiveness is reduced to +25%.',
  },
  {
    id: 'war_cape_aegis',
    name: 'Mount Wudang Taiji Mantle',
    classId: 'warrior',
    slot: 'cape',
    signatureText: 'Zhang Sanfeng’s Yin-Yang deflection mantle: grants a regenerating spirit barrier equal to 25% Max HP every floor.',
    cursedName: 'Leaking Yin-Yang Balance',
    cursedText: 'Spirit barrier value is reduced to 15% Max HP.',
  },

  // ======================== PASSIVE SKILL RELICS (12) ========================
  {
    id: 'mage_wep_starlight',
    name: 'Heaven-Reliant Sword',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'None dare contest under the heavens — twin sister to the Dragon-Slaying Saber: basic attacks loose 3 homing starlight sword bolts.',
    cursedName: 'Flickering Meridian',
    cursedText: 'Every 10th technique has a slight cast delay.',
  },
  {
    id: 'mage_wep_abyssal',
    name: 'Dog-Beating Bamboo Staff',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Sacred emerald bamboo staff of the Beggar Sect Chiefs: 20% chance on strike to summon an emerald vortex pulling cultists inward.',
    cursedName: 'Hollow Bamboo Core',
    cursedText: 'Maximum HP is reduced by 15%.',
  },
  {
    id: 'mage_wep_glacial',
    name: 'Green-Jade Peach Blossom Flute',
    classId: 'mage',
    slot: 'weapon',
    signatureText: 'Eastern Heretic Huang Yaoshi’s jade flute: plays the Azure Tide Symphony — every note slows cultists and shatters AoE soundwaves on death.',
    cursedName: 'Chilled Melody',
    cursedText: 'Base technique tempo is 10% slower.',
  },
  {
    id: 'mage_head_archmage',
    name: 'Wudang Pure-Yang Daoist Crown',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Zhang Sanfeng’s supreme Daoist crown: empowers all comprehended Passive Skills at +1 higher potency.',
    cursedName: 'Heavy Jade Crown',
    cursedText: 'Cooldowns are increased by a flat 5%.',
  },
  {
    id: 'mage_head_chaos',
    name: 'Carefree Sect Seven-Treasure Hairpin',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Tianshan Child Elder’s immortal hairpin: casting a Martial Technique triggers a secondary spirit burst at 50% power.',
    cursedName: 'Erratic Meridian Pulse',
    cursedText: 'Secondary spirit burst power drops to 35%.',
  },
  {
    id: 'mage_head_sparks',
    name: 'Dali Six-Pulse Meridian Circlet',
    classId: 'mage',
    slot: 'headgear',
    signatureText: 'Dali Duan royal clan’s Qi circlet: Six-Pulse sword arcs bounce +4 additional times across the chamber.',
    cursedName: 'Grounding Jade Loop',
    cursedText: 'Six-Pulse sword arcs bounce 2 fewer times.',
  },
  {
    id: 'mage_top_frost',
    name: 'Ancient Tomb Cold-Jade Silk',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Carved from the hundred-year Cold-Jade Bed: stuns & freezes cultist meridians chamber-wide for 2s when your HP drops below 30%.',
    cursedName: 'Chilled Silk Weave',
    cursedText: 'Your Armor rating is reduced by 15%.',
  },
  {
    id: 'mage_top_astral',
    name: 'Mount Hua Violet-Mist Robe',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Revered Daoist vestment of Mount Hua’s Violet Mist Art: reduces all Martial Technique cooldowns by 30%.',
    cursedName: 'Tangled Violet Qi',
    cursedText: 'Technique activation delays are increased by 10%.',
  },
  {
    id: 'mage_top_phoenix',
    name: 'Golden Bell Arhat Kasaya',
    classId: 'mage',
    slot: 'top',
    signatureText: 'Sacred Buddhist kasaya of Mount Song: revive once per spire delve with 50% HP and a massive Nine-Yang solar nova.',
    cursedName: 'Diminished Golden Bell',
    cursedText: 'Revive triggers with only 25% HP.',
  },
  {
    id: 'mage_cape_tome',
    name: 'Nine-Yin Sacred Sutra Scroll',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Daoist Huang Chang’s supreme immortal canon: summons 2 orbiting sutra talismans that strike nearby cultists continuously.',
    cursedName: 'Fragmented Sheepskin Scroll',
    cursedText: 'Your movement speed is reduced by 5%.',
  },
  {
    id: 'mage_cape_tempest',
    name: 'Kunlun Iron-Lute Melody Mantle',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'He Zudao’s three-saint cloud mantle: every 10s, calls down a resonant falling-star palm barrage dealing massive AoE damage.',
    cursedName: 'Delayed Lute Pulse',
    cursedText: 'Barrage interval increases to every 14 seconds.',
  },
  {
    id: 'mage_cape_seraphim',
    name: 'Lingbo Carefree Cloud Mantle',
    classId: 'mage',
    slot: 'cape',
    signatureText: 'Echoes of the Goddess of Luo River footwork: soar lightly on Lingbo Microsteps, dodging 35% of ground melee strikes.',
    cursedName: 'Heavy Hemline',
    cursedText: 'Dodge chance is reduced to 20%.',
  },

  // ======================== SHADOW & NIGHT-WALKER RELICS (11) ========================
  {
    id: 'thief_wep_shadowfang',
    name: 'Gentleman & Lady Twin Swords',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Passionless Valley twin dark-steel magnetic blades: every critical hit spawns a Sword-Shadow afterimage mimic.',
    cursedName: 'Fading Sword-Mirage',
    cursedText: 'Afterimage deals 25% less damage than your main strike.',
  },
  {
    id: 'thief_wep_phantom',
    name: 'Ice-Soul Silver Needles',
    classId: 'thief',
    slot: 'weapon',
    signatureText: 'Red-Dust Fairy Li Mochou’s lethal silver needles — forged with freezing venom that pierces guard: strikes ignore 60% of Armor and inflict Bleed.',
    cursedName: 'Unsteady Flick',
    cursedText: 'Bleed duration is shortened by 1 second.',
  },
  {
    id: 'thief_head_eclipse',
    name: 'Linghu Chong Wanderer Headband',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Mount Hua prodigy Linghu Chong’s carefree headband — reads every flaw in an instant: guaranteed 100% Critical Hit Chance for the first 4 seconds of every floor.',
    cursedName: 'Fleeting Sword-Intuition',
    cursedText: 'Guaranteed Crit duration lasts for 2.5 seconds instead.',
  },
  {
    id: 'thief_head_bandana',
    name: 'Ancient Tomb Jade-Bee Hood',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'Ancient Tomb Sect’s prized Jade-Bee Needle crest: projectiles and needle waves pierce through up to 3 cultists in a line.',
    cursedName: 'Frayed Tomb Band',
    cursedText: 'Projectiles only pierce through up to 2 cultists.',
  },
  {
    id: 'thief_head_fox',
    name: 'Yang Guo Human-Skin Mask',
    classId: 'thief',
    slot: 'headgear',
    signatureText: 'The Condor Hero’s uncanny disguise crafted by Cheng Ying: +30% Dodge Chance; evading an attack triggers an instant counter-slash.',
    cursedName: 'Restricted Vision',
    cursedText: 'Counter-slash damage is reduced by 20%.',
  },
  {
    id: 'thief_top_silentstep',
    name: 'Lingbo Microsteps Silk Tunic',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Duan Yu’s effortless divine footwork: Shadow-Step Dash glides instantly between foes with brief invulnerability.',
    cursedName: 'Stiff Silk Border',
    cursedText: 'Shadow-Step Dash cooldown is increased by 0.5 seconds.',
  },
  {
    id: 'thief_top_shadowweave',
    name: 'Golden Silk Impenetrable Vest',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Woven from thousands of spun gold threads impervious to all blades: increases Critical Hit Damage by +100%.',
    cursedName: 'Frayed Golden Thread',
    cursedText: 'Base Critical Hit Chance is reduced by 5%.',
  },
  {
    id: 'thief_top_goldvest',
    name: 'Beggar Sect Thousand-Coin Brocade',
    classId: 'thief',
    slot: 'top',
    signatureText: 'Cultists drop +60% more Gold; gain +1% Damage per 1,000 Gold held.',
    cursedName: 'Heavy Silver Bullion',
    cursedText: 'Movement speed is reduced by 5%.',
  },
  {
    id: 'thief_cape_afterimage',
    name: 'Peach Blossom Mirage Cloak',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Huang Yaoshi’s illusion formation: leaves behind explosive thunder-powder decoys every time you dodge or dash.',
    cursedName: 'Damp Thunder-Powder',
    cursedText: 'Decoy blast radius is slightly smaller.',
  },
  {
    id: 'thief_cape_crimsonmoon',
    name: 'Blood-Blade Sect Red Lotus Scarf',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Blood-Blade sect butcher scarf: executes normal cultists below 20% HP instantly.',
    cursedName: 'Lenient Edge',
    cursedText: 'Execute triggers on cultists below 10% HP.',
  },
  {
    id: 'thief_cape_batwing',
    name: 'Green-Winged Bat King Mantle',
    classId: 'thief',
    slot: 'cape',
    signatureText: 'Ming Cult guardian Wei Yixiao’s icy wings: converts 15% of all Critical Damage dealt into vitality healing.',
    cursedName: 'Parched Bat Wings',
    cursedText: 'Vitality conversion rate drops to 10%.',
  },

  // ======================== CONDOR & SWORD SOVEREIGN RELICS (12) ========================
  {
    id: 'bow_wep_galeforce',
    name: 'Genghis Khan Iron-Horn Warbow',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Guo Jing’s hundred-stone steppe warbow used to fell the twin condors: looses +2 additional projectiles in a spread on every attack.',
    cursedName: 'Crosswind Steppe String',
    cursedText: 'Spread projectiles have slight dispersion inaccuracy.',
  },
  {
    id: 'bow_wep_worldtree',
    name: 'Ancient Tomb Golden-Bell Silk Ribbon',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Xiaolongnü’s white silk ribbon with silver bells: 25% chance on hit to seal cultist acupoints (root) and sprout healing spirit orbs.',
    cursedName: 'Fringed Silk Ribbon',
    cursedText: 'Acupoint root duration is shortened to 1 second.',
  },
  {
    id: 'bow_wep_thunderbird',
    name: 'Golden Wheel Monk’s Five Dharma Wheels',
    classId: 'bowman',
    slot: 'weapon',
    signatureText: 'Five whirling wheels of gold, silver, copper, iron, and lead: every 5th shot unleashes a piercing Five-Wheel thunder bolt.',
    cursedName: 'Off-Axis Wheel Spin',
    cursedText: 'Every 7th shot transforms instead of every 5th.',
  },
  {
    id: 'bow_head_feathered',
    name: 'Condor-Shooting Hero Plume Crest',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: '+40% Attack Speed and +20% Range on all Martial Technique projectiles.',
    cursedName: 'Heavy White Plume',
    cursedText: 'Attack Speed bonus is dialed back to +25%.',
  },
  {
    id: 'bow_head_beastmaster',
    name: 'Divine Condor Companion Crest',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Yang Guo’s loyal giant Condor crest: summons a second spectral Wolf guardian alongside your Condor.',
    cursedName: 'Restless Beast',
    cursedText: 'Spectral Wolf strikes 15% slower.',
  },
  {
    id: 'bow_head_hawkeye',
    name: 'Hundred-Pace Yang-Leaf Visor',
    classId: 'bowman',
    slot: 'headgear',
    signatureText: 'Master archer Yang Youji’s leaf-piercing focus: Damage increases by up to +80% based on distance to the cultist.',
    cursedName: 'Narrowed Field of View',
    cursedText: 'Maximum distance damage bonus caps at +50%.',
  },
  {
    id: 'bow_top_apexpredator',
    name: 'Zhongnan Mountain Divine Condor Tunic',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Woven from molted feathers of Dugu Qiubai’s Divine Condor: your companions inherit 100% of your Crit Rate and Crit DMG.',
    cursedName: 'Frayed Feather Bond',
    cursedText: 'Companions inherit 75% of your stats instead.',
  },
  {
    id: 'bow_top_windrunner',
    name: 'Willow-Gliding Wind-Riding Tunic',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Every 3rd dodge unleashes a free volley of 5 homing spirit blades.',
    cursedName: 'Faltered Willow Step',
    cursedText: 'Requires every 4th dodge to trigger the volley.',
  },
  {
    id: 'bow_top_camouflage',
    name: 'Peach Blossom Misty Bamboo Cloak',
    classId: 'bowman',
    slot: 'top',
    signatureText: 'Huang Yaoshi’s mist formation: cultists take 2 seconds longer to notice you when entering a floor.',
    cursedName: 'Rustling Bamboo',
    cursedText: 'Stealth delay is reduced to 1 second.',
  },
  {
    id: 'bow_cape_endlesssky',
    name: 'Nine-Heavens Condor Cloud Cloak',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'On-hit technique & relic triggers have double the chance to activate.',
    cursedName: 'Knotted Feather Strings',
    cursedText: 'On-hit trigger chance bonus is reduced to +50%.',
  },
  {
    id: 'bow_cape_goldenfalcon',
    name: 'Steppe Golden Eagle Hunting Mantle',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'Your Condor companion periodically drops Gold and vitality orbs mid-fight.',
    cursedName: 'Greedy Falcon Raptor',
    cursedText: 'Drop frequency is slightly lowered.',
  },
  {
    id: 'bow_cape_sylvanspirit',
    name: 'Passionless Valley Cold-Plum Mantle',
    classId: 'bowman',
    slot: 'cape',
    signatureText: 'All Esoteric Manuals appear 2x more frequently when comprehending.',
    cursedName: 'Fading Cold-Plum Scent',
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
