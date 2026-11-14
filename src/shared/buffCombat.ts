import type { ComputedHeroStats } from './types.ts';

export type SimEnemy = {
  id: number;
  x: number;
  hp: number;
  maxHp: number;
  speed: number;
  atk: number;
  isBoss: boolean;
  isMiniBoss: boolean;
  chillTimer: number;
  bleedTimer: number;
  bleedStacks: number;
  burnTimer: number;
  poisonTimer: number;
  poisonStacks: number;
  armorShred: number;
  marks: number;
};

export type HeroHitInput = {
  targetId: number;
  enemies: readonly SimEnemy[];
  stats: ComputedHeroStats;
  draftedBuffIds: readonly string[];
  heroHp: number;
  heroX: number;
  unhitTimer: number;
  vampiricTouchCd: number;
  runGold: number;
  forceCrit?: boolean;
  baseDamageMult?: number;
  applyOnHit?: boolean;
};

export type HeroHitResult = {
  enemies: SimEnemy[];
  killedIds: number[];
  damageDealt: number;
  wasCrit: boolean;
  heroHeal: number;
  newVampiricTouchCd: number;
  runGoldDelta: number;
  cleaveHits: number;
  stormcallerHits: number;
};

export type AttackProcsInput = {
  attackCount: number;
  targetId: number;
  enemies: readonly SimEnemy[];
  stats: ComputedHeroStats;
  draftedBuffIds: readonly string[];
  weaponSocket?: string;
  forceEcho?: boolean;
  forceSplitArrow?: boolean;
  forceShadowPartner?: boolean;
  forceSnipersMark?: boolean;
  roll?: () => number;
};

export type AttackProcsResult = {
  enemies: SimEnemy[];
  killedIds: number[];
  staticChainHits: number;
  echoTriggered: boolean;
  bonusProjectiles: number;
  triElementalEffects: string[];
  shadowPartnerTriggered: boolean;
  snipersMarkApplied: boolean;
  snipersMarkTriggered: boolean;
};

export type DotTickResult = {
  enemy: SimEnemy;
  burnDamage: number;
  bleedDamage: number;
  poisonDamage: number;
  killed: boolean;
};

export type EnemyHitHeroResult = {
  attacker: SimEnemy;
  reflectedDamage: number;
  killed: boolean;
};

export type HealWithShieldResult = {
  heroHp: number;
  heroShield: number;
  healed: number;
  shieldGained: number;
};

export type VolatileSoulResult = {
  heroHp: number;
  hpDrained: number;
  aoeDamage: number;
  enemies: SimEnemy[];
  killedIds: number[];
};

export const countBuffStacks = (draftedBuffIds: readonly string[], buffId: string): number => {
  let count = 0;
  for (const id of draftedBuffIds) {
    if (id === buffId) {
      count += 1;
    }
  }
  return count;
};

export const computeFloorStartShield = (
  maxHp: number,
  draftedBuffIds: readonly string[],
  hasAegisCape = false,
  isAegisCursed = false,
): number => {
  let shield = 0;
  if (draftedBuffIds.includes('gold_aegis_bastion')) {
    shield += Math.round(maxHp * 0.3);
  }
  if (draftedBuffIds.includes('prism_mage_mana_barrier')) {
    shield += Math.round(maxHp * 0.25);
  }
  if (hasAegisCape) {
    shield += Math.round(maxHp * (isAegisCursed ? 0.15 : 0.25));
  }
  return shield;
};

export const computeFloorClearHeal = (
  maxHp: number,
  draftedBuffIds: readonly string[],
  fastingFloorsLeft: number,
): number => {
  if (fastingFloorsLeft > 0) {
    return 0;
  }
  const secondWindStacks = countBuffStacks(draftedBuffIds, 'silver_second_wind');
  const healPct = 0.15 + secondWindStacks * 0.12;
  return Math.round(maxHp * healPct);
};

export const computeBossRouletteCount = (
  floor: number,
  draftedBuffIds: readonly string[],
): number => {
  if (floor === 10) {
    return 1 + (draftedBuffIds.includes('cursed_double_edged_fate') ? 1 : 0);
  }
  if (floor === 4) {
    return 1;
  }
  return 0;
};

