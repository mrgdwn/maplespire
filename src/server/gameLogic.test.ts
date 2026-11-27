import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIOME_CATALOG, BOSS_MUTATIONS, rollBossMutations } from '../shared/catalogs/biomes.ts';
import {
  ALL_BUFFS,
  CORE_BUFFS,
  PRISMATIC_CLASS_BUFFS,
  getFloorBracketWeights,
  refreshSingleDraftCard,
  rollDraftCards,
} from '../shared/catalogs/buffs.ts';
import {
  CLASS_CATALOG,
  computeHeroCombatStats,
  computeLinkSkillBonuses,
} from '../shared/catalogs/classes.ts';
import { LEGENDARY_CATALOG, getHybridElement } from '../shared/catalogs/legendaries.ts';
import {
  WUXIA_ACTIVE_ARTS,
  WUXIA_INNER_QI,
  WUXIA_SECRET_SYNERGIES,
} from '../shared/catalogs/wuxia.ts';
import {
  awardClassExp,
  calculateLeaderboardScore,
  claimLoginStreakReward,
  createInitialProfile,
  createLegendaryGearItem,
  createSpecificLegendaryGearItem,
  evaluateDailyMasteryBounty,
  getDailyChallengeConfig,
  getDailyMasteryBounty,
  getDailySectDecree,
  getDay14SlotLegendaryChoices,
  getLoginStreakStatus,
  getMiniBossLegendaryChance,
  getRegularFloorRareChance,
  getSlotUpgradeCost,
  mulberry32,
  parsePlayerProfile,
} from '../shared/utils.ts';

