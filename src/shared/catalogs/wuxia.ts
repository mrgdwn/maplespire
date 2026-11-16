export type WuxiaManualKind = 'active' | 'inner_qi' | 'synergy' | 'enlightenment';

export type WuxiaManualRarity = 'martial' | 'esoteric' | 'ultimate' | 'peerless' | 'enlightenment';

export type WuxiaArtStyle =
  | 'palm_wave'
  | 'jade_swords'
  | 'staff_spin'
  | 'iron_cleave'
  | 'flute_sonic'
  | 'venom_needles'
  | 'six_pulse'
  | 'flicking_finger';

export type WuxiaStatBundle = {
  readonly hpPct?: number;
  readonly atkPct?: number;
  readonly speedPct?: number;
  readonly armorFlat?: number;
  readonly critChance?: number;
  readonly critDamage?: number;
  readonly dodgeChance?: number;
  readonly cooldownReduction?: number;
  readonly lifesteal?: number;
  readonly goldBonusPct?: number;
  readonly shieldOnFloor?: number;
};

export type WuxiaActiveArt = {
  readonly id: string;
  readonly kind: 'active';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly sectOrigin: string;
  readonly colorHex: number;
  readonly style: WuxiaArtStyle;
  readonly cooldownsMs: readonly [number, number, number, number, number];
  readonly powerMults: readonly [number, number, number, number, number];
  readonly projectileCounts: readonly [number, number, number, number, number];
  readonly levelDescriptions: readonly [string, string, string, string, string];
  readonly pairedQiId: string;
  readonly synergyId: string;
};

export type WuxiaInnerQi = {
  readonly id: string;
  readonly kind: 'inner_qi';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly sectOrigin: string;
  readonly colorHex: number;
  readonly levelDescriptions: readonly [string, string, string, string, string];
  readonly levelStats: readonly [
    WuxiaStatBundle,
    WuxiaStatBundle,
    WuxiaStatBundle,
    WuxiaStatBundle,
    WuxiaStatBundle,
  ];
};

export type WuxiaSecretSynergy = {
  readonly id: string;
  readonly kind: 'synergy';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly colorHex: number;
  readonly activeId: string;
  readonly innerQiId: string;
  readonly riddleHint: string;
  readonly description: string;
  readonly powerMult: number;
  readonly projectileCount: number;
  readonly cooldownMs: number;
  readonly bonusStats: WuxiaStatBundle;
};

export type WuxiaEnlightenmentScroll = {
  readonly id: string;
  readonly kind: 'enlightenment';
  readonly name: string;
  readonly shortName: string;
  readonly icon: string;
  readonly colorHex: number;
  readonly description: string;
  readonly bonusStats: WuxiaStatBundle;
};

export type WuxiaManualEntry =
  | WuxiaActiveArt
  | WuxiaInnerQi
  | WuxiaSecretSynergy
  | WuxiaEnlightenmentScroll;

export type WuxiaSlotEntry = {
  readonly id: string;
  readonly level: number;
};

export type WuxiaLoadoutSummary = {
  readonly actives: readonly WuxiaSlotEntry[];
  readonly innerQis: readonly WuxiaSlotEntry[];
  readonly activeLevels: Readonly<Record<string, number>>;
  readonly innerQiLevels: Readonly<Record<string, number>>;
  readonly awakenedSynergies: readonly string[];
  readonly availableSynergies: readonly WuxiaSecretSynergy[];
  readonly enlightenmentCounts: Readonly<Record<string, number>>;
  readonly aggregatedStats: Required<WuxiaStatBundle>;
  readonly maxActiveSlots: number;
  readonly maxInnerQiSlots: number;
  readonly maxManualLevel: number;
};

export type WuxiaDraftOption = {
  readonly id: string;
  readonly kind: WuxiaManualKind;
  readonly rarity: WuxiaManualRarity;
  readonly name: string;
  readonly icon: string;
  readonly currentLevel: number;
  readonly nextLevel: number;
  readonly maxLevel: number;
  readonly badge: string;
  readonly description: string;
  readonly isSecretAwakening: boolean;
  readonly tags: readonly string[];
};

export const WUXIA_MAX_ACTIVE_SLOTS = 3;
export const WUXIA_MAX_INNER_QI_SLOTS = 3;
export const WUXIA_MAX_MANUAL_LEVEL = 3;
export const WUXIA_HIGH_REALM_ACTIVE_SLOTS = 4;
export const WUXIA_HIGH_REALM_INNER_QI_SLOTS = 4;
export const WUXIA_GRANDMASTER_LEVEL = 4;
export const WUXIA_TRANSCENDENT_LEVEL = 5;

export const getMaxActiveSlotsForFloor = (floor: number): number =>
  floor >= 15 ? WUXIA_HIGH_REALM_ACTIVE_SLOTS : WUXIA_MAX_ACTIVE_SLOTS;

export const getMaxInnerQiSlotsForFloor = (floor: number): number =>
  floor >= 15 ? WUXIA_HIGH_REALM_INNER_QI_SLOTS : WUXIA_MAX_INNER_QI_SLOTS;

export const getMaxManualLevelForFloor = (floor: number): number =>
  floor >= 21 ? WUXIA_TRANSCENDENT_LEVEL : floor >= 11 ? WUXIA_GRANDMASTER_LEVEL : WUXIA_MAX_MANUAL_LEVEL;