export const computeEnemySpawnHpMult = (draftedBuffIds: readonly string[]): number => {
  return draftedBuffIds.includes('cursed_gilded_avarice') ? 1.25 : 1;
};

export const computeBossChestCount = (draftedBuffIds: readonly string[]): number => {
  return 1 + (draftedBuffIds.includes('cursed_gilded_avarice') ? 1 : 0);
};

export const computeEffectiveAttackSpeed = (
  stats: Pick<ComputedHeroStats, 'attackSpeed'>,
  draftedBuffIds: readonly string[],
  unhitTimer: number,
  battleMomentumStacks: number,
): number => {
  let as = stats.attackSpeed;
  if (draftedBuffIds.includes('gold_glass_tempest') && unhitTimer >= 3) {
    as += 0.45;
  }
  if (draftedBuffIds.includes('silver_battle_momentum') && battleMomentumStacks > 0) {
    as += Math.min(5, battleMomentumStacks) * 0.05;
  }
  return Number(as.toFixed(4));
};

export const applyFrostbiteMeleeChill = (
  enemies: readonly SimEnemy[],
  heroX: number,
  draftedBuffIds: readonly string[],
): SimEnemy[] => {
  if (!draftedBuffIds.includes('silver_frostbite_aura')) {
    return enemies.map((e) => ({ ...e }));
  }
  return enemies.map((e) => {
    if (e.hp > 0 && e.x - heroX <= 165) {
      return { ...e, chillTimer: Math.max(e.chillTimer, 0.25) };
    }
    return { ...e };
  });
};

