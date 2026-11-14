import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALL_BUFFS,
  CORE_BUFFS,
  PRISMATIC_CLASS_BUFFS,
  getBuffById,
  refreshSingleDraftCard,
  rollDraftCards,
} from '../shared/catalogs/buffs.ts';
import { computeHeroCombatStats } from '../shared/catalogs/classes.ts';
import { createInitialProfile } from '../shared/utils.ts';
import {
  applyFrostbiteMeleeChill,
  computeBossChestCount,
  computeBossRouletteCount,
  computeEffectiveAttackSpeed,
  computeElementalProcChance,
  computeEnemySpawnHpMult,
  computeFloorClearHeal,
  computeFloorStartShield,
  resolveActiveSkillCast,
  resolveAttackProcs,
  resolveDotTick,
  resolveEnemyHitHero,
  resolveHealWithOverhealShield,
  resolveHeroHitOnEnemy,
  resolveSpectralPackCompanion,
  resolveVolatileSoulPulse,
  type SimEnemy,
} from '../shared/buffCombat.ts';

const makeEnemy = (overrides: Partial<SimEnemy> = {}): SimEnemy => ({
  id: 1,
  x: 320,
  hp: 500,
  maxHp: 500,
  speed: 60,
  atk: 12,
  isBoss: false,
  isMiniBoss: false,
  chillTimer: 0,
  bleedTimer: 0,
  bleedStacks: 0,
  burnTimer: 0,
  poisonTimer: 0,
  poisonStacks: 0,
  armorShred: 0,
  marks: 0,
  ...overrides,
});

const testedBuffIds = new Set<string>();
const markTested = (...buffIds: string[]): void => {
  for (const id of buffIds) {
    assert.ok(getBuffById(id), `Expected valid buff id "${id}" in ALL_BUFFS`);
    testedBuffIds.add(id);
  }
};

