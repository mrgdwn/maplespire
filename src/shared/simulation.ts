import {
  computeBossChestCount,
  computeBossRouletteCount,
  computeEnemySpawnHpMult,
  computeFloorClearHeal,
  computeFloorStartShield,
} from './buffCombat.ts';
import {
  BIOME_CATALOG,
  getBiomeForFloor,
  getEndBossNameForFloor,
  getMiniBossForFloor,
  rollBossMutations,
  type BiomeMechanicId,
} from './catalogs/biomes.ts';
import {
  CLASS_IDS,
  GEAR_SLOTS,
  computeHeroCombatStats,
  getClassDefinition,
} from './catalogs/classes.ts';
import {
  WUXIA_ACTIVE_ARTS,
  WUXIA_ENLIGHTENMENT_SCROLLS,
  WUXIA_INNER_QI,
  WUXIA_SECRET_SYNERGIES,
  computeWuxiaLoadout,
  getActiveAwakenedSynergy,
  getSynergiesForActive,
  getSynergiesForInnerQi,
  getWuxiaActiveArtById,
  isCultLeaderFloor,
  isRandomMiniBossFloor,
  rollWuxiaDraftCards,
  type WuxiaDraftOption,
} from './catalogs/wuxia.ts';
import type {
  BiomeId,
  ClassId,
  ComputedHeroStats,
  GearItem,
  GearSlot,
  LegionStatKey,
  MutationId,
  PlayerProfile,
} from './types.ts';
import {
  awardClassExp,
  createGearItem,
  createInitialProfile,
  createLegendaryGearItem,
  getDismantleShardValue,
  getLegionUpgradeCost,
  getSlotUpgradeCost,
  hashString,
  mulberry32,
} from './utils.ts';

export type SimStrategy = 'synergy_hunter' | 'balanced' | 'aggressive' | 'immortal_tank';

export type SimMode = 'campaign' | 'benchmark';

export type FloorBracketKey = 'F1-10' | 'F11-20' | 'F21-30' | 'F31+';

export type KillFloorType =
  | 'mob'
  | 'elite'
  | 'miniboss'
  | 'cult_leader'
  | 'mount_hua_summit'
  | 'none';

export type SimConfig = {
  runs: number;
  mode: SimMode;
  strategy: SimStrategy;
  baseSeed: number;
  maxFloorCap?: number | undefined;
  flawShatterRate?: number | undefined;
  classId?: ClassId | undefined;
  extractAtFloor?: number | undefined;
  batchId?: string | undefined;
};

export type SimulatedArtSummary = {
  id: string;
  name: string;
  level: number;
};

export type SimulatedRunRecord = {
  batchId: string;
  runIndex: number;
  timestampIso: string;
  seed: number;
  mode: SimMode;
  strategy: SimStrategy;
  classId: ClassId;
  startLevel: number;
  endLevel: number;
  floorReached: number;
  floorsCleared: number;
  outcome: 'died' | 'extracted' | 'cleared';
  killedBy: string | null;
  killFloorType: KillFloorType;
  activeBossMutations: MutationId[];
  durationSec: number;
  wavesCleared: number;
  elitesKilled: number;
  miniBossesKilled: number;
  cultLeadersKilled: number;
  qiFlawsShattered: number;
  tribulationStrikesSurvived: number;
  potionsUsed: number;
  draftedIds: string[];
  activeArtsFinal: SimulatedArtSummary[];
  innerQiFinal: SimulatedArtSummary[];
  awakenedSynergies: string[];
  enlightenmentPicks: number;
  firstSynergyFloor: number | null;
  synergyAwakenedFloors: Record<string, number>;
  goldEarned: number;
  shardsEarned: number;
  coresEarned: number;
  legendaryDrops: string[];
  equippedLegendaries: string[];
  gearPowerScore: number;
  bracketDps: Record<FloorBracketKey, number>;
  bracketDamageTaken: Record<FloorBracketKey, number>;
};

export type LethalityBreakdownEntry = {
  key: KillFloorType;
  deaths: number;
  pct: number;
};

export type DeadliestEnemyEntry = {
  name: string;
  deaths: number;
  pct: number;
};

export type ClassPerformanceEntry = {
  classId: ClassId;
  className: string;
  runs: number;
  avgFloor: number;
  medianFloor: number;
  maxFloor: number;
  f10ClearRatePct: number;
  f20ReachRatePct: number;
  f30ReachRatePct: number;
  avgF21Dps: number;
};

export type ActiveArtTelemetryEntry = {
  id: string;
  name: string;
  pickCount: number;
  pickRatePct: number;
  avgFinalLevel: number;
  avgFloorWhenDrafted: number;
};

export type SecretSynergyTelemetryEntry = {
  id: string;
  name: string;
  awakenedCount: number;
  awakenedRatePct: number;
  avgFloorAwakened: number | null;
  avgFloorReachedWhenAwakened: number | null;
};

export type InnerQiTelemetryEntry = {
  id: string;
  name: string;
  pickCount: number;
  pickRatePct: number;
  avgFinalLevel: number;
};

export type BalanceHealthCheck = {
  check: string;
  status: 'PASS' | 'WARN';
  detail: string;
};

export type SimulationEvaluationSummary = {
  batchId: string;
  generatedAtIso: string;
  config: {
    runs: number;
    mode: SimMode;
    strategy: SimStrategy;
    baseSeed: number;
    maxFloorCap: number;
  };
  overview: {
    totalRuns: number;
    avgFloor: number;
    minFloor: number;
    p25Floor: number;
    medianFloor: number;
    p75Floor: number;
    p90Floor: number;
    maxFloor: number;
    f10ClearRatePct: number;
    f20ReachRatePct: number;
    f30ReachRatePct: number;
    f40ReachRatePct: number;
    clearRatePct: number;
    avgDurationSec: number;
    avgQiFlawsShattered: number;
    avgEnlightenmentPicks: number;
  };
  lethality: {
    totalDeaths: number;
    byFloorType: LethalityBreakdownEntry[];
    byBracket: Record<FloorBracketKey, { deaths: number; pct: number }>;
    deadliestEnemies: DeadliestEnemyEntry[];
    deadlyMutations: { id: MutationId; deaths: number; pct: number }[];
  };
  classPerformance: ClassPerformanceEntry[];
  wuxiaTelemetry: {
    activeArts: ActiveArtTelemetryEntry[];
    secretSynergies: SecretSynergyTelemetryEntry[];
    innerQi: InnerQiTelemetryEntry[];
    avgFirstSynergyFloor: number | null;
    anySynergyRatePct: number;
  };
  economyAndProgression: {
    avgGoldEarned: number;
    avgShardsEarned: number;
    avgCoresEarned: number;
    avgLegendariesDropped: number;
    topEquippedLegendaries: { name: string; equippedCount: number }[];
    earlyVsLateCurve: {
      earlyRunsCount: number;
      lateRunsCount: number;
      earlyAvgLevel: number;
      lateAvgLevel: number;
      earlyAvgGearPower: number;
      lateAvgGearPower: number;
      earlyAvgFloor: number;
      lateAvgFloor: number;
    };
  };
  healthChecks: BalanceHealthCheck[];
};

export type SimulatedBatchResult = {
  runs: SimulatedRunRecord[];
  finalProfile: PlayerProfile;
  summary: SimulationEvaluationSummary;
};

type SimActorEnemy = {
  id: number;
  name: string;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  atkIntervalSec: number;
  atkTimer: number;
  speed: number;
  hitShield: number;
  isBoss: boolean;
  isMiniBoss: boolean;
  isElite: boolean;
  floorType: KillFloorType;
  mutations: MutationId[];
  mechanic: BiomeMechanicId | null;
  armorShred: number;
  burnStacks: number;
  burnTimer: number;
  bleedStacks: number;
  bleedTimer: number;
  chillTimer: number;
  rootTimer: number;
  stunTimer: number;
  smokeTimer: number;
  smokeActiveTimer: number;
  permafrostTimer: number;
  overheatTimer: number;
  enrageTimer: number;
  enrageStacks: number;
  volatileTimer: number;
  flawTimer: number;
  flawCooldown: number;
};

type SimHazard = {
  fuse: number;
  damage: number;
};

type BracketTelemetryAccumulator = {
  damageDealt: number;
  damageTaken: number;
  timeSec: number;
};

const HERO_X = 180;
const ARENA_WIDTH = 1024;
const TIME_STEP_SEC = 0.1;

const toFloorBracket = (floor: number): FloorBracketKey => {
  if (floor <= 10) return 'F1-10';
  if (floor <= 20) return 'F11-20';
  if (floor <= 30) return 'F21-30';
  return 'F31+';
};

const createEmptyBracketRecord = (): Record<FloorBracketKey, number> => ({
  'F1-10': 0,
  'F11-20': 0,
  'F21-30': 0,
  'F31+': 0,
});

const getEquippedLegendariesMap = (
  profile: PlayerProfile,
  classId: ClassId
): Map<string, boolean> => {
  const map = new Map<string, boolean>();
  const cls = profile.classes[classId];
  for (const slot of GEAR_SLOTS) {
    const item = cls.equipped[slot];
    if (item && item.legendaryId) {
      map.set(item.legendaryId, item.isCursed);
    }
  }
  return map;
};

export const computeGearPowerScore = (profile: PlayerProfile, classId: ClassId): number => {
  const cls = profile.classes[classId];
  let score = 0;
  for (const slot of GEAR_SLOTS) {
    const item = cls.equipped[slot];
    if (!item) continue;
    const tierMult = item.tier === 'legendary' ? 2.4 : item.tier === 'rare' ? 1.45 : 1;
    const purifiedMult = item.isCursed ? 0.9 : 1.08;
    const slotEnhanceMult = 1 + cls.slotLevels[slot] * 0.1;
    score += item.baseStatBonus * tierMult * purifiedMult * slotEnhanceMult;
  }
  return Math.round(score);
};

const scoreSingleGearItem = (item: GearItem): number => {
  const tierBonus = item.tier === 'legendary' ? 220 : item.tier === 'rare' ? 60 : 0;
  const slotBonus = item.slot === 'weapon' ? 1.25 : 1;
  const cursePenalty = item.isCursed ? -35 : 25;
  return item.baseStatBonus * 3 * slotBonus + tierBonus + cursePenalty + item.level * 2;
};

