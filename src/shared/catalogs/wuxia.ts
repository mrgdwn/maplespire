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
    icon: '🐉',
    sectOrigin: 'Beggar Sect Stance',
    colorHex: 0xf59e0b,
    style: 'palm_wave',
    cooldownsMs: [2800, 2450, 2050, 1800, 1550],
    powerMults: [1.35, 1.75, 2.3, 2.95, 3.7],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Unleash 1 golden dragon-qi palm wave forward (1.35x ATK + knockback).',
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
    icon: '🗡️',
    sectOrigin: 'Ancient Tomb Lineage',
    colorHex: 0x38bdf8,
    style: 'jade_swords',
    cooldownsMs: [2300, 1950, 1600, 1380, 1180],
    powerMults: [1.1, 1.42, 1.8, 2.35, 3.0],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Project 2 swift jade sword-qi blades toward nearby cultists (1.10x ATK).',
      'Launch 3 crescent jade blades with swift meridian tempo (1.42x ATK).',
      'ULTIMATE: 4 synchronized moon-jade blades carve crowds (1.80x ATK).',
      'GRANDMASTER: 5 cold moonlight blades cut rapidly across ranks (2.35x ATK).',
      'TRANSCENDENT: 6 ethereal Ancient Tomb phantom swords (3.00x ATK).',
    ],
    pairedQiId: 'qi_nine_yin',
    synergyId: 'syn_melancholic_sword',
  },
  {
    id: 'art_dog_staff',
    kind: 'active',
    name: 'Beggar Dog-Beating Staff',
    shortName: 'Emerald Staff',
    icon: '🎋',
    sectOrigin: 'Chief Rod Forms',
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
    name: 'Xuantie Heavy Iron Cleave',
    shortName: 'Iron Cleave',
    icon: '⚔️',
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
      'GRANDMASTER: Shattering Xuantie impact halts Hall Masters (4.00x ATK).',
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
    icon: '🪈',
    sectOrigin: 'Eastern Sea Pavilion',
    colorHex: 0x2dd4bf,
    style: 'flute_sonic',
    cooldownsMs: [2500, 2150, 1750, 1500, 1280],
    powerMults: [1.05, 1.35, 1.72, 2.25, 2.85],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Send 2 sonic flute notes that ricochet cleanly between foes (1.05x ATK).',
      'Play 3 harmonic qi notes bouncing deeper through waves (1.35x ATK).',
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
    name: 'Soul-Chilling Ice Needles',
    shortName: 'Ice Needles',
    icon: '❄️',
    sectOrigin: 'Red-Silk Frost Art',
    colorHex: 0x818cf8,
    style: 'venom_needles',
    cooldownsMs: [2400, 2050, 1700, 1450, 1250],
    powerMults: [0.95, 1.22, 1.55, 2.05, 2.6],
    projectileCounts: [3, 5, 7, 9, 11],
    levelDescriptions: [
      'Loose 3 homing silver frost needles that chill targets (0.95x ATK).',
      'Fire 5 tracking chill needles across the chamber (1.22x ATK).',
      'ULTIMATE: 7 Frozen Silk needles lock onto cultists (1.55x ATK).',
      'GRANDMASTER: 9 piercing Soul-Frost needles saturate the room (2.05x ATK).',
      'TRANSCENDENT: 11 Blizzard Silk needles freeze entire waves (2.60x ATK).',
    ],
    pairedQiId: 'qi_toad_venom',
    synergyId: 'syn_thousand_venom_lotus',
  },
  {
    id: 'art_six_pulse',
    kind: 'active',
    name: 'Six-Pulse Divine Sword',
    shortName: 'Six-Pulse Qi',
    icon: '⚡',
    sectOrigin: 'Dali Duan Clan Royal Art',
    colorHex: 0x0ea5e9,
    style: 'six_pulse',
    cooldownsMs: [2550, 2200, 1800, 1550, 1300],
    powerMults: [1.25, 1.65, 2.15, 2.75, 3.45],
    projectileCounts: [2, 3, 4, 5, 6],
    levelDescriptions: [
      'Project 2 invisible fingertip sword-qi beams piercing lines (1.25x ATK).',
      'Channel 3 meridian sword rays slicing through cultist shields (1.65x ATK).',
      'ULTIMATE: 4 dazzling Six-Pulse rays skewering deep ranks (2.15x ATK).',
      'GRANDMASTER: 5 rapid royal Qi lances pierce armor cleanly (2.75x ATK).',
      'TRANSCENDENT: All 6 Six-Pulse meridians erupt in unison (3.45x ATK).',
    ],
    pairedQiId: 'qi_sunflower_manual',
    synergyId: 'syn_six_pulse_chaos',
  },
  {
    id: 'art_tantan_finger',
    kind: 'active',
    name: 'Flicking Finger Divine Thrum',
    shortName: 'Finger Thrum',
    icon: '💥',
    sectOrigin: 'Peach Blossom Isle',
    colorHex: 0xfb7185,
    style: 'flicking_finger',
    cooldownsMs: [2400, 2050, 1700, 1450, 1220],
    powerMults: [1.3, 1.7, 2.2, 2.85, 3.6],
    projectileCounts: [1, 2, 3, 4, 5],
    levelDescriptions: [
      'Flick a compressed crimson Qi pellet that bursts on impact (1.30x ATK).',
      'Fire 2 concussive Peach-Isle finger bolts with Qi shockwaves (1.70x ATK).',
      'ULTIMATE: 3 shattering crimson Qi thrums stagger bosses (2.20x ATK).',
      'GRANDMASTER: 4 high-velocity Qi bullets erupt in AoE rings (2.85x ATK).',
      'TRANSCENDENT: 5 Sovereign Finger-Cannons detonate on contact (3.60x ATK).',
    ],
    pairedQiId: 'qi_dragon_elephant',
    synergyId: 'syn_ten_dragon_thunder',
  },
];