export const WUXIA_ACTIVE_ARTS: readonly WuxiaActiveArt[] = [
  {
    id: 'art_dragon_palm',
    kind: 'active',
    name: '18 Dragon-Subduing Palms',
    shortName: 'Dragon Palms',
    icon: '',
    sectOrigin: 'Beggar Sect Lineage',
    colorHex: 0xf59e0b,
    style: 'palm_wave',
    cooldownsMs: [2800, 2450, 2050, 1800, 1550],
    powerMults: [1.35, 1.75, 2.3, 2.95, 3.7],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Unleash 1 golden dragon palm wave forward (1.35x ATK + knockback).',
      'Sweep 2 roaring dragon palms in a wider arc (1.75x ATK + knockback).',
      'ULTIMATE: 3 piercing golden dragon palms crush cult lines (2.30x ATK).',
      'GRANDMASTER: 4 surging imperial dragon waves shake the chamber (2.95x ATK).',
      'TRANSCENDENT: 5 peerless golden dragons obliterate cultist formations (3.70x ATK).',
    ],
    pairedQiId: 'qi_nine_yang',
    synergyId: 'syn_sovereign_dragon',
  },
  {
    id: 'art_jade_sword',
    kind: 'active',
    name: 'Jade Maiden Swordplay',
    shortName: 'Jade Sword',
    icon: '',
    sectOrigin: 'Ancient Tomb Lineage',
    colorHex: 0x38bdf8,
    style: 'jade_swords',
    cooldownsMs: [2300, 1950, 1600, 1380, 1180],
    powerMults: [1.1, 1.42, 1.8, 2.35, 3.0],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Project 2 swift jade sword blades toward nearby cultists (1.10x ATK).',
      'Launch 3 crescent jade blades with swift tempo (1.42x ATK).',
      'ULTIMATE: 4 synchronized moon-jade blades carve crowds (1.80x ATK).',
      'GRANDMASTER: 5 cold moonlight blades cut rapidly across ranks (2.35x ATK).',
      'TRANSCENDENT: 6 ethereal Ancient Tomb phantom swords (3.00x ATK).',
    ],
    pairedQiId: 'qi_jade_maiden',
    synergyId: 'syn_melancholic_sword',
  },
  {
    id: 'art_dog_staff',
    kind: 'active',
    name: 'Beggar Dog-Beating Staff',
    shortName: 'Emerald Staff',
    icon: '',
    sectOrigin: 'Chief Rod Lineage',
    colorHex: 0x10b981,
    style: 'staff_spin',
    cooldownsMs: [2600, 2250, 1850, 1600, 1380],
    powerMults: [1.2, 1.58, 2.05, 2.65, 3.35],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Whirl an emerald bamboo arc hitting all adjacent cultists (1.20x ATK).',
      'Double sweeping staff vortex expands reach and staggers foes (1.58x ATK).',
      'ULTIMATE: Tempest Bamboo Wheel breaks guard & slows hordes (2.05x ATK).',
      'GRANDMASTER: Wide emerald vortex crushes cultists across 255px (2.65x ATK).',
      'TRANSCENDENT: Sovereign Green-Rod Cyclone dominates the hall (3.35x ATK).',
    ],
    pairedQiId: 'qi_heaven_earth',
    synergyId: 'syn_all_dogs_bow',
  },
  {
    id: 'art_heavy_iron',
    kind: 'active',
    name: 'Black-Iron Heavy Sword Cleave',
    shortName: 'Iron Cleave',
    icon: '',
    sectOrigin: 'Sword Tomb Valley',
    colorHex: 0xa855f7,
    style: 'iron_cleave',
    cooldownsMs: [3400, 3000, 2600, 2250, 1950],
    powerMults: [1.85, 2.4, 3.15, 4.0, 5.0],
    projectileCounts: [1, 1, 2, 3, 4],
    levelDescriptions: [
      'Slam a blunt black-iron shockwave ahead (1.85x ATK + brief stun).',
      'Massive obsidian quake ruptures frontline cult guards (2.40x ATK).',
      'ULTIMATE: Twin Sword-Tomb fissures crush cult packs (3.15x ATK).',
      'GRANDMASTER: Shattering Black-Iron impact halts Hall Masters (4.00x ATK).',
      'TRANSCENDENT: Heavenly Iron Calamity cleaves every sect guard (5.00x ATK).',
    ],
    pairedQiId: 'qi_solitary_sword',
    synergyId: 'syn_sword_tomb_unbroken',
  },
  {
    id: 'art_jade_flute',
    kind: 'active',
    name: 'Peach Blossom Jade Flute',
    shortName: 'Jade Flute',
    icon: '',
    sectOrigin: 'Eastern Sea Pavilion',
    colorHex: 0x2dd4bf,
    style: 'flute_sonic',
    cooldownsMs: [2500, 2150, 1750, 1500, 1280],
    powerMults: [1.05, 1.35, 1.72, 2.25, 2.85],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Send 2 sonic flute notes that ricochet cleanly between foes (1.05x ATK).',
      'Play 3 harmonic soundwaves bouncing deeper through waves (1.35x ATK).',
      'ULTIMATE: 4 Tide-Song echoes shatter inner guards (1.72x ATK).',
      'GRANDMASTER: 5 Peach-Island Trigram notes disrupt cultists (2.25x ATK).',
      'TRANSCENDENT: 6 surging Azure Sea resonance blasts (2.85x ATK).',
    ],
    pairedQiId: 'qi_bagua_harmony',
    synergyId: 'syn_azure_sea_symphony',
  },
  {
    id: 'art_ice_needle',
    kind: 'active',
    name: 'Melancholic Soul-Severing Palm',
    shortName: 'Melancholic Palm',
    icon: '',
    sectOrigin: 'Yang Guo Eastern Sea Lineage',
    colorHex: 0x6366f1,
    style: 'venom_needles',
    cooldownsMs: [2550, 2200, 1800, 1520, 1300],
    powerMults: [1.55, 2.0, 2.6, 3.35, 4.2],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Strike with 1 surging indigo sea-tide palm wave that chills & pushes foes (1.55x ATK).',
      'Unleash 2 crashing Melancholic Palm surges born of sixteen years of grief (2.00x ATK).',
      'ULTIMATE: 3 Heartbreak Sea-Tide Palms crush and slow cult lines (2.60x ATK).',
      'GRANDMASTER: 4 abyssal Condor-Grief tidal waves shatter inner guards (3.35x ATK).',
      'TRANSCENDENT: 5 peerless Soul-Severing Ocean Palms obliterate the chamber (4.20x ATK).',
    ],
    pairedQiId: 'qi_nine_yin',
    synergyId: 'syn_thousand_venom_lotus',
  },
  {
    id: 'art_six_pulse',
    kind: 'active',
    name: 'Six-Pulse Divine Sword',
    shortName: 'Six-Pulse Sword',
    icon: '',
    sectOrigin: 'Dali Royal Clan Lineage',
    colorHex: 0x0ea5e9,
    style: 'six_pulse',
    cooldownsMs: [2550, 2200, 1800, 1550, 1300],
    powerMults: [1.25, 1.65, 2.15, 2.75, 3.45],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Project 2 invisible fingertip sword beams piercing lines (1.25x ATK).',
      'Channel 3 meridian sword rays slicing through cultist shields (1.65x ATK).',
      'ULTIMATE: 4 dazzling Six-Pulse rays skewering deep ranks (2.15x ATK).',
      'GRANDMASTER: 5 rapid royal spirit lances pierce armor cleanly (2.75x ATK).',
      'TRANSCENDENT: All 6 Six-Pulse meridians erupt in unison (3.45x ATK).',
    ],
    pairedQiId: 'qi_star_absorb',
    synergyId: 'syn_six_pulse_chaos',
  },
  {
    id: 'art_tantan_finger',
    kind: 'active',
    name: 'Flicking Finger Divine Thrum',
    shortName: 'Finger Thrum',
    icon: '',
    sectOrigin: 'Peach Blossom Isle',
    colorHex: 0xfb7185,
    style: 'flicking_finger',
    cooldownsMs: [2400, 2050, 1700, 1450, 1220],
    powerMults: [1.3, 1.7, 2.2, 2.85, 3.6],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Flick a compressed crimson spirit pellet that bursts on impact (1.30x ATK).',
      'Fire 2 concussive Peach-Isle finger bolts with shockwaves (1.70x ATK).',
      'ULTIMATE: 3 shattering crimson thrums stagger bosses (2.20x ATK).',
      'GRANDMASTER: 4 high-velocity spirit bullets erupt in AoE rings (2.85x ATK).',
      'TRANSCENDENT: 5 Sovereign Finger-Cannons detonate on contact (3.60x ATK).',
    ],
    pairedQiId: 'qi_dragon_elephant',
    synergyId: 'syn_ten_dragon_thunder',
  },
  {
    id: 'art_taiji_sword',
    kind: 'active',
    name: 'Taiji Yin-Yang Swordplay',
    shortName: 'Taiji Sword',
    icon: '',
    sectOrigin: 'Wudang Mountain Lineage',
    colorHex: 0x67e8f9,
    style: 'jade_swords',
    cooldownsMs: [2400, 2050, 1700, 1450, 1200],
    powerMults: [1.2, 1.55, 2.05, 2.7, 3.45],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Cast 2 orbiting Yin-Yang sword arcs that curve inward and deflect frontal blows (1.20x ATK).',
      'Unleash 3 circular Taiji sword rays creating a spinning vacuum that pulls foes (1.55x ATK).',
      'ULTIMATE: 4 synchronized Two-Instrument Taiji blades carving through waves (2.05x ATK).',
      'GRANDMASTER: 5 boundless soft-steel sword spirals that silence incoming damage (2.70x ATK).',
      'TRANSCENDENT: 6 Supreme Void Taiji circle blades shredding the entire vanguard (3.45x ATK).',
    ],
    pairedQiId: 'qi_pure_yang',
    synergyId: 'syn_taiji_void_harmony',
  },
  {
    id: 'art_dragon_saber',
    kind: 'active',
    name: 'Dragon-Slaying Saber Cleave',
    shortName: 'Dragon Saber',
    icon: '',
    sectOrigin: 'Heavenly Saber Lineage',
    colorHex: 0xf59e0b,
    style: 'iron_cleave',
    cooldownsMs: [3300, 2900, 2500, 2150, 1850],
    powerMults: [1.9, 2.5, 3.25, 4.15, 5.2],
    projectileCounts: [1, 1, 2, 3, 4],
    levelDescriptions: [
      'Slam a devastating golden saber shockwave that sunders cultist armor (1.90x ATK + stun).',
      'Rupture the ground with a 240px Dragon-Slaying fissure halting elites (2.50x ATK).',
      'ULTIMATE: Twin Precious Saber tremors that obliterate elite barriers (3.25x ATK).',
      'GRANDMASTER: 3 earth-splitting saber quakes sweeping across the hall (4.15x ATK).',
      'TRANSCENDENT: 4 Sovereign Dragon-Slaying cataclysms crushing all who defy (5.20x ATK).',
    ],
    pairedQiId: 'qi_great_shift',
    synergyId: 'syn_heavenly_dragon_dominion',
  },
  {
    id: 'art_shifting_stars',
    kind: 'active',
    name: 'Shifting Stars Celestial Deflection',
    shortName: 'Shifting Stars',
    icon: '',
    sectOrigin: 'Gusu Murong Clan Lineage',
    colorHex: 0x818cf8,
    style: 'six_pulse',
    cooldownsMs: [2600, 2250, 1850, 1580, 1320],
    powerMults: [1.25, 1.62, 2.1, 2.7, 3.4],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Release 2 celestial starlight rays that return damage upon impact (1.25x ATK).',
      'Channel 3 stellar deflection beams that pierce through frontline shields (1.62x ATK).',
      'ULTIMATE: 4 Gusu constellation rays that ricochet across cult lines (2.10x ATK).',
      'GRANDMASTER: 5 astral counter-force lances piercing all enemy armor (2.70x ATK).',
      'TRANSCENDENT: 6 Sovereign Stellar Arrays returning cultist fury back tenfold (3.40x ATK).',
    ],
    pairedQiId: 'qi_lingbo_steps',
    synergyId: 'syn_celestial_ripple_return',
  },
  {
    id: 'art_tianshan_six_yang',
    kind: 'active',
    name: 'Tianshan Six-Yang Plum Hand',
    shortName: 'Tianshan Plum Hand',
    icon: '',
    sectOrigin: 'Spirit Vulture Palace Lineage',
    colorHex: 0xf43f5e,
    style: 'venom_needles',
    cooldownsMs: [2450, 2100, 1720, 1460, 1240],
    powerMults: [1.35, 1.75, 2.25, 2.9, 3.65],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Cast 2 Life-and-Death frost plum talismans that chill and rupture foes (1.35x ATK).',
      'Launch 3 alternating Yin-Yang plum palm bursts piercing cult packs (1.75x ATK).',
      'ULTIMATE: 4 icy Spirit Vulture plum strikes detonating on impact (2.25x ATK).',
      'GRANDMASTER: 5 Mount Heaven meridian palms tearing through armor (2.90x ATK).',
      'TRANSCENDENT: 6 Six-Yang Plum Blossom storms sweeping the spire floor (3.65x ATK).',
    ],
    pairedQiId: 'qi_xiao_wuxiang',
    synergyId: 'syn_eight_desolations_frost',
  },
  {
    id: 'art_great_shift',
    kind: 'active',
    name: 'Great Shift of Heaven and Earth',
    shortName: 'Great Shift',
    icon: '',
    sectOrigin: 'Ming Cult Bright Summit Lineage',
    colorHex: 0xfbbf24,
    style: 'flute_sonic',
    cooldownsMs: [2500, 2150, 1800, 1500, 1250],
    powerMults: [1.45, 1.9, 2.5, 3.3, 4.2],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Unfurl a 180px Qiankun vortex that pulls enemies and reverses frontal strikes (1.45x ATK).',
      'Expand a 220px shifting vortex that disrupts enemy lines and redirects damage (1.90x ATK).',
      'ULTIMATE: Seventh-Level Qiankun cosmic array tearing through enemy defenses (2.50x ATK).',
      'GRANDMASTER: 340px Heaven-and-Earth vortex deflecting incoming forces (3.30x ATK).',
      'TRANSCENDENT: Screen-wide celestial Qiankun reversal obliterating cult formations (4.20x ATK).',
    ],
    pairedQiId: 'qi_nine_yang',
    synergyId: 'syn_bright_summit_qiankun',
  },
  {
    id: 'art_toad_stance',
    kind: 'active',
    name: 'Western Toad Divine Stance',
    shortName: 'Toad Stance',
    icon: '',
    sectOrigin: 'White Camel Mountain Lineage',
    colorHex: 0x22c55e,
    style: 'iron_cleave',
    cooldownsMs: [3000, 2600, 2200, 1850, 1550],
    powerMults: [1.75, 2.3, 3.0, 3.85, 4.8],
    projectileCounts: [1, 1, 2, 3, 4],
    levelDescriptions: [
      'Crouch low and unleash an explosive leaping concussive wave (1.75x ATK + heavy knockback).',
      'Deep croaking resonance ruptures ground in a 240px viridian shockwave (2.30x ATK + stun).',
      'ULTIMATE: Twin White Camel seismic rumbles shattering frontlines (3.00x ATK).',
      'GRANDMASTER: 3 concussive venomous quakes sweeping across the hall (3.85x ATK).',
      'TRANSCENDENT: Cataclysmic Mount Hua Toad Leap crushing all sect formations (4.80x ATK).',
    ],
    pairedQiId: 'qi_nine_yin',
    synergyId: 'syn_reversed_nine_yin_toad',
  },
];

