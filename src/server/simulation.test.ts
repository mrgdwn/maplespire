import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateSimulationBatch,
  formatEvaluationMarkdown,
  simulateBatch,
} from '../shared/simulation.ts';

void describe('Wuxia Spire Automated Simulation & Evaluation Framework', () => {
  void it('produces deterministic reproducible results for identical seeds in benchmark mode', () => {
    const first = simulateBatch({
      batchId: 'det_test_1',
      runs: 6,
      mode: 'benchmark',
      strategy: 'synergy_hunter',
      baseSeed: 424242,
      maxFloorCap: 35,
    });

    const second = simulateBatch({
      batchId: 'det_test_1',
      runs: 6,
      mode: 'benchmark',
      strategy: 'synergy_hunter',
      baseSeed: 424242,
      maxFloorCap: 35,
    });

    assert.equal(first.runs.length, 6);
    assert.deepEqual(
      first.runs.map((r) => ({
        classId: r.classId,
        floorReached: r.floorReached,
        outcome: r.outcome,
        killedBy: r.killedBy,
        draftedIds: r.draftedIds,
        goldEarned: r.goldEarned,
      })),
      second.runs.map((r) => ({
        classId: r.classId,
        floorReached: r.floorReached,
        outcome: r.outcome,
        killedBy: r.killedBy,
        draftedIds: r.draftedIds,
        goldEarned: r.goldEarned,
      }))
    );
  });

  void it('advances hero levels, gear power, and currencies across campaign runs', () => {
    const batch = simulateBatch({
      batchId: 'campaign_prog_test',
      runs: 10,
      mode: 'campaign',
      strategy: 'balanced',
      baseSeed: 13579,
      maxFloorCap: 50,
    });

    assert.equal(batch.runs.length, 10);
    const totalLevels =
      batch.finalProfile.classes.warrior.level +
      batch.finalProfile.classes.mage.level +
      batch.finalProfile.classes.thief.level +
      batch.finalProfile.classes.bowman.level;
    assert.ok(totalLevels > 4, `Expected combined class levels > 4, got ${totalLevels}`);

    const totalGearPower = batch.runs.reduce((acc, r) => acc + r.gearPowerScore, 0);
    assert.ok(totalGearPower > 0);
    assert.ok(batch.runs[9]!.gearPowerScore >= batch.runs[0]!.gearPowerScore);
  });

  void it('computes valid percentiles, synergy telemetry, lethality metrics, and Markdown evaluation', () => {
    const batch = simulateBatch({
      batchId: 'eval_metrics_test',
      runs: 10,
      mode: 'campaign',
      strategy: 'aggressive',
      baseSeed: 98765,
      maxFloorCap: 45,
    });

    const evalSummary = evaluateSimulationBatch(batch.runs, {
      batchId: 'eval_metrics_test',
      runs: 10,
      mode: 'campaign',
      strategy: 'aggressive',
      baseSeed: 98765,
      maxFloorCap: 45,
    });

    const o = evalSummary.overview;
    assert.equal(o.totalRuns, 10);
    assert.ok(o.minFloor <= o.p25Floor);
    assert.ok(o.p25Floor <= o.medianFloor);
    assert.ok(o.medianFloor <= o.p75Floor);
    assert.ok(o.p75Floor <= o.p90Floor);
    assert.ok(o.p90Floor <= o.maxFloor);
    assert.equal(evalSummary.wuxiaTelemetry.activeArts.length, 14);
    assert.equal(evalSummary.wuxiaTelemetry.secretSynergies.length, 23);
    assert.ok(evalSummary.healthChecks.length >= 4);

    const md = formatEvaluationMarkdown(evalSummary);
    assert.ok(md.includes('# Wuxia Spire Simulation Evaluation Report'));
    assert.ok(md.includes('## 1. Survival Funnel & Floor Distribution'));
    assert.ok(md.includes('## 5. Wuxia Martial Arts & Secret Synergy Telemetry'));
    assert.ok(!md.includes('FD_F1-10'));
  });
});
