import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeHeroCombatStats } from '../shared/catalogs/classes.ts';
import {
  ALL_WUXIA_MANUALS,
  WUXIA_ACTIVE_ARTS,
  WUXIA_ENLIGHTENMENT_SCROLLS,
  WUXIA_INNER_QI,
  WUXIA_MAX_ACTIVE_SLOTS,
  WUXIA_MAX_INNER_QI_SLOTS,
  WUXIA_SECRET_SYNERGIES,
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
    assert.equal(WUXIA_ACTIVE_ARTS.length, 6);
    assert.equal(WUXIA_INNER_QI.length, 8);
    assert.equal(WUXIA_SECRET_SYNERGIES.length, 6);
    assert.equal(WUXIA_ENLIGHTENMENT_SCROLLS.length, 3);

    const uniqueIds = new Set(ALL_WUXIA_MANUALS.map((m) => m.id));
    assert.equal(uniqueIds.size, ALL_WUXIA_MANUALS.length);

    for (const syn of WUXIA_SECRET_SYNERGIES) {
      assert.ok(getWuxiaActiveArtById(syn.activeId), `Missing active art ${syn.activeId}`);
      assert.ok(getWuxiaInnerQiById(syn.innerQiId), `Missing inner qi ${syn.innerQiId}`);
      assert.ok(syn.riddleHint.length > 10);
    }
  });

  void it('enforces 3 Active Martial Art slots, 3 Inner Qi slots, and Lv.1 -> Lv.3 progression', () => {
    const drafted = [
      'art_dragon_palm',
      'art_dragon_palm',
      'art_jade_sword',
      'art_dog_staff',
      'art_heavy_iron', // 4th distinct active should be ignored by slot cap
      'art_dragon_palm',
      'art_dragon_palm', // 4th copy caps at Lv.3
      'qi_nine_yang',
      'qi_nine_yin',
      'qi_heaven_earth',
      'qi_iron_cloth', // 4th distinct qi should be ignored by slot cap
    ];

    const loadout = computeWuxiaLoadout(drafted);
    assert.equal(loadout.actives.length, WUXIA_MAX_ACTIVE_SLOTS);
    assert.equal(loadout.innerQis.length, WUXIA_MAX_INNER_QI_SLOTS);
    assert.equal(loadout.activeLevels.art_dragon_palm, 3);
    assert.equal(loadout.activeLevels.art_heavy_iron, undefined);
    assert.equal(loadout.innerQiLevels.qi_iron_cloth, undefined);

    const candidates = buildWuxiaDraftCandidates(drafted, 5);
    assert.equal(
      candidates.some((c) => c.option.id === 'art_heavy_iron'),
      false,
      'Unowned 4th active art must not be offered when 3 Active slots are full'
    );
    assert.equal(
      candidates.some((c) => c.option.id === 'qi_iron_cloth'),
      false,
      'Unowned 4th inner qi must not be offered when 3 Qi slots are full'
    );
  });

  void it('guarantees at least one Active Martial Art on empty Floor 1 start and backfills endless Enlightenment', () => {
    const rng = mulberry32(4242);
    const firstCards = rollWuxiaDraftCards(rng, [], 1, 3);
    assert.equal(firstCards.length, 3);
    assert.equal(
      firstCards.some((c) => c.kind === 'active'),
      true,
      'Classless wanderer draft #1 must include at least one Active Martial Art'
    );

    // Fully max 3 actives + 3 non-synergizing inner Qis to verify Enlightenment endless backfill
    const maxedNonMatching = [
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
    const endlessCards = rollWuxiaDraftCards(rng, maxedNonMatching, 25, 3);
    assert.equal(endlessCards.length, 3);
    assert.equal(
      endlessCards.every((c) => c.kind === 'enlightenment'),
      true
    );

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
  });
});