export const WUXIA_INNER_QI: readonly WuxiaInnerQi[] = [
  {
    id: 'qi_nine_yang',
    kind: 'inner_qi',
    name: 'Nine-Yang Divine Sutra',
    shortName: 'Nine-Yang Sutra',
    icon: '',
    sectOrigin: 'Shaolin Sacred Scroll',
    colorHex: 0xf97316,
    levelDescriptions: [
      '+12% Max HP, +10 Armor, +45 Floor Barrier.',
      '+24% Max HP, +22 Armor, +95 Floor Barrier.',
      '+38% Max HP, +36 Armor, +160 Floor Barrier.',
      'GRANDMASTER: +55% Max HP, +54 Armor, +240 Floor Barrier.',
      'TRANSCENDENT: +75% Max HP, +78 Armor, +360 Floor Barrier.',
    ],
    levelStats: [
      { hpPct: 0.12, armorFlat: 10, shieldOnFloor: 45 },
      { hpPct: 0.24, armorFlat: 22, shieldOnFloor: 95 },
      { hpPct: 0.38, armorFlat: 36, shieldOnFloor: 160 },
      { hpPct: 0.55, armorFlat: 54, shieldOnFloor: 240 },
      { hpPct: 0.75, armorFlat: 78, shieldOnFloor: 360 },
    ],
  },
  {
    id: 'qi_jade_maiden',
    kind: 'inner_qi',
    name: 'Jade Maiden Heart Sutra',
    shortName: 'Jade Maiden',
    icon: '',
    sectOrigin: 'Ancient Tomb Inner Chamber',
    colorHex: 0xf472b6,
    levelDescriptions: [
      '+14% Skill Haste, +12% Attack Speed, +8% Crit Chance.',
      '+26% Skill Haste, +24% Attack Speed, +16% Crit Chance.',
      '+38% Skill Haste, +38% Attack Speed, +24% Crit Chance.',
      'GRANDMASTER: +48% Skill Haste, +52% Attack Speed, +32% Crit Chance.',
      'TRANSCENDENT: +58% Skill Haste, +68% Attack Speed, +42% Crit Chance.',
    ],
    levelStats: [
      { cooldownReduction: 0.14, speedPct: 0.12, critChance: 0.08 },
      { cooldownReduction: 0.26, speedPct: 0.24, critChance: 0.16 },
      { cooldownReduction: 0.38, speedPct: 0.38, critChance: 0.24 },
      { cooldownReduction: 0.48, speedPct: 0.52, critChance: 0.32 },
      { cooldownReduction: 0.58, speedPct: 0.68, critChance: 0.42 },
    ],
  },
  {
    id: 'qi_heaven_earth',
    kind: 'inner_qi',
    name: 'Cloud-Step Sky Sutra',
    shortName: 'Cloud-Step Sutra',
    icon: '',
    sectOrigin: 'Wudang Cloud Peak',
    colorHex: 0x34d399,
    levelDescriptions: [
      '+12% Skill Haste (CDR), +7% Dodge, +10% Speed.',
      '+24% Skill Haste (CDR), +14% Dodge, +20% Speed.',
      '+36% Skill Haste (CDR), +22% Dodge, +32% Speed.',
      'GRANDMASTER: +46% Skill Haste, +30% Dodge, +44% Speed.',
      'TRANSCENDENT: +56% Skill Haste, +38% Dodge, +58% Speed.',
    ],
    levelStats: [
      { cooldownReduction: 0.12, dodgeChance: 0.07, speedPct: 0.1 },
      { cooldownReduction: 0.24, dodgeChance: 0.14, speedPct: 0.2 },
      { cooldownReduction: 0.36, dodgeChance: 0.22, speedPct: 0.32 },
      { cooldownReduction: 0.46, dodgeChance: 0.3, speedPct: 0.44 },
      { cooldownReduction: 0.56, dodgeChance: 0.38, speedPct: 0.58 },
    ],
  },
  {
    id: 'qi_solitary_sword',
    kind: 'inner_qi',
    name: 'Solitary Nine-Sword Sutra',
    shortName: 'Nine-Sword Sutra',
    icon: '',
    sectOrigin: 'Sword Demon Hermitage',
    colorHex: 0xc084fc,
    levelDescriptions: [
      '+25% Crit DMG, +10% ATK, +6% Crit Chance.',
      '+55% Crit DMG, +22% ATK, +12% Crit Chance.',
      '+90% Crit DMG, +36% ATK, +18% Crit Chance.',
      'GRANDMASTER: +130% Crit DMG, +52% ATK, +25% Crit Chance.',
      'TRANSCENDENT: +180% Crit DMG, +72% ATK, +32% Crit Chance.',
    ],
    levelStats: [
      { critDamage: 0.25, atkPct: 0.1, critChance: 0.06 },
      { critDamage: 0.55, atkPct: 0.22, critChance: 0.12 },
      { critDamage: 0.9, atkPct: 0.36, critChance: 0.18 },
      { critDamage: 1.3, atkPct: 0.52, critChance: 0.25 },
      { critDamage: 1.8, atkPct: 0.72, critChance: 0.32 },
    ],
  },
  {
    id: 'qi_bagua_harmony',
    kind: 'inner_qi',
    name: 'Eight-Trigram Harmony Sutra',
    shortName: 'Trigram Sutra',
    icon: '',
    sectOrigin: 'Peach Blossom Isle',
    colorHex: 0x2dd4bf,
    levelDescriptions: [
      '+10% CDR, +10% Max HP, +18% Gold Bonus.',
      '+20% CDR, +20% Max HP, +36% Gold Bonus.',
      '+32% CDR, +32% Max HP, +55% Gold Bonus.',
      'GRANDMASTER: +42% CDR, +48% Max HP, +80% Gold Bonus.',
      'TRANSCENDENT: +52% CDR, +66% Max HP, +110% Gold Bonus.',
    ],
    levelStats: [
      { cooldownReduction: 0.1, hpPct: 0.1, goldBonusPct: 0.18 },
      { cooldownReduction: 0.2, hpPct: 0.2, goldBonusPct: 0.36 },
      { cooldownReduction: 0.32, hpPct: 0.32, goldBonusPct: 0.55 },
      { cooldownReduction: 0.42, hpPct: 0.48, goldBonusPct: 0.8 },
      { cooldownReduction: 0.52, hpPct: 0.66, goldBonusPct: 1.1 },
    ],
  },
  {
    id: 'qi_nine_yin',
    kind: 'inner_qi',
    name: 'Nine-Yin True Sutra',
    shortName: 'Nine-Yin Sutra',
    icon: '',
    sectOrigin: 'Sacred Imperial Vault',
    colorHex: 0x60a5fa,
    levelDescriptions: [
      '+12% ATK, +8% Crit Chance, +10% Attack Speed.',
      '+24% ATK, +16% Crit Chance, +20% Attack Speed.',
      '+38% ATK, +25% Crit Chance, +32% Attack Speed.',
      'GRANDMASTER: +54% ATK, +34% Crit Chance, +44% Attack Speed.',
      'TRANSCENDENT: +74% ATK, +45% Crit Chance, +58% Attack Speed.',
    ],
    levelStats: [
      { atkPct: 0.12, critChance: 0.08, speedPct: 0.1 },
      { atkPct: 0.24, critChance: 0.16, speedPct: 0.2 },
      { atkPct: 0.38, critChance: 0.25, speedPct: 0.32 },
      { atkPct: 0.54, critChance: 0.34, speedPct: 0.44 },
      { atkPct: 0.74, critChance: 0.45, speedPct: 0.58 },
    ],
  },
  {
    id: 'qi_star_absorb',
    kind: 'inner_qi',
    name: 'Northern Abyss Absorption Sutra',
    shortName: 'Northern Abyss',
    icon: '',
    sectOrigin: 'Carefree Ravine',
    colorHex: 0x38bdf8,
    levelDescriptions: [
      '+5% Lifesteal, +12% Crit DMG, +18% Gold Bonus.',
      '+10% Lifesteal, +28% Crit DMG, +36% Gold Bonus.',
      '+16% Lifesteal, +45% Crit DMG, +60% Gold Bonus.',
      'GRANDMASTER: +22% Lifesteal, +75% Crit DMG, +90% Gold Bonus.',
      'TRANSCENDENT: +28% Lifesteal, +115% Crit DMG, +125% Gold Bonus.',
    ],
    levelStats: [
      { lifesteal: 0.05, critDamage: 0.12, goldBonusPct: 0.18 },
      { lifesteal: 0.1, critDamage: 0.28, goldBonusPct: 0.36 },
      { lifesteal: 0.16, critDamage: 0.45, goldBonusPct: 0.6 },
      { lifesteal: 0.22, critDamage: 0.75, goldBonusPct: 0.9 },
      { lifesteal: 0.28, critDamage: 1.15, goldBonusPct: 1.25 },
    ],
  },
  {
    id: 'qi_dragon_elephant',
    kind: 'inner_qi',
    name: 'Ten-Dragon Sovereign Sutra',
    shortName: 'Ten-Dragon Sutra',
    icon: '',
    sectOrigin: 'Western Peak Sanctuary',
    colorHex: 0xd97706,
    levelDescriptions: [
      '+14% ATK, +14% Max HP, +12 Armor.',
      '+28% ATK, +28% Max HP, +26 Armor.',
      '+46% ATK, +44% Max HP, +44 Armor.',
      'GRANDMASTER: +68% ATK, +65% Max HP, +68 Armor.',
      'TRANSCENDENT: +95% ATK, +92% Max HP, +98 Armor.',
    ],
    levelStats: [
      { atkPct: 0.14, hpPct: 0.14, armorFlat: 12 },
      { atkPct: 0.28, hpPct: 0.28, armorFlat: 26 },
      { atkPct: 0.46, hpPct: 0.44, armorFlat: 44 },
      { atkPct: 0.68, hpPct: 0.65, armorFlat: 68 },
      { atkPct: 0.95, hpPct: 0.92, armorFlat: 98 },
    ],
  },
  {
    id: 'qi_pure_yang',
    kind: 'inner_qi',
    name: 'Pure Yang Boundless Sutra',
    shortName: 'Pure Yang Sutra',
    icon: '',
    sectOrigin: 'Wudang Daoist Hermitage',
    colorHex: 0x38bdf8,
    levelDescriptions: [
      '+12% Max HP, +12 Armor, +10% Cooldown Reduction.',
      '+24% Max HP, +26 Armor, +20% Cooldown Reduction.',
      '+38% Max HP, +42 Armor, +30% Cooldown Reduction.',
      'GRANDMASTER: +56% Max HP, +62 Armor, +40% Cooldown Reduction.',
      'TRANSCENDENT: +78% Max HP, +88 Armor, +52% Cooldown Reduction.',
    ],
    levelStats: [
      { hpPct: 0.12, armorFlat: 12, cooldownReduction: 0.1 },
      { hpPct: 0.24, armorFlat: 26, cooldownReduction: 0.2 },
      { hpPct: 0.38, armorFlat: 42, cooldownReduction: 0.3 },
      { hpPct: 0.56, armorFlat: 62, cooldownReduction: 0.4 },
      { hpPct: 0.78, armorFlat: 88, cooldownReduction: 0.52 },
    ],
  },
  {
    id: 'qi_great_shift',
    kind: 'inner_qi',
    name: 'Great Shift of Heaven and Earth',
    shortName: 'Great Shift Sutra',
    icon: '',
    sectOrigin: 'Bright Summit Sacred Order',
    colorHex: 0xfbbf24,
    levelDescriptions: [
      '+8% Dodge Chance, +12% ATK, +50 Floor Barrier.',
      '+16% Dodge Chance, +24% ATK, +110 Floor Barrier.',
      '+24% Dodge Chance, +38% ATK, +180 Floor Barrier.',
      'GRANDMASTER: +32% Dodge Chance, +54% ATK, +270 Floor Barrier.',
      'TRANSCENDENT: +42% Dodge Chance, +74% ATK, +380 Floor Barrier.',
    ],
    levelStats: [
      { dodgeChance: 0.08, atkPct: 0.12, shieldOnFloor: 50 },
      { dodgeChance: 0.16, atkPct: 0.24, shieldOnFloor: 110 },
      { dodgeChance: 0.24, atkPct: 0.38, shieldOnFloor: 180 },
      { dodgeChance: 0.32, atkPct: 0.54, shieldOnFloor: 270 },
      { dodgeChance: 0.42, atkPct: 0.74, shieldOnFloor: 380 },
    ],
  },
  {
    id: 'qi_lingbo_steps',
    kind: 'inner_qi',
    name: 'Lingbo Ripple Microsteps',
    shortName: 'Lingbo Steps',
    icon: '',
    sectOrigin: 'Carefree Immortal Cave',
    colorHex: 0x60a5fa,
    levelDescriptions: [
      '+8% Dodge Chance, +14% Speed, +10% Cooldown Reduction.',
      '+16% Dodge Chance, +26% Speed, +18% Cooldown Reduction.',
      '+24% Dodge Chance, +38% Speed, +26% Cooldown Reduction.',
      'GRANDMASTER: +32% Dodge Chance, +52% Speed, +36% Cooldown Reduction.',
      'TRANSCENDENT: +42% Dodge Chance, +70% Speed, +48% Cooldown Reduction.',
    ],
    levelStats: [
      { dodgeChance: 0.08, speedPct: 0.14, cooldownReduction: 0.1 },
      { dodgeChance: 0.16, speedPct: 0.26, cooldownReduction: 0.18 },
      { dodgeChance: 0.24, speedPct: 0.38, cooldownReduction: 0.26 },
      { dodgeChance: 0.32, speedPct: 0.52, cooldownReduction: 0.36 },
      { dodgeChance: 0.42, speedPct: 0.7, cooldownReduction: 0.48 },
    ],
  },
  {
    id: 'qi_xiao_wuxiang',
    kind: 'inner_qi',
    name: 'Little Boundless Formless Sutra',
    shortName: 'Little Boundless Sutra',
    icon: '',
    sectOrigin: 'Carefree Sect Secret Vault',
    colorHex: 0xa855f7,
    levelDescriptions: [
      '+12% ATK, +10% Crit Chance, +10% Cooldown Reduction.',
      '+24% ATK, +18% Crit Chance, +22% Cooldown Reduction.',
      '+38% ATK, +26% Crit Chance, +32% Cooldown Reduction.',
      'GRANDMASTER: +54% ATK, +35% Crit Chance, +42% Cooldown Reduction.',
      'TRANSCENDENT: +74% ATK, +46% Crit Chance, +54% Cooldown Reduction.',
    ],
    levelStats: [
      { atkPct: 0.12, critChance: 0.1, cooldownReduction: 0.1 },
      { atkPct: 0.24, critChance: 0.18, cooldownReduction: 0.22 },
      { atkPct: 0.38, critChance: 0.26, cooldownReduction: 0.32 },
      { atkPct: 0.54, critChance: 0.35, cooldownReduction: 0.42 },
      { atkPct: 0.74, critChance: 0.46, cooldownReduction: 0.54 },
    ],
  },
  {
    id: 'qi_yi_jin_jing',
    kind: 'inner_qi',
    name: 'Tendon-Changing Divine Classic',
    shortName: 'Tendon Classic',
    icon: '',
    sectOrigin: 'Shaolin Bodhidharma Hermitage',
    colorHex: 0xfacc15,
    levelDescriptions: [
      '+18% Max HP, +18 Armor, +8% Dodge Chance.',
      '+36% Max HP, +38 Armor, +16% Dodge Chance.',
      '+58% Max HP, +62 Armor, +24% Dodge Chance.',
      'GRANDMASTER: +85% Max HP, +92 Armor, +34% Dodge Chance.',
      'TRANSCENDENT: +120% Max HP, +130 Armor, +45% Dodge Chance.',
    ],
    levelStats: [
      { hpPct: 0.18, armorFlat: 18, dodgeChance: 0.08 },
      { hpPct: 0.36, armorFlat: 38, dodgeChance: 0.16 },
      { hpPct: 0.58, armorFlat: 62, dodgeChance: 0.24 },
      { hpPct: 0.85, armorFlat: 92, dodgeChance: 0.34 },
      { hpPct: 1.2, armorFlat: 130, dodgeChance: 0.45 },
    ],
  },
];