const scoreDraftOption = (
  option: WuxiaDraftOption,
  draftedIds: readonly string[],
  floor: number,
  strategy: SimStrategy
): number => {
  const loadout = computeWuxiaLoadout(draftedIds, floor);
  let score = 0;

  if (option.isSecretAwakening) {
    score += strategy === 'synergy_hunter' ? 1000 : 750;
  }

  if (option.kind === 'active') {
    const art = getWuxiaActiveArtById(option.id);
    const hasPairedQi = art
      ? getSynergiesForActive(art.id).some((s) => (loadout.innerQiLevels[s.innerQiId] ?? 0) > 0)
      : false;
    const base =
      option.currentLevel === 0
        ? strategy === 'aggressive'
          ? 240
          : 205
        : 220 + option.nextLevel * 38;
    score += base;
    if (hasPairedQi) {
      score += strategy === 'synergy_hunter' ? 210 : 120;
    }
    if (option.nextLevel === 3 || option.nextLevel === 5) {
      score += 85;
    }
  } else if (option.kind === 'inner_qi') {
    const partneredSynergies = getSynergiesForInnerQi(option.id);
    const partneredActive = partneredSynergies
      .map((s) => getWuxiaActiveArtById(s.activeId))
      .find((a) => a !== null && (loadout.activeLevels[a.id] ?? 0) > 0);
    score += option.currentLevel === 0 ? 150 : 165 + option.nextLevel * 28;
    if (partneredActive) {
      const actLv = loadout.activeLevels[partneredActive.id] ?? 0;
      score += (strategy === 'synergy_hunter' ? 230 : 130) + actLv * 25;
    }

    const offensiveQis = new Set([
      'qi_nine_yin',
      'qi_solitary_sword',
      'qi_jade_maiden',
      'qi_dragon_elephant',
    ]);
    const defensiveQis = new Set([
      'qi_nine_yang',
      'qi_heaven_earth',
      'qi_bagua_harmony',
      'qi_star_absorb',
    ]);
    if (strategy === 'aggressive' && offensiveQis.has(option.id)) score += 110;
    if (strategy === 'immortal_tank' && defensiveQis.has(option.id)) score += 120;
    if (strategy === 'balanced') score += 45;
  } else if (option.kind === 'enlightenment') {
    score += 130;
    if (
      option.id === 'enlighten_sword_intent' ||
      option.id === 'enlighten_qi_surge' ||
      option.id === 'enlighten_tribulation_thunder'
    ) {
      score += strategy === 'aggressive' ? 110 : 65;
    }
    if (
      option.id === 'enlighten_immortal_vessel' ||
      option.id === 'enlighten_steel_will' ||
      option.id === 'enlighten_blood_lotus'
    ) {
      score += strategy === 'immortal_tank' ? 115 : 55;
    }
    if (strategy === 'balanced' && option.id === 'enlighten_peerless_domain') {
      score += 70;
    }
  }

  return score;
};

