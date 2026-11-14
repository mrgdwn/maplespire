import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  evaluateSimulationBatch,
  formatEvaluationMarkdown,
  simulateBatch,
  type SimMode,
  type SimStrategy,
  type SimulatedRunRecord,
} from '../shared/simulation.ts';
import type { ClassId } from '../shared/types.ts';
import { isClassId, isNumber, isRecord, isString } from '../shared/utils.ts';

type ParsedCliArgs = {
  runs: number;
  mode: SimMode;
  strategy: SimStrategy;
  strategyExplicit: boolean;
  baseSeed: number;
  maxFloorCap: number;
  classId?: ClassId | undefined;
  batches: number;
  intervalSec: number;
  outDir: string;
};

const ALL_STRATEGIES: readonly SimStrategy[] = [
  'synergy_hunter',
  'balanced',
  'aggressive',
  'immortal_tank',
];

const parseStrategy = (val: string | undefined): SimStrategy | null => {
  if (
    val === 'synergy_hunter' ||
    val === 'balanced' ||
    val === 'aggressive' ||
    val === 'immortal_tank'
  ) {
    return val;
  }
  return null;
};

const parseMode = (val: string | undefined): SimMode | null => {
  if (val === 'campaign' || val === 'benchmark') return val;
  return null;
};

const parseCliArgs = (argv: readonly string[]): ParsedCliArgs => {
  let runs = 20;
  let mode: SimMode = 'campaign';
  let strategy: SimStrategy = 'synergy_hunter';
  let strategyExplicit = false;
  let baseSeed = Date.now();
  let maxFloorCap = 80;
  let classId: ClassId | undefined;
  let batches = 1;
  let intervalSec = 0;
  let outDir = 'sim-results';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (!arg || !next) continue;

    if (arg === '--runs') {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n) && n > 0) runs = n;
      i += 1;
    } else if (arg === '--mode') {
      const parsed = parseMode(next);
      if (parsed) mode = parsed;
      i += 1;
    } else if (arg === '--strategy') {
      const parsed = parseStrategy(next);
      if (parsed) {
        strategy = parsed;
        strategyExplicit = true;
      }
      i += 1;
    } else if (arg === '--seed') {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n)) baseSeed = n;
      i += 1;
    } else if (arg === '--max-floor') {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n) && n >= 10) maxFloorCap = n;
      i += 1;
    } else if (arg === '--class') {
      if (isClassId(next)) classId = next;
      i += 1;
    } else if (arg === '--batches') {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n) && n >= 1) batches = n;
      i += 1;
    } else if (arg === '--interval-sec') {
      const n = Number.parseInt(next, 10);
      if (Number.isFinite(n) && n >= 0) intervalSec = n;
      i += 1;
    } else if (arg === '--out-dir') {
      if (next.trim().length > 0) outDir = next.trim();
      i += 1;
    }
  }

  return {
    runs,
    mode,
    strategy,
    strategyExplicit,
    baseSeed,
    maxFloorCap,
    classId,
    batches,
    intervalSec,
    outDir,
  };
};

const isSimulatedRunRecord = (val: unknown): val is SimulatedRunRecord => {
  if (!isRecord(val)) return false;
  return (
    isString(val.batchId) &&
    isNumber(val.runIndex) &&
    isNumber(val.seed) &&
    isClassId(val.classId) &&
    isNumber(val.floorReached) &&
    isNumber(val.floorsCleared)
  );
};

const loadHistoryRecords = (historyPath: string): SimulatedRunRecord[] => {
  if (!existsSync(historyPath)) return [];
  const raw = readFileSync(historyPath, 'utf8');
  const records: SimulatedRunRecord[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isSimulatedRunRecord(parsed)) {
        records.push(parsed);
      }
    } catch {
      // Skip malformed line in ledger
    }
  }
  return records;
};

const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });

const runCli = async (): Promise<void> => {
  const args = parseCliArgs(process.argv.slice(2));
  const outRoot = resolve(process.cwd(), args.outDir);
  const batchesDir = join(outRoot, 'batches');
  const historyPath = join(outRoot, 'runs-history.jsonl');
  const latestBatchPath = join(outRoot, 'latest-batch.json');
  const latestReportPath = join(outRoot, 'latest-report.md');
  const historyReportPath = join(outRoot, 'history-report.md');

  mkdirSync(batchesDir, { recursive: true });

  const sessionRuns: SimulatedRunRecord[] = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (let b = 0; b < args.batches; b += 1) {
    const batchStrategy: SimStrategy =
      args.batches > 1 && !args.strategyExplicit
        ? ALL_STRATEGIES[b % ALL_STRATEGIES.length] ?? args.strategy
        : args.strategy;
    const batchSeed = args.baseSeed + b * 100_003;
    const batchId = `${stamp}_b${b + 1}_${args.mode}_${batchStrategy}_r${args.runs}`;

    const startedAt = Date.now();
    const result = simulateBatch({
      batchId,
      runs: args.runs,
      mode: args.mode,
      strategy: batchStrategy,
      baseSeed: batchSeed,
      maxFloorCap: args.maxFloorCap,
      classId: args.classId,
    });
    const elapsedMs = Date.now() - startedAt;

    sessionRuns.push(...result.runs);

    const jsonlLines = `${result.runs.map((r) => JSON.stringify(r)).join('\n')}\n`;
    appendFileSync(historyPath, jsonlLines, 'utf8');

    const batchPayload = JSON.stringify(
      {
        summary: result.summary,
        runs: result.runs,
      },
      null,
      2
    );
    writeFileSync(join(batchesDir, `${batchId}.json`), batchPayload, 'utf8');
    writeFileSync(latestBatchPath, batchPayload, 'utf8');

    const reportMd = formatEvaluationMarkdown(result.summary);
    writeFileSync(latestReportPath, reportMd, 'utf8');

    const o = result.summary.overview;
    console.log(
      `[Batch ${b + 1}/${args.batches}] ${batchId} (${elapsedMs}ms) | Avg F${o.avgFloor} | Med F${o.medianFloor} | Max F${o.maxFloor} | F10: ${o.f10ClearRatePct}% | F20: ${o.f20ReachRatePct}% | F30: ${o.f30ReachRatePct}% | Syn: ${result.summary.wuxiaTelemetry.anySynergyRatePct}%`
    );

    if (b + 1 < args.batches && args.intervalSec > 0) {
      await sleepMs(args.intervalSec * 1000);
    }
  }

  const allHistory = loadHistoryRecords(historyPath);
  if (allHistory.length > 0) {
    const historySummary = evaluateSimulationBatch(allHistory, {
      batchId: `cumulative_${allHistory.length}_runs`,
      runs: allHistory.length,
      mode: args.mode,
      strategy: args.strategy,
      baseSeed: args.baseSeed,
      maxFloorCap: args.maxFloorCap,
    });
    writeFileSync(historyReportPath, formatEvaluationMarkdown(historySummary), 'utf8');
    console.log(
      `\nLedger updated: ${allHistory.length} total tracked runs in ${historyPath}`
    );
    console.log(`Latest report: ${latestReportPath}`);
    console.log(`Cumulative report: ${historyReportPath}`);
  }
};

void runCli().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Simulation CLI failed: ${msg}`);
  process.exitCode = 1;
});