export const WUXIA_SECRET_SYNERGIES: readonly WuxiaSecretSynergy[] = [
  {
    id: 'syn_sovereign_dragon',
    kind: 'synergy',
    name: 'True Dragon Sovereign Palm',
    shortName: 'Sovereign Dragon',
    icon: '',
    colorHex: 0xfef08a,
    activeId: 'art_dragon_palm',
    innerQiId: 'qi_nine_yang',
    riddleHint:
      'When eighteen palms roar beside scorching Nine-Yang heat, a golden sovereign shakes the spire.',
    description:
      'PEERLESS SYNERGY: Unleashes 5 blazing Imperial Dragon Waves (3.40x ATK) + +22% ATK & +25 Armor.',
    powerMult: 3.4,
    projectileCount: 5,
    cooldownMs: 1750,
    bonusStats: { atkPct: 0.22, armorFlat: 25, shieldOnFloor: 120 },
  },
  {
    id: 'syn_melancholic_sword',
    kind: 'synergy',
    name: 'Twin-Lotus Immortal Sword Array',
    shortName: 'Twin-Lotus Sword',
    icon: '',
    colorHex: 0x7dd3fc,
    activeId: 'art_jade_sword',
    innerQiId: 'qi_jade_maiden',
    riddleHint:
      'Harmonize Ancient Tomb swordplay with the Jade Maiden Heart Sutra to awaken six twin-soul blades.',
    description:
      'PEERLESS SYNERGY: Twin-Soul Condor Aura fires 6 phantom lotus blades (2.75x ATK) + +18% Crit Chance & +20% Speed.',
    powerMult: 2.75,
    projectileCount: 6,
    cooldownMs: 1350,
    bonusStats: { critChance: 0.18, speedPct: 0.2, atkPct: 0.16 },
  },
  {
    id: 'syn_all_dogs_bow',
    kind: 'synergy',
    name: 'Thirty-Six Forms: Heaven Under Staff',
    shortName: 'Heaven Under Staff',
    icon: '',
    colorHex: 0x6ee7b7,
    activeId: 'art_dog_staff',
    innerQiId: 'qi_heaven_earth',
    riddleHint:
      'Tread weightless clouds while gripping the beggar chief rod, and every beast beneath Heaven bows.',
    description:
      'PEERLESS SYNERGY: Grand emerald whirlwind sweeps the chamber (3.10x ATK, wide stun) + +15% Dodge & +15% CDR.',
    powerMult: 3.1,
    projectileCount: 4,
    cooldownMs: 1500,
    bonusStats: { dodgeChance: 0.15, cooldownReduction: 0.15, speedPct: 0.16 },
  },
  {
    id: 'syn_sword_tomb_unbroken',
    kind: 'synergy',
    name: 'Nine-Sword Tomb Resonance',
    shortName: 'Sword Tomb',
    icon: '',
    colorHex: 0xe879f9,
    activeId: 'art_heavy_iron',
    innerQiId: 'qi_solitary_sword',
    riddleHint:
      'Pair the heavy unedged black-iron blade with Solitary Nine-Sword Sutra to wake buried legends.',
    description:
      'PEERLESS SYNERGY: Crushes crowds with 6 spectral orbiting blades & tremors (4.20x ATK) + +55% Crit DMG.',
    powerMult: 4.2,
    projectileCount: 6,
    cooldownMs: 2100,
    bonusStats: { critDamage: 0.55, atkPct: 0.24 },
  },
  {
    id: 'syn_azure_sea_symphony',
    kind: 'synergy',
    name: 'Azure Tide Peerless Symphony',
    shortName: 'Azure Symphony',
    icon: '',
    colorHex: 0x5eead4,
    activeId: 'art_jade_flute',
    innerQiId: 'qi_bagua_harmony',
    riddleHint:
      'Align the Eight-Trigram Harmony Sutra to a lone jade flute and the Eastern Tide shatters every cult pulse.',
    description:
      'PEERLESS SYNERGY: 6 golden-azure notes chain rapidly across cult ranks (2.65x ATK) + +15% CDR & +30% Gold.',
    powerMult: 2.65,
    projectileCount: 6,
    cooldownMs: 1450,
    bonusStats: { cooldownReduction: 0.15, goldBonusPct: 0.3, hpPct: 0.18 },
  },
  {
    id: 'syn_thousand_venom_lotus',
    kind: 'synergy',
    name: 'Sovereign Melancholic Sea-Tide Palm',
    shortName: 'Soul-Severing Tide',
    icon: '',
    colorHex: 0x818cf8,
    activeId: 'art_ice_needle',
    innerQiId: 'qi_nine_yin',
    riddleHint:
      'Temper Nine-Yin True Sutra inside Yang Guo’s Melancholic Palm against the roaring Eastern Sea.',
    description:
      'PEERLESS SYNERGY: Unleashes 5 abyssal Soul-Severing tidal palms (3.85x ATK) + +6% Lifesteal & +20% ATK.',
    powerMult: 3.85,
    projectileCount: 5,
    cooldownMs: 1450,
    bonusStats: { lifesteal: 0.06, atkPct: 0.2, armorFlat: 20 },
  },
  {
    id: 'syn_six_pulse_chaos',
    kind: 'synergy',
    name: 'Six-Pulse Heaven-Piercing Array',
    shortName: 'Heaven-Piercing Sword',
    icon: '',
    colorHex: 0x38bdf8,
    activeId: 'art_six_pulse',
    innerQiId: 'qi_star_absorb',
    riddleHint:
      'Feed the Six-Pulse royal sword beams with vast Northern Abyss ocean reservoirs to tear open the sky.',
    description:
      'PEERLESS SYNERGY: Fires 8 relentless royal sword beams (3.10x ATK) + +18% CDR & +18% Crit Chance.',
    powerMult: 3.1,
    projectileCount: 8,
    cooldownMs: 1300,
    bonusStats: { cooldownReduction: 0.18, critChance: 0.18, speedPct: 0.2 },
  },
  {
    id: 'syn_ten_dragon_thunder',
    kind: 'synergy',
    name: 'Ten-Dragon Sovereign Finger Cannon',
    shortName: 'Dragon Cannon',
    icon: '',
    colorHex: 0xfb923c,
    activeId: 'art_tantan_finger',
    innerQiId: 'qi_dragon_elephant',
    riddleHint:
      'Focus Ten-Dragon Sovereign Sutra onto a single flicked fingertip to burst cult ranks.',
    description:
      'PEERLESS SYNERGY: Launches 6 seismic crimson finger-cannons (3.60x ATK) + +30% ATK & +35 Armor.',
    powerMult: 3.6,
    projectileCount: 6,
    cooldownMs: 1450,
    bonusStats: { atkPct: 0.3, armorFlat: 35, hpPct: 0.2 },
  },
  {
    id: 'syn_taiji_void_harmony',
    kind: 'synergy',
    name: 'Taiji Supreme Void Harmony',
    shortName: 'Taiji Void',
    icon: '',
    colorHex: 0xa5f3fc,
    activeId: 'art_taiji_sword',
    innerQiId: 'qi_pure_yang',
    riddleHint:
      'Draw the gentle circle of Wudang swordplay while circulating Pure Yang breath until softness conquers the hardest steel.',
    description:
      'PEERLESS SYNERGY: Summons 8 rotating Yin-Yang Void Blades (3.20x ATK) + +25 Armor & +18% CDR.',
    powerMult: 3.2,
    projectileCount: 8,
    cooldownMs: 1350,
    bonusStats: { armorFlat: 25, cooldownReduction: 0.18, hpPct: 0.2 },
  },
  {
    id: 'syn_heavenly_dragon_dominion',
    kind: 'synergy',
    name: 'Heavenly Sword & Dragon Saber Dominion',
    shortName: 'Heavenly Dominion',
    icon: '',
    colorHex: 0xfef08a,
    activeId: 'art_dragon_saber',
    innerQiId: 'qi_great_shift',
    riddleHint:
      'Channel the Seventh Level of Heaven and Earth Great Shift while cleaving with the Sovereign Dragon Saber to unite both supreme weapons.',
    description:
      'PEERLESS SYNERGY: Dual Heavenly Sword and Dragon Saber shockwaves cleave all ranks (4.40x ATK) + +22% ATK & +12% Dodge.',
    powerMult: 4.4,
    projectileCount: 5,
    cooldownMs: 2000,
    bonusStats: { atkPct: 0.22, dodgeChance: 0.12, critDamage: 0.45 },
  },
  {
    id: 'syn_celestial_ripple_return',
    kind: 'synergy',
    name: 'Celestial Ripple Return Stance',
    shortName: 'Celestial Ripple',
    icon: '',
    colorHex: 0xc7d2fe,
    activeId: 'art_shifting_stars',
    innerQiId: 'qi_lingbo_steps',
    riddleHint:
      'Glide upon Lingbo ripples according to the 64 Hexagrams while shifting enemy trajectories with Murong starcraft.',
    description:
      'PEERLESS SYNERGY: Fires 8 homing starlight counter-lances (3.15x ATK) + +15% Dodge & +18% CDR.',
    powerMult: 3.15,
    projectileCount: 8,
    cooldownMs: 1320,
    bonusStats: { dodgeChance: 0.15, cooldownReduction: 0.18, speedPct: 0.22 },
  },
  {
    id: 'syn_eight_desolations_frost',
    kind: 'synergy',
    name: 'Eight Desolations Frost Sovereign',
    shortName: 'Eight Desolations Frost',
    icon: '',
    colorHex: 0xfbcfe8,
    activeId: 'art_tianshan_six_yang',
    innerQiId: 'qi_xiao_wuxiang',
    riddleHint:
      'Imbue the Little Boundless formless breath into Tianshan Plum Hand to rule supreme across Eight Desolations and Six Harmonies.',
    description:
      'PEERLESS SYNERGY: Launches 7 frost-flame plum storms (3.30x ATK) + +20% ATK & +16% Crit Chance.',
    powerMult: 3.3,
    projectileCount: 7,
    cooldownMs: 1350,
    bonusStats: { atkPct: 0.2, critChance: 0.16, cooldownReduction: 0.15 },
  },
  {
    id: 'syn_yin_yang_dragon',
    kind: 'synergy',
    name: 'Nine-Yin True Dragon Sovereign',
    shortName: 'Yin-Yang Dragon',
    icon: '',
    colorHex: 0xfef08a,
    activeId: 'art_dragon_palm',
    innerQiId: 'qi_nine_yin',
    riddleHint:
      'Temper eighteen roaring dragon palms with the supreme softness of Nine-Yin True Sutra to balance hardness with yielding grace.',
    description:
      'PEERLESS SYNERGY: 5 surging Yin-Yang Dragon Waves (3.60x ATK) + +24% ATK, +15% Crit Chance & +18% Speed.',
    powerMult: 3.6,
    projectileCount: 5,
    cooldownMs: 1600,
    bonusStats: { atkPct: 0.24, critChance: 0.15, speedPct: 0.18 },
  },
  {
    id: 'syn_xiao_feng_dragon',
    kind: 'synergy',
    name: 'Heroic Dragon Heaven-Shatterer',
    shortName: 'Heroic Dragon',
    icon: '',
    colorHex: 0xfbbf24,
    activeId: 'art_dragon_palm',
    innerQiId: 'qi_yi_jin_jing',
    riddleHint:
      'Power the eighteen dragon palms with the unbreakable diamond foundation of Tendon-Changing Classic to shatter the vault of heaven.',
    description:
      'PEERLESS SYNERGY: 6 roaring golden dragon shockwaves (4.10x ATK) + +30% ATK, +40 Armor & +30% Max HP.',
    powerMult: 4.1,
    projectileCount: 6,
    cooldownMs: 1650,
    bonusStats: { atkPct: 0.3, armorFlat: 40, hpPct: 0.3 },
  },
  {
    id: 'syn_six_pulse_lingbo',
    kind: 'synergy',
    name: 'Lingbo Celestial Six-Pulse Glide',
    shortName: 'Lingbo Six-Pulse',
    icon: '',
    colorHex: 0x38bdf8,
    activeId: 'art_six_pulse',
    innerQiId: 'qi_lingbo_steps',
    riddleHint:
      'Tread the 64 Book of Changes hexagrams at high velocity while projecting invisible royal sword beams across every angle.',
    description:
      'PEERLESS SYNERGY: 8 swift untargetable royal sword lances (3.25x ATK) + +20% Dodge, +20% CDR & +25% Speed.',
    powerMult: 3.25,
    projectileCount: 8,
    cooldownMs: 1250,
    bonusStats: { dodgeChance: 0.2, cooldownReduction: 0.2, speedPct: 0.25 },
  },
  {
    id: 'syn_taiji_great_shift',
    kind: 'synergy',
    name: 'Great Shift Taiji Reversal',
    shortName: 'Great Shift Taiji',
    icon: '',
    colorHex: 0xa5f3fc,
    activeId: 'art_taiji_sword',
    innerQiId: 'qi_great_shift',
    riddleHint:
      'Spin the soft circles of Wudang swordplay within the sacred seventh level of Great Shift to reflect enemy strikes into a vortex.',
    description:
      'PEERLESS SYNERGY: 8 spinning Taiji Reversal vortex blades (3.35x ATK) + +15% Dodge, +20 Armor & +180 Floor Barrier.',
    powerMult: 3.35,
    projectileCount: 8,
    cooldownMs: 1280,
    bonusStats: { dodgeChance: 0.15, armorFlat: 20, shieldOnFloor: 180 },
  },
  {
    id: 'syn_heavy_dragon_elephant',
    kind: 'synergy',
    name: 'Ten-Dragon Mountain-Crushing Cleave',
    shortName: 'Ten-Dragon Cleave',
    icon: '',
    colorHex: 0xf59e0b,
    activeId: 'art_heavy_iron',
    innerQiId: 'qi_dragon_elephant',
    riddleHint:
      'Infuse the weight of ten dragons and ten elephants into the unedged black-iron colossus blade to split the heavens.',
    description:
      'PEERLESS SYNERGY: Devastating blunt earth-splitter (4.80x ATK, long stun) + +35% ATK, +30 Armor & +25% Max HP.',
    powerMult: 4.8,
    projectileCount: 4,
    cooldownMs: 1900,
    bonusStats: { atkPct: 0.35, armorFlat: 30, hpPct: 0.25 },
  },
  {
    id: 'syn_boundless_star_shift',
    kind: 'synergy',
    name: 'Boundless Stellar Mirror Reflection',
    shortName: 'Boundless Star Shift',
    icon: '',
    colorHex: 0xc7d2fe,
    activeId: 'art_shifting_stars',
    innerQiId: 'qi_xiao_wuxiang',
    riddleHint:
      'Harness Little Boundless formless mimicry to reflect every sect’s secret techniques back with cosmic starlight.',
    description:
      'PEERLESS SYNERGY: 8 ricocheting astral starlight beams (3.30x ATK) + +22% ATK, +20% CDR & +15% Crit Chance.',
    powerMult: 3.3,
    projectileCount: 8,
    cooldownMs: 1280,
    bonusStats: { atkPct: 0.22, cooldownReduction: 0.2, critChance: 0.15 },
  },
  {
    id: 'syn_spirit_vulture_talisman',
    kind: 'synergy',
    name: 'Spirit Vulture Ice-Talisman Sovereign',
    shortName: 'Ice-Talisman Sovereign',
    icon: '',
    colorHex: 0xfbcfe8,
    activeId: 'art_tianshan_six_yang',
    innerQiId: 'qi_star_absorb',
    riddleHint:
      'Condense vast Northern Abyss ocean reserves into thin Life-and-Death frost plates that pierce meridian defenses.',
    description:
      'PEERLESS SYNERGY: 8 piercing frost-talisman volleys (3.40x ATK) + +8% Lifesteal, +18% CDR & +25% Gold Bonus.',
    powerMult: 3.4,
    projectileCount: 8,
    cooldownMs: 1280,
    bonusStats: { lifesteal: 0.08, cooldownReduction: 0.18, goldBonusPct: 0.25 },
  },
  {
    id: 'syn_bright_summit_qiankun',
    kind: 'synergy',
    name: 'Bright Summit Supreme Qiankun Reversal',
    shortName: 'Bright Summit Qiankun',
    icon: '',
    colorHex: 0xfef08a,
    activeId: 'art_great_shift',
    innerQiId: 'qi_nine_yang',
    riddleHint:
      'Power the Seventh Level of Heaven and Earth Great Shift with the solar furnace of Nine-Yang to save Bright Summit.',
    description:
      'PEERLESS SYNERGY: Screen-wide golden Qiankun solar explosion (4.25x ATK) + +25% ATK, +45 Armor & +200 Floor Barrier.',
    powerMult: 4.25,
    projectileCount: 6,
    cooldownMs: 1350,
    bonusStats: { atkPct: 0.25, armorFlat: 45, shieldOnFloor: 200 },
  },
  {
    id: 'syn_reversed_nine_yin_toad',
    kind: 'synergy',
    name: 'Reversed Nine-Yin Demonic Toad',
    shortName: 'Reversed Toad',
    icon: '',
    colorHex: 0x4ade80,
    activeId: 'art_toad_stance',
    innerQiId: 'qi_nine_yin',
    riddleHint:
      'Reverse the meridians of Nine-Yin True Sutra while crouching in the White Camel Toad Stance until supreme madness conquers Mount Hua.',
    description:
      'PEERLESS SYNERGY: 5 leaping viridian venom-quake shockwaves (4.60x ATK, long stun) + +32% ATK, +50% Crit DMG & +8% Lifesteal.',
    powerMult: 4.6,
    projectileCount: 5,
    cooldownMs: 1700,
    bonusStats: { atkPct: 0.32, critDamage: 0.5, lifesteal: 0.08 },
  },
  {
    id: 'syn_white_camel_strength',
    kind: 'synergy',
    name: 'Ten-Dragon Toad Cataclysm',
    shortName: 'Ten-Dragon Toad',
    icon: '',
    colorHex: 0x22c55e,
    activeId: 'art_toad_stance',
    innerQiId: 'qi_dragon_elephant',
    riddleHint:
      'Infuse the weight of ten dragons and ten elephants into the White Camel leaping toad shockwave.',
    description:
      'PEERLESS SYNERGY: Cataclysmic concussive toad leap (4.90x ATK) + +38% ATK, +35 Armor & +25% Max HP.',
    powerMult: 4.9,
    projectileCount: 4,
    cooldownMs: 1850,
    bonusStats: { atkPct: 0.38, armorFlat: 35, hpPct: 0.25 },
  },
  {
    id: 'syn_nine_yang_taiji_sword',
    kind: 'synergy',
    name: 'Nine-Yang Taiji Sun Sword',
    shortName: 'Nine-Yang Taiji',
    icon: '',
    colorHex: 0xfde047,
    activeId: 'art_taiji_sword',
    innerQiId: 'qi_nine_yang',
    riddleHint:
      'Infuse Nine-Yang solar heat into the endless circular flow of Wudang Taiji swordplay.',
    description:
      'PEERLESS SYNERGY: 8 blazing Taiji Sun Sword arcs (3.50x ATK) + +22% ATK, +18% CDR & +30 Armor.',
    powerMult: 3.5,
    projectileCount: 8,
    cooldownMs: 1250,
    bonusStats: { atkPct: 0.22, cooldownReduction: 0.18, armorFlat: 30 },
  },
];