const pickWuxiaDraftOption = (
  options: readonly WuxiaDraftOption[],
  draftedIds: readonly string[],
  floor: number,
  strategy: SimStrategy,
  rng: () => number
): WuxiaDraftOption | null => {
  if (options.length === 0) return null;
  let best: WuxiaDraftOption | null = null;
  let bestScore = -1;
  for (const option of options) {
    const jitter = rng() * 8;
    const score = scoreDraftOption(option, draftedIds, floor, strategy) + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
};

const buildFloorEnemies = (
  rng: () => number,
  floor: number,
  waveIndex: number,
  totalWaves: number,
  runSeed: number,
  baseBiomeId: BiomeId,
  draftedIds: readonly string[],
  lastBossMutations: readonly MutationId[],
  idGen: { next: number }
): {
  enemies: SimActorEnemy[];
  mutationsRolled: MutationId[];
  encounterType: KillFloorType;
} => {
  const hpMult = computeEnemySpawnHpMult(draftedIds);
  const floorBiome = getBiomeForFloor(baseBiomeId, floor, runSeed);
  const isCultLeader = isCultLeaderFloor(floor);
  const isMountHuaSummit = !isCultLeader && floor >= 25 && floor % 10 === 5;
  const isMiniBoss = isRandomMiniBossFloor(floor, runSeed) || isMountHuaSummit;
  const bracket = Math.floor((floor - 1) / 10);

  const realmHpMult =
    floor <= 10
      ? 1 + (floor - 1) * 0.08
      : floor <= 20
        ? 1.72 * Math.pow(1.1, floor - 10)
        : floor <= 30
          ? 4.46 * Math.pow(1.1, floor - 20)
          : 11.57 * Math.pow(1.06, floor - 30);

  const realmAtkMult =
    floor <= 10
      ? 1 + (floor - 1) * 0.04
      : floor <= 20
        ? 1.36 + (floor - 10) * 0.08
        : floor <= 30
          ? 2.16 + (floor - 20) * 0.12
          : 3.36 * Math.pow(1.035, floor - 30);

  const makeActor = (opts: {
    name: string;
    x: number;
    hp: number;
    atk: number;
    atkIntervalSec: number;
    speed: number;
    hitShield: number;
    isBoss: boolean;
    isMiniBoss: boolean;
    isElite: boolean;
    floorType: KillFloorType;
    mutations: MutationId[];
    mechanic: BiomeMechanicId | null;
  }): SimActorEnemy => {
    let maxHp = opts.hp;
    let atkIntervalSec = opts.atkIntervalSec;
    if (opts.mutations.includes('juggernaut')) {
      maxHp = Math.round(maxHp * 1.3);
      atkIntervalSec *= 1.2;
    }
    if (opts.mutations.includes('hasted')) {
      maxHp = Math.round(maxHp * 0.8);
      atkIntervalSec = Math.max(0.55, atkIntervalSec * 0.72);
    }
    return {
      id: idGen.next++,
      name: opts.name,
      x: opts.x,
      hp: maxHp,
      maxHp,
      atk: opts.atk,
      atkIntervalSec,
      atkTimer: opts.isBoss ? 0.9 : 0.5 + rng() * 0.6,
      speed: opts.speed,
      hitShield: opts.hitShield,
      isBoss: opts.isBoss,
      isMiniBoss: opts.isMiniBoss,
      isElite: opts.isElite,
      floorType: opts.floorType,
      mutations: [...opts.mutations],
      mechanic: opts.mechanic,
      armorShred: 0,
      burnStacks: 0,
      burnTimer: 0,
      bleedStacks: 0,
      bleedTimer: 0,
      chillTimer: 0,
      rootTimer: 0,
      stunTimer: 0,
      smokeTimer: 6,
      smokeActiveTimer: 0,
      permafrostTimer: 8,
      overheatTimer: 1.5,
      enrageTimer: 5,
      enrageStacks: 0,
      volatileTimer: 4.5,
      flawTimer: 0,
      flawCooldown: opts.isBoss ? 2.4 : opts.isElite ? 2.6 + rng() * 1.6 : 4.2 + rng() * 2.5,
    };
  };

  if (isCultLeader || isMiniBoss) {
    const isEndBoss = isCultLeader;
    const baseCount = isCultLeader
      ? Math.min(3, Math.max(1, Math.floor(floor / 10)))
      : isMountHuaSummit
        ? 2
        : 1;
    const rouletteCount = Math.max(baseCount, computeBossRouletteCount(floor, draftedIds));
    const mutations = rollBossMutations(rng, rouletteCount, lastBossMutations);

    const bossTier = Math.max(1, Math.floor(floor / 10));
    const cultLeaderHp =
      bossTier === 1
        ? 4800
        : bossTier === 2
          ? 26000
          : bossTier === 3
            ? 95000
            : bossTier === 4
              ? 165000
              : bossTier === 5
                ? 285000
                : bossTier === 6
                  ? 480000
                  : Math.round(480000 * Math.pow(1.5, bossTier - 6));
    const cultLeaderAtk =
      bossTier === 1
        ? 68
        : bossTier === 2
          ? 210
          : bossTier === 3
            ? 460
            : bossTier === 4
              ? 620
              : bossTier === 5
                ? 820
                : bossTier === 6
                  ? 1080
                  : Math.round(1080 * Math.pow(1.25, bossTier - 6));

    const baseHp = isEndBoss
      ? cultLeaderHp
      : Math.round((360 + floor * 85) * realmHpMult * (floor >= 11 ? 2.6 : 1.65));
    const baseAtk = isEndBoss
      ? cultLeaderAtk
      : Math.round((14 + floor * 3.2) * realmAtkMult * 1.65);

    const miniBossSpec = getMiniBossForFloor(baseBiomeId, floor, runSeed);
    const bossName = isEndBoss
      ? `${getEndBossNameForFloor(baseBiomeId, floor, runSeed)} (F${floor})`
      : miniBossSpec.name;
    const baseInterval = Math.max(0.68, (isEndBoss ? 1.15 : 1.32) - floor * 0.012);
    const bossSpeed = 28 + Math.min(28, floor * 0.8);
    const encounterType: KillFloorType = isEndBoss
      ? 'cult_leader'
      : isMountHuaSummit
        ? 'mount_hua_summit'
        : 'miniboss';

    const result: SimActorEnemy[] = [];
    if (isMountHuaSummit) {
      const secondSpec = getMiniBossForFloor(baseBiomeId, floor + 2, runSeed + 7919);
      result.push(
        makeActor({
          name: miniBossSpec.name,
          x: ARENA_WIDTH - 195,
          hp: Math.round(baseHp * 0.85 * hpMult),
          atk: baseAtk,
          atkIntervalSec: baseInterval,
          speed: bossSpeed,
          hitShield: 0,
          isBoss: true,
          isMiniBoss: true,
          isElite: false,
          floorType: 'mount_hua_summit',
          mutations,
          mechanic: miniBossSpec.mechanicId,
        }),
        makeActor({
          name: secondSpec.name,
          x: ARENA_WIDTH - 95,
          hp: Math.round(baseHp * 0.85 * hpMult),
          atk: baseAtk,
          atkIntervalSec: baseInterval,
          speed: bossSpeed,
          hitShield: 0,
          isBoss: true,
          isMiniBoss: true,
          isElite: false,
          floorType: 'mount_hua_summit',
          mutations,
          mechanic: secondSpec.mechanicId,
        })
      );
    } else if (mutations.includes('twin_soul')) {
      result.push(
        makeActor({
          name: bossName,
          x: ARENA_WIDTH - 160,
          hp: Math.round(baseHp * 0.65 * hpMult),
          atk: baseAtk,
          atkIntervalSec: baseInterval,
          speed: bossSpeed,
          hitShield: 0,
          isBoss: true,
          isMiniBoss: !isEndBoss,
          isElite: false,
          floorType: encounterType,
          mutations,
          mechanic: isEndBoss ? floorBiome.mechanicId : miniBossSpec.mechanicId,
        }),
        makeActor({
          name: `${bossName} (Shade)`,
          x: ARENA_WIDTH - 95,
          hp: Math.round(baseHp * 0.35 * hpMult),
          atk: Math.round(baseAtk * 0.75),
          atkIntervalSec: baseInterval,
          speed: bossSpeed,
          hitShield: 0,
          isBoss: true,
          isMiniBoss: !isEndBoss,
          isElite: false,
          floorType: encounterType,
          mutations,
          mechanic: isEndBoss ? floorBiome.mechanicId : miniBossSpec.mechanicId,
        })
      );
    } else {
      result.push(
        makeActor({
          name: bossName,
          x: ARENA_WIDTH - 150,
          hp: Math.round(baseHp * hpMult),
          atk: baseAtk,
          atkIntervalSec: baseInterval,
          speed: bossSpeed,
          hitShield: 0,
          isBoss: true,
          isMiniBoss: !isEndBoss,
          isElite: false,
          floorType: encounterType,
          mutations,
          mechanic: isEndBoss ? floorBiome.mechanicId : miniBossSpec.mechanicId,
        })
      );
    }

    return { enemies: result, mutationsRolled: mutations, encounterType };
  }

  // Normal + Elite waves
  const isFinalWave = waveIndex === totalWaves;
  const isEliteFloor = floor > 1 && (floor % 10 === 7 || floor % 10 === 9);
  const mobCount =
    floor === 1 ? 3 : 3 + Math.min(5, Math.floor(floor / 4)) + (isFinalWave ? 1 : 0);
  const eliteChance =
    floor < 3 ? 0 : Math.min(0.65, 0.18 + bracket * 0.14 + (floor % 10) * 0.015);
  const spacing = Math.min(
    84,
    Math.max(38, Math.floor((ARENA_WIDTH - HERO_X - 200) / Math.max(1, mobCount - 1)))
  );
  const frontAnchorX = waveIndex > 1 ? Math.max(HERO_X + 210, ARENA_WIDTH - 260) : ARENA_WIDTH - 75;

  const mobs: SimActorEnemy[] = [];
  for (let i = 0; i < mobCount; i += 1) {
    const kindIdx = Math.floor(rng() * 3);
    const mobName = floorBiome.mobNames[kindIdx] ?? 'Cultist';
    const isElite =
      (isEliteFloor && i === mobCount - 1) ||
      (floor >= 3 && (rng() < eliteChance || (isFinalWave && i === 0 && floor >= 5)));
    const maxHp = Math.round(
      (46 + floor * 28 + waveIndex * 14) * realmHpMult * (isElite ? 2.15 : 1) * hpMult
    );
    const atk = Math.round((7 + floor * 2.2) * realmAtkMult * (isElite ? 1.45 : 1));
    const x = Math.max(
      HERO_X + 130,
      waveIndex > 1 ? frontAnchorX + i * spacing * 0.65 : ARENA_WIDTH - 75 - i * spacing
    );

    mobs.push(
      makeActor({
        name: isElite ? `Elite ${mobName}` : mobName,
        x,
        hp: maxHp,
        atk,
        atkIntervalSec: Math.max(0.78, (isElite ? 1.28 : 1.52) - floor * 0.018),
        speed: (36 + Math.min(48, floor * 1.5)) * (isElite ? 1.18 : 1),
        hitShield: isElite && floor >= 11 ? Math.min(6, 1 + bracket) : 0,
        isBoss: false,
        isMiniBoss: false,
        isElite,
        floorType: isElite ? 'elite' : 'mob',
        mutations: [],
        mechanic: null,
      })
    );
  }

  return { enemies: mobs, mutationsRolled: [], encounterType: 'mob' };
};

export const simulateSingleRun = (opts: {
  profile: PlayerProfile;
  classId: ClassId;
  strategy: SimStrategy;
  seed: number;
  runIndex: number;
  batchId: string;
  mode: SimMode;
  maxFloorCap?: number | undefined;
  flawShatterRate?: number | undefined;
  extractAtFloor?: number | undefined;
}): SimulatedRunRecord => {
  const maxFloorCap = Math.max(10, opts.maxFloorCap ?? 80);
  const flawShatterRate = Math.max(0, Math.min(1, opts.flawShatterRate ?? 0.65));
  const rng = mulberry32(opts.seed);
  const startLevel = opts.profile.classes[opts.classId].level;
  const baseBiome = BIOME_CATALOG[Math.floor(rng() * BIOME_CATALOG.length)] ?? BIOME_CATALOG[0];
  const baseBiomeId: BiomeId = baseBiome ? baseBiome.id : 'slime_bog';

  const legMap = getEquippedLegendariesMap(opts.profile, opts.classId);
  const hasLeg = (id: string): boolean => legMap.has(id);
  const isLegCursed = (id: string): boolean => legMap.get(id) === true;

  const draftedIds: string[] = [];
  const artDraftedFloor: Record<string, number> = {};
  const synergyAwakenedFloors: Record<string, number> = {};
  let firstSynergyFloor: number | null = null;
  let lastBossMutations: MutationId[] = [];
  let activeBossMutations: MutationId[] = [];

  let goldCollected = 0;
  let shardsCollected = 0;
  let coresCollected = 0;
  let floorsCleared = 0;
  let floorReached = 1;
  let wavesCleared = 0;
  let elitesKilled = 0;
  let miniBossesKilled = 0;
  let cultLeadersKilled = 0;
  let qiFlawsShattered = 0;
  let tribulationStrikesSurvived = 0;
  let potionsUsed = 0;
  let totalTimeSec = 0;

  let outcome: 'died' | 'extracted' | 'cleared' = 'cleared';
  let killedBy: string | null = null;
  let killFloorType: KillFloorType = 'none';

  const bracketStats: Record<FloorBracketKey, BracketTelemetryAccumulator> = {
    'F1-10': { damageDealt: 0, damageTaken: 0, timeSec: 0 },
    'F11-20': { damageDealt: 0, damageTaken: 0, timeSec: 0 },
    'F21-30': { damageDealt: 0, damageTaken: 0, timeSec: 0 },
    'F31+': { damageDealt: 0, damageTaken: 0, timeSec: 0 },
  };

  let stats: ComputedHeroStats = computeHeroCombatStats(
    opts.profile,
    opts.classId,
    draftedIds,
    goldCollected,
    floorsCleared
  );
  let heroHp = stats.maxHp;
  let heroShield = 0;
  let invulnHitsLeft = 0;
  let phoenixReviveUsed = false;
  let fastingFloorsLeft = 0;
  let dodgeCount = 0;
  let attackCount = 0;

  let attackTimer = 0;
  let skillTimer = 0;
  let dashCooldown = 0;
  let potionCooldown = 0;
  let vampiricTouchCd = 0;
  let battleMomentumStacks = 0;
  let battleMomentumTimer = 0;
  let unhitTimer = 5;
  let hawkTimer = 0;
  let wolfTimer = 0;
  let runeZapTimer = 0;
  let meteorTimer = 0;
  let tribulationTimer = 0;
  let volatileSoulTimer = 0;
  const wuxiaArtTimers: Record<string, number> = {};
  const idGen = { next: 1 };

  const healHero = (amount: number): void => {
    if (amount <= 0 || fastingFloorsLeft > 0) return;
    const rounded = Math.max(1, Math.round(amount));
    const missing = Math.max(0, stats.maxHp - heroHp);
    const actual = Math.min(missing, rounded);
    const overheal = rounded - actual;
    heroHp += actual;
    if (overheal > 0 && draftedIds.includes('prism_war_blood_shield')) {
      heroShield = Math.min(stats.maxHp, heroShield + overheal);
    }
  };

  for (let floor = 1; floor <= maxFloorCap; floor += 1) {
    floorReached = floor;
    const bracketKey = toFloorBracket(floor);
    stats = computeHeroCombatStats(
      opts.profile,
      opts.classId,
      draftedIds,
      goldCollected,
      floorsCleared
    );
    const loadout = computeWuxiaLoadout(draftedIds, floor);
    const duguStacks = loadout.enlightenmentCounts['enlighten_sword_intent'] ?? 0;

    heroHp = Math.min(stats.maxHp, heroHp);
    heroShield =
      computeFloorStartShield(
        stats.maxHp,
        draftedIds,
        hasLeg('war_cape_aegis'),
        isLegCursed('war_cape_aegis')
      ) + loadout.aggregatedStats.shieldOnFloor;
    invulnHitsLeft = 0;

    let potionCharges = 1;
    const isBossFloor =
      isCultLeaderFloor(floor) ||
      isRandomMiniBossFloor(floor, opts.seed) ||
      (floor >= 25 && floor % 10 === 5);
    const totalWaves = isBossFloor ? 1 : floor <= 1 ? 1 : 2;
    totalTimeSec += isBossFloor ? 0.75 : 0.9;

    const hazards: SimHazard[] = [];

    const damageEnemy = (
      enemies: SimActorEnemy[],
      enemy: SimActorEnemy,
      rawDmg: number,
      labelTag: string | null
    ): void => {
      if (enemy.hp <= 0) return;
      if (enemy.smokeActiveTimer > 0 && rng() < 0.5) return;

      if (enemy.hitShield > 0 && labelTag !== 'SHATTER') {
        enemy.hitShield = Math.max(0, enemy.hitShield - (1 + duguStacks));
        return;
      }

      let dmg = rawDmg;
      if ((enemy.isBoss || enemy.isMiniBoss) && duguStacks > 0) {
        dmg *= 1 + 0.15 * duguStacks;
      }
      if (enemy.mutations.includes('golden_gilded')) dmg *= 1.15;
      if (enemy.chillTimer > 0 && draftedIds.includes('silver_frostbite_aura')) dmg *= 1.12;
      if (enemy.isBoss && draftedIds.includes('prism_war_titan_cleave')) dmg *= 1.25;
      if (
        enemy.isBoss &&
        draftedIds.includes('gold_executioners_verdict') &&
        enemy.hp / enemy.maxHp <= 0.3
      ) {
        dmg *= 1.3;
      }
      if (
        opts.classId === 'thief' &&
        opts.profile.classes.thief.level >= 15 &&
        (enemy.bleedStacks > 0 || enemy.burnStacks > 0 || enemy.hp >= enemy.maxHp)
      ) {
        dmg *= 1.25;
      }
      if (hasLeg('bow_head_hawkeye')) {
        const distRatio = Math.min(1, Math.max(0, (enemy.x - HERO_X) / 450));
        dmg *= 1 + distRatio * (isLegCursed('bow_head_hawkeye') ? 0.5 : 0.8);
      }
      dmg *= 1 + enemy.armorShred * 0.06;

      const finalDmg = Math.max(1, Math.round(dmg));
      const actualDealt = Math.min(enemy.hp, finalDmg);
      enemy.hp = Math.max(0, enemy.hp - finalDmg);
      bracketStats[bracketKey].damageDealt += actualDealt;

      if (stats.lifestealPct > 0) {
        healHero(finalDmg * (stats.lifestealPct / 100));
      }
      if (draftedIds.includes('silver_armor_shred')) {
        enemy.armorShred = Math.min(10, enemy.armorShred + 1);
      }
      if (draftedIds.includes('silver_ignite_sparks') && rng() < 0.35) {
        enemy.burnTimer = 3;
        enemy.burnStacks = Math.min(4, enemy.burnStacks + 1);
      }
      if (draftedIds.includes('silver_serrated_wounds') && rng() < 0.4) {
        enemy.bleedTimer = 3;
        enemy.bleedStacks = Math.min(5, enemy.bleedStacks + 1);
      }

      if (enemy.hp <= 0) {
        if (draftedIds.includes('silver_battle_momentum')) {
          battleMomentumStacks = Math.min(5, battleMomentumStacks + 1);
          battleMomentumTimer = 3;
        }
        if (hasLeg('war_wep_souldrinker')) {
          healHero(stats.maxHp * 0.03);
        }
        if (enemy.isBoss && !enemy.isMiniBoss) cultLeadersKilled += 1;
        else if (enemy.isMiniBoss) miniBossesKilled += 1;
        else if (enemy.isElite) elitesKilled += 1;

        const goldBonusMult = 1 + stats.goldBonusPct / 100;
        const coinCount = enemy.isBoss ? 6 : enemy.isMiniBoss ? 3 : 1;
        const baseGold = enemy.isBoss ? 36 : enemy.isMiniBoss ? 22 : 12 + floor * 3;
        goldCollected += Math.round(baseGold * goldBonusMult) * coinCount;
        if (enemy.isBoss || enemy.isMiniBoss) {
          const chestCount = computeBossChestCount(draftedIds);
          goldCollected += Math.round((enemy.isBoss ? 48 : 30) * goldBonusMult) * chestCount;
          shardsCollected += enemy.isBoss ? 12 : 5;
          if (enemy.isBoss) coresCollected += 1;
        }

        // Remove dead enemies cleanly by filtering outside or in wave loop
        void enemies;
      }
    };

    const damageHero = (
      rawAtk: number,
      attacker: SimActorEnemy | null,
      fallbackSource: string
    ): void => {
      if (heroHp <= 0) return;
      if (invulnHitsLeft > 0) {
        invulnHitsLeft -= 1;
        return;
      }
      if (rng() < stats.dodgeRate) {
        dodgeCount += 1;
        return;
      }
      unhitTimer = 0;
      const armorMit = 100 / (100 + Math.max(0, stats.armor));
      const elitePenalty = attacker?.isMiniBoss && hasLeg('war_wep_souldrinker') ? 1.1 : 1;
      let dmg = Math.max(
        1,
        Math.round(rawAtk * armorMit * stats.damageTakenMult * elitePenalty)
      );

      if (attacker && draftedIds.includes('silver_thornmail_plating')) {
        damageEnemy([], attacker, Math.round(stats.armor * 0.8), 'THORNS');
      }
      if (attacker && hasLeg('war_top_dragonscale')) {
        const mitigated = Math.max(1, Math.round(rawAtk * (1 - armorMit)));
        damageEnemy([], attacker, Math.round(mitigated * 1.2), 'REFLECT');
      }
      if (attacker && attacker.mutations.includes('vampiric')) {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(dmg * 0.15));
      }

      if (heroShield > 0) {
        const absorbed = Math.min(heroShield, dmg);
        heroShield -= absorbed;
        dmg -= absorbed;
      }
      if (dmg > 0) {
        heroHp = Math.max(0, heroHp - dmg);
        bracketStats[bracketKey].damageTaken += dmg;
      }

      if (heroHp <= 0) {
        if (hasLeg('mage_top_phoenix') && !phoenixReviveUsed) {
          phoenixReviveUsed = true;
          heroHp = Math.round(stats.maxHp * (isLegCursed('mage_top_phoenix') ? 0.25 : 0.5));
          return;
        }
        outcome = 'died';
        killedBy = attacker ? attacker.name : fallbackSource;
        killFloorType = attacker ? attacker.floorType : isBossFloor ? 'cult_leader' : 'mob';
      }
    };

    const executeWuxiaArt = (
      enemies: SimActorEnemy[],
      artId: string,
      isBurst: boolean,
      isMutualMirror = false
    ): void => {
      const alive = enemies.filter((e) => e.hp > 0);
      if (alive.length === 0) return;
      const art = getWuxiaActiveArtById(artId);
      if (!art) return;

      const level = Math.min(5, Math.max(1, loadout.activeLevels[artId] ?? 1));
      const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
      const tier: 'base' | 'ultimate' | 'grandmaster' =
        syn !== null || level >= 4 ? 'grandmaster' : level >= 3 ? 'ultimate' : 'base';

      const powerMult =
        (syn ? syn.powerMult : (art.powerMults[level - 1] ?? 1.2)) *
        (isBurst ? 1.3 : 1) *
        stats.allDamageMult *
        (1 + stats.skillPowerPct / 100);
      const rawCount = syn ? syn.projectileCount : (art.projectileCounts[level - 1] ?? 1);
      const hitCrit = syn !== null || isBurst || rng() < stats.critRate;
      const dmg = Math.max(1, Math.round(stats.atk * powerMult * (hitCrit ? stats.critDmg : 1)));

      if (art.style === 'staff_spin' || art.style === 'iron_cleave') {
        const radius =
          art.style === 'staff_spin'
            ? tier === 'grandmaster'
              ? 345
              : tier === 'ultimate'
                ? 265
                : 165 + level * 25
            : tier === 'grandmaster'
              ? 280
              : tier === 'ultimate'
                ? 220
                : 170;
        let hitAny = false;
        for (const e of alive) {
          if (Math.abs(e.x - HERO_X) <= radius + (art.style === 'iron_cleave' ? 220 : 0)) {
            hitAny = true;
            damageEnemy(enemies, e, dmg, syn ? 'SYN' : 'ART');
            if (e.hp > 0 && tier !== 'base') {
              e.stunTimer = Math.max(e.stunTimer, tier === 'grandmaster' ? 0.5 : 0.25);
            }
          }
        }
        if (!hitAny && alive[0]) {
          damageEnemy(enemies, alive[0], dmg, 'ART');
        }
      } else {
        const pierceCap =
          tier === 'grandmaster' ? Math.min(alive.length, 4) : tier === 'ultimate' ? 3 : 2;
        const hitsPerVolley = Math.min(alive.length, Math.max(rawCount, pierceCap));
        for (let i = 0; i < hitsPerVolley; i += 1) {
          const target = alive[i % alive.length];
          if (!target || target.hp <= 0) continue;
          const mult = i === 0 ? 1 : 0.85;
          damageEnemy(enemies, target, Math.round(dmg * mult), syn ? 'SYN' : 'ART');
          if (target.hp > 0 && art.style === 'venom_needles') {
            target.chillTimer = Math.max(target.chillTimer, 2.5);
          }
          if (
            target.hp > 0 &&
            (art.style === 'palm_wave' || art.style === 'venom_needles') &&
            !target.mutations.includes('juggernaut')
          ) {
            target.x = Math.min(ARENA_WIDTH - 55, target.x + 28);
          }
        }
      }

      if (!isMutualMirror) {
        const mutualStacks = loadout.enlightenmentCounts['enlighten_qi_surge'] ?? 0;
        if (mutualStacks > 0 && rng() < Math.min(0.75, mutualStacks * 0.25)) {
          executeWuxiaArt(enemies, artId, isBurst, true);
        }
      }
    };

    for (let waveIndex = 1; waveIndex <= totalWaves; waveIndex += 1) {
      const built = buildFloorEnemies(
        rng,
        floor,
        waveIndex,
        totalWaves,
        opts.seed,
        baseBiomeId,
        draftedIds,
        lastBossMutations,
        idGen
      );
      if (built.mutationsRolled.length > 0) {
        lastBossMutations = [...built.mutationsRolled];
        activeBossMutations = [...built.mutationsRolled];
      }
      const enemies = built.enemies;

      let floorTimerSec = 0;
      const maxWaveTimeSec = 180;

      while (heroHp > 0 && enemies.some((e) => e.hp > 0) && floorTimerSec < maxWaveTimeSec) {
        const dt = TIME_STEP_SEC;
        floorTimerSec += dt;
        totalTimeSec += dt;
        bracketStats[bracketKey].timeSec += dt;
        unhitTimer += dt;

        if (potionCooldown > 0) potionCooldown = Math.max(0, potionCooldown - dt);
        if (skillTimer > 0) skillTimer = Math.max(0, skillTimer - dt);
        if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - dt);
        if (vampiricTouchCd > 0) vampiricTouchCd = Math.max(0, vampiricTouchCd - dt);
        if (battleMomentumTimer > 0) {
          battleMomentumTimer -= dt;
          if (battleMomentumTimer <= 0) battleMomentumStacks = 0;
        }

        // Auto-potion & defensive dash AI
        const potionThreshold =
          opts.strategy === 'immortal_tank'
            ? 0.55
            : opts.strategy === 'aggressive'
              ? 0.35
              : 0.45;
        if (
          potionCharges > 0 &&
          potionCooldown <= 0 &&
          fastingFloorsLeft <= 0 &&
          heroHp / stats.maxHp <= potionThreshold
        ) {
          potionCharges -= 1;
          potionCooldown = 10;
          potionsUsed += 1;
          healHero(stats.maxHp * 0.35);
        }

        const cdMult = 1 - stats.cooldownReductionPct / 100;
        if (dashCooldown <= 0 && (opts.strategy !== 'aggressive' || heroHp < stats.maxHp * 0.7)) {
          dashCooldown = Math.max(2.0, 5 * cdMult);
          invulnHitsLeft = Math.max(invulnHitsLeft, 1);
          for (const e of enemies) {
            if (e.hp > 0 && e.x - HERO_X <= 180) {
              if (!e.mutations.includes('juggernaut')) {
                e.x = Math.min(ARENA_WIDTH - 55, e.x + 110);
              }
              e.stunTimer = Math.max(e.stunTimer, 0.6);
            }
          }
        }

        if (opts.classId === 'warrior' && opts.profile.classes.warrior.level >= 15) {
          healHero(stats.maxHp * 0.015 * dt);
        }

        // Dantian Burst (Active Skill)
        if (skillTimer <= 0) {
          skillTimer = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);
          if (loadout.actives.length === 0) {
            const taijiDmg = Math.max(
              1,
              Math.round(stats.atk * 2.1 * stats.allDamageMult * stats.critDmg)
            );
            for (const e of enemies) {
              if (e.hp > 0 && e.x - HERO_X <= 240) {
                damageEnemy(enemies, e, taijiDmg, 'TAIJI');
                if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.75);
              }
            }
          } else {
            for (const slot of loadout.actives) {
              executeWuxiaArt(enemies, slot.id, true);
            }
          }
        }

        // Passive auto-cycle Wuxia Martial Arts
        for (const slot of loadout.actives) {
          const art = getWuxiaActiveArtById(slot.id);
          if (!art) continue;
          const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
          const baseCdMs = syn ? syn.cooldownMs : (art.cooldownsMs[slot.level - 1] ?? 2600);
          const cdSec = Math.max(0.75, (baseCdMs / 1000) * cdMult);
          const curTimer = (wuxiaArtTimers[art.id] ?? 0.35) - dt;
          if (curTimer <= 0) {
            wuxiaArtTimers[art.id] = cdSec;
            executeWuxiaArt(enemies, art.id, false);
          } else {
            wuxiaArtTimers[art.id] = curTimer;
          }
        }

        // Tribulation Lightning Pillars
        const tribStacks = loadout.enlightenmentCounts['enlighten_tribulation_thunder'] ?? 0;
        if (tribStacks > 0) {
          tribulationTimer += dt;
          if (tribulationTimer >= 3.5) {
            tribulationTimer = 0;
            tribulationStrikesSurvived += 1;
            const pillarDmg = Math.max(
              1,
              Math.round(stats.atk * 2.6 * tribStacks * stats.allDamageMult)
            );
            const front = enemies.find((e) => e.hp > 0);
            if (front) {
              for (const e of enemies) {
                if (e.hp > 0 && Math.abs(e.x - front.x) <= 185) {
                  damageEnemy(enemies, e, pillarDmg, 'TRIBULATION');
                  if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.45);
                }
              }
            }
          }
        }

        // Legendary companion / meteor / volatile procs
        if (hasLeg('mage_cape_tempest')) {
          meteorTimer += dt;
          const interval = isLegCursed('mage_cape_tempest') ? 14 : 10;
          if (meteorTimer >= interval) {
            meteorTimer = 0;
            const meteorDmg = stats.atk * 2.6 * stats.allDamageMult;
            for (const e of enemies) {
              if (e.hp > 0) damageEnemy(enemies, e, meteorDmg, 'METEOR');
            }
          }
        }

        if (draftedIds.includes('cursed_volatile_soul')) {
          volatileSoulTimer += dt;
          if (volatileSoulTimer >= 5) {
            volatileSoulTimer = 0;
            heroHp = Math.max(1, heroHp * 0.98);
            const pulseDmg = stats.atk * 1.8 * stats.allDamageMult;
            for (const e of enemies) {
              if (e.hp > 0) damageEnemy(enemies, e, pulseDmg, 'PULSE');
            }
          }
        }

        if (hasLeg('mage_cape_tome')) {
          runeZapTimer += dt;
          if (runeZapTimer >= 1.2) {
            runeZapTimer = 0;
            const front = enemies.find((e) => e.hp > 0);
            if (front) damageEnemy(enemies, front, stats.atk * 0.65, 'RUNE');
          }
        }

        if (hasLeg('bow_cape_goldenfalcon')) {
          hawkTimer += dt;
          if (hawkTimer >= 1.5) {
            hawkTimer = 0;
            const front = enemies.find((e) => e.hp > 0);
            if (front) damageEnemy(enemies, front, stats.atk * 0.7, 'HAWK');
          }
        }

        if (hasLeg('bow_head_beastmaster') || draftedIds.includes('prism_bow_spectral_pack')) {
          wolfTimer += dt;
          if (wolfTimer >= (isLegCursed('bow_head_beastmaster') ? 1.5 : 1.3)) {
            wolfTimer = 0;
            const front = enemies.find((e) => e.hp > 0);
            if (front) damageEnemy(enemies, front, stats.atk * 0.85, 'WOLF');
          }
        }

        // Tick volatile bomb hazards
        for (let hi = hazards.length - 1; hi >= 0; hi -= 1) {
          const hz = hazards[hi];
          if (!hz) continue;
          hz.fuse -= dt;
          if (hz.fuse <= 0) {
            hazards.splice(hi, 1);
            if (rng() < 0.5) {
              damageHero(hz.damage, enemies.find((e) => e.hp > 0) ?? null, 'Volatile Magma');
            }
          }
        }

        // Tick each living enemy
        let frontEnemy: SimActorEnemy | null = null;
        let frontDist = Number.POSITIVE_INFINITY;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const d = e.x - HERO_X;
          if (d < frontDist) {
            frontDist = d;
            frontEnemy = e;
          }
        }
        const attackRange = Math.max(240, stats.range);
        const heroInRange = frontEnemy !== null && frontDist <= attackRange;

        for (const e of enemies) {
          if (e.hp <= 0 || heroHp <= 0) continue;

          if (e.burnTimer > 0) {
            e.burnTimer -= dt;
            if (Math.floor(e.burnTimer + dt) !== Math.floor(e.burnTimer)) {
              damageEnemy(enemies, e, stats.atk * 0.18 * e.burnStacks, 'BURN');
              if (e.hp <= 0) continue;
            }
          }
          if (e.bleedTimer > 0) {
            e.bleedTimer -= dt;
            if (Math.floor(e.bleedTimer + dt) !== Math.floor(e.bleedTimer)) {
              damageEnemy(enemies, e, stats.atk * 0.15 * e.bleedStacks, 'BLEED');
              if (e.hp <= 0) continue;
            }
          }
          if (e.chillTimer > 0) e.chillTimer = Math.max(0, e.chillTimer - dt);
          if (e.rootTimer > 0) e.rootTimer = Math.max(0, e.rootTimer - dt);
          if (e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt);
          if (e.smokeActiveTimer > 0) e.smokeActiveTimer = Math.max(0, e.smokeActiveTimer - dt);

          if (e.isBoss && e.mechanic) {
            if (e.mechanic === 'permafrost_armor') {
              e.permafrostTimer -= dt;
              if (e.permafrostTimer <= 0) {
                e.permafrostTimer = 10;
                e.hitShield = e.isMiniBoss ? 8 : 14;
              }
            } else if (e.mechanic === 'overheat_aura') {
              e.overheatTimer -= dt;
              if (e.overheatTimer <= 0) {
                e.overheatTimer = 1.6;
                damageHero(Math.round(e.atk * 0.45), e, e.name);
                if (heroHp <= 0) break;
              }
            } else if (e.mechanic === 'smoke_bomb') {
              e.smokeTimer -= dt;
              if (e.smokeTimer <= 0) {
                e.smokeTimer = 9;
                e.smokeActiveTimer = 3;
              }
            } else if (e.mechanic === 'enrage_timer') {
              e.enrageTimer -= dt;
              if (e.enrageTimer <= 0) {
                e.enrageTimer = 5;
                e.enrageStacks = Math.min(6, e.enrageStacks + 1);
              }
            }
          }

          if (e.mutations.includes('volatile')) {
            e.volatileTimer -= dt;
            if (e.volatileTimer <= 0) {
              e.volatileTimer = 4.5;
              hazards.push({ fuse: 2.0, damage: e.atk * 1.45 });
            }
          }

          const meleeDist = HERO_X + 74;
          if (e.stunTimer <= 0 && e.rootTimer <= 0 && e.x > meleeDist) {
            const slow = e.chillTimer > 0 ? 0.75 : 1;
            const approachBoost = e.x > HERO_X + 215 ? 1.55 : 1;
            e.x = Math.max(meleeDist, e.x - e.speed * approachBoost * slow * dt);
          }

          if (e.stunTimer <= 0 && (e.x <= meleeDist + 16 || (e.isBoss && heroInRange))) {
            const enrageSpeed = 1 + e.enrageStacks * 0.15;
            const chillSlow = e.chillTimer > 0 ? 0.8 : 1;
            e.atkTimer -= dt * enrageSpeed * chillSlow;
            if (e.atkTimer <= 0) {
              e.atkTimer = e.atkIntervalSec;
              damageHero(e.atk, e, e.name);
              if (heroHp <= 0) break;
            }
          }

          // Interactive Qi Flaw exposure & simulated shatter click
          if (e.flawTimer > 0) {
            e.flawTimer = Math.max(0, e.flawTimer - dt);
            if (e.flawTimer <= 0) {
              e.flawCooldown = e.isBoss ? 4.2 + rng() * 2.2 : 6.0 + rng() * 2.5;
            }
          } else if (e.isBoss || e.isMiniBoss || e.isElite || floor >= 20) {
            e.flawCooldown -= dt;
            if (e.flawCooldown <= 0) {
              e.flawTimer = 2.6;
              if (rng() < flawShatterRate) {
                qiFlawsShattered += 1;
                e.flawTimer = 0;
                e.flawCooldown = e.isBoss ? 4.8 : 6.2;
                e.hitShield = Math.max(0, e.hitShield - 3);
                e.stunTimer = Math.max(e.stunTimer, 1.4);
                skillTimer *= 0.5;
                for (const key of Object.keys(wuxiaArtTimers)) {
                  const cur = wuxiaArtTimers[key] ?? 0;
                  wuxiaArtTimers[key] = cur * 0.5;
                }
                goldCollected += 8 * floor;
                if (e.isBoss) shardsCollected += 1;
                const shatterDmg = Math.max(
                  1,
                  Math.round(stats.atk * 3.5 * stats.allDamageMult * stats.critDmg)
                );
                damageEnemy(enemies, e, shatterDmg, 'SHATTER');
              }
            }
          }
        }

        if (heroHp <= 0) break;

        // Hero basic attack
        if (frontEnemy && heroInRange && frontEnemy.hp > 0) {
          const glassBonus =
            draftedIds.includes('gold_glass_tempest') && unhitTimer >= 3 ? 0.45 : 0;
          const momentumBonus = battleMomentumStacks * 0.05;
          const effectiveSpeed = stats.attackSpeed * (1 + glassBonus + momentumBonus);
          attackTimer += dt;
          const interval = 1 / Math.max(0.3, effectiveSpeed);
          if (attackTimer >= interval) {
            attackTimer = 0;
            attackCount += 1;
            const totalShots =
              1 +
              (hasLeg('bow_wep_galeforce') ? 2 : 0) +
              (draftedIds.includes('prism_bow_split_arrow') ? 2 : 0) +
              (hasLeg('mage_wep_starlight') ? 2 : 0);
            for (let s = 0; s < totalShots; s += 1) {
              const isCrit = rng() < stats.critRate;
              const mult = s === 0 ? 1 : 0.6;
              let raw = stats.atk * mult * stats.allDamageMult;
              if (isCrit) raw *= stats.critDmg;
              else if (draftedIds.includes('cursed_reckless_gamble')) raw *= 0.5;
              const target = enemies.find((e) => e.hp > 0);
              if (!target) break;
              damageEnemy(enemies, target, raw, null);
              if (draftedIds.includes('gold_stormcaller_conduit') && isCrit) {
                for (const other of enemies) {
                  if (other.id !== target.id && other.hp > 0 && Math.abs(other.x - target.x) <= 95) {
                    damageEnemy(enemies, other, stats.atk * 1.2, 'STORM');
                  }
                }
              }
            }
            if (draftedIds.includes('silver_echo_strike') && rng() < 0.25) {
              const target = enemies.find((e) => e.hp > 0);
              if (target) {
                damageEnemy(enemies, target, stats.atk * stats.allDamageMult, 'ECHO');
              }
            }
            void attackCount;
          }
        }
      }

      if (heroHp > 0 && enemies.some((e) => e.hp > 0)) {
        // Stalemate timeout safeguard
        const survivor = enemies.find((e) => e.hp > 0) ?? null;
        outcome = 'died';
        killedBy = survivor ? `${survivor.name} (Timeout)` : 'Tribulation Stalemate';
        killFloorType = survivor ? survivor.floorType : 'mob';
        break;
      }

      if (heroHp <= 0) {
        break;
      }

      wavesCleared += 1;
    }

    if (heroHp <= 0 || outcome === 'died') {
      break;
    }

    floorsCleared = floor;

    if (opts.extractAtFloor && floor >= opts.extractAtFloor) {
      outcome = 'extracted';
      break;
    }

    if (floor >= maxFloorCap) {
      outcome = 'cleared';
      break;
    }

    // Floor clear heal & Wuxia Manual Draft
    const heal = computeFloorClearHeal(stats.maxHp, draftedIds, fastingFloorsLeft);
    if (fastingFloorsLeft > 0) fastingFloorsLeft -= 1;
    healHero(heal);

    const draftCards = rollWuxiaDraftCards(rng, draftedIds, floor, 3);
    const picked = pickWuxiaDraftOption(draftCards, draftedIds, floor, opts.strategy, rng);
    if (picked) {
      const prevLoadout = computeWuxiaLoadout(draftedIds, floor);
      draftedIds.push(picked.id);
      if (picked.kind === 'active' && artDraftedFloor[picked.id] === undefined) {
        artDraftedFloor[picked.id] = floor;
      }
      const nextLoadout = computeWuxiaLoadout(draftedIds, floor);
      for (const synId of nextLoadout.awakenedSynergies) {
        if (!prevLoadout.awakenedSynergies.includes(synId)) {
          if (firstSynergyFloor === null) firstSynergyFloor = floor;
          if (synergyAwakenedFloors[synId] === undefined) {
            synergyAwakenedFloors[synId] = floor;
          }
        }
      }
    }
  }

  // Compute server-equivalent banking & drops for campaign tracking + telemetry
  const finalLoadout = computeWuxiaLoadout(draftedIds, floorReached);
  const clearedForRewards = outcome === 'died' ? Math.max(0, floorReached - 1) : floorReached;
  const cultDefeated = Math.floor(clearedForRewards / 10);
  const coresEarned = coresCollected + Math.max(outcome === 'cleared' ? 1 : 0, cultDefeated);
  const shardsEarned = shardsCollected;
  const goldEarned = goldCollected;

  const dropSeed = hashString(`${opts.batchId}:${opts.runIndex}:${floorReached}`);
  const dropRng = mulberry32(dropSeed);
  const dropLegNames: string[] = [];
  for (let b = 1; b <= Math.floor(clearedForRewards / 10); b += 1) {
    const bossFloor = Math.max(10, b * 10);
    const leg = createLegendaryGearItem(dropRng, opts.classId, dropRng() >= 0.65, `b${bossFloor}`, bossFloor);
    dropLegNames.push(leg.name);
  }
  for (let f = 6; f <= clearedForRewards; f += 1) {
    if (
      !isCultLeaderFloor(f) &&
      (isRandomMiniBossFloor(f, opts.seed) || (f >= 25 && f % 10 === 5)) &&
      dropRng() < 0.35
    ) {
      const leg = createLegendaryGearItem(dropRng, opts.classId, dropRng() >= 0.65, `mb${f}`, f);
      dropLegNames.push(leg.name);
    }
  }

  let enlightenmentPicks = 0;
  for (const scroll of WUXIA_ENLIGHTENMENT_SCROLLS) {
    enlightenmentPicks += finalLoadout.enlightenmentCounts[scroll.id] ?? 0;
  }

  const activeArtsFinal: SimulatedArtSummary[] = finalLoadout.actives.map((slot) => ({
    id: slot.id,
    name: getWuxiaActiveArtById(slot.id)?.name ?? slot.id,
    level: slot.level,
  }));

  const innerQiFinal: SimulatedArtSummary[] = finalLoadout.innerQis.map((slot) => {
    const entry = WUXIA_INNER_QI.find((q) => q.id === slot.id);
    return {
      id: slot.id,
      name: entry?.name ?? slot.id,
      level: slot.level,
    };
  });

  const equippedLegendaries: string[] = [];
  for (const slot of GEAR_SLOTS) {
    const eq = opts.profile.classes[opts.classId].equipped[slot];
    if (eq && eq.legendaryId) {
      equippedLegendaries.push(eq.name);
    }
  }

  const bracketDps = createEmptyBracketRecord();
  const bracketDamageTaken = createEmptyBracketRecord();
  const keys: readonly FloorBracketKey[] = ['F1-10', 'F11-20', 'F21-30', 'F31+'];
  for (const k of keys) {
    const b = bracketStats[k];
    bracketDps[k] = b.timeSec > 0 ? Math.round(b.damageDealt / b.timeSec) : 0;
    bracketDamageTaken[k] = Math.round(b.damageTaken);
  }

  return {
    batchId: opts.batchId,
    runIndex: opts.runIndex,
    timestampIso: new Date().toISOString(),
    seed: opts.seed,
    mode: opts.mode,
    strategy: opts.strategy,
    classId: opts.classId,
    startLevel,
    endLevel: startLevel,
    floorReached,
    floorsCleared,
    outcome,
    killedBy,
    killFloorType,
    activeBossMutations,
    durationSec: Number(totalTimeSec.toFixed(1)),
    wavesCleared,
    elitesKilled,
    miniBossesKilled,
    cultLeadersKilled,
    qiFlawsShattered,
    tribulationStrikesSurvived,
    potionsUsed,
    draftedIds,
    activeArtsFinal,
    innerQiFinal,
    awakenedSynergies: [...finalLoadout.awakenedSynergies],
    enlightenmentPicks,
    firstSynergyFloor,
    synergyAwakenedFloors,
    goldEarned,
    shardsEarned,
    coresEarned,
    legendaryDrops: dropLegNames,
    equippedLegendaries,
    gearPowerScore: computeGearPowerScore(opts.profile, opts.classId),
    bracketDps,
    bracketDamageTaken,
  };
};