export const WUXIA_INNER_QI: readonly WuxiaInnerQi[] = [
  {
    id: 'qi_nine_yang',
    kind: 'inner_qi',
    name: 'Nine Yang Divine Qi',
    shortName: 'Nine Yang',
    icon: '☀️',
    sectOrigin: 'Shaolin Lantern Scroll',
    colorHex: 0xf97316,
    levelDescriptions: [
      '+12% Max HP, +10 Armor, +45 Floor Qi Barrier.',
      '+24% Max HP, +22 Armor, +95 Floor Qi Barrier.',
      '+38% Max HP, +36 Armor, +160 Floor Qi Barrier.',
      'GRANDMASTER: +55% Max HP, +54 Armor, +240 Floor Qi Barrier.',
      'TRANSCENDENT: +75% Max HP, +78 Armor, +360 Floor Qi Barrier.',
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
    id: 'qi_nine_yin',
    kind: 'inner_qi',
    name: 'Nine Yin True Scripture',
    shortName: 'Nine Yin',
    icon: '🌙',
    sectOrigin: 'Huang Yaoshi Vault',
    colorHex: 0x60a5fa,
    levelDescriptions: [
      '+12% ATK, +8% Crit Chance, +10% Tempo.',
      '+24% ATK, +16% Crit Chance, +20% Tempo.',
      '+38% ATK, +25% Crit Chance, +32% Tempo.',
      'GRANDMASTER: +54% ATK, +34% Crit Chance, +44% Tempo.',
      'TRANSCENDENT: +74% ATK, +45% Crit Chance, +58% Tempo.',
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
    id: 'qi_heaven_earth',
    kind: 'inner_qi',
    name: 'Void Step Qinggong',
    shortName: 'Void Qinggong',
    icon: '💨',
    sectOrigin: 'Quanzhen Cloud Path',
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
    name: 'Dugu Sword Intent',
    shortName: 'Sword Intent',
    icon: '⚡',
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
    name: 'Eight Trigram Meridian Art',
    shortName: 'Bagua Qi',
    icon: '☯️',
    sectOrigin: 'Peach Blossom Isle',
    colorHex: 0x2dd4bf,
    levelDescriptions: [
      '+10% CDR, +10% Max HP, +18% Silver Taels.',
      '+20% CDR, +20% Max HP, +36% Silver Taels.',
      '+32% CDR, +32% Max HP, +55% Silver Taels.',
      'GRANDMASTER: +42% CDR, +48% Max HP, +80% Silver Taels.',
      'TRANSCENDENT: +52% CDR, +66% Max HP, +110% Silver Taels.',
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
    id: 'qi_toad_venom',
    kind: 'inner_qi',
    name: 'Western Toad Stance',
    shortName: 'Toad Stance',
    icon: '🐸',
    sectOrigin: 'White Camel Peak',
    colorHex: 0xa3e635,
    levelDescriptions: [
      '+4% Lifesteal, +12 Armor, +10% ATK.',
      '+8% Lifesteal, +26 Armor, +22% ATK.',
      '+13% Lifesteal, +42 Armor, +36% ATK.',
      'GRANDMASTER: +18% Lifesteal, +62 Armor, +52% ATK.',
      'TRANSCENDENT: +24% Lifesteal, +88 Armor, +72% ATK.',
    ],
    levelStats: [
      { lifesteal: 0.04, armorFlat: 12, atkPct: 0.1 },
      { lifesteal: 0.08, armorFlat: 26, atkPct: 0.22 },
      { lifesteal: 0.13, armorFlat: 42, atkPct: 0.36 },
      { lifesteal: 0.18, armorFlat: 62, atkPct: 0.52 },
      { lifesteal: 0.24, armorFlat: 88, atkPct: 0.72 },
    ],
  },
  {
    id: 'qi_iron_cloth',
    kind: 'inner_qi',
    name: 'Golden Bell Iron Shirt',
    shortName: 'Golden Bell',
    icon: '🔔',
    sectOrigin: 'External Body Refinement',
    colorHex: 0xfbbf24,
    levelDescriptions: [
      '+18 Armor, +15% Max HP.',
      '+38 Armor, +30% Max HP.',
      '+65 Armor, +50% Max HP.',
      'GRANDMASTER: +96 Armor, +75% Max HP.',
      'TRANSCENDENT: +135 Armor, +105% Max HP.',
    ],
    levelStats: [
      { armorFlat: 18, hpPct: 0.15 },
      { armorFlat: 38, hpPct: 0.3 },
      { armorFlat: 65, hpPct: 0.5 },
      { armorFlat: 96, hpPct: 0.75 },
      { armorFlat: 135, hpPct: 1.05 },
    ],
  },
  {
    id: 'qi_star_absorb',
    kind: 'inner_qi',
    name: 'Northern Abyss Qi Absorption',
    shortName: 'Abyss Qi',
    icon: '🌀',
    sectOrigin: 'Carefree Ravine',
    colorHex: 0xf472b6,
    levelDescriptions: [
      '+5% Lifesteal, +12% Crit DMG, +18% Silver Taels.',
      '+10% Lifesteal, +28% Crit DMG, +36% Silver Taels.',
      '+16% Lifesteal, +45% Crit DMG, +60% Silver Taels.',
      'GRANDMASTER: +22% Lifesteal, +75% Crit DMG, +90% Silver Taels.',
      'TRANSCENDENT: +28% Lifesteal, +115% Crit DMG, +125% Silver Taels.',
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
    id: 'qi_sunflower_manual',
    kind: 'inner_qi',
    name: 'Crimson Meridian Swift Scripture',
    shortName: 'Swift Meridian',
    icon: '🌺',
    sectOrigin: 'Forbidden Inner Palace Scroll',
    colorHex: 0xf43f5e,
    levelDescriptions: [
      '+14% Skill Haste, +12% Speed, +8% Crit Chance.',
      '+26% Skill Haste, +24% Speed, +16% Crit Chance.',
      '+38% Skill Haste, +38% Speed, +24% Crit Chance.',
      'GRANDMASTER: +48% Skill Haste, +52% Speed, +32% Crit Chance.',
      'TRANSCENDENT: +58% Skill Haste, +68% Speed, +42% Crit Chance.',
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
    id: 'qi_dragon_elephant',
    kind: 'inner_qi',
    name: 'Dragon-Elephant Prajna Merit',
    shortName: 'Dragon-Elephant',
    icon: '🐘',
    sectOrigin: 'Western Sovereign Scroll',
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
];

export const WUXIA_SECRET_SYNERGIES: readonly WuxiaSecretSynergy[] = [
  {
    id: 'syn_sovereign_dragon',
    kind: 'synergy',
    name: 'True Dragon Sovereign Palm',
    shortName: 'Sovereign Dragon',
    icon: '🐲',
    colorHex: 0xfef08a,
    activeId: 'art_dragon_palm',
    innerQiId: 'qi_nine_yang',
    riddleHint:
      'When eighteen palms roar beside scorching solar heat, a golden sovereign shakes the spire.',
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
    name: 'Melancholic Sword of Parting',
    shortName: 'Parting Sword',
    icon: '🌸',
    colorHex: 0x7dd3fc,
    activeId: 'art_jade_sword',
    innerQiId: 'qi_nine_yin',
    riddleHint:
      'Let Tomb swordplay cross currents with the cold Moon Scripture, and parting longing turns into six phantom blades.',
    description:
      'PEERLESS SYNERGY: Twin Condor Aura fires 6 phantom blades (2.75x ATK) + +18% Crit Chance & +20% Speed.',
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
    icon: '👑',
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
    icon: '🗡️',
    colorHex: 0xe879f9,
    activeId: 'art_heavy_iron',
    innerQiId: 'qi_solitary_sword',
    riddleHint:
      'Pair the heavy unedged black iron blade with formless Solitary Intent to wake buried legends.',
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
    icon: '🌊',
    colorHex: 0x5eead4,
    activeId: 'art_jade_flute',
    innerQiId: 'qi_bagua_harmony',
    riddleHint:
      'Align the eight trigrams to a lone bamboo flute and the Eastern Tide shatters every cult pulse.',
    description:
      'PEERLESS SYNERGY: 6 golden-azure notes chain rapidly across cult ranks (2.65x ATK) + +15% CDR & +30% Taels.',
    powerMult: 2.65,
    projectileCount: 6,
    cooldownMs: 1450,
    bonusStats: { cooldownReduction: 0.15, goldBonusPct: 0.3, hpPct: 0.18 },
  },
  {
    id: 'syn_thousand_venom_lotus',
    kind: 'synergy',
    name: 'Thousand-Frost Lotus Volley',
    shortName: 'Frost Lotus',
    icon: '🪷',
    colorHex: 0xc4b5fd,
    activeId: 'art_ice_needle',
    innerQiId: 'qi_toad_venom',
    riddleHint:
      'Temper venomous Toad breath inside silver frost needles until a thousand winter petals bloom.',
    description:
      'PEERLESS SYNERGY: Fires 10 homing frost-venom lotus needles (2.35x ATK) + +6% Lifesteal & +20% ATK.',
    powerMult: 2.35,
    projectileCount: 10,
    cooldownMs: 1400,
    bonusStats: { lifesteal: 0.06, atkPct: 0.2, armorFlat: 20 },
  },
  {
    id: 'syn_six_pulse_chaos',
    kind: 'synergy',
    name: 'Six-Pulse Heaven-Piercing Array',
    shortName: 'Heaven-Piercing Qi',
    icon: '☄️',
    colorHex: 0x38bdf8,
    activeId: 'art_six_pulse',
    innerQiId: 'qi_sunflower_manual',
    riddleHint:
      'Drive the six royal meridian swords with forbidden crimson swiftness to tear open the sky.',
    description:
      'PEERLESS SYNERGY: Fires 8 relentless royal sword-qi beams (3.10x ATK) + +18% CDR & +18% Crit Chance.',
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
    icon: '🔥',
    colorHex: 0xfb923c,
    activeId: 'art_tantan_finger',
    innerQiId: 'qi_dragon_elephant',
    riddleHint:
      'Focus ten-fold Dragon-Elephant strength onto a single flicked fingertip to burst cult ranks.',
    description:
      'PEERLESS SYNERGY: Launches 6 seismic crimson finger-cannons (3.60x ATK) + +30% ATK & +35 Armor.',
    powerMult: 3.6,
    projectileCount: 6,
    cooldownMs: 1450,
    bonusStats: { atkPct: 0.3, armorFlat: 35, hpPct: 0.2 },
  },
];

export const WUXIA_ENLIGHTENMENT_SCROLLS: readonly WuxiaEnlightenmentScroll[] = [
  {
    id: 'enlighten_qi_surge',
    kind: 'enlightenment',
    name: 'Left-Right Mutual Hands (左右互搏)',
    shortName: 'Mutual Hands',
    icon: '☯️',
    colorHex: 0xfbbf24,
    description:
      'Zhou Botong’s Dual-Mind Technique: +14% ATK & +5% CDR per stack, plus +25% chance/stack (max 75%) to DOUBLE-CAST Martial Arts!',
    bonusStats: { atkPct: 0.14, cooldownReduction: 0.05 },
  },
  {
    id: 'enlighten_meridian_haste',
    kind: 'enlightenment',
    name: 'Eight-Meridian Overdrive',
    shortName: 'Meridian Overdrive',
    icon: '⚡',
    colorHex: 0x38bdf8,
    description: 'High-Realm Cultivation: +12% Skill Haste, +12% Crit Chance & +12% Speed.',
    bonusStats: { cooldownReduction: 0.12, critChance: 0.12, speedPct: 0.12 },
  },
  {
    id: 'enlighten_steel_will',
    kind: 'enlightenment',
    name: 'Golden Core Tempering',
    shortName: 'Golden Core',
    icon: '🛡️',
    colorHex: 0xf59e0b,
    description: 'High-Realm Cultivation: +22 Armor, +90 Floor Qi Barrier & +3% Lifesteal.',
    bonusStats: { armorFlat: 22, shieldOnFloor: 90, lifesteal: 0.03 },
  },
  {
    id: 'enlighten_sword_intent',
    kind: 'enlightenment',
    name: 'Dugu Nine Swords — Shield-Breaker (獨孤九劍)',
    shortName: 'Dugu Po-Qi',
    icon: '⚔️',
    colorHex: 0xc084fc,
    description:
      'Dugu Nine Swords Po-Qi Form: +12% ATK, +8% Crit & +25% Crit DMG, plus every attack shatters +1 extra Boss Hit-Shield layer per stack!',
    bonusStats: { atkPct: 0.12, critDamage: 0.25, critChance: 0.08 },
  },
  {
    id: 'enlighten_blood_lotus',
    kind: 'enlightenment',
    name: 'Crimson Lotus Blood Sutra',
    shortName: 'Blood Lotus',
    icon: '🩸',
    colorHex: 0xf43f5e,
    description: 'Demonic Cultivation: +6% Lifesteal & +20% ATK (stackable).',
    bonusStats: { lifesteal: 0.06, atkPct: 0.2 },
  },
  {
    id: 'enlighten_cloud_dragon',
    kind: 'enlightenment',
    name: 'Nine-Heavens Cloud Stride',
    shortName: 'Cloud Stride',
    icon: '☁️',
    colorHex: 0x34d399,
    description: 'High-Realm Qinggong: +10% Dodge, +18% Speed & +10% Skill Haste.',
    bonusStats: { dodgeChance: 0.1, speedPct: 0.18, cooldownReduction: 0.1 },
  },
  {
    id: 'enlighten_immortal_vessel',
    kind: 'enlightenment',
    name: 'Immortal Jade Bone Forging',
    shortName: 'Jade Bone',
    icon: '🦴',
    colorHex: 0x2dd4bf,
    description: 'Body Tribulation: +25% Max HP, +30 Armor & +140 Floor Qi Barrier.',
    bonusStats: { hpPct: 0.25, armorFlat: 30, shieldOnFloor: 140 },
  },
  {
    id: 'enlighten_tribulation_thunder',
    kind: 'enlightenment',
    name: 'Nine-Heavens Tribulation Lightning (九天雷劫)',
    shortName: 'Tribulation Bolt',
    icon: '🌩️',
    colorHex: 0xa855f7,
    description:
      'Sect Tribulation: +18% ATK, +7% Crit Rate, +25% Crit DMG & calls a Heaven Lightning Pillar every 3.5s (260% ATK × stacks AoE)!',
    bonusStats: { atkPct: 0.18, critDamage: 0.25, critChance: 0.07 },
  },
  {
    id: 'enlighten_treasury',
    kind: 'enlightenment',
    name: 'Four-Seas Merchant Decree',
    shortName: 'Merchant Decree',
    icon: '🪙',
    colorHex: 0x10b981,
    description: 'High-Realm Cultivation: +45% Silver Taels & +14% ATK (stackable).',
    bonusStats: { goldBonusPct: 0.45, atkPct: 0.14 },
  },
  {
    id: 'enlighten_peerless_domain',
    kind: 'enlightenment',
    name: 'Supreme Sovereign Qi Domain',
    shortName: 'Sovereign Domain',
    icon: '🏯',
    colorHex: 0xfef08a,
    description: 'Peak Enlightenment: +15% ATK, +15% Max HP, +15 Armor & +80 Floor Qi Barrier.',
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
      ? 'NEW ART'
      : nextLv >= 5
        ? 'LV.5 TRANSCENDENT'
        : nextLv === 4
          ? 'LV.4 GRANDMASTER'
          : nextLv === 3
            ? 'LV.3 ULTIMATE'
            : `UPGRADE LV.${nextLv}`;
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
    tags: [art.sectOrigin, `Active ${nextLv}/${maxLevel}`],
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
      ? 'NEW NEIGONG'
      : nextLv >= 5
        ? 'QI LV.5 TRANSCENDENT'
        : nextLv === 4
          ? 'QI LV.4 GRANDMASTER'
          : `QI LV.${nextLv}/${maxLevel}`;
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
    tags: [qi.sectOrigin, `Inner Qi ${nextLv}/${maxLevel}`],
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
  if (isCultLeaderFloor(floor)) return 'Cult Leader Sanctum';
  if (floor <= 10) return 'Outer Martial Courtyard';
  if (floor <= 20) return 'Inner Sect Pagoda';
  if (floor <= 30) return 'Grandmaster Peak';
  return 'Peerless Abyss Ascent';
};