export const WUXIA_ENLIGHTENMENT_SCROLLS: readonly WuxiaEnlightenmentScroll[] = [
  {
    id: 'enlighten_qi_surge',
    kind: 'enlightenment',
    name: 'Left-Right Mutual Hands',
    shortName: 'Mutual Hands',
    icon: '',
    colorHex: 0xfbbf24,
    description:
      'Dual-Mind Mastery: +14% ATK & +5% CDR per stack, plus +25% chance/stack (max 75%) to DOUBLE-CAST Martial Techniques!',
    bonusStats: { atkPct: 0.14, cooldownReduction: 0.05 },
  },
  {
    id: 'enlighten_meridian_haste',
    kind: 'enlightenment',
    name: 'Eight-Meridian Overdrive',
    shortName: 'Meridian Overdrive',
    icon: '',
    colorHex: 0x38bdf8,
    description: 'High-Realm Mastery: +12% Skill Haste, +12% Crit Chance & +12% Speed.',
    bonusStats: { cooldownReduction: 0.12, critChance: 0.12, speedPct: 0.12 },
  },
  {
    id: 'enlighten_steel_will',
    kind: 'enlightenment',
    name: 'Golden Core Tempering',
    shortName: 'Golden Core',
    icon: '',
    colorHex: 0xf59e0b,
    description: 'High-Realm Mastery: +22 Armor, +90 Floor Barrier & +3% Lifesteal.',
    bonusStats: { armorFlat: 22, shieldOnFloor: 90, lifesteal: 0.03 },
  },
  {
    id: 'enlighten_sword_intent',
    kind: 'enlightenment',
    name: 'Solitary Nine Swords — Shield-Breaker',
    shortName: 'Shield-Breaker',
    icon: '',
    colorHex: 0xc084fc,
    description:
      'Supreme Sword Intent: +12% ATK, +8% Crit & +25% Crit DMG, plus every attack shatters +1 extra Boss Hit-Shield layer per stack!',
    bonusStats: { atkPct: 0.12, critDamage: 0.25, critChance: 0.08 },
  },
  {
    id: 'enlighten_blood_lotus',
    kind: 'enlightenment',
    name: 'Crimson Lotus Blood Scroll',
    shortName: 'Blood Lotus',
    icon: '',
    colorHex: 0xf43f5e,
    description: 'Forbidden Mastery: +6% Lifesteal & +20% ATK (stackable).',
    bonusStats: { lifesteal: 0.06, atkPct: 0.2 },
  },
  {
    id: 'enlighten_cloud_dragon',
    kind: 'enlightenment',
    name: 'Nine-Heavens Cloud Stride',
    shortName: 'Cloud Stride',
    icon: '',
    colorHex: 0x34d399,
    description: 'Sky Footwork Mastery: +10% Dodge, +18% Speed & +10% Skill Haste.',
    bonusStats: { dodgeChance: 0.1, speedPct: 0.18, cooldownReduction: 0.1 },
  },
  {
    id: 'enlighten_immortal_vessel',
    kind: 'enlightenment',
    name: 'Immortal Jade Bone Forging',
    shortName: 'Jade Bone',
    icon: '',
    colorHex: 0x2dd4bf,
    description: 'Body Tempering: +25% Max HP, +30 Armor & +140 Floor Barrier.',
    bonusStats: { hpPct: 0.25, armorFlat: 30, shieldOnFloor: 140 },
  },
  {
    id: 'enlighten_tribulation_thunder',
    kind: 'enlightenment',
    name: 'Nine-Heavens Tribulation Lightning',
    shortName: 'Tribulation Bolt',
    icon: '',
    colorHex: 0xa855f7,
    description:
      'Heavenly Tribulation: +18% ATK, +7% Crit Rate, +25% Crit DMG & calls a Heaven Lightning Pillar every 3.5s (260% ATK × stacks AoE)!',
    bonusStats: { atkPct: 0.18, critDamage: 0.25, critChance: 0.07 },
  },
  {
    id: 'enlighten_treasury',
    kind: 'enlightenment',
    name: 'Four-Seas Merchant Decree',
    shortName: 'Merchant Decree',
    icon: '',
    colorHex: 0x10b981,
    description: 'High-Realm Mastery: +45% Gold Bonus & +14% ATK (stackable).',
    bonusStats: { goldBonusPct: 0.45, atkPct: 0.14 },
  },
  {
    id: 'enlighten_peerless_domain',
    kind: 'enlightenment',
    name: 'Supreme Sovereign Domain',
    shortName: 'Sovereign Domain',
    icon: '',
    colorHex: 0xfef08a,
    description: 'Peak Enlightenment: +15% ATK, +15% Max HP, +15 Armor & +80 Floor Barrier.',
    bonusStats: { atkPct: 0.15, hpPct: 0.15, armorFlat: 15, shieldOnFloor: 80 },
  },
];