export const applyPostRunProgression = (
  profile: PlayerProfile,
  record: SimulatedRunRecord
): { updatedProfile: PlayerProfile; updatedRecord: SimulatedRunRecord } => {
  const dropSeed = hashString(`${record.batchId}:${record.runIndex}:progression:${record.seed}`);
  const rng = mulberry32(dropSeed);
  const clearedFloors =
    record.outcome === 'died' ? Math.max(0, record.floorReached - 1) : record.floorReached;
  const cultLeadersDefeated = Math.floor(clearedFloors / 10);

  const expBase =
    record.floorReached * 42 +
    cultLeadersDefeated * 90 +
    (record.outcome === 'cleared' ? 120 : record.outcome === 'extracted' ? 50 : 15);
  const expResult = awardClassExp(profile.classes[record.classId], expBase);

  const rawDrops: GearItem[] = [];
  for (let f = 2; f <= clearedFloors; f += 1) {
    if (rawDrops.length >= 24) break;
    const slot = GEAR_SLOTS[Math.floor(rng() * GEAR_SLOTS.length)] ?? 'weapon';
    if (isCultLeaderFloor(f) || isRandomMiniBossFloor(f, record.seed)) {
      rawDrops.push(createGearItem(rng, record.classId, slot, 'rare', f, `sim_${record.runIndex}_f${f}`));
    } else if (rng() < 0.45) {
      rawDrops.push(createGearItem(rng, record.classId, slot, 'normal', f, `sim_${record.runIndex}_f${f}`));
    }
  }

  for (let b = 1; b <= cultLeadersDefeated; b += 1) {
    const bossFloor = Math.max(10, b * 10);
    rawDrops.push(
      createLegendaryGearItem(rng, record.classId, rng() >= 0.65, `sim_${record.runIndex}_b${bossFloor}`, bossFloor)
    );
  }
  for (let f = 6; f <= clearedFloors; f += 1) {
    if (
      !isCultLeaderFloor(f) &&
      (isRandomMiniBossFloor(f, record.seed) || (f >= 25 && f % 10 === 5)) &&
      rng() < 0.35
    ) {
      rawDrops.push(
        createLegendaryGearItem(rng, record.classId, rng() >= 0.65, `sim_${record.runIndex}_mb${f}`, f)
      );
    }
  }

  let nextCls = expResult.updated;
  const equippedCopy = { ...nextCls.equipped };
  let gold = profile.gold + record.goldEarned;
  let shards = profile.shards + record.shardsEarned;
  let bossCores = profile.bossCores + record.coresEarned;
  const surplusDrops: GearItem[] = [];

  for (const drop of rawDrops) {
    const current = equippedCopy[drop.slot];
    if (!current || scoreSingleGearItem(drop) > scoreSingleGearItem(current)) {
      if (current && !current.id.startsWith('starter_wep_')) {
        shards += getDismantleShardValue(current);
      }
      equippedCopy[drop.slot] = drop;
    } else {
      surplusDrops.push(drop);
    }
  }

  for (const surplus of surplusDrops) {
    shards += getDismantleShardValue(surplus);
  }

  const slotLevels = { ...nextCls.slotLevels };
  // Camp blacksmith auto-upgrades evenly across slots, favoring weapon slightly
  let upgraded = true;
  let slotLoops = 0;
  while (upgraded && slotLoops < 20) {
    upgraded = false;
    slotLoops += 1;
    let lowestSlot: GearSlot = 'weapon';
    let lowestVal = slotLevels.weapon;
    for (const s of GEAR_SLOTS) {
      const effectiveLevel = s === 'weapon' ? slotLevels[s] - 1 : slotLevels[s];
      if (effectiveLevel < lowestVal) {
        lowestVal = effectiveLevel;
        lowestSlot = s;
      }
    }
    const cost = getSlotUpgradeCost(slotLevels[lowestSlot]);
    if (shards >= cost.shards && gold >= cost.gold && slotLevels[lowestSlot] < 50) {
      shards -= cost.shards;
      gold -= cost.gold;
      slotLevels[lowestSlot] += 1;
      upgraded = true;
    }
  }

  // Upgrade Legion Board with Boss Cores
  const legion = { ...profile.legion };
  const legionKeys: readonly LegionStatKey[] = ['atk', 'hp', 'critDmg', 'gold'];
  let legUpgraded = true;
  let legLoops = 0;
  while (legUpgraded && legLoops < 15) {
    legUpgraded = false;
    legLoops += 1;
    let bestKey: LegionStatKey = 'atk';
    let lowestLv = Number.POSITIVE_INFINITY;
    for (const key of legionKeys) {
      if (legion[key] < lowestLv) {
        lowestLv = legion[key];
        bestKey = key;
      }
    }
    const cost = getLegionUpgradeCost(legion[bestKey]);
    if (bossCores >= cost) {
      bossCores -= cost;
      legion[bestKey] += 1;
      legUpgraded = true;
    }
  }

  nextCls = {
    ...nextCls,
    equipped: equippedCopy,
    slotLevels,
  };

  const updatedProfile: PlayerProfile = {
    ...profile,
    gold,
    shards,
    bossCores,
    legion,
    classes: {
      ...profile.classes,
      [record.classId]: nextCls,
    },
    inventory: surplusDrops.slice(0, 20),
  };

  const updatedEquippedLegendaries: string[] = [];
  for (const slot of GEAR_SLOTS) {
    const eq = nextCls.equipped[slot];
    if (eq && eq.legendaryId) {
      updatedEquippedLegendaries.push(eq.name);
    }
  }

  const updatedRecord: SimulatedRunRecord = {
    ...record,
    endLevel: nextCls.level,
    equippedLegendaries: updatedEquippedLegendaries,
    gearPowerScore: computeGearPowerScore(updatedProfile, record.classId),
  };

  return { updatedProfile, updatedRecord };
};