void describe('Wuxia Spire Shared Catalogs & Game Logic', async () => {
  await it('contains exact catalog counts from GDD', () => {
    assert.equal(CLASS_CATALOG.length, 4);
    assert.equal(LEGENDARY_CATALOG.length, 46);
    assert.equal(CORE_BUFFS.length, 32);
    assert.equal(PRISMATIC_CLASS_BUFFS.length, 12);
    assert.equal(ALL_BUFFS.length, 44);
    assert.equal(BIOME_CATALOG.length, 5);
    assert.equal(BOSS_MUTATIONS.length, 6);
  });

  await it('derives deterministic daily biome and bounty class from dateKey', () => {
    const a = getDailyChallengeConfig('2026-11-14');
    const b = getDailyChallengeConfig('2026-11-14');
    assert.deepEqual(a, b);
  });

  await it('computes Link Skill bonuses per 10 levels across all classes', () => {
    const profile = createInitialProfile('tester');
    profile.classes.warrior.level = 20;
    profile.classes.mage.level = 15;
    profile.classes.thief.level = 30;
    profile.classes.bowman.level = 10;

    const links = computeLinkSkillBonuses(profile.classes);
    assert.equal(links.maxHpPct, 6);
    assert.equal(links.skillDmgPct, 3);
    assert.equal(links.critRatePct, 6);
    assert.equal(links.attackSpeedPct, 3);
  });

  await it('uses GDD floor bracket odds and guarantees 1 Cursed slot on Floor 7', () => {
    const early = getFloorBracketWeights(2, 1);
    assert.deepEqual(early, { bronze: 65, silver: 25, gold: 8, cursed: 2 });

    const mid = getFloorBracketWeights(5, 1);
    assert.deepEqual(mid, { bronze: 45, silver: 35, gold: 15, cursed: 5 });

    const late = getFloorBracketWeights(8, 1);
    assert.deepEqual(late, { bronze: 25, silver: 40, gold: 25, cursed: 10 });

    const rng = mulberry32(42);
    const cards = rollDraftCards({
      floor: 7,
      rng,
      classId: 'warrior',
      classLevel: 10,
      banishedIds: [],
      equippedBuffIds: [],
      silverWeightMult: 1,
    });
    assert.equal(cards.length, 3);
    assert.ok(cards.some((c) => c.tier === 'cursed'));

    const refreshed = refreshSingleDraftCard(
      {
        floor: 7,
        rng,
        classId: 'warrior',
        classLevel: 10,
        banishedIds: [],
        equippedBuffIds: [],
        silverWeightMult: 1,
      },
      cards,
      0
    );
    assert.equal(refreshed.length, 3);
    assert.equal(refreshed[1]?.id, cards[1]?.id);
    assert.equal(refreshed[2]?.id, cards[2]?.id);
  });

  await it('excludes banished bronze buffs and includes Lv. 35 Prismatic buffs only at Lv. 35+', () => {
    const lowRng = mulberry32(1234);
    for (let i = 0; i < 20; i++) {
      const cards = rollDraftCards({
        floor: 8,
        rng: lowRng,
        classId: 'mage',
        classLevel: 20,
        banishedIds: ['bronze_sharpened_edge'],
        equippedBuffIds: [],
        silverWeightMult: 1,
      });
      assert.ok(cards.every((c) => c.tier !== 'prismatic'));
      assert.ok(cards.every((c) => c.id !== 'bronze_sharpened_edge'));
    }
  });

  await it('computes dual-socket elemental hybrids and boss mutations cleanly', () => {
    assert.equal(getHybridElement(['fire', 'lightning'])?.name, 'Plasma');
    assert.equal(getHybridElement(['dark', 'ice'])?.name, 'Abyssal Frost');
    assert.equal(getHybridElement(['fire', 'fire']), null);

    const rng = mulberry32(99);
    const muts = rollBossMutations(rng, 2);
    assert.equal(muts.length, 2);
    assert.notEqual(muts[0], muts[1]);
  });

  await it('levels up classes on EXP gain and parses saved profiles safely', () => {
    const profile = createInitialProfile('snoo_hero');
    const res = awardClassExp(profile.classes.warrior, 500);
    assert.equal(res.leveledUp, true);
    assert.ok(res.updated.level > 1);

    const stats = computeHeroCombatStats(profile, 'warrior', ['bronze_sharpened_edge'], 1000, 3);
    assert.ok(stats.atk > 24);

    const roundTrip = parsePlayerProfile(JSON.parse(JSON.stringify(profile)), 'fallback');
    assert.equal(roundTrip.username, 'snoo_hero');
    assert.equal(roundTrip.classes.warrior.equipped.weapon?.id, 'starter_wep_warrior');

    // Migrates legacy saved Legendary & Normal/Rare gear names on profile load
    const legacySaved = JSON.parse(JSON.stringify(profile));
    legacySaved.classes.warrior.equipped.headgear = {
      id: 'leg_legacy_bandana',
      name: 'Bandana of the Night Lord',
      slot: 'headgear',
      classId: 'thief',
      tier: 'legendary',
      level: 10,
      baseStatBonus: 42,
      affixText: 'Throwing stars/daggers pierce through up to 3 enemies in a line.',
      sockets: [],
      maxSockets: 0,
      legendaryId: 'thief_head_bandana',
      isCursed: true,
    };
    const migrated = parsePlayerProfile(legacySaved, 'fallback');
    assert.equal(
      migrated.classes.warrior.equipped.headgear?.name,
      'Ancient Tomb Jade-Bee Hood'
    );
    assert.equal(
      migrated.classes.warrior.equipped.headgear?.affixText,
      'Ancient Tomb Sect’s prized Jade-Bee Needle crest: projectiles and needle waves pierce through up to 3 cultists in a line.'
    );

    const clearedScore = calculateLeaderboardScore(10, 'cleared', 95_000, 1200);
    const extractedScore = calculateLeaderboardScore(7, 'extracted', 60_000, 800);
    assert.ok(clearedScore > extractedScore);
  });

  await it('provides deterministic Daily Sect Decrees and evaluates Daily Mastery Bounties', () => {
    const decreeA = getDailySectDecree('2026-11-20');
    const decreeB = getDailySectDecree('2026-11-20');
    assert.deepEqual(decreeA, decreeB);

    const bountyA = getDailyMasteryBounty('2026-11-20');
    const bountyB = getDailyMasteryBounty('2026-11-20');
    assert.deepEqual(bountyA, bountyB);
    assert.ok(bountyA.shardReward > 0);

    const firstActive = WUXIA_ACTIVE_ARTS[0];
    const firstQi = WUXIA_INNER_QI[0];
    const secondQi = WUXIA_INNER_QI[1];
    const firstSynergy = WUXIA_SECRET_SYNERGIES[0];
    assert.ok(firstActive && firstQi && secondQi && firstSynergy);

    assert.equal(evaluateDailyMasteryBounty('reach_floor_15', 14, []), false);
    assert.equal(evaluateDailyMasteryBounty('reach_floor_15', 15, []), true);
    assert.equal(evaluateDailyMasteryBounty('clear_floor_20', 19, []), false);
    assert.equal(evaluateDailyMasteryBounty('clear_floor_20', 20, []), true);

    assert.equal(
      evaluateDailyMasteryBounty('master_active_lv3', 5, [firstActive.id, firstActive.id]),
      false
    );
    assert.equal(
      evaluateDailyMasteryBounty('master_active_lv3', 5, [
        firstActive.id,
        firstActive.id,
        firstActive.id,
      ]),
      true
    );

    assert.equal(evaluateDailyMasteryBounty('dual_passive_harmony', 5, [firstQi.id]), false);
    assert.equal(
      evaluateDailyMasteryBounty('dual_passive_harmony', 5, [firstQi.id, secondQi.id]),
      true
    );

    assert.equal(evaluateDailyMasteryBounty('awaken_synergy', 5, [firstActive.id]), false);
    assert.equal(
      evaluateDailyMasteryBounty('awaken_synergy', 5, [
        firstSynergy.activeId,
        firstSynergy.innerQiId,
        firstSynergy.id,
      ]),
      true
    );
  });

  await it('handles Login Streak Day 1-7 cycle, weekly grace, Day 14 1-of-3, and Day 30 Full Selector', () => {
    let profile = createInitialProfile('streak_tester');

    // Day 1
    let status = getLoginStreakStatus(profile, '2026-11-01');
    assert.equal(status.canClaimToday, true);
    assert.equal(status.nextStreak, 1);
    assert.equal(status.nextCycleDay, 1);
    let res = claimLoginStreakReward(profile, '2026-11-01');
    profile = res.profile;
    assert.equal(profile.loginStreak.currentStreak, 1);
    assert.equal(profile.gold, 350);
    assert.equal(profile.goldenTickets, 1);

    // Same-day repeat claim is a no-op
    const dup = claimLoginStreakReward(profile, '2026-11-01');
    assert.equal(dup.profile.gold, profile.gold);

    // Day 2
    res = claimLoginStreakReward(profile, '2026-11-02');
    profile = res.profile;
    assert.equal(profile.loginStreak.currentStreak, 2);
    assert.equal(profile.shards, 30);

    // Day 3 -> guaranteed Rare drop
    const invBeforeDay3 = profile.inventory.length;
    res = claimLoginStreakReward(profile, '2026-11-03');
    profile = res.profile;
    assert.equal(profile.loginStreak.currentStreak, 3);
    assert.equal(profile.inventory.length, invBeforeDay3 + 1);
    assert.equal(profile.inventory[profile.inventory.length - 1]?.tier, 'rare');

    // Skip 2026-11-04 (1-day gap -> 2026-11-05): Weekly grace preserves streak
    status = getLoginStreakStatus(profile, '2026-11-05');
    assert.equal(status.graceWillApply, true);
    assert.equal(status.nextStreak, 4);
    res = claimLoginStreakReward(profile, '2026-11-05');
    profile = res.profile;
    assert.equal(profile.loginStreak.currentStreak, 4);
    assert.ok(profile.loginStreak.graceUsedWeekKey.length > 0);

    // Another 1-day gap in the same ISO week (skip 2026-11-06 -> 2026-11-07) does NOT preserve streak
    const sameWeekGap = getLoginStreakStatus(profile, '2026-11-07');
    assert.equal(sameWeekGap.graceWillApply, false);
    assert.equal(sameWeekGap.nextStreak, 1);

    // Continue consecutively to Day 5, Day 6, Day 7
    profile = claimLoginStreakReward(profile, '2026-11-06').profile;
    profile = claimLoginStreakReward(profile, '2026-11-07').profile;
    status = getLoginStreakStatus(profile, '2026-11-08');
    assert.equal(status.nextCycleDay, 7);
    assert.equal(status.needsSlotChoice, true);

    // Day 7 -> Slot-choice Pristine Legendary
    res = claimLoginStreakReward(profile, '2026-11-08', 'cape');
    profile = res.profile;
    assert.equal(profile.loginStreak.currentStreak, 7);
    const day7Item = profile.inventory[profile.inventory.length - 1];
    assert.equal(day7Item?.tier, 'legendary');
    assert.equal(day7Item?.slot, 'cape');
    assert.equal(day7Item?.isCursed, false);

    // Day 14 -> 1-of-3 slot Legendary choice
    const day14Profile = {
      ...profile,
      loginStreak: {
        ...profile.loginStreak,
        currentStreak: 13,
        lastClaimDate: '2026-11-14',
      },
    };
    const day14Status = getLoginStreakStatus(day14Profile, '2026-11-15');
    assert.equal(day14Status.isMilestone14, true);
    assert.equal(day14Status.needsDay14Choice, true);
    const choices = getDay14SlotLegendaryChoices('weapon', '2026-11-15');
    assert.equal(choices.length, 3);
    const chosen14 = choices[1];
    assert.ok(chosen14);
    const day14Res = claimLoginStreakReward(day14Profile, '2026-11-15', 'weapon', chosen14.id);
    const day14Item = day14Res.profile.inventory[day14Res.profile.inventory.length - 1];
    assert.equal(day14Item?.legendaryId, chosen14.id);
    assert.equal(day14Item?.isCursed, false);

    // Day 21 -> Purifies an equipped cursed legendary when bag has none (+40 Shards)
    const equippedCursedLeg = createSpecificLegendaryGearItem(
      LEGENDARY_CATALOG[0]!.id,
      true,
      'day21_equipped',
      15
    );
    const day21Profile = {
      ...profile,
      shards: 100,
      bossCores: 1,
      inventory: [],
      classes: {
        ...profile.classes,
        [profile.selectedClass]: {
          ...profile.classes[profile.selectedClass],
          equipped: {
            ...profile.classes[profile.selectedClass].equipped,
            [equippedCursedLeg.slot]: equippedCursedLeg,
          },
        },
      },
      loginStreak: {
        ...profile.loginStreak,
        currentStreak: 20,
        lastClaimDate: '2026-11-20',
      },
    };
    const day21Status = getLoginStreakStatus(day21Profile, '2026-11-21');
    assert.equal(day21Status.isMilestone21, true);
    const day21Res = claimLoginStreakReward(day21Profile, '2026-11-21');
    const purifiedEquipped =
      day21Res.profile.classes[day21Profile.selectedClass].equipped[equippedCursedLeg.slot];
    assert.equal(purifiedEquipped?.id, equippedCursedLeg.id);
    assert.equal(purifiedEquipped?.isCursed, false);
    assert.equal(day21Res.profile.shards, 140);
    assert.equal(day21Res.profile.bossCores, 1);
    assert.equal(
      day21Profile.classes[day21Profile.selectedClass].equipped[equippedCursedLeg.slot]?.isCursed,
      true
    );

    // Day 30 -> Full Selector (any Legendary from catalog)
    const day30Profile = {
      ...profile,
      loginStreak: {
        ...profile.loginStreak,
        currentStreak: 29,
        lastClaimDate: '2026-11-29',
      },
    };
    const day30Status = getLoginStreakStatus(day30Profile, '2026-11-30');
    assert.equal(day30Status.isMilestone30, true);
    assert.equal(day30Status.needsFullSelector, true);
    const targetLeg = LEGENDARY_CATALOG[LEGENDARY_CATALOG.length - 1];
    assert.ok(targetLeg);
    const day30Res = claimLoginStreakReward(day30Profile, '2026-11-30', undefined, targetLeg.id);
    const day30Item = day30Res.profile.inventory[day30Res.profile.inventory.length - 1];
    assert.equal(day30Item?.legendaryId, targetLeg.id);
    assert.equal(day30Item?.isCursed, false);
  });

  await it('applies all 8 permanent passive legion stats and uses Shard-only slot upgrade costs', () => {
    const baseProfile = createInitialProfile('legion_tester');
    const upgradedProfile = createInitialProfile('legion_tester');
    upgradedProfile.legion = {
      atk: 5,
      hp: 4,
      armor: 3,
      critRate: 4,
      critDmg: 3,
      dodge: 4,
      cdr: 5,
      gold: 5,
    };

    const baseStats = computeHeroCombatStats(baseProfile, 'warrior', [], 0, 0);
    const upStats = computeHeroCombatStats(upgradedProfile, 'warrior', [], 0, 0);

    assert.ok(upStats.atk > baseStats.atk);
    assert.ok(upStats.maxHp > baseStats.maxHp);
    assert.equal(upStats.armor, baseStats.armor + 15);
    assert.ok(Math.abs(upStats.critRate - (baseStats.critRate + 0.06)) < 1e-6);
    assert.ok(Math.abs(upStats.critDmg - (baseStats.critDmg + 0.24)) < 1e-6);
    assert.ok(Math.abs(upStats.dodgeRate - (baseStats.dodgeRate + 0.06)) < 1e-6);
    assert.equal(upStats.cooldownReductionPct, baseStats.cooldownReductionPct + 10);
    assert.equal(upStats.goldBonusPct, baseStats.goldBonusPct + 30);

    for (let lvl = 0; lvl <= 5; lvl++) {
      const cost = getSlotUpgradeCost(lvl);
      assert.equal(cost.gold, 0);
      assert.equal(cost.shards, 10 + lvl * 6);
    }
  });

  await it('scales floor rarity curves and distributes Legendary slots evenly across all 4 slots', () => {
    assert.equal(getRegularFloorRareChance(2), 0.15);
    assert.equal(getRegularFloorRareChance(10), 0.3);
    assert.equal(getRegularFloorRareChance(20), 0.5);
    assert.equal(getRegularFloorRareChance(30), 0.7);

    assert.equal(getMiniBossLegendaryChance(6), 0.18);
    assert.equal(getMiniBossLegendaryChance(20), 0.25);
    assert.equal(getMiniBossLegendaryChance(40), 0.35);

    const rng = mulberry32(424242);
    const slotCounts = { weapon: 0, headgear: 0, top: 0, cape: 0 };
    const sampleSize = 400;
    for (let i = 0; i < sampleSize; i++) {
      const item = createLegendaryGearItem(rng, 'warrior', false, `t${i}`, 20);
      assert.equal(item.tier, 'legendary');
      assert.equal(item.maxSockets, 0);
      assert.deepEqual(item.sockets, []);
      assert.ok(!/[\u4e00-\u9fff]/.test(item.name));
      slotCounts[item.slot] += 1;
    }

    // Uniform 25% per slot (~100 each out of 400; verify each slot stays within [70, 130])
    for (const slot of ['weapon', 'headgear', 'top', 'cape'] as const) {
      assert.ok(
        slotCounts[slot] >= 70 && slotCounts[slot] <= 130,
        `Expected balanced slot count for ${slot}, got ${slotCounts[slot]}`
      );
    }
  });
});