export const ALL_WUXIA_MANUALS: readonly WuxiaManualEntry[] = [
  ...WUXIA_ACTIVE_ARTS,
  ...WUXIA_INNER_QI,
  ...WUXIA_SECRET_SYNERGIES,
  ...WUXIA_ENLIGHTENMENT_SCROLLS,
];

export const getWuxiaManualById = (id: string): WuxiaManualEntry | null =>
  ALL_WUXIA_MANUALS.find((entry) => entry.id === id) ?? null;

export const getWuxiaActiveArtById = (id: string): WuxiaActiveArt | null =>
  WUXIA_ACTIVE_ARTS.find((entry) => entry.id === id) ?? null;

export const getWuxiaInnerQiById = (id: string): WuxiaInnerQi | null =>
  WUXIA_INNER_QI.find((entry) => entry.id === id) ?? null;

export const getWuxiaSynergyById = (id: string): WuxiaSecretSynergy | null =>
  WUXIA_SECRET_SYNERGIES.find((entry) => entry.id === id) ?? null;

export const getWuxiaEnlightenmentScrollById = (id: string): WuxiaEnlightenmentScroll | null =>
  WUXIA_ENLIGHTENMENT_SCROLLS.find((entry) => entry.id === id) ?? null;

export const getActiveAwakenedSynergy = (
  activeId: string,
  awakenedSynergyIds: readonly string[]
): WuxiaSecretSynergy | null => {
  for (const synId of awakenedSynergyIds) {
    const syn = getWuxiaSynergyById(synId);
    if (syn && syn.activeId === activeId) return syn;
  }
  return null;
};