const computePercentile = (sortedAsc: readonly number[], p: number): number => {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const loVal = sortedAsc[lo] ?? 0;
  const hiVal = sortedAsc[hi] ?? loVal;
  return Number((loVal + (hiVal - loVal) * (pos - lo)).toFixed(1));
};

export const simulateBatch = (config: SimConfig): SimulatedBatchResult => {
  const runsCount = Math.max(1, Math.floor(config.runs));
  const batchId = config.batchId ?? `batch_${config.mode}_${config.strategy}_${config.baseSeed}`;
  let profile = createInitialProfile(`sim_${config.strategy}`);
  const records: SimulatedRunRecord[] = [];

  for (let i = 0; i < runsCount; i += 1) {
    if (config.mode === 'benchmark') {
      profile = createInitialProfile(`sim_${config.strategy}`);
    }
    const classId: ClassId =
      config.classId ?? CLASS_IDS[i % CLASS_IDS.length] ?? 'warrior';
    const seed = hashString(`${config.baseSeed}:${i}:${classId}:${config.strategy}`);
    const rawRecord = simulateSingleRun({
      profile,
      classId,
      strategy: config.strategy,
      seed,
      runIndex: i + 1,
      batchId,
      mode: config.mode,
      maxFloorCap: config.maxFloorCap,
      flawShatterRate: config.flawShatterRate,
      extractAtFloor: config.extractAtFloor,
    });

    if (config.mode === 'campaign') {
      const progressed = applyPostRunProgression(profile, rawRecord);
      profile = progressed.updatedProfile;
      records.push(progressed.updatedRecord);
    } else {
      records.push(rawRecord);
    }
  }

  const summary = evaluateSimulationBatch(records, {
    batchId,
    runs: runsCount,
    mode: config.mode,
    strategy: config.strategy,
    baseSeed: config.baseSeed,
    maxFloorCap: config.maxFloorCap ?? 80,
  });

  return { runs: records, finalProfile: profile, summary };
};

