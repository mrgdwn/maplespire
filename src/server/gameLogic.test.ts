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
  awardClassExp,
  calculateLeaderboardScore,
  createInitialProfile,
  getDailyChallengeConfig,
  mulberry32,
  parsePlayerProfile,
} from '../shared/utils.ts';

void describe('Wuxia Spire Shared Catalogs & Game Logic', async () => {
  await it('contains exact catalog counts from GDD', () => {
    assert.equal(CLASS_CATALOG.length, 4);
    assert.equal(LEGENDARY_CATALOG.length, 48);
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
      'Tang Sect Rainstorm Headband'
    );
    assert.equal(
      migrated.classes.warrior.equipped.headgear?.affixText,
      'Hidden needles & Qi projectiles pierce through up to 3 cultists in a line.'
    );

    const clearedScore = calculateLeaderboardScore(10, 'cleared', 95_000, 1200);
    const extractedScore = calculateLeaderboardScore(7, 'extracted', 60_000, 800);
    assert.ok(clearedScore > extractedScore);
  });
});