export const resolveHeroHitOnEnemy = (input: HeroHitInput): HeroHitResult => {
  const enemies = input.enemies.map((e) => ({ ...e }));
  const primary = enemies.find((e) => e.id === input.targetId && e.hp > 0);
  if (!primary) {
    return {
      enemies: enemies.filter((e) => e.hp > 0),
      killedIds: [],
      damageDealt: 0,
      wasCrit: false,
      heroHeal: 0,
      newVampiricTouchCd: input.vampiricTouchCd,
      runGoldDelta: 0,
      cleaveHits: 0,
      stormcallerHits: 0,
    };
  }

  const isCrit = input.forceCrit ?? false;
  let critDmgMult = input.stats.critDmg;
  if (input.draftedBuffIds.includes('gold_glass_tempest') && input.unhitTimer >= 3) {
    critDmgMult += 0.25;
  }

  let dmg = input.stats.atk * (input.baseDamageMult ?? 1) * input.stats.allDamageMult;
  if (isCrit) {
    dmg *= critDmgMult;
  } else if (input.draftedBuffIds.includes('cursed_reckless_gamble')) {
    dmg *= 0.5;
  }

  if (input.draftedBuffIds.includes('prism_war_undying_rage')) {
    const missingHpPct = Math.max(0, 1 - input.heroHp / Math.max(1, input.stats.maxHp));
    dmg *= 1 + Math.min(0.6, missingHpPct * 0.75);
  }

  if (primary.chillTimer > 0 && input.draftedBuffIds.includes('silver_frostbite_aura')) {
    dmg *= 1.12;
  }

  if (input.draftedBuffIds.includes('gold_executioners_verdict')) {
    if (!primary.isBoss && !primary.isMiniBoss && primary.hp / primary.maxHp <= 0.18) {
      dmg = primary.hp + 999;
    } else if ((primary.isBoss || primary.isMiniBoss) && primary.hp / primary.maxHp <= 0.3) {
      dmg *= 1.3;
    }
  }

  dmg *= 1 + primary.armorShred * 0.06;
  const finalDmg = Math.max(1, Math.round(dmg));
  primary.hp = Math.max(0, primary.hp - finalDmg);

  const killedIds: number[] = [];
  if (primary.hp <= 0) {
    killedIds.push(primary.id);
  }

  let heroHeal = 0;
  let newVampiricTouchCd = input.vampiricTouchCd;
  let runGoldDelta = 0;
  let cleaveHits = 0;
  let stormcallerHits = 0;

  if (input.applyOnHit !== false && primary.hp > 0 && input.draftedBuffIds.includes('silver_serrated_wounds')) {
    primary.bleedTimer = 3;
    primary.bleedStacks = Math.min(5, primary.bleedStacks + 1);
  }

  if (isCrit) {
    if (input.draftedBuffIds.includes('silver_vampiric_touch') && newVampiricTouchCd <= 0) {
      newVampiricTouchCd = 0.5;
      heroHeal += Math.round(input.stats.maxHp * 0.02);
    }
    if (input.draftedBuffIds.includes('gold_stormcaller_conduit')) {
      const skyDmg = Math.max(1, Math.round(input.stats.atk * 1.2));
      for (const other of enemies) {
        if (other.id !== primary.id && other.hp > 0 && Math.abs(other.x - primary.x) <= 95) {
          other.hp = Math.max(0, other.hp - skyDmg);
          stormcallerHits += 1;
          if (other.hp <= 0) {
            killedIds.push(other.id);
          }
        }
      }
    }
  }

  if (input.applyOnHit !== false && input.draftedBuffIds.includes('prism_war_titan_cleave')) {
    const cleaveDmg = Math.max(1, Math.round(finalDmg * 0.65));
    for (const other of enemies) {
      if (other.id !== primary.id && other.hp > 0 && Math.abs(other.x - input.heroX) <= 180) {
        other.hp = Math.max(0, other.hp - cleaveDmg);
        cleaveHits += 1;
        if (other.hp <= 0) {
          killedIds.push(other.id);
        }
      }
    }
  }

  if (input.applyOnHit !== false && input.draftedBuffIds.includes('prism_thief_coin_toss')) {
    const coinDmg = Math.max(1, Math.round(input.stats.atk * 0.25 + input.runGold * 0.01));
    for (const other of enemies) {
      if (other.hp > 0 && Math.abs(other.x - primary.x) <= 130) {
        other.hp = Math.max(0, other.hp - coinDmg);
        if (other.hp <= 0 && !killedIds.includes(other.id)) {
          killedIds.push(other.id);
        }
      }
    }
    runGoldDelta += 4;
  }

  return {
    enemies: enemies.filter((e) => e.hp > 0),
    killedIds,
    damageDealt: finalDmg,
    wasCrit: isCrit,
    heroHeal,
    newVampiricTouchCd,
    runGoldDelta,
    cleaveHits,
    stormcallerHits,
  };
};

