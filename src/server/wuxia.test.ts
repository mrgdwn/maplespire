import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBiomeForFloor } from '../shared/catalogs/biomes.ts';
import { computeHeroCombatStats } from '../shared/catalogs/classes.ts';
import {
  ALL_WUXIA_MANUALS,
  WUXIA_ACTIVE_ARTS,
  WUXIA_ENLIGHTENMENT_SCROLLS,
  WUXIA_GRANDMASTER_LEVEL,
  WUXIA_HIGH_REALM_ACTIVE_SLOTS,
  WUXIA_HIGH_REALM_INNER_QI_SLOTS,
  WUXIA_INNER_QI,
  WUXIA_MAX_ACTIVE_SLOTS,
  WUXIA_MAX_INNER_QI_SLOTS,
  WUXIA_MAX_MANUAL_LEVEL,
  WUXIA_SECRET_SYNERGIES,
  WUXIA_TRANSCENDENT_LEVEL,
  buildWuxiaDraftCandidates,
  computeWuxiaLoadout,
  getMiniBossFloorsForBracket,
  getWuxiaActiveArtById,
  getWuxiaInnerQiById,
  isCultLeaderFloor,
  isRandomMiniBossFloor,
  refreshWuxiaDraftCard,
  rollWuxiaDraftCards,
} from '../shared/catalogs/wuxia.ts';
import { calculateLeaderboardScore, createInitialProfile, mulberry32 } from '../shared/utils.ts';