export const getSynergiesForActive = (activeId: string): readonly WuxiaSecretSynergy[] =>
  WUXIA_SECRET_SYNERGIES.filter((syn) => syn.activeId === activeId);

export const getSynergiesForInnerQi = (innerQiId: string): readonly WuxiaSecretSynergy[] =>
  WUXIA_SECRET_SYNERGIES.filter((syn) => syn.innerQiId === innerQiId);

const emptyStats = (): {
  hpPct: number;
  atkPct: number;
  speedPct: number;
  armorFlat: number;
  critChance: number;
  critDamage: number;
  dodgeChance: number;
  cooldownReduction: number;
  lifesteal: number;
  goldBonusPct: number;
  shieldOnFloor: number;
} => ({
  hpPct: 0,
  atkPct: 0,
  speedPct: 0,
  armorFlat: 0,
  critChance: 0,
  critDamage: 0,
  dodgeChance: 0,
  cooldownReduction: 0,
  lifesteal: 0,
  goldBonusPct: 0,
  shieldOnFloor: 0,
});

const addBundle = (
  acc: ReturnType<typeof emptyStats>,
  bundle: WuxiaStatBundle
): void => {
  acc.hpPct += bundle.hpPct ?? 0;
  acc.atkPct += bundle.atkPct ?? 0;
  acc.speedPct += bundle.speedPct ?? 0;
  acc.armorFlat += bundle.armorFlat ?? 0;
  acc.critChance += bundle.critChance ?? 0;
  acc.critDamage += bundle.critDamage ?? 0;
  acc.dodgeChance += bundle.dodgeChance ?? 0;
  acc.cooldownReduction += bundle.cooldownReduction ?? 0;
  acc.lifesteal += bundle.lifesteal ?? 0;
  acc.goldBonusPct += bundle.goldBonusPct ?? 0;
  acc.shieldOnFloor += bundle.shieldOnFloor ?? 0;
};

export const computeWuxiaLoadout = (
  draftedIds: readonly string[],
  floor = 1
): WuxiaLoadoutSummary => {
  const maxActiveSlots = getMaxActiveSlotsForFloor(floor);
  const maxInnerQiSlots = getMaxInnerQiSlotsForFloor(floor);
  const maxManualLevel = getMaxManualLevelForFloor(floor);

  const activeOrder: string[] = [];
  const innerQiOrder: string[] = [];
  const activeLevels: Record<string, number> = {};
  const innerQiLevels: Record<string, number> = {};
  const awakenedSynergies: string[] = [];
  const enlightenmentCounts: Record<string, number> = {};

  for (const id of draftedIds) {
    const manual = getWuxiaManualById(id);
    if (!manual) continue;
    if (manual.kind === 'active') {
      const prev = activeLevels[id] ?? 0;
      if (prev === 0) {
        if (activeOrder.length >= maxActiveSlots) continue;
        activeOrder.push(id);
      }
      activeLevels[id] = Math.min(maxManualLevel, prev + 1);
    } else if (manual.kind === 'inner_qi') {
      const prev = innerQiLevels[id] ?? 0;
      if (prev === 0) {
        if (innerQiOrder.length >= maxInnerQiSlots) continue;
        innerQiOrder.push(id);
      }
      innerQiLevels[id] = Math.min(maxManualLevel, prev + 1);
    } else if (manual.kind === 'synergy') {
      if (!awakenedSynergies.includes(id)) {
        awakenedSynergies.push(id);
      }
    } else if (manual.kind === 'enlightenment') {
      enlightenmentCounts[id] = (enlightenmentCounts[id] ?? 0) + 1;
    }
  }

  const aggregatedStats = emptyStats();

  for (const qiId of innerQiOrder) {
    const qi = getWuxiaInnerQiById(qiId);
    const lv = innerQiLevels[qiId] ?? 0;
    if (qi && lv >= 1) {
      const idx = Math.min(4, Math.max(0, lv - 1));
      const bundle = qi.levelStats[idx];
      if (bundle) addBundle(aggregatedStats, bundle);
    }
  }

  for (const synId of awakenedSynergies) {
    const syn = getWuxiaSynergyById(synId);
    if (syn) {
      addBundle(aggregatedStats, syn.bonusStats);
    }
  }

  for (const scroll of WUXIA_ENLIGHTENMENT_SCROLLS) {
    const count = enlightenmentCounts[scroll.id] ?? 0;
    for (let i = 0; i < count; i++) {
      addBundle(aggregatedStats, scroll.bonusStats);
    }
  }

  const availableSynergies = WUXIA_SECRET_SYNERGIES.filter((syn) => {
    if (awakenedSynergies.includes(syn.id)) return false;
    const actLv = activeLevels[syn.activeId] ?? 0;
    const qiLv = innerQiLevels[syn.innerQiId] ?? 0;
    return actLv >= WUXIA_MAX_MANUAL_LEVEL && qiLv >= 1;
  });

  const actives: WuxiaSlotEntry[] = activeOrder.map((id) => ({
    id,
    level: activeLevels[id] ?? 1,
  }));
  const innerQis: WuxiaSlotEntry[] = innerQiOrder.map((id) => ({
    id,
    level: innerQiLevels[id] ?? 1,
  }));

  return {
    actives,
    innerQis,
    activeLevels,
    innerQiLevels,
    awakenedSynergies,
    availableSynergies,
    enlightenmentCounts,
    aggregatedStats,
    maxActiveSlots,
    maxInnerQiSlots,
    maxManualLevel,
  };
};

type WeightedDraftCandidate = {
  readonly option: WuxiaDraftOption;
  readonly weight: number;
};

const toActiveDraftOption = (
  art: WuxiaActiveArt,
  curLv: number,
  maxLevel: number
): WuxiaDraftOption => {
  const nextLv = Math.min(maxLevel, curLv + 1);
  const idx = Math.min(4, Math.max(0, nextLv - 1));
  const desc = art.levelDescriptions[idx] ?? art.levelDescriptions[0];
  const badge =
    curLv === 0
      ? 'NEW ACTIVE SKILL'
      : nextLv >= 5
        ? 'ACTIVE LV.5 TRANSCENDENT'
        : nextLv === 4
          ? 'ACTIVE LV.4 GRANDMASTER'
          : nextLv === 3
            ? 'ACTIVE LV.3 ULTIMATE'
            : `ACTIVE UPGRADE LV.${nextLv}`;
  return {
    id: art.id,
    kind: 'active',
    rarity: nextLv >= 4 ? 'peerless' : nextLv === 3 ? 'ultimate' : nextLv === 2 ? 'esoteric' : 'martial',
    name: art.name,
    icon: art.icon,
    currentLevel: curLv,
    nextLevel: nextLv,
    maxLevel,
    badge,
    description: desc,
    isSecretAwakening: false,
    tags: [art.sectOrigin, `Active Skill ${nextLv}/${maxLevel}`],
  };
};