export const resolveAttackProcs = (input: AttackProcsInput): AttackProcsResult => {
  const enemies = input.enemies.map((e) => ({ ...e }));
  const primary = enemies.find((e) => e.id === input.targetId && e.hp > 0);
  const roll = input.roll ?? (() => 0.99);
  const killedIds: number[] = [];

  if (!primary) {
    return {
      enemies: enemies.filter((e) => e.hp > 0),
      killedIds,
      staticChainHits: 0,
      echoTriggered: false,
      bonusProjectiles: 0,
      triElementalEffects: [],
      shadowPartnerTriggered: false,
      snipersMarkApplied: false,
      snipersMarkTriggered: false,
    };
  }

  let staticChainHits = 0;
  if (input.draftedBuffIds.includes('silver_static_discharge') && input.attackCount % 4 === 0) {
    const chainDmg = Math.max(1, Math.round(input.stats.atk * 0.8));
    let chains = 0;
    for (const other of enemies) {
      if (other.id !== primary.id && other.hp > 0 && Math.abs(other.x - primary.x) <= 170) {
        other.hp = Math.max(0, other.hp - chainDmg);
        staticChainHits += 1;
        chains += 1;
        if (other.hp <= 0) {
          killedIds.push(other.id);
        }
        if (chains >= 2) {
          break;
        }
      }
    }
  }

  const echoTriggered =
    input.draftedBuffIds.includes('silver_echo_strike') &&
    (input.forceEcho ?? roll() < 0.25);

  const shadowPartnerTriggered =
    input.draftedBuffIds.includes('prism_thief_shadow_partner') &&
    (input.forceShadowPartner ?? roll() < 0.3);

  const bonusProjectiles =
    input.draftedBuffIds.includes('prism_bow_split_arrow') &&
    (input.forceSplitArrow ?? roll() < 0.5)
      ? 2
      : 0;

  const triElementalEffects: string[] = [];
  if (input.draftedBuffIds.includes('prism_mage_tri_elemental')) {
    const elementIdx = (input.attackCount - 1) % 3;
    if (elementIdx === 0) {
      primary.burnTimer = Math.max(primary.burnTimer, 3);
      triElementalEffects.push('burn');
    } else if (elementIdx === 1) {
      primary.chillTimer = Math.max(primary.chillTimer, 2);
      triElementalEffects.push('chill');
    } else {
      const shockDmg = Math.max(1, Math.round(input.stats.atk * 0.45));
      primary.hp = Math.max(0, primary.hp - shockDmg);
      triElementalEffects.push('shock');
      if (primary.hp <= 0 && !killedIds.includes(primary.id)) {
        killedIds.push(primary.id);
      }
    }
  }

  let snipersMarkApplied = false;
  let snipersMarkTriggered = false;
  if (input.draftedBuffIds.includes('prism_bow_snipers_mark') && primary.hp > 0) {
    const shouldMark = input.forceSnipersMark ?? roll() < 0.45;
    if (shouldMark) {
      primary.marks += 1;
      snipersMarkApplied = true;
      if (primary.marks >= 3) {
        primary.marks = 0;
        snipersMarkTriggered = true;
        const burstDmg = Math.max(1, Math.round(input.stats.atk * 2.2));
        primary.hp = Math.max(0, primary.hp - burstDmg);
        if (primary.hp <= 0 && !killedIds.includes(primary.id)) {
          killedIds.push(primary.id);
        }
      }
    }
  }

  return {
    enemies: enemies.filter((e) => e.hp > 0),
    killedIds,
    staticChainHits,
    echoTriggered,
    bonusProjectiles,
    triElementalEffects,
    shadowPartnerTriggered,
    snipersMarkApplied,
    snipersMarkTriggered,
  };
};

export const resolveDotTick = (
  enemy: SimEnemy,
  atk: number,
  draftedBuffIds: readonly string[],
  forceCrit = false,
): DotTickResult => {
  const next = { ...enemy };
  const overload = draftedBuffIds.includes('gold_elemental_overload');

  let burnDamage = 0;
  if (next.burnTimer > 0 && next.hp > 0) {
    burnDamage = Math.max(1, Math.round(atk * (overload ? 0.45 : 0.3)));
    next.hp = Math.max(0, next.hp - burnDamage);
  }

  let bleedDamage = 0;
  if (next.bleedTimer > 0 && next.bleedStacks > 0 && next.hp > 0) {
    bleedDamage = Math.max(1, Math.round(atk * 0.15 * next.bleedStacks));
    next.hp = Math.max(0, next.hp - bleedDamage);
  }

  let poisonDamage = 0;
  if (next.poisonTimer > 0 && next.poisonStacks > 0 && next.hp > 0) {
    let dmg = atk * 0.12 * next.poisonStacks;
    if (draftedBuffIds.includes('prism_thief_fatal_venom') && forceCrit) {
      dmg *= 1.65;
    }
    poisonDamage = Math.max(1, Math.round(dmg));
    next.hp = Math.max(0, next.hp - poisonDamage);
  }

  return {
    enemy: next,
    burnDamage,
    bleedDamage,
    poisonDamage,
    killed: next.hp <= 0,
  };
};

export const resolveEnemyHitHero = (
  attacker: SimEnemy,
  armor: number,
  draftedBuffIds: readonly string[],
): EnemyHitHeroResult => {
  const next = { ...attacker };
  let reflectedDamage = 0;
  if (next.hp > 0 && draftedBuffIds.includes('silver_thornmail_plating')) {
    reflectedDamage = Math.max(1, Math.round(armor * 0.8));
    next.hp = Math.max(0, next.hp - reflectedDamage);
  }
  return {
    attacker: next,
    reflectedDamage,
    killed: next.hp <= 0,
  };
};