export const evaluateSimulationBatch = (
  records: readonly SimulatedRunRecord[],
  meta?: {
    batchId?: string;
    runs?: number;
    mode?: SimMode;
    strategy?: SimStrategy;
    baseSeed?: number;
    maxFloorCap?: number;
  }
): SimulationEvaluationSummary => {
  const n = records.length;
  const sortedFloors = records.map((r) => r.floorReached).sort((a, b) => a - b);
  const sumFloor = records.reduce((acc, r) => acc + r.floorReached, 0);
  const sumDur = records.reduce((acc, r) => acc + r.durationSec, 0);
  const sumFlaws = records.reduce((acc, r) => acc + r.qiFlawsShattered, 0);
  const sumEnlighten = records.reduce((acc, r) => acc + r.enlightenmentPicks, 0);

  const countWhere = (pred: (r: SimulatedRunRecord) => boolean): number =>
    records.reduce((acc, r) => acc + (pred(r) ? 1 : 0), 0);
  const pct = (count: number, denom: number): number =>
    denom > 0 ? Number(((count / denom) * 100).toFixed(1)) : 0;
  const avg = (total: number, denom: number): number =>
    denom > 0 ? Number((total / denom).toFixed(1)) : 0;

  // Lethality breakdown
  const deaths = records.filter((r) => r.outcome === 'died');
  const totalDeaths = deaths.length;
  const floorTypeKeys: readonly KillFloorType[] = [
    'cult_leader',
    'miniboss',
    'mount_hua_summit',
    'elite',
    'mob',
  ];
  const byFloorType: LethalityBreakdownEntry[] = floorTypeKeys.map((key) => {
    const count = deaths.filter((d) => d.killFloorType === key).length;
    return { key, deaths: count, pct: pct(count, totalDeaths) };
  });

  const byBracket: Record<FloorBracketKey, { deaths: number; pct: number }> = {
    'F1-10': { deaths: 0, pct: 0 },
    'F11-20': { deaths: 0, pct: 0 },
    'F21-30': { deaths: 0, pct: 0 },
    'F31+': { deaths: 0, pct: 0 },
  };
  const enemyDeathMap = new Map<string, number>();
  const mutDeathMap = new Map<MutationId, number>();

  for (const d of deaths) {
    const bk = toFloorBracket(d.floorReached);
    byBracket[bk].deaths += 1;
    const enemyName = d.killedBy ?? 'Unknown Cultist';
    enemyDeathMap.set(enemyName, (enemyDeathMap.get(enemyName) ?? 0) + 1);
    if (
      d.killFloorType === 'cult_leader' ||
      d.killFloorType === 'miniboss' ||
      d.killFloorType === 'mount_hua_summit'
    ) {
      for (const m of d.activeBossMutations) {
        mutDeathMap.set(m, (mutDeathMap.get(m) ?? 0) + 1);
      }
    }
  }
  const bracketKeys: readonly FloorBracketKey[] = ['F1-10', 'F11-20', 'F21-30', 'F31+'];
  for (const bk of bracketKeys) {
    byBracket[bk].pct = pct(byBracket[bk].deaths, totalDeaths);
  }

  const deadliestEnemies: DeadliestEnemyEntry[] = [...enemyDeathMap.entries()]
    .map(([name, count]) => ({ name, deaths: count, pct: pct(count, totalDeaths) }))
    .sort((a, b) => b.deaths - a.deaths)
    .slice(0, 8);

  const deadlyMutations = [...mutDeathMap.entries()]
    .map(([id, count]) => ({ id, deaths: count, pct: pct(count, totalDeaths) }))
    .sort((a, b) => b.deaths - a.deaths);

  // Class performance
  const classPerformance: ClassPerformanceEntry[] = CLASS_IDS.map((cid) => {
    const clsRuns = records.filter((r) => r.classId === cid);
    const floors = clsRuns.map((r) => r.floorReached).sort((a, b) => a - b);
    const f21Runs = clsRuns.filter((r) => r.bracketDps['F21-30'] > 0);
    const f21DpsSum = f21Runs.reduce((acc, r) => acc + r.bracketDps['F21-30'], 0);
    return {
      classId: cid,
      className: getClassDefinition(cid).name,
      runs: clsRuns.length,
      avgFloor: avg(
        clsRuns.reduce((acc, r) => acc + r.floorReached, 0),
        clsRuns.length
      ),
      medianFloor: computePercentile(floors, 0.5),
      maxFloor: floors[floors.length - 1] ?? 0,
      f10ClearRatePct: pct(
        clsRuns.filter((r) => r.floorsCleared >= 10).length,
        clsRuns.length
      ),
      f20ReachRatePct: pct(
        clsRuns.filter((r) => r.floorReached >= 20).length,
        clsRuns.length
      ),
      f30ReachRatePct: pct(
        clsRuns.filter((r) => r.floorReached >= 30).length,
        clsRuns.length
      ),
      avgF21Dps: f21Runs.length > 0 ? Math.round(f21DpsSum / f21Runs.length) : 0,
    };
  });

  // Wuxia manual telemetry
  const activeArts: ActiveArtTelemetryEntry[] = WUXIA_ACTIVE_ARTS.map((art) => {
    const picked = records.filter((r) => r.activeArtsFinal.some((a) => a.id === art.id));
    const lvSum = picked.reduce((acc, r) => {
      const entry = r.activeArtsFinal.find((a) => a.id === art.id);
      return acc + (entry ? entry.level : 0);
    }, 0);
    const floorSum = picked.reduce((acc, r) => acc + r.floorReached, 0);
    return {
      id: art.id,
      name: art.name,
      pickCount: picked.length,
      pickRatePct: pct(picked.length, n),
      avgFinalLevel: picked.length > 0 ? Number((lvSum / picked.length).toFixed(2)) : 0,
      avgFloorWhenDrafted: avg(floorSum, picked.length),
    };
  }).sort((a, b) => b.pickCount - a.pickCount);

  const secretSynergies: SecretSynergyTelemetryEntry[] = WUXIA_SECRET_SYNERGIES.map((syn) => {
    const awakened = records.filter((r) => r.awakenedSynergies.includes(syn.id));
    const awakenFloors = awakened
      .map((r) => r.synergyAwakenedFloors[syn.id] ?? r.firstSynergyFloor)
      .filter((v): v is number => v !== null && v !== undefined);
    const floorReachedSum = awakened.reduce((acc, r) => acc + r.floorReached, 0);
    return {
      id: syn.id,
      name: syn.name,
      awakenedCount: awakened.length,
      awakenedRatePct: pct(awakened.length, n),
      avgFloorAwakened:
        awakenFloors.length > 0
          ? avg(
              awakenFloors.reduce((a, b) => a + b, 0),
              awakenFloors.length
            )
          : null,
      avgFloorReachedWhenAwakened:
        awakened.length > 0 ? avg(floorReachedSum, awakened.length) : null,
    };
  }).sort((a, b) => b.awakenedCount - a.awakenedCount);

  const innerQi: InnerQiTelemetryEntry[] = WUXIA_INNER_QI.map((qi) => {
    const picked = records.filter((r) => r.innerQiFinal.some((q) => q.id === qi.id));
    const lvSum = picked.reduce((acc, r) => {
      const entry = r.innerQiFinal.find((q) => q.id === qi.id);
      return acc + (entry ? entry.level : 0);
    }, 0);
    return {
      id: qi.id,
      name: qi.name,
      pickCount: picked.length,
      pickRatePct: pct(picked.length, n),
      avgFinalLevel: picked.length > 0 ? Number((lvSum / picked.length).toFixed(2)) : 0,
    };
  }).sort((a, b) => b.pickCount - a.pickCount);

  const withSynergy = records.filter((r) => r.awakenedSynergies.length > 0);
  const firstSynFloors = withSynergy
    .map((r) => r.firstSynergyFloor)
    .filter((f): f is number => f !== null);

  // Economy & progression
  const totalGold = records.reduce((acc, r) => acc + r.goldEarned, 0);
  const totalShards = records.reduce((acc, r) => acc + r.shardsEarned, 0);
  const totalCores = records.reduce((acc, r) => acc + r.coresEarned, 0);
  const totalLegs = records.reduce((acc, r) => acc + r.legendaryDrops.length, 0);

  const legEquipCounts = new Map<string, number>();
  for (const r of records) {
    for (const name of r.equippedLegendaries) {
      legEquipCounts.set(name, (legEquipCounts.get(name) ?? 0) + 1);
    }
  }
  const topEquippedLegendaries = [...legEquipCounts.entries()]
    .map(([name, equippedCount]) => ({ name, equippedCount }))
    .sort((a, b) => b.equippedCount - a.equippedCount)
    .slice(0, 6);

  const sliceSize = Math.max(1, Math.floor(n * 0.2));
  const earlyRuns = records.slice(0, sliceSize);
  const lateRuns = records.slice(Math.max(0, n - sliceSize));

  // Balance health checks
  const f10ClearRatePct = pct(countWhere((r) => r.floorsCleared >= 10), n);
  const f13WipeRatePct = pct(
    countWhere((r) => r.outcome === 'died' && r.floorReached <= 3),
    n
  );
  const f30ReachRatePct = pct(countWhere((r) => r.floorReached >= 30), n);
  const f40ReachRatePct = pct(countWhere((r) => r.floorReached >= 40), n);
  const anySynergyRatePct = pct(withSynergy.length, n);
  const f10ReachRuns = records.filter((r) => r.floorReached >= 10);
  const f10SynRatePct = pct(
    f10ReachRuns.filter((r) => r.awakenedSynergies.length > 0).length,
    f10ReachRuns.length
  );

  const activeClassAvgs = classPerformance.filter((c) => c.runs > 0).map((c) => c.avgFloor);
  const classSpread =
    activeClassAvgs.length >= 2
      ? Number((Math.max(...activeClassAvgs) - Math.min(...activeClassAvgs)).toFixed(1))
      : 0;

  const healthChecks: BalanceHealthCheck[] = [
    {
      check: 'Early Floor 1–3 Wipe Rate',
      status: f13WipeRatePct <= 15 ? 'PASS' : 'WARN',
      detail: `${f13WipeRatePct}% died on F1–3 (target <= 15%).`,
    },
    {
      check: 'F10 Cult Leader Clear Rate',
      status: f10ClearRatePct >= 20 ? 'PASS' : 'WARN',
      detail: `${f10ClearRatePct}% cleared Floor 10+ across batch (target >= 20%).`,
    },
    {
      check: 'Secret Synergy Awakening Rate (F10+ Runs)',
      status: f10ReachRuns.length === 0 || f10SynRatePct >= 25 ? 'PASS' : 'WARN',
      detail:
        f10ReachRuns.length > 0
          ? `${f10SynRatePct}% of F10+ runs awakened at least 1 Secret Synergy (target >= 25%).`
          : 'No runs reached F10 in this sample.',
    },
    {
      check: 'High-Realm Endless Scaling (F30+ -> F40+)',
      status:
        f30ReachRatePct === 0 || f40ReachRatePct < f30ReachRatePct * 0.9 ? 'PASS' : 'WARN',
      detail: `F30 reach ${f30ReachRatePct}% -> F40 reach ${f40ReachRatePct}% (ensures F31+ scaling still applies pressure).`,
    },
    {
      check: 'Class Balance Spread',
      status: activeClassAvgs.length < 2 || classSpread <= 10 ? 'PASS' : 'WARN',
      detail:
        activeClassAvgs.length >= 2
          ? `Avg floor spread across styles is ${classSpread} floors (target <= 10).`
          : 'Single-class batch.',
    },
  ];

  const first = records[0];
  return {
    batchId: meta?.batchId ?? first?.batchId ?? 'unknown_batch',
    generatedAtIso: new Date().toISOString(),
    config: {
      runs: meta?.runs ?? n,
      mode: meta?.mode ?? first?.mode ?? 'campaign',
      strategy: meta?.strategy ?? first?.strategy ?? 'synergy_hunter',
      baseSeed: meta?.baseSeed ?? first?.seed ?? 1,
      maxFloorCap: meta?.maxFloorCap ?? 80,
    },
    overview: {
      totalRuns: n,
      avgFloor: avg(sumFloor, n),
      minFloor: sortedFloors[0] ?? 0,
      p25Floor: computePercentile(sortedFloors, 0.25),
      medianFloor: computePercentile(sortedFloors, 0.5),
      p75Floor: computePercentile(sortedFloors, 0.75),
      p90Floor: computePercentile(sortedFloors, 0.9),
      maxFloor: sortedFloors[sortedFloors.length - 1] ?? 0,
      f10ClearRatePct,
      f20ReachRatePct: pct(countWhere((r) => r.floorReached >= 20), n),
      f30ReachRatePct,
      f40ReachRatePct,
      clearRatePct: pct(countWhere((r) => r.outcome === 'cleared'), n),
      avgDurationSec: avg(sumDur, n),
      avgQiFlawsShattered: avg(sumFlaws, n),
      avgEnlightenmentPicks: avg(sumEnlighten, n),
    },
    lethality: {
      totalDeaths,
      byFloorType,
      byBracket,
      deadliestEnemies,
      deadlyMutations,
    },
    classPerformance,
    wuxiaTelemetry: {
      activeArts,
      secretSynergies,
      innerQi,
      avgFirstSynergyFloor:
        firstSynFloors.length > 0
          ? avg(
              firstSynFloors.reduce((a, b) => a + b, 0),
              firstSynFloors.length
            )
          : null,
      anySynergyRatePct,
    },
    economyAndProgression: {
      avgGoldEarned: Math.round(totalGold / Math.max(1, n)),
      avgShardsEarned: avg(totalShards, n),
      avgCoresEarned: avg(totalCores, n),
      avgLegendariesDropped: Number((totalLegs / Math.max(1, n)).toFixed(2)),
      topEquippedLegendaries,
      earlyVsLateCurve: {
        earlyRunsCount: earlyRuns.length,
        lateRunsCount: lateRuns.length,
        earlyAvgLevel: avg(
          earlyRuns.reduce((a, r) => a + r.endLevel, 0),
          earlyRuns.length
        ),
        lateAvgLevel: avg(
          lateRuns.reduce((a, r) => a + r.endLevel, 0),
          lateRuns.length
        ),
        earlyAvgGearPower: Math.round(
          earlyRuns.reduce((a, r) => a + r.gearPowerScore, 0) / Math.max(1, earlyRuns.length)
        ),
        lateAvgGearPower: Math.round(
          lateRuns.reduce((a, r) => a + r.gearPowerScore, 0) / Math.max(1, lateRuns.length)
        ),
        earlyAvgFloor: avg(
          earlyRuns.reduce((a, r) => a + r.floorReached, 0),
          earlyRuns.length
        ),
        lateAvgFloor: avg(
          lateRuns.reduce((a, r) => a + r.floorReached, 0),
          lateRuns.length
        ),
      },
    },
    healthChecks,
  };
};