const toInnerQiDraftOption = (
  qi: WuxiaInnerQi,
  curLv: number,
  maxLevel: number
): WuxiaDraftOption => {
  const nextLv = Math.min(maxLevel, curLv + 1);
  const idx = Math.min(4, Math.max(0, nextLv - 1));
  const desc = qi.levelDescriptions[idx] ?? qi.levelDescriptions[0];
  const badge =
    curLv === 0
      ? 'NEW PASSIVE SKILL'
      : nextLv >= 5
        ? 'PASSIVE LV.5 TRANSCENDENT'
        : nextLv === 4
          ? 'PASSIVE LV.4 GRANDMASTER'
          : nextLv === 3
            ? 'PASSIVE LV.3 ULTIMATE'
            : `PASSIVE UPGRADE LV.${nextLv}`;
  return {
    id: qi.id,
    kind: 'inner_qi',
    rarity: nextLv >= 5 ? 'ultimate' : nextLv >= 3 ? 'esoteric' : 'martial',
    name: qi.name,
    icon: qi.icon,
    currentLevel: curLv,
    nextLevel: nextLv,
    maxLevel,
    badge,
    description: desc,
    isSecretAwakening: false,
    tags: [qi.sectOrigin, `Passive Skill ${nextLv}/${maxLevel}`],
  };
};

const toSynergyDraftOption = (syn: WuxiaSecretSynergy): WuxiaDraftOption => ({
  id: syn.id,
  kind: 'synergy',
  rarity: 'peerless',
  name: syn.name,
  icon: syn.icon,
  currentLevel: 0,
  nextLevel: 1,
  maxLevel: 1,
  badge: 'SECRET SYNERGY',
  description: syn.description,
  isSecretAwakening: true,
  tags: ['Peerless Awakening', 'Secret Combo'],
});

const toEnlightenmentDraftOption = (
  scroll: WuxiaEnlightenmentScroll,
  curCount: number
): WuxiaDraftOption => ({
  id: scroll.id,
  kind: 'enlightenment',
  rarity: 'enlightenment',
  name: scroll.name,
  icon: scroll.icon,
  currentLevel: curCount,
  nextLevel: curCount + 1,
  maxLevel: 99,
  badge: curCount > 0 ? `STACK x${curCount + 1}` : 'TRIBULATION SCROLL',
  description: scroll.description,
  isSecretAwakening: false,
  tags: ['High-Realm Tribulation', 'Stackable'],
});

export const buildWuxiaDraftCandidates = (
  draftedIds: readonly string[],
  floor: number
): readonly WeightedDraftCandidate[] => {
  const loadout = computeWuxiaLoadout(draftedIds, floor);
  const candidates: WeightedDraftCandidate[] = [];

  for (const syn of loadout.availableSynergies) {
    candidates.push({
      option: toSynergyDraftOption(syn),
      weight: 9,
    });
  }

  const activeSlotsFull = loadout.actives.length >= loadout.maxActiveSlots;
  for (const art of WUXIA_ACTIVE_ARTS) {
    const curLv = loadout.activeLevels[art.id] ?? 0;
    if (curLv >= loadout.maxManualLevel) continue;
    if (curLv === 0 && activeSlotsFull) continue;
    const isFloor1 = floor <= 1;
    const baseWeight = curLv > 0 ? 3.4 : isFloor1 ? 3.2 : 2.5;
    candidates.push({
      option: toActiveDraftOption(art, curLv, loadout.maxManualLevel),
      weight: baseWeight,
    });
  }

  const qiSlotsFull = loadout.innerQis.length >= loadout.maxInnerQiSlots;
  for (const qi of WUXIA_INNER_QI) {
    const curLv = loadout.innerQiLevels[qi.id] ?? 0;
    if (curLv >= loadout.maxManualLevel) continue;
    if (curLv === 0 && qiSlotsFull) continue;
    const hasPairedMaxArt = WUXIA_SECRET_SYNERGIES.some(
      (syn) => syn.innerQiId === qi.id && (loadout.activeLevels[syn.activeId] ?? 0) >= 2
    );
    const weight = curLv > 0 ? 3.0 : hasPairedMaxArt ? 2.7 : 2.2;
    candidates.push({
      option: toInnerQiDraftOption(qi, curLv, loadout.maxManualLevel),
      weight,
    });
  }

  if (candidates.length < 3) {
    for (const scroll of WUXIA_ENLIGHTENMENT_SCROLLS) {
      const curCount = loadout.enlightenmentCounts[scroll.id] ?? 0;
      const weight = Math.max(0.55, 1.8 - curCount * 0.2);
      candidates.push({
        option: toEnlightenmentDraftOption(scroll, curCount),
        weight,
      });
    }
  } else if (floor >= 12) {
    const offset = (floor + draftedIds.length) % WUXIA_ENLIGHTENMENT_SCROLLS.length;
    for (let i = 0; i < 2; i++) {
      const scroll =
        WUXIA_ENLIGHTENMENT_SCROLLS[(offset + i * 3) % WUXIA_ENLIGHTENMENT_SCROLLS.length];
      if (!scroll) continue;
      const curCount = loadout.enlightenmentCounts[scroll.id] ?? 0;
      candidates.push({
        option: toEnlightenmentDraftOption(scroll, curCount),
        weight: 1.05,
      });
    }
  }

  return candidates;
};

const pickWeightedIndex = (
  items: readonly WeightedDraftCandidate[],
  rng: () => number
): number => {
  let total = 0;
  for (const item of items) {
    total += Math.max(0.01, item.weight);
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    const entry = items[i];
    if (!entry) continue;
    roll -= Math.max(0.01, entry.weight);
    if (roll <= 0) return i;
  }
  return Math.max(0, items.length - 1);
};

export const rollWuxiaDraftCards = (
  rng: () => number,
  draftedIds: readonly string[],
  floor: number,
  count = 3
): readonly WuxiaDraftOption[] => {
  const pool = [...buildWuxiaDraftCandidates(draftedIds, floor)];
  const picks: WuxiaDraftOption[] = [];

  // Guarantee at least one Active Martial Art on Floor 1 if player still has 0 Active Arts.
  const loadout = computeWuxiaLoadout(draftedIds, floor);
  if (loadout.actives.length === 0) {
    const activeOnly = pool.filter((item) => item.option.kind === 'active');
    if (activeOnly.length > 0) {
      const idxInActive = pickWeightedIndex(activeOnly, rng);
      const chosen = activeOnly[idxInActive];
      if (chosen) {
        picks.push(chosen.option);
        const removeIdx = pool.findIndex((item) => item.option.id === chosen.option.id);
        if (removeIdx >= 0) pool.splice(removeIdx, 1);
      }
    }
  }

  while (picks.length < count && pool.length > 0) {
    const idx = pickWeightedIndex(pool, rng);
    const chosen = pool.splice(idx, 1)[0];
    if (chosen) {
      picks.push(chosen.option);
    }
  }

  return picks;
};

export const refreshWuxiaDraftCard = (
  rng: () => number,
  draftedIds: readonly string[],
  floor: number,
  currentHandIds: readonly string[],
  excludeId: string
): WuxiaDraftOption | null => {
  const blocked = new Set<string>([...currentHandIds, excludeId]);
  const pool = buildWuxiaDraftCandidates(draftedIds, floor).filter(
    (entry) => !blocked.has(entry.option.id)
  );
  if (pool.length === 0) {
    const fallbackPool = buildWuxiaDraftCandidates(draftedIds, floor).filter(
      (entry) => entry.option.id !== excludeId
    );
    if (fallbackPool.length === 0) return null;
    const idx = pickWeightedIndex(fallbackPool, rng);
    return fallbackPool[idx]?.option ?? null;
  }
  const idx = pickWeightedIndex(pool, rng);
  return pool[idx]?.option ?? null;
};

export const isCultLeaderFloor = (floor: number): boolean =>
  floor >= 10 && floor % 10 === 0;

export const getMiniBossFloorsForBracket = (
  bracketIndex: number,
  seed: number
): readonly [number, number] => {
  const bracketStart = bracketIndex * 10 + 1;
  // Candidate floors inside each 10-floor bracket: 2..9, 12..19, 22..29, ...
  const candidates: number[] = [];
  for (let offset = 1; offset <= 8; offset++) {
    candidates.push(bracketStart + offset);
  }
  const mixed = (seed ^ Math.imul(bracketIndex + 1, 2654435761)) >>> 0;
  const firstIdx = mixed % candidates.length;
  const firstFloor = candidates[firstIdx] ?? bracketStart + 3;
  const remaining = candidates.filter((f) => f !== firstFloor && Math.abs(f - firstFloor) >= 2);
  const pool2 = remaining.length > 0 ? remaining : candidates.filter((f) => f !== firstFloor);
  const mixed2 = Math.imul(mixed ^ 0x9e3779b9, 2246822519) >>> 0;
  const secondFloor = pool2[mixed2 % pool2.length] ?? bracketStart + 6;
  return firstFloor < secondFloor ? [firstFloor, secondFloor] : [secondFloor, firstFloor];
};

export const isRandomMiniBossFloor = (floor: number, seed: number): boolean => {
  if (floor <= 1 || isCultLeaderFloor(floor)) return false;
  const bracketIndex = Math.floor((floor - 1) / 10);
  const [f1, f2] = getMiniBossFloorsForBracket(bracketIndex, seed);
  return floor === f1 || floor === f2;
};

export const getWuxiaFloorBracketTitle = (floor: number): string => {
  if (isCultLeaderFloor(floor)) {
    if (floor === 30) return 'Supreme Cult Leader Sanctum (Daily Climax)';
    return `Cult Leader Sanctum (Floor ${floor})`;
  }
  if (floor <= 10) return 'Outer Martial Courtyard (Early Game)';
  if (floor <= 20) return 'Inner Sect Pagoda (Mid Game)';
  if (floor <= 30) return 'Grandmaster Peak (Late Game)';
  return 'Endless Heavenly Spire';
};