export const resolveHealWithOverhealShield = (
  heroHp: number,
  heroShield: number,
  maxHp: number,
  healAmount: number,
  fastingFloorsLeft: number,
  draftedBuffIds: readonly string[],
): HealWithShieldResult => {
  if (fastingFloorsLeft > 0 || healAmount <= 0) {
    return {
      heroHp,
      heroShield,
      healed: 0,
      shieldGained: 0,
    };
  }
  const missing = Math.max(0, maxHp - heroHp);
  const healed = Math.min(missing, Math.round(healAmount));
  const overheal = Math.max(0, Math.round(healAmount) - healed);
  let shieldGained = 0;
  let nextShield = heroShield;
  if (overheal > 0 && draftedBuffIds.includes('prism_war_blood_shield')) {
    const cap = Math.round(maxHp * 0.45);
    shieldGained = Math.min(overheal, Math.max(0, cap - heroShield));
    nextShield += shieldGained;
  }
  return {
    heroHp: heroHp + healed,
    heroShield: nextShield,
    healed,
    shieldGained,
  };
};

export const resolveActiveSkillCast = (
  baseMult: number,
  draftedBuffIds: readonly string[],
): { skillCooldownMult: number; hitMultipliers: number[]; manaBarrierShieldPct: number } => {
  const skillCooldownMult = draftedBuffIds.includes('gold_overclocked_core') ? 0.7 : 1;
  const hitMultipliers = draftedBuffIds.includes('prism_mage_spell_echo')
    ? [baseMult, Number((baseMult * 0.65).toFixed(4))]
    : [baseMult];
  const manaBarrierShieldPct = draftedBuffIds.includes('prism_mage_mana_barrier') ? 0.2 : 0;
  return {
    skillCooldownMult,
    hitMultipliers,
    manaBarrierShieldPct,
  };
};

export const computeElementalProcChance = (
  baseChance: number,
  draftedBuffIds: readonly string[],
): number => {
  const mult = draftedBuffIds.includes('gold_elemental_overload') ? 2 : 1;
  return Math.min(1, Number((baseChance * mult).toFixed(4)));
};

export const resolveSpectralPackCompanion = (
  classId: string,
  draftedBuffIds: readonly string[],
  atk: number,
): { wolfActive: boolean; wolfDamage: number } => {
  const active = classId === 'bowman' && draftedBuffIds.includes('prism_bow_spectral_pack');
  return {
    wolfActive: active,
    wolfDamage: active ? Math.max(1, Math.round(atk * 1.15)) : 0,
  };
};

export const resolveVolatileSoulPulse = (
  heroHp: number,
  atk: number,
  allDamageMult: number,
  enemies: readonly SimEnemy[],
  draftedBuffIds: readonly string[],
): VolatileSoulResult => {
  if (!draftedBuffIds.includes('cursed_volatile_soul')) {
    return {
      heroHp,
      hpDrained: 0,
      aoeDamage: 0,
      enemies: enemies.map((e) => ({ ...e })),
      killedIds: [],
    };
  }

  const nextHp = Math.max(1, Math.round(heroHp * 0.98));
  const hpDrained = Math.max(0, heroHp - nextHp);
  const aoeDamage = Math.max(1, Math.round(atk * 1.8 * allDamageMult));

  const nextEnemies = enemies.map((e) => ({ ...e }));
  const killedIds: number[] = [];
  for (const enemy of nextEnemies) {
    if (enemy.hp > 0) {
      enemy.hp = Math.max(0, enemy.hp - aoeDamage);
      if (enemy.hp <= 0) {
        killedIds.push(enemy.id);
      }
    }
  }

  return {
    heroHp: nextHp,
    hpDrained,
    aoeDamage,
    enemies: nextEnemies.filter((e) => e.hp > 0),
    killedIds,
  };
};