void describe('Wuxia Spire Martial Arts, Inner Qi & Secret Synergies', () => {
  void it('maintains expected catalog sizes, unique IDs, and valid secret pairs', () => {
    assert.equal(WUXIA_ACTIVE_ARTS.length, 8);
    assert.equal(WUXIA_INNER_QI.length, 10);
    assert.equal(WUXIA_SECRET_SYNERGIES.length, 8);
    assert.equal(WUXIA_ENLIGHTENMENT_SCROLLS.length, 10);

    const uniqueIds = new Set(ALL_WUXIA_MANUALS.map((m) => m.id));
    assert.equal(uniqueIds.size, ALL_WUXIA_MANUALS.length);

    for (const syn of WUXIA_SECRET_SYNERGIES) {
      assert.ok(getWuxiaActiveArtById(syn.activeId), `Missing active art ${syn.activeId}`);
      assert.ok(getWuxiaInnerQiById(syn.innerQiId), `Missing inner qi ${syn.innerQiId}`);
      assert.ok(syn.riddleHint.length > 10);
    }
  });

  void it('enforces 3 slots / Lv.3 on F1-10 and unlocks 4th slot + Lv.4/Lv.5 breakthroughs at higher floors', () => {
    const drafted = [
      'art_dragon_palm',
      'art_dragon_palm',
      'art_jade_sword',
      'art_dog_staff',
      'art_heavy_iron', // 4th distinct active blocked on F1-14, unlocked at F15+
      'art_dragon_palm',
      'art_dragon_palm', // 4th copy capped at Lv.3 on F1-10, unlocked at F11+
      'art_dragon_palm', // 5th copy unlocked at F21+
      'qi_nine_yang',
      'qi_nine_yin',
      'qi_heaven_earth',
      'qi_iron_cloth', // 4th distinct qi blocked on F1-14, unlocked at F15+
    ];

    const earlyLoadout = computeWuxiaLoadout(drafted, 5);
    assert.equal(earlyLoadout.maxActiveSlots, WUXIA_MAX_ACTIVE_SLOTS);
    assert.equal(earlyLoadout.maxInnerQiSlots, WUXIA_MAX_INNER_QI_SLOTS);
    assert.equal(earlyLoadout.maxManualLevel, WUXIA_MAX_MANUAL_LEVEL);
    assert.equal(earlyLoadout.actives.length, WUXIA_MAX_ACTIVE_SLOTS);
    assert.equal(earlyLoadout.innerQis.length, WUXIA_MAX_INNER_QI_SLOTS);
    assert.equal(earlyLoadout.activeLevels.art_dragon_palm, 3);
    assert.equal(earlyLoadout.activeLevels.art_heavy_iron, undefined);
    assert.equal(earlyLoadout.innerQiLevels.qi_iron_cloth, undefined);

    const earlyCandidates = buildWuxiaDraftCandidates(drafted, 5);
    assert.equal(
      earlyCandidates.some((c) => c.option.id === 'art_heavy_iron'),
      false,
      'Unowned 4th active art must not be offered when 3 Active slots are full before Floor 15'
    );
    assert.equal(
      earlyCandidates.some((c) => c.option.id === 'qi_iron_cloth'),
      false,
      'Unowned 4th inner qi must not be offered when 3 Qi slots are full before Floor 15'
    );

    const midLoadout = computeWuxiaLoadout(drafted, 16);
    assert.equal(midLoadout.maxActiveSlots, WUXIA_HIGH_REALM_ACTIVE_SLOTS);
    assert.equal(midLoadout.maxInnerQiSlots, WUXIA_HIGH_REALM_INNER_QI_SLOTS);
    assert.equal(midLoadout.maxManualLevel, WUXIA_GRANDMASTER_LEVEL);
    assert.equal(midLoadout.actives.length, 4);
    assert.equal(midLoadout.innerQis.length, 4);
    assert.equal(midLoadout.activeLevels.art_dragon_palm, 4);

    const highLoadout = computeWuxiaLoadout(drafted, 25);
    assert.equal(highLoadout.maxManualLevel, WUXIA_TRANSCENDENT_LEVEL);
    assert.equal(highLoadout.activeLevels.art_dragon_palm, 5);
  });

  void it('guarantees at least one Active Martial Art on Floor 1, continues Lv.4-5 upgrades on F25, and varies High-Realm Scrolls once maxed', () => {
    const rng = mulberry32(4242);
    const firstCards = rollWuxiaDraftCards(rng, [], 1, 3);
    assert.equal(firstCards.length, 3);
    assert.equal(
      firstCards.some((c) => c.kind === 'active'),
      true,
      'Classless wanderer draft #1 must include at least one Active Martial Art'
    );

    // At Floor 25, a 3-slot Lv.3 build still receives Lv.4/5 breakthroughs & 4th-slot unlocks
    const midBuild = [
      'art_dragon_palm',
      'art_dragon_palm',
      'art_dragon_palm',
      'art_jade_sword',
      'art_jade_sword',
      'art_jade_sword',
      'art_dog_staff',
      'art_dog_staff',
      'art_dog_staff',
      'qi_iron_cloth',
      'qi_iron_cloth',
      'qi_iron_cloth',
      'qi_star_absorb',
      'qi_star_absorb',
      'qi_star_absorb',
      'qi_solitary_sword',
      'qi_solitary_sword',
      'qi_solitary_sword',
    ];
    const midF25Candidates = buildWuxiaDraftCandidates(midBuild, 25);
    assert.equal(
      midF25Candidates.some((c) => c.option.kind === 'active' || c.option.kind === 'inner_qi'),
      true,
      'Floor 25 should still offer Lv.4-5 breakthroughs and 4th slot manuals before falling back'
    );

    // Once all 4 Active + 4 Inner Qi slots hit Lv.5 (no paired synergies), offer 3 distinct High-Realm Scrolls
    const maxed4x4NonMatching = [
      ...Array.from({ length: 5 }, () => 'art_dragon_palm'),
      ...Array.from({ length: 5 }, () => 'art_jade_sword'),
      ...Array.from({ length: 5 }, () => 'art_dog_staff'),
      ...Array.from({ length: 5 }, () => 'art_six_pulse'),
      ...Array.from({ length: 5 }, () => 'qi_iron_cloth'),
      ...Array.from({ length: 5 }, () => 'qi_star_absorb'),
      ...Array.from({ length: 5 }, () => 'qi_solitary_sword'),
      ...Array.from({ length: 5 }, () => 'qi_dragon_elephant'),
    ];
    const endlessCards = rollWuxiaDraftCards(rng, maxed4x4NonMatching, 32, 3);
    assert.equal(endlessCards.length, 3);
    assert.equal(
      endlessCards.every((c) => c.kind === 'enlightenment'),
      true
    );
    assert.equal(new Set(endlessCards.map((c) => c.id)).size, 3);

    const swapped = refreshWuxiaDraftCard(
      rng,
      ['art_dragon_palm'],
      2,
      firstCards.map((c) => c.id),
      firstCards[0]?.id ?? ''
    );
    assert.ok(swapped !== null && swapped.id !== firstCards[0]?.id);
  });

  void it('keeps Secret Synergies hidden until Active Lv.3 + paired Inner Qi Lv.1+, then removes once awakened', () => {
    const partialBuild = ['art_dragon_palm', 'art_dragon_palm', 'qi_nine_yang'];
    const partialLoadout = computeWuxiaLoadout(partialBuild);
    assert.equal(partialLoadout.availableSynergies.length, 0);

    const readyBuild = [
      'art_dragon_palm',
      'art_dragon_palm',
      'art_dragon_palm',
      'qi_nine_yang',
    ];
    const readyLoadout = computeWuxiaLoadout(readyBuild);
    assert.equal(readyLoadout.availableSynergies.length, 1);
    assert.equal(readyLoadout.availableSynergies[0]?.id, 'syn_sovereign_dragon');

    const readyCandidates = buildWuxiaDraftCandidates(readyBuild, 8);
    assert.equal(
      readyCandidates.some(
        (c) => c.option.id === 'syn_sovereign_dragon' && c.option.isSecretAwakening
      ),
      true
    );

    const awakenedBuild = [...readyBuild, 'syn_sovereign_dragon'];
    const awakenedLoadout = computeWuxiaLoadout(awakenedBuild);
    assert.deepEqual(awakenedLoadout.awakenedSynergies, ['syn_sovereign_dragon']);
    assert.equal(awakenedLoadout.availableSynergies.length, 0);

    // Verify stats scale significantly with Inner Qi + Awakened Synergy
    const profile = createInitialProfile('WuxiaTester');
    const baseStats = computeHeroCombatStats(profile, 'warrior', [], 0, 0);
    const synergyStats = computeHeroCombatStats(profile, 'warrior', awakenedBuild, 0, 8);
    assert.ok(synergyStats.maxHp > baseStats.maxHp);
    assert.ok(synergyStats.atk > baseStats.atk);
    assert.ok(synergyStats.armor > baseStats.armor);
  });

  void it('schedules endless Cult Leaders every 10 floors and 2 deterministic random Mini-Bosses per bracket', () => {
    for (const floor of [10, 20, 30, 40, 100]) {
      assert.equal(isCultLeaderFloor(floor), true);
      assert.equal(isRandomMiniBossFloor(floor, 12345), false);
    }
    for (const floor of [1, 4, 9, 11, 19, 25]) {
      assert.equal(isCultLeaderFloor(floor), false);
    }

    const seeds = [101, 2026, 99991, 777777];
    for (const seed of seeds) {
      for (let bracket = 0; bracket < 4; bracket++) {
        const [f1, f2] = getMiniBossFloorsForBracket(bracket, seed);
        const minFloor = bracket * 10 + 2;
        const maxFloor = bracket * 10 + 9;
        assert.ok(f1 >= minFloor && f1 <= maxFloor);
        assert.ok(f2 >= minFloor && f2 <= maxFloor);
        assert.notEqual(f1, f2);
        assert.equal(isRandomMiniBossFloor(f1, seed), true);
        assert.equal(isRandomMiniBossFloor(f2, seed), true);
        assert.equal(isRandomMiniBossFloor(bracket * 10 + 1, seed), false);
      }
    }

    const f10Score = calculateLeaderboardScore(10, 'extracted', 60_000, 500);
    const f20Score = calculateLeaderboardScore(20, 'extracted', 120_000, 1200);
    const f30Score = calculateLeaderboardScore(30, 'extracted', 180_000, 2000);
    assert.ok(f20Score > f10Score);
    assert.ok(f30Score > f20Score);

    // Biomes stay fixed for 10 floors, then randomly switch to a different sect at F11, F21, F31...
    for (const seed of seeds) {
      const b1 = getBiomeForFloor('slime_bog', 1, seed).id;
      const b10 = getBiomeForFloor('slime_bog', 10, seed).id;
      const b11 = getBiomeForFloor('slime_bog', 11, seed).id;
      const b20 = getBiomeForFloor('slime_bog', 20, seed).id;
      const b21 = getBiomeForFloor('slime_bog', 21, seed).id;
      assert.equal(b1, b10);
      assert.equal(b11, b20);
      assert.notEqual(b10, b11);
      assert.notEqual(b20, b21);
    }
  });
});