const renderBar = (pctVal: number): string => {
  const filled = Math.max(0, Math.min(10, Math.round(pctVal / 10)));
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
};

export const formatEvaluationMarkdown = (summary: SimulationEvaluationSummary): string => {
  const o = summary.overview;
  const lines: string[] = [
    `# Wuxia Spire Simulation Evaluation Report`,
    ``,
    `- **Batch ID**: \`${summary.batchId}\``,
    `- **Generated**: ${summary.generatedAtIso}`,
    `- **Config**: ${summary.config.runs} runs | Mode: \`${summary.config.mode}\` | Strategy: \`${summary.config.strategy}\` | Cap: Floor ${summary.config.maxFloorCap} | Seed: \`${summary.config.baseSeed}\``,
    ``,
    `## 1. Survival Funnel & Floor Distribution`,
    ``,
    `| Metric | Value |`,
    `| :--- | ---: |`,
    `| Total Runs | ${o.totalRuns} |`,
    `| Avg / Median Floor | ${o.avgFloor} / ${o.medianFloor} |`,
    `| Percentiles (P25 / P75 / P90) | F${o.p25Floor} / F${o.p75Floor} / F${o.p90Floor} |`,
    `| Min / Max Floor | F${o.minFloor} / F${o.maxFloor} |`,
    `| F10 Cult Leader Clear Rate | ${renderBar(o.f10ClearRatePct)} **${o.f10ClearRatePct}%** |`,
    `| F20+ Reach Rate | ${renderBar(o.f20ReachRatePct)} **${o.f20ReachRatePct}%** |`,
    `| F30+ Reach Rate | ${renderBar(o.f30ReachRatePct)} **${o.f30ReachRatePct}%** |`,
    `| F40+ Reach Rate | ${renderBar(o.f40ReachRatePct)} **${o.f40ReachRatePct}%** |`,
    `| Full Cap Clears (F${summary.config.maxFloorCap}) | ${o.clearRatePct}% |`,
    `| Avg Sim Combat Duration | ${o.avgDurationSec}s |`,
    `| Avg Qi Flaws Shattered / Run | ${o.avgQiFlawsShattered} |`,
    `| Avg Enlightenment Scrolls / Run | ${o.avgEnlightenmentPicks} |`,
    ``,
    `## 2. Automated Balance Health Checks`,
    ``,
    `| Status | Check | Detail |`,
    `| :---: | :--- | :--- |`,
    ...summary.healthChecks.map(
      (hc) => `| ${hc.status === 'PASS' ? 'PASS' : 'WARN'} | ${hc.check} | ${hc.detail} |`
    ),
    ``,
    `## 3. Lethality & Bottleneck Analysis (${summary.lethality.totalDeaths} Deaths)`,
    ``,
    `### By Floor Bracket`,
    `| Bracket | Deaths | Share |`,
    `| :--- | ---: | ---: |`,
    `FD_F1-10`,
    `FD_F11-20`,
    `FD_F21-30`,
    `FD_F31+`,
    ``,
    `### By Encounter Type`,
    `| Encounter Type | Deaths | Share |`,
    `| :--- | ---: | ---: |`,
    ...summary.lethality.byFloorType.map(
      (entry) => `| \`${entry.key}\` | ${entry.deaths} | ${entry.pct}% |`
    ),
    ``,
    `### Deadliest Enemies / Cult Leaders`,
    `| Enemy / Boss | Deaths | Share |`,
    `| :--- | ---: | ---: |`,
    ...(summary.lethality.deadliestEnemies.length > 0
      ? summary.lethality.deadliestEnemies.map(
          (e) => `| ${e.name} | ${e.deaths} | ${e.pct}% |`
        )
      : [`| *(No deaths recorded)* | 0 | 0% |`]),
    ``,
    `## 4. Fighting Style Performance`,
    ``,
    `| Style | Runs | Avg Floor | Median | Max | F10 Clear | F20+ | F30+ | Avg F21-30 DPS |`,
    `| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...summary.classPerformance.map(
      (c) =>
        `| ${c.className} (\`${c.classId}\`) | ${c.runs} | F${c.avgFloor} | F${c.medianFloor} | F${c.maxFloor} | ${c.f10ClearRatePct}% | ${c.f20ReachRatePct}% | ${c.f30ReachRatePct}% | ${c.avgF21Dps.toLocaleString()} |`
    ),
    ``,
    `## 5. Wuxia Martial Arts & Secret Synergy Telemetry`,
    ``,
    `- **Any Secret Synergy Awakened**: ${summary.wuxiaTelemetry.anySynergyRatePct}% of runs`,
    `- **Avg Floor of First Awakening**: ${summary.wuxiaTelemetry.avgFirstSynergyFloor !== null ? `F${summary.wuxiaTelemetry.avgFirstSynergyFloor}` : 'N/A'}`,
    ``,
    `### Secret Synergies`,
    `| Secret Synergy | Awakened | Rate | Avg Floor Awakened | Avg Final Floor |`,
    `| :--- | ---: | ---: | ---: | ---: |`,
    ...summary.wuxiaTelemetry.secretSynergies.map(
      (s) =>
        `| ${s.name} | ${s.awakenedCount} | ${s.awakenedRatePct}% | ${s.avgFloorAwakened !== null ? `F${s.avgFloorAwakened}` : '—'} | ${s.avgFloorReachedWhenAwakened !== null ? `F${s.avgFloorReachedWhenAwakened}` : '—'} |`
    ),
    ``,
    `### Active Martial Arts Pick Rates`,
    `| Active Art | Picks | Pick Rate | Avg Final Level | Avg Final Floor |`,
    `| :--- | ---: | ---: | ---: | ---: |`,
    ...summary.wuxiaTelemetry.activeArts.map(
      (a) =>
        `| ${a.name} | ${a.pickCount} | ${a.pickRatePct}% | Lv.${a.avgFinalLevel} | F${a.avgFloorWhenDrafted} |`
    ),
    ``,
    `## 6. Economy, Legendaries & Meta-Progression Curve`,
    ``,
    `- **Avg Banked / Run**: ${summary.economyAndProgression.avgGoldEarned.toLocaleString()} Taels | ${summary.economyAndProgression.avgShardsEarned} Shards | ${summary.economyAndProgression.avgCoresEarned} Boss Cores | ${summary.economyAndProgression.avgLegendariesDropped} Legendaries`,
    `- **Early 20% (${summary.economyAndProgression.earlyVsLateCurve.earlyRunsCount} runs)**: Avg Lv.${summary.economyAndProgression.earlyVsLateCurve.earlyAvgLevel} | Gear Power ${summary.economyAndProgression.earlyVsLateCurve.earlyAvgGearPower} | Avg Floor F${summary.economyAndProgression.earlyVsLateCurve.earlyAvgFloor}`,
    `- **Late 20% (${summary.economyAndProgression.earlyVsLateCurve.lateRunsCount} runs)**: Avg Lv.${summary.economyAndProgression.earlyVsLateCurve.lateAvgLevel} | Gear Power ${summary.economyAndProgression.earlyVsLateCurve.lateAvgGearPower} | Avg Floor F${summary.economyAndProgression.earlyVsLateCurve.lateAvgFloor}`,
  ];

  if (summary.economyAndProgression.topEquippedLegendaries.length > 0) {
    lines.push(
      ``,
      `### Top Equipped Jin Yong Legendaries`,
      `| Legendary Item | Runs Equipped |`,
      `| :--- | ---: |`,
      ...summary.economyAndProgression.topEquippedLegendaries.map(
        (l) => `| ${l.name} | ${l.equippedCount} |`
      )
    );
  }

  return lines
    .join('\n')
    .replace(
      'FD_F1-10',
      `| F1-10 | ${summary.lethality.byBracket['F1-10'].deaths} | ${summary.lethality.byBracket['F1-10'].pct}% |`
    )
    .replace(
      'FD_F11-20',
      `| F11-20 | ${summary.lethality.byBracket['F11-20'].deaths} | ${summary.lethality.byBracket['F11-20'].pct}% |`
    )
    .replace(
      'FD_F21-30',
      `| F21-30 | ${summary.lethality.byBracket['F21-30'].deaths} | ${summary.lethality.byBracket['F21-30'].pct}% |`
    )
    .replace(
      'FD_F31+',
      `| F31+ | ${summary.lethality.byBracket['F31+'].deaths} | ${summary.lethality.byBracket['F31+'].pct}% |`
    );
};