void describe('Wuxia Spire All 44 Buffs Coverage Suite', async () => {
  await it('catalog exposes 44 unique buffs across all 5 tiers and respects class draft locks', () => {
    assert.equal(CORE_BUFFS.length, 32);
    assert.equal(PRISMATIC_CLASS_BUFFS.length, 12);
    assert.equal(ALL_BUFFS.length, 44);

    const uniqueIds = new Set(ALL_BUFFS.map((b) => b.id));
    assert.equal(uniqueIds.size, 44);

    for (const tier of ['bronze', 'silver', 'gold', 'cursed'] as const) {
      assert.equal(
        ALL_BUFFS.filter((b) => b.tier === tier).length,
        8,
        `Expected 8 ${tier} buffs`,
      );
    }
    assert.equal(ALL_BUFFS.filter((b) => b.tier === 'prismatic').length, 12);

    for (const classId of ['warrior', 'mage', 'thief', 'bowman'] as const) {
      for (let floor = 1; floor <= 9; floor += 1) {
        const draftInput = {
          floor,
          rng: () => 0.99,
          classId,
          classLevel: 40,
          banishedIds: [],
          equippedBuffIds: [],
          silverWeightMult: 1,
        };
        const cards = rollDraftCards(draftInput);
        assert.equal(cards.length, 3);
        for (const card of cards) {
          if (card.classId) {
            assert.equal(card.classId, classId);
          }
        }
        const rerolled = refreshSingleDraftCard(draftInput, cards, 0);
        assert.equal(rerolled.length, 3);
        const replacement = rerolled[0];
        assert.ok(replacement);
        if (replacement.classId) {
          assert.equal(replacement.classId, classId);
        }
      }
    }
  });

  await it('covers all 8 Bronze stat & economy buffs', () => {
    const profile = createInitialProfile('BuffTester');
    const base = computeHeroCombatStats(profile, 'warrior', [], 0, 0);

    const edge = computeHeroCombatStats(profile, 'warrior', ['bronze_sharpened_edge'], 0, 0);
    const edgeStacked = computeHeroCombatStats(
      profile,
      'warrior',
      ['bronze_sharpened_edge', 'bronze_sharpened_edge'],
      0,
      0,
    );
    assert.ok(edge.atk > base.atk);
    assert.ok(edgeStacked.atk > edge.atk);
    markTested('bronze_sharpened_edge');

    const swift = computeHeroCombatStats(profile, 'warrior', ['bronze_swift_strikes'], 0, 0);
    assert.ok(swift.attackSpeed > base.attackSpeed);
    markTested('bronze_swift_strikes');

    const hearty = computeHeroCombatStats(profile, 'warrior', ['bronze_hearty_constitution'], 0, 0);
    assert.ok(hearty.maxHp > base.maxHp);
    markTested('bronze_hearty_constitution');

    const ironSkin = computeHeroCombatStats(profile, 'warrior', ['bronze_iron_skin'], 0, 0);
    assert.ok(ironSkin.armor > base.armor);
    markTested('bronze_iron_skin');

    const keenEye = computeHeroCombatStats(profile, 'warrior', ['bronze_keen_eye'], 0, 0);
    assert.ok(Math.abs(keenEye.critRate - (base.critRate + 0.12)) < 1e-6);
    markTested('bronze_keen_eye');

    const lethal = computeHeroCombatStats(profile, 'warrior', ['bronze_lethal_precision'], 0, 0);
    assert.ok(Math.abs(lethal.critDmg - (base.critDmg + 0.35)) < 1e-6);
    markTested('bronze_lethal_precision');

    const windwalker = computeHeroCombatStats(profile, 'warrior', ['bronze_windwalker'], 0, 0);
    assert.ok(Math.abs(windwalker.dodgeRate - (base.dodgeRate + 0.12)) < 1e-6);
    markTested('bronze_windwalker');

    const greed = computeHeroCombatStats(profile, 'warrior', ['bronze_greed_charm'], 0, 0);
    assert.equal(greed.goldBonusPct, base.goldBonusPct + 25);
    markTested('bronze_greed_charm');
  });

  await it('covers all 8 Silver proc, DoT, sustain & stacking buffs', () => {
    const profile = createInitialProfile('SilverTester');
    const stats = computeHeroCombatStats(profile, 'warrior', ['bronze_iron_skin'], 0, 0);

    // 1. silver_static_discharge: every 4th basic attack chains lightning to up to 2 nearby enemies
    const enemiesForStatic = [
      makeEnemy({ id: 1, x: 300, hp: 200 }),
      makeEnemy({ id: 2, x: 360, hp: 10 }), // killed by static chain
      makeEnemy({ id: 3, x: 420, hp: 200 }),
      makeEnemy({ id: 4, x: 450, hp: 200 }), // beyond 2-target cap
    ];
    const notFourth = resolveAttackProcs({
      attackCount: 3,
      targetId: 1,
      enemies: enemiesForStatic,
      stats,
      draftedBuffIds: ['silver_static_discharge'],
    });
    assert.equal(notFourth.staticChainHits, 0);

    const fourth = resolveAttackProcs({
      attackCount: 4,
      targetId: 1,
      enemies: enemiesForStatic,
      stats,
      draftedBuffIds: ['silver_static_discharge'],
    });
    assert.equal(fourth.staticChainHits, 2);
    assert.deepEqual(fourth.killedIds, [2]);
    assert.equal(fourth.enemies.some((e) => e.id === 2), false);
    markTested('silver_static_discharge');

    // 2. silver_vampiric_touch: crit heals 2% max HP and enforces 0.5s cooldown
    const vampReady = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy()],
      stats,
      draftedBuffIds: ['silver_vampiric_touch'],
      heroHp: 100,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: true,
    });
    assert.equal(vampReady.heroHeal, Math.round(stats.maxHp * 0.02));
    assert.equal(vampReady.newVampiricTouchCd, 0.5);

    const vampOnCd = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy()],
      stats,
      draftedBuffIds: ['silver_vampiric_touch'],
      heroHp: 100,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0.4,
      runGold: 0,
      forceCrit: true,
    });
    assert.equal(vampOnCd.heroHeal, 0);
    markTested('silver_vampiric_touch');

    // 3. silver_second_wind: 15% base + 12% per stack, 0 while fasting
    assert.equal(computeFloorClearHeal(1000, [], 0), 150);
    assert.equal(computeFloorClearHeal(1000, ['silver_second_wind'], 0), 270);
    assert.equal(computeFloorClearHeal(1000, ['silver_second_wind', 'silver_second_wind'], 0), 390);
    assert.equal(computeFloorClearHeal(1000, ['silver_second_wind'], 2), 0);
    markTested('silver_second_wind');

    // 4. silver_serrated_wounds: stacks bleed up to 5 and deals 15% ATK per stack
    let bleedEnemy = makeEnemy({ id: 1, hp: 500 });
    for (let i = 0; i < 6; i += 1) {
      const res = resolveHeroHitOnEnemy({
        targetId: 1,
        enemies: [bleedEnemy],
        stats,
        draftedBuffIds: ['silver_serrated_wounds'],
        heroHp: stats.maxHp,
        heroX: 120,
        unhitTimer: 0,
        vampiricTouchCd: 0,
        runGold: 0,
      });
      assert.ok(res.enemies[0]);
      bleedEnemy = res.enemies[0];
    }
    assert.equal(bleedEnemy.bleedStacks, 5);
    const bleedTick = resolveDotTick(bleedEnemy, 100, ['silver_serrated_wounds']);
    assert.equal(bleedTick.bleedDamage, 75);
    markTested('silver_serrated_wounds');

    // 5. silver_frostbite_aura: chills melee enemies <= 165px and increases hit damage by 12%
    const chilled = applyFrostbiteMeleeChill(
      [makeEnemy({ id: 1, x: 250 }), makeEnemy({ id: 2, x: 420 })],
      120,
      ['silver_frostbite_aura'],
    );
    assert.ok((chilled[0]?.chillTimer ?? 0) >= 0.25);
    assert.equal(chilled[1]?.chillTimer, 0);

    const noAuraHit = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ id: 1, chillTimer: 1 })],
      stats,
      draftedBuffIds: [],
      heroHp: stats.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    const auraHit = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ id: 1, chillTimer: 1 })],
      stats,
      draftedBuffIds: ['silver_frostbite_aura'],
      heroHp: stats.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    assert.ok(auraHit.damageDealt > noAuraHit.damageDealt);
    markTested('silver_frostbite_aura');

    // 6. silver_echo_strike: procs under 0.25 threshold, skips above
    const echoHit = resolveAttackProcs({
      attackCount: 1,
      targetId: 1,
      enemies: [makeEnemy()],
      stats,
      draftedBuffIds: ['silver_echo_strike'],
      roll: () => 0.1,
    });
    const echoMiss = resolveAttackProcs({
      attackCount: 1,
      targetId: 1,
      enemies: [makeEnemy()],
      stats,
      draftedBuffIds: ['silver_echo_strike'],
      roll: () => 0.8,
    });
    assert.equal(echoHit.echoTriggered, true);
    assert.equal(echoMiss.echoTriggered, false);
    markTested('silver_echo_strike');

    // 7. silver_thornmail_plating: reflects 80% armor and kills attacker reaching 0 HP
    const reflectResult = resolveEnemyHitHero(makeEnemy({ id: 9, hp: 15 }), 25, [
      'silver_thornmail_plating',
    ]);
    assert.equal(reflectResult.reflectedDamage, 20);
    assert.equal(reflectResult.killed, true);
    assert.equal(reflectResult.attacker.hp, 0);
    markTested('silver_thornmail_plating');

    // 8. silver_battle_momentum: +5% AS per stack capped at 5 stacks (+0.25)
    const as0 = computeEffectiveAttackSpeed(stats, ['silver_battle_momentum'], 0, 0);
    const as3 = computeEffectiveAttackSpeed(stats, ['silver_battle_momentum'], 0, 3);
    const as9 = computeEffectiveAttackSpeed(stats, ['silver_battle_momentum'], 0, 9);
    assert.ok(Math.abs(as3 - (as0 + 0.15)) < 1e-4);
    assert.ok(Math.abs(as9 - (as0 + 0.25)) < 1e-4);
    markTested('silver_battle_momentum');
  });

  await it('covers all 8 Gold buffs including Stormcaller secondary-kill regression', () => {
    const profile = createInitialProfile('GoldTester');
    const base = computeHeroCombatStats(profile, 'warrior', [], 0, 0);

    // 1. gold_stormcaller_conduit: crit triggers 120% ATK sky-bolt <= 95px & removes dead mobs
    const stormTarget = makeEnemy({ id: 1, x: 300, hp: 900 });
    const nearbyWeakMob = makeEnemy({ id: 2, x: 380, hp: 10 }); // within 95px -> killed
    const nearbyToughMob = makeEnemy({ id: 3, x: 240, hp: 400 }); // within 95px -> damaged
    const farMob = makeEnemy({ id: 4, x: 450, hp: 10 }); // > 95px -> untouched

    const stormRes = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [stormTarget, nearbyWeakMob, nearbyToughMob, farMob],
      stats: base,
      draftedBuffIds: ['gold_stormcaller_conduit'],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: true,
    });
    assert.equal(stormRes.stormcallerHits, 2);
    assert.deepEqual(stormRes.killedIds, [2]);
    assert.equal(stormRes.enemies.some((e) => e.id === 2), false);
    const remainingFar = stormRes.enemies.find((e) => e.id === 4);
    assert.equal(remainingFar?.hp, 10);
    markTested('gold_stormcaller_conduit');

    // 2. gold_fortress_of_might: adds 50% of Armor to Base ATK
    const ironOnly = computeHeroCombatStats(profile, 'warrior', ['bronze_iron_skin'], 0, 0);
    const fortress = computeHeroCombatStats(
      profile,
      'warrior',
      ['bronze_iron_skin', 'gold_fortress_of_might'],
      0,
      0,
    );
    assert.ok(fortress.atk > ironOnly.atk);
    markTested('gold_fortress_of_might');

    // 3. gold_executioners_verdict: executes non-bosses <= 18% HP; +30% dmg to bosses <= 30% HP
    const weakTrash = makeEnemy({ id: 10, maxHp: 1000, hp: 180, isBoss: false });
    const execRes = resolveHeroHitOnEnemy({
      targetId: 10,
      enemies: [weakTrash],
      stats: base,
      draftedBuffIds: ['gold_executioners_verdict'],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    assert.deepEqual(execRes.killedIds, [10]);

    const woundedBoss = makeEnemy({ id: 11, maxHp: 10000, hp: 2500, isBoss: true });
    const bossPlain = resolveHeroHitOnEnemy({
      targetId: 11,
      enemies: [woundedBoss],
      stats: base,
      draftedBuffIds: [],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    const bossExec = resolveHeroHitOnEnemy({
      targetId: 11,
      enemies: [woundedBoss],
      stats: base,
      draftedBuffIds: ['gold_executioners_verdict'],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    assert.ok(bossExec.damageDealt > bossPlain.damageDealt);
    markTested('gold_executioners_verdict');

    // 4. gold_overclocked_core: -30% CDR on stats and 0.7x cooldown on active skill cast
    const oc = computeHeroCombatStats(profile, 'mage', ['gold_overclocked_core'], 0, 0);
    assert.ok(oc.cooldownReductionPct >= 30);
    assert.equal(resolveActiveSkillCast(2.0, ['gold_overclocked_core']).skillCooldownMult, 0.7);
    markTested('gold_overclocked_core');

    // 5. gold_mid_run_midas: +1% All DMG per 500 run gold
    const midas0 = computeHeroCombatStats(profile, 'warrior', ['gold_mid_run_midas'], 0, 0);
    const midas2500 = computeHeroCombatStats(profile, 'warrior', ['gold_mid_run_midas'], 2500, 0);
    assert.ok(Math.abs(midas2500.allDamageMult - (midas0.allDamageMult + 0.05)) < 1e-6);
    markTested('gold_mid_run_midas');

    // 6. gold_glass_tempest: +45% AS & +25% Crit DMG when unhit >= 3s
    const tempestInactive = computeEffectiveAttackSpeed(base, ['gold_glass_tempest'], 2.9, 0);
    const tempestActive = computeEffectiveAttackSpeed(base, ['gold_glass_tempest'], 3.0, 0);
    assert.ok(Math.abs(tempestActive - (tempestInactive + 0.45)) < 1e-4);

    const tempestNoCritBonus = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: base,
      draftedBuffIds: ['gold_glass_tempest'],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 2,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: true,
    });
    const tempestCritBonus = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: base,
      draftedBuffIds: ['gold_glass_tempest'],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 3.1,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: true,
    });
    assert.ok(tempestCritBonus.damageDealt > tempestNoCritBonus.damageDealt);
    markTested('gold_glass_tempest');

    // 7. gold_aegis_bastion: +30% Max HP floor-start shield
    assert.equal(computeFloorStartShield(1000, ['gold_aegis_bastion']), 300);
    markTested('gold_aegis_bastion');

    // 8. gold_elemental_overload: 2x proc chance and +50% burn damage
    assert.equal(computeElementalProcChance(0.25, ['gold_elemental_overload']), 0.5);
    assert.equal(computeElementalProcChance(0.75, ['gold_elemental_overload']), 1);
    const burningMob = makeEnemy({ hp: 500, burnTimer: 3 });
    const burnBase = resolveDotTick(burningMob, 100, []);
    const burnOverloaded = resolveDotTick(burningMob, 100, ['gold_elemental_overload']);
    assert.equal(burnBase.burnDamage, 30);
    assert.equal(burnOverloaded.burnDamage, 45);
    markTested('gold_elemental_overload');
  });

  await it('covers all 8 Cursed risk/reward buffs', () => {
    const profile = createInitialProfile('CursedTester');
    const base = computeHeroCombatStats(profile, 'thief', [], 0, 0);

    // 1. cursed_pact_of_carnage: +75% All DMG, +20% damage taken
    const pact = computeHeroCombatStats(profile, 'thief', ['cursed_pact_of_carnage'], 0, 0);
    assert.ok(Math.abs(pact.allDamageMult - (base.allDamageMult + 0.75)) < 1e-6);
    assert.ok(Math.abs(pact.damageTakenMult - (base.damageTakenMult + 0.2)) < 1e-6);
    markTested('cursed_pact_of_carnage');

    // 2. cursed_bloodlust_frenzy: +AS, +10% lifesteal, -25% Max HP
    const bloodlust = computeHeroCombatStats(profile, 'thief', ['cursed_bloodlust_frenzy'], 0, 0);
    assert.ok(bloodlust.attackSpeed > base.attackSpeed);
    assert.equal(bloodlust.lifestealPct, base.lifestealPct + 10);
    assert.ok(bloodlust.maxHp < base.maxHp);
    markTested('cursed_bloodlust_frenzy');

    // 3. cursed_gilded_avarice: +100% Gold bonus, +1 boss chest, +25% enemy HP
    const avarice = computeHeroCombatStats(profile, 'thief', ['cursed_gilded_avarice'], 0, 0);
    assert.equal(avarice.goldBonusPct, base.goldBonusPct + 100);
    assert.equal(computeBossChestCount([]), 1);
    assert.equal(computeBossChestCount(['cursed_gilded_avarice']), 2);
    assert.equal(computeEnemySpawnHpMult(['cursed_gilded_avarice']), 1.25);
    markTested('cursed_gilded_avarice');

    // 4. cursed_reckless_gamble: +40% Crit Rate, non-crits deal 50% less damage
    const gamble = computeHeroCombatStats(profile, 'thief', ['cursed_reckless_gamble'], 0, 0);
    assert.ok(Math.abs(gamble.critRate - Math.min(1, base.critRate + 0.4)) < 1e-6);
    const plainHit = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: base,
      draftedBuffIds: [],
      heroHp: base.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    const gambleNonCrit = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: gamble,
      draftedBuffIds: ['cursed_reckless_gamble'],
      heroHp: gamble.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
      forceCrit: false,
    });
    assert.ok(gambleNonCrit.damageDealt < plainHit.damageDealt);
    markTested('cursed_reckless_gamble');

    // 5. cursed_fasting_vow: +20% All DMG per cleared floor, blocks healing while fasting > 0
    const fasting0 = computeHeroCombatStats(profile, 'thief', ['cursed_fasting_vow'], 0, 0);
    const fasting3 = computeHeroCombatStats(profile, 'thief', ['cursed_fasting_vow'], 0, 3);
    assert.ok(Math.abs(fasting3.allDamageMult - (fasting0.allDamageMult + 0.6)) < 1e-6);
    assert.equal(computeFloorClearHeal(1000, [], 2), 0);
    assert.equal(resolveHealWithOverhealShield(200, 0, 1000, 300, 2, []).healed, 0);
    markTested('cursed_fasting_vow');

    // 6. cursed_berserkers_tunnel: +85% ATK, cuts Dodge and Armor
    const baselineWithWind = computeHeroCombatStats(profile, 'thief', ['bronze_windwalker'], 0, 0);
    const tunnel = computeHeroCombatStats(
      profile,
      'thief',
      ['bronze_windwalker', 'cursed_berserkers_tunnel'],
      0,
      0,
    );
    assert.ok(tunnel.atk > baselineWithWind.atk);
    assert.ok(tunnel.armor < baselineWithWind.armor);
    assert.ok(tunnel.dodgeRate < baselineWithWind.dodgeRate);
    markTested('cursed_berserkers_tunnel');

    // 7. cursed_volatile_soul: drains 2% current HP down to min 1 HP & deals 180% ATK AoE
    const volatile = resolveVolatileSoulPulse(
      500,
      100,
      1,
      [makeEnemy({ id: 1, hp: 150 }), makeEnemy({ id: 2, hp: 500 })],
      ['cursed_volatile_soul'],
    );
    assert.equal(volatile.heroHp, 490);
    assert.equal(volatile.aoeDamage, 180);
    assert.deepEqual(volatile.killedIds, [1]);
    assert.equal(volatile.enemies.length, 1);
    assert.equal(volatile.enemies[0]?.hp, 320);

    const floorClamp = resolveVolatileSoulPulse(1, 100, 1, [], ['cursed_volatile_soul']);
    assert.equal(floorClamp.heroHp, 1);
    markTested('cursed_volatile_soul');

    // 8. cursed_double_edged_fate: +30% All DMG and +1 extra Floor 10 Boss Mutation
    const fate = computeHeroCombatStats(profile, 'thief', ['cursed_double_edged_fate'], 0, 0);
    assert.ok(Math.abs(fate.allDamageMult - (base.allDamageMult + 0.3)) < 1e-6);
    assert.equal(computeBossRouletteCount(4, ['cursed_double_edged_fate']), 1);
    assert.equal(computeBossRouletteCount(10, []), 1);
    assert.equal(computeBossRouletteCount(10, ['cursed_double_edged_fate']), 2);
    markTested('cursed_double_edged_fate');
  });

  await it('covers all 12 Prismatic class-exclusive buffs (Warrior, Mage, Thief, Bowman)', () => {
    const profile = createInitialProfile('PrismaticTester');
    const warStats = computeHeroCombatStats(profile, 'warrior', [], 0, 0);
    const mageStats = computeHeroCombatStats(profile, 'mage', [], 0, 0);
    const thiefStats = computeHeroCombatStats(profile, 'thief', [], 0, 0);
    const bowStats = computeHeroCombatStats(profile, 'bowman', [], 0, 0);

    // Warrior 1: prism_war_blood_shield (overheal becomes shield capped at 45% Max HP)
    const overhealRes = resolveHealWithOverhealShield(950, 0, 1000, 200, 0, ['prism_war_blood_shield']);
    assert.equal(overhealRes.heroHp, 1000);
    assert.equal(overhealRes.healed, 50);
    assert.equal(overhealRes.shieldGained, 150);
    assert.equal(overhealRes.heroShield, 150);

    const cappedRes = resolveHealWithOverhealShield(1000, 400, 1000, 200, 0, ['prism_war_blood_shield']);
    assert.equal(cappedRes.heroShield, 450);
    markTested('prism_war_blood_shield');

    // Warrior 2: prism_war_titan_cleave (65% cleave to nearby enemies <= 180px from hero)
    const cleaveRes = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [
        makeEnemy({ id: 1, x: 200, hp: 500 }),
        makeEnemy({ id: 2, x: 260, hp: 5 }), // killed by cleave
        makeEnemy({ id: 3, x: 400, hp: 500 }), // > 180px from heroX=120
      ],
      stats: warStats,
      draftedBuffIds: ['prism_war_titan_cleave'],
      heroHp: warStats.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
    });
    assert.equal(cleaveRes.cleaveHits, 1);
    assert.deepEqual(cleaveRes.killedIds, [2]);
    assert.equal(cleaveRes.enemies.find((e) => e.id === 3)?.hp, 500);
    markTested('prism_war_titan_cleave');

    // Warrior 3: prism_war_undying_rage (bonus damage as HP drops)
    const fullHpRage = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: warStats,
      draftedBuffIds: ['prism_war_undying_rage'],
      heroHp: warStats.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
    });
    const lowHpRage = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ hp: 5000 })],
      stats: warStats,
      draftedBuffIds: ['prism_war_undying_rage'],
      heroHp: Math.max(1, Math.round(warStats.maxHp * 0.1)),
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 0,
    });
    assert.ok(lowHpRage.damageDealt > fullHpRage.damageDealt);
    markTested('prism_war_undying_rage');

    // Mage 1: prism_mage_tri_elemental (cycles Burn -> Chill -> Shock)
    const atk1 = resolveAttackProcs({
      attackCount: 1,
      targetId: 1,
      enemies: [makeEnemy({ hp: 500 })],
      stats: mageStats,
      draftedBuffIds: ['prism_mage_tri_elemental'],
    });
    const atk2 = resolveAttackProcs({
      attackCount: 2,
      targetId: 1,
      enemies: [makeEnemy({ hp: 500 })],
      stats: mageStats,
      draftedBuffIds: ['prism_mage_tri_elemental'],
    });
    const atk3 = resolveAttackProcs({
      attackCount: 3,
      targetId: 1,
      enemies: [makeEnemy({ hp: 5 })],
      stats: mageStats,
      draftedBuffIds: ['prism_mage_tri_elemental'],
    });
    assert.deepEqual(atk1.triElementalEffects, ['burn']);
    assert.deepEqual(atk2.triElementalEffects, ['chill']);
    assert.deepEqual(atk3.triElementalEffects, ['shock']);
    assert.deepEqual(atk3.killedIds, [1]);
    markTested('prism_mage_tri_elemental');

    // Mage 2: prism_mage_spell_echo (active skill fires a 65% second echo)
    const skillEcho = resolveActiveSkillCast(2, ['prism_mage_spell_echo']);
    assert.deepEqual(skillEcho.hitMultipliers, [2, 1.3]);
    markTested('prism_mage_spell_echo');

    // Mage 3: prism_mage_mana_barrier (25% floor shield + 20% skill shield)
    assert.equal(computeFloorStartShield(1000, ['prism_mage_mana_barrier']), 250);
    assert.equal(resolveActiveSkillCast(2, ['prism_mage_mana_barrier']).manaBarrierShieldPct, 0.2);
    markTested('prism_mage_mana_barrier');

    // Thief 1: prism_thief_shadow_partner (duplicate strike proc)
    const shadowProc = resolveAttackProcs({
      attackCount: 1,
      targetId: 1,
      enemies: [makeEnemy()],
      stats: thiefStats,
      draftedBuffIds: ['prism_thief_shadow_partner'],
      roll: () => 0.15,
    });
    assert.equal(shadowProc.shadowPartnerTriggered, true);
    markTested('prism_thief_shadow_partner');

    // Thief 2: prism_thief_fatal_venom (poison crits for 1.65x damage)
    const poisonedMob = makeEnemy({ hp: 500, poisonTimer: 3, poisonStacks: 4 });
    const venomNonCrit = resolveDotTick(poisonedMob, 100, ['prism_thief_fatal_venom'], false);
    const venomCrit = resolveDotTick(poisonedMob, 100, ['prism_thief_fatal_venom'], true);
    assert.equal(venomNonCrit.poisonDamage, 48);
    assert.equal(venomCrit.poisonDamage, 79);
    markTested('prism_thief_fatal_venom');

    // Thief 3: prism_thief_coin_toss (AoE splash scaled by run gold + +4 gold delta)
    const coinRes = resolveHeroHitOnEnemy({
      targetId: 1,
      enemies: [makeEnemy({ id: 1, x: 300, hp: 500 }), makeEnemy({ id: 2, x: 350, hp: 20 })],
      stats: thiefStats,
      draftedBuffIds: ['prism_thief_coin_toss'],
      heroHp: thiefStats.maxHp,
      heroX: 120,
      unhitTimer: 0,
      vampiricTouchCd: 0,
      runGold: 1000,
    });
    assert.equal(coinRes.runGoldDelta, 4);
    assert.ok((coinRes.enemies.find((e) => e.id === 2)?.hp ?? 20) < 20);
    markTested('prism_thief_coin_toss');

    // Bowman 1: prism_bow_split_arrow (+2 bonus arrows on proc)
    const split = resolveAttackProcs({
      attackCount: 1,
      targetId: 1,
      enemies: [makeEnemy()],
      stats: bowStats,
      draftedBuffIds: ['prism_bow_split_arrow'],
      roll: () => 0.2,
    });
    assert.equal(split.bonusProjectiles, 2);
    markTested('prism_bow_split_arrow');

    // Bowman 2: prism_bow_spectral_pack (summons spectral wolf strike for bowman)
    const wolfBow = resolveSpectralPackCompanion('bowman', ['prism_bow_spectral_pack'], 100);
    const wolfWar = resolveSpectralPackCompanion('warrior', ['prism_bow_spectral_pack'], 100);
    assert.equal(wolfBow.wolfActive, true);
    assert.equal(wolfBow.wolfDamage, 115);
    assert.equal(wolfWar.wolfActive, false);
    markTested('prism_bow_spectral_pack');

    // Bowman 3: prism_bow_snipers_mark (3 marks detonate for 220% ATK burst)
    let markEnemy = makeEnemy({ id: 1, hp: 1000 });
    for (let i = 0; i < 2; i += 1) {
      const m = resolveAttackProcs({
        attackCount: i + 1,
        targetId: 1,
        enemies: [markEnemy],
        stats: bowStats,
        draftedBuffIds: ['prism_bow_snipers_mark'],
        forceSnipersMark: true,
      });
      assert.equal(m.snipersMarkTriggered, false);
      assert.ok(m.enemies[0]);
      markEnemy = m.enemies[0];
    }
    const burst = resolveAttackProcs({
      attackCount: 3,
      targetId: 1,
      enemies: [markEnemy],
      stats: bowStats,
      draftedBuffIds: ['prism_bow_snipers_mark'],
      forceSnipersMark: true,
    });
    assert.equal(burst.snipersMarkTriggered, true);
    assert.ok((burst.enemies[0]?.hp ?? 1000) < markEnemy.hp);
    assert.equal(burst.enemies[0]?.marks, 0);
    markTested('prism_bow_snipers_mark');
  });

  await it('enforces 100% coverage across every buff ID in ALL_BUFFS (44 / 44)', () => {
    const missing = ALL_BUFFS.filter((b) => !testedBuffIds.has(b.id)).map((b) => b.id);
    assert.deepEqual(missing, [], `Missing tests for buffs: ${missing.join(', ')}`);
    assert.equal(testedBuffIds.size, ALL_BUFFS.length);
  });
});
