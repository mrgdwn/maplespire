import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  getBiomeById,
  getBiomeForFloor,
  getEndBossNameForFloor,
  getMiniBossForFloor,
  getMutationById,
} from '../../shared/catalogs/biomes.ts';
import { computeHeroCombatStats } from '../../shared/catalogs/classes.ts';
import {
  computeWuxiaLoadout,
  getActiveAwakenedSynergy,
  getWuxiaActiveArtById,
  getWuxiaInnerQiById,
  isCultLeaderFloor,
  isRandomMiniBossFloor,
  type WuxiaArtStyle,
} from '../../shared/catalogs/wuxia.ts';
import {
  computeBossChestCount,
  computeBossRouletteCount,
  computeEnemySpawnHpMult,
  computeFloorClearHeal,
  computeFloorStartShield,
} from '../../shared/buffCombat.ts';
import { getHybridElement } from '../../shared/catalogs/legendaries.ts';
import type {
  BiomeDefinition,
  BiomeMechanicId,
} from '../../shared/catalogs/biomes.ts';
import type {
  ClassId,
  ComputedHeroStats,
  DailySectDecree,
  ElementId,
  GearSlot,
  MutationId,
  RunOutcome,
} from '../../shared/types.ts';
import { getDailySectDecree, getUtcDateKey, mulberry32 } from '../../shared/utils.ts';
import { getGearVisualStyle, registerPixelTextures } from '../fx/pixelArt.ts';
import { musicFX } from '../fx/music.ts';
import { soundFX } from '../fx/sound.ts';
import type {
  DungeonBridge,
  RunEndPayload,
  RunHudSnapshot,
  RunStartPayload,
} from '../ui/bridge.ts';

type RgbTuple = readonly [number, number, number];

type AmbientMote = {
  arc: Phaser.GameObjects.Arc;
  speedY: number;
  speedX: number;
  baseAlpha: number;
  phase: number;
  isForeground: boolean;
};

const hexIntToRgb = (hex: number): RgbTuple => [
  (hex >> 16) & 255,
  (hex >> 8) & 255,
  hex & 255,
];

const parseAccentRgb = (hexStr: string): RgbTuple => {
  const clean = hexStr.startsWith('#') ? hexStr.slice(1) : hexStr;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [251, 191, 36];
  return hexIntToRgb(Number.parseInt(clean, 16));
};

const mixRgb = (a: RgbTuple, b: RgbTuple, t: number): RgbTuple => {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
};

const scaleRgb = (c: RgbTuple, factor: number): RgbTuple => [
  Math.max(0, Math.min(255, Math.round(c[0] * factor))),
  Math.max(0, Math.min(255, Math.round(c[1] * factor))),
  Math.max(0, Math.min(255, Math.round(c[2] * factor))),
];

const rgbaCss = (c: RgbTuple, alpha: number): string =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;

const rgbToHexInt = (c: RgbTuple): number =>
  ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

const hashTextSeed = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const drawGlowingPaperLantern = (
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  dropLen: number,
  accentRgb: RgbTuple
): void => {
  const cy = topY + dropLen;
  const glow = ctx.createRadialGradient(x, cy, 2, x, cy, 34);
  glow.addColorStop(0, 'rgba(255, 232, 160, 0.56)');
  glow.addColorStop(0.38, 'rgba(249, 136, 42, 0.26)');
  glow.addColorStop(0.72, rgbaCss(accentRgb, 0.1));
  glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, 34, 0, Math.PI * 2);
  ctx.fill();

  // Silk cord
  ctx.strokeStyle = 'rgba(28, 22, 24, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, cy - 10);
  ctx.stroke();

  // Lantern casing
  const bodyGrad = ctx.createRadialGradient(x - 1, cy - 1, 1, x, cy, 11);
  bodyGrad.addColorStop(0, '#fff7cc');
  bodyGrad.addColorStop(0.45, '#fb923c');
  bodyGrad.addColorStop(1, '#b91c1c');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(x, cy, 7.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bamboo ribs & brass fittings
  ctx.strokeStyle = 'rgba(90, 20, 12, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 7, cy - 3);
  ctx.lineTo(x + 7, cy - 3);
  ctx.moveTo(x - 7, cy + 3);
  ctx.lineTo(x + 7, cy + 3);
  ctx.stroke();

  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - 4, cy - 11, 8, 2.5);
  ctx.fillRect(x - 4, cy + 8.5, 8, 2.5);

  // Crimson tassel
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, cy + 11);
  ctx.lineTo(x, cy + 18);
  ctx.stroke();
};

const drawDistantPagoda = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  silRgb: RgbTuple,
  winRgb: RgbTuple
): void => {
  ctx.fillStyle = rgbaCss(silRgb, 0.96);
  // 3 stepped pagoda tiers
  const tiers = [
    { w: 30, h: 12, y: baseY - 12 },
    { w: 23, h: 11, y: baseY - 25 },
    { w: 16, h: 10, y: baseY - 37 },
  ];
  for (const tier of tiers) {
    ctx.fillRect(cx - tier.w * 0.34, tier.y, tier.w * 0.68, tier.h);
    // Upturned eaves roof
    ctx.beginPath();
    ctx.moveTo(cx - tier.w * 0.68, tier.y + 1);
    ctx.quadraticCurveTo(cx, tier.y - 6, cx + tier.w * 0.68, tier.y + 1);
    ctx.lineTo(cx + tier.w * 0.45, tier.y + 4);
    ctx.lineTo(cx - tier.w * 0.45, tier.y + 4);
    ctx.closePath();
    ctx.fill();
  }
  // Spire finial
  ctx.fillRect(cx - 1, baseY - 48, 2, 10);

  // Warm paper-lit alcove windows
  ctx.fillStyle = rgbaCss(winRgb, 0.85);
  ctx.fillRect(cx - 2, baseY - 9, 4, 4);
  ctx.fillRect(cx - 1.5, baseY - 21, 3, 3.5);
  ctx.fillRect(cx - 1, baseY - 33, 2, 3);
};

const paintHd2dSkyCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: BiomeDefinition
): void => {
  const skyTop = hexIntToRgb(biome.skyTopHex);
  const skyBot = hexIntToRgb(biome.skyBottomHex);
  const accent = parseAccentRgb(biome.accentHex);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, rgbaCss(scaleRgb(skyTop, 0.58), 1));
  skyGrad.addColorStop(0.42, rgbaCss(skyTop, 1));
  skyGrad.addColorStop(0.78, rgbaCss(skyBot, 1));
  skyGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, accent, 0.24), 1));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle distant pinpoint stars (warm ivory, no chunky + crosses)
  const rng = mulberry32(hashTextSeed(biome.id));
  for (let i = 0; i < 42; i += 1) {
    const sx = Math.round(rng() * w);
    const sy = Math.round(rng() * h * 0.52);
    const alpha = 0.16 + rng() * 0.45;
    ctx.fillStyle = i % 6 === 0 ? rgbaCss(accent, alpha) : `rgba(244, 236, 216, ${alpha.toFixed(2)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Celestial moon with soft feathered radial atmospheric bloom (zero hard trapezoid beams)
  const moonX = Math.round(w * 0.76);
  const moonY = Math.round(h * 0.24);
  const outerBloom = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 150);
  outerBloom.addColorStop(0, 'rgba(245, 228, 186, 0.3)');
  outerBloom.addColorStop(0.32, rgbaCss(accent, 0.14));
  outerBloom.addColorStop(0.68, rgbaCss(skyBot, 0.06));
  outerBloom.addColorStop(1, rgbaCss(accent, 0));
  ctx.fillStyle = outerBloom;
  ctx.fillRect(0, 0, w, h);

  const moonDiscGrad = ctx.createRadialGradient(moonX - 6, moonY - 6, 2, moonX, moonY, 24);
  moonDiscGrad.addColorStop(0, '#f8f0dc');
  moonDiscGrad.addColorStop(0.72, rgbaCss(mixRgb([238, 220, 180], accent, 0.22), 0.96));
  moonDiscGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, accent, 0.45), 0.88));
  ctx.fillStyle = moonDiscGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
  ctx.fill();

  // Soft feathered ink-wash cloud wisps (radial gradients, never hard brown ellipses)
  const drawCloudWisp = (cx: number, cy: number, rx: number, ry: number, alpha: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / Math.max(1, rx));
    const cloudCol = mixRgb(skyBot, [224, 206, 174], 0.26);
    const cg = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
    cg.addColorStop(0, rgbaCss(cloudCol, alpha));
    cg.addColorStop(0.55, rgbaCss(cloudCol, alpha * 0.45));
    cg.addColorStop(1, rgbaCss(cloudCol, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  for (let c = 0; c < 5; c += 1) {
    const cx = 48 + c * 105 + (rng() - 0.5) * 36;
    const cy = 54 + (c % 3) * 28 + rng() * 18;
    drawCloudWisp(cx, cy, 74 + rng() * 28, 16 + rng() * 7, 0.14);
    drawCloudWisp(cx + 34, cy + 5, 52 + rng() * 18, 12 + rng() * 5, 0.11);
  }
};

const paintHd2dFarMountainsCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: BiomeDefinition
): void => {
  const hillRgb = hexIntToRgb(biome.hillColorHex);
  const pillarRgb = hexIntToRgb(biome.pillarColorHex);
  const skyBot = hexIntToRgb(biome.skyBottomHex);
  const accent = parseAccentRgb(biome.accentHex);

  // Periodic craggy Guilin karst silhouettes (start & end at exact same Y for seamless scrolling)
  const farPeaks: readonly (readonly [number, number])[] = [
    [0.0, 0.56],
    [0.07, 0.38],
    [0.14, 0.48],
    [0.23, 0.26],
    [0.31, 0.44],
    [0.39, 0.32],
    [0.48, 0.51],
    [0.57, 0.29],
    [0.65, 0.41],
    [0.74, 0.22],
    [0.83, 0.46],
    [0.91, 0.36],
    [1.0, 0.56],
  ];

  const farFill = mixRgb(hillRgb, skyBot, 0.42);
  const farGrad = ctx.createLinearGradient(0, h * 0.2, 0, h);
  farGrad.addColorStop(0, rgbaCss(farFill, 0.82));
  farGrad.addColorStop(1, rgbaCss(scaleRgb(farFill, 0.55), 0.96));
  ctx.fillStyle = farGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (const [px, py] of farPeaks) {
    ctx.lineTo(Math.round(px * w), Math.round(py * h));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Mid-distance misty valley veil separating the two karst planes
  const midMist = ctx.createLinearGradient(0, h * 0.44, 0, h * 0.85);
  midMist.addColorStop(0, rgbaCss(skyBot, 0));
  midMist.addColorStop(0.55, rgbaCss(mixRgb(skyBot, [224, 210, 184], 0.2), 0.32));
  midMist.addColorStop(1, rgbaCss(skyBot, 0));
  ctx.fillStyle = midMist;
  ctx.fillRect(0, Math.round(h * 0.44), w, Math.round(h * 0.42));

  // Closer craggy karst ridge (seamless periodic endpoints at 0.68)
  const nearPeaks: readonly (readonly [number, number])[] = [
    [0.0, 0.68],
    [0.08, 0.52],
    [0.16, 0.61],
    [0.26, 0.42],
    [0.35, 0.58],
    [0.44, 0.47],
    [0.54, 0.64],
    [0.64, 0.46],
    [0.72, 0.55],
    [0.82, 0.39],
    [0.91, 0.57],
    [1.0, 0.68],
  ];

  const nearPeakFill = scaleRgb(mixRgb(hillRgb, pillarRgb, 0.28), 0.72);
  const nearGrad = ctx.createLinearGradient(0, h * 0.38, 0, h);
  nearGrad.addColorStop(0, rgbaCss(nearPeakFill, 0.95));
  nearGrad.addColorStop(1, rgbaCss(scaleRgb(nearPeakFill, 0.5), 0.99));
  ctx.fillStyle = nearGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (const [px, py] of nearPeaks) {
    ctx.lineTo(Math.round(px * w), Math.round(py * h));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Two cliffside silhouette pagodas perched naturally on peak crests
  const winGlow = mixRgb([238, 206, 134], accent, 0.2);
  drawDistantPagoda(ctx, Math.round(0.26 * w), Math.round(0.42 * h) + 5, nearPeakFill, winGlow);
  drawDistantPagoda(ctx, Math.round(0.82 * w), Math.round(0.39 * h) + 5, nearPeakFill, winGlow);

  // Soft ink-wash valley mist hugging the base
  const mistGrad = ctx.createLinearGradient(0, h * 0.64, 0, h);
  mistGrad.addColorStop(0, rgbaCss(skyBot, 0));
  mistGrad.addColorStop(0.6, rgbaCss(mixRgb(skyBot, accent, 0.16), 0.34));
  mistGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, [226, 214, 192], 0.22), 0.58));
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, Math.round(h * 0.64), w, Math.round(h * 0.36));
};

const drawGnarledPine = (
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  silCol: RgbTuple,
  rimCol: RgbTuple
): void => {
  ctx.save();
  // Gnarled curving trunk
  ctx.strokeStyle = rgbaCss(silCol, 0.96);
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX - 8, baseY - 46, baseX + 6, baseY - 94);
  ctx.stroke();

  // Sweeping upper boughs
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseX - 2, baseY - 62);
  ctx.quadraticCurveTo(baseX - 28, baseY - 70, baseX - 46, baseY - 62);
  ctx.moveTo(baseX + 3, baseY - 78);
  ctx.quadraticCurveTo(baseX + 26, baseY - 88, baseX + 44, baseY - 78);
  ctx.stroke();

  // Layered woodblock-style jagged pine needle clusters
  const pads: readonly [number, number, number, number][] = [
    [baseX - 38, baseY - 66, 26, 9],
    [baseX - 10, baseY - 82, 30, 10],
    [baseX + 28, baseY - 82, 28, 9],
    [baseX + 6, baseY - 100, 34, 11],
  ];
  for (const [cx, cy, rx, ry] of pads) {
    ctx.fillStyle = rgbaCss(silCol, 0.96);
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy + ry * 0.35);
    ctx.lineTo(cx - rx * 0.65, cy - ry * 0.55);
    ctx.lineTo(cx - rx * 0.25, cy - ry * 0.2);
    ctx.lineTo(cx, cy - ry);
    ctx.lineTo(cx + rx * 0.3, cy - ry * 0.25);
    ctx.lineTo(cx + rx * 0.7, cy - ry * 0.6);
    ctx.lineTo(cx + rx, cy + ry * 0.35);
    ctx.quadraticCurveTo(cx, cy + ry * 0.65, cx - rx, cy + ry * 0.35);
    ctx.closePath();
    ctx.fill();

    // Subtle moonlight needle crest strokes
    ctx.strokeStyle = rgbaCss(rimCol, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.65, cy - ry * 0.55);
    ctx.lineTo(cx, cy - ry);
    ctx.lineTo(cx + rx * 0.7, cy - ry * 0.6);
    ctx.stroke();
  }
  ctx.restore();
};

const drawStoneLantern = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  stoneCol: RgbTuple,
  accentRgb: RgbTuple
): void => {
  // Pedestal & shaft
  ctx.fillStyle = rgbaCss(stoneCol, 0.95);
  ctx.fillRect(cx - 8, baseY - 5, 16, 5);
  ctx.fillRect(cx - 3.5, baseY - 28, 7, 23);
  ctx.fillRect(cx - 7, baseY - 31, 14, 3);

  // Firebox & warm candle glow
  const glow = ctx.createRadialGradient(cx, baseY - 36, 2, cx, baseY - 36, 30);
  glow.addColorStop(0, 'rgba(245, 208, 128, 0.5)');
  glow.addColorStop(0.45, rgbaCss(accentRgb, 0.18));
  glow.addColorStop(1, 'rgba(245, 208, 128, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, baseY - 36, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgbaCss(stoneCol, 0.95);
  ctx.fillRect(cx - 6, baseY - 42, 2, 11);
  ctx.fillRect(cx + 4, baseY - 42, 2, 11);
  ctx.fillStyle = '#f5d790';
  ctx.fillRect(cx - 3, baseY - 40, 6, 8);

  // Curved stone cap
  ctx.fillStyle = rgbaCss(stoneCol, 0.98);
  ctx.beginPath();
  ctx.moveTo(cx - 12, baseY - 42);
  ctx.quadraticCurveTo(cx, baseY - 51, cx + 12, baseY - 42);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - 2, baseY - 52, 4, 3);
};

const paintHd2dMidPavilionCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: BiomeDefinition
): void => {
  const pillarRgb = hexIntToRgb(biome.pillarColorHex);
  const floorTopRgb = hexIntToRgb(biome.floorTopHex);
  const accent = parseAccentRgb(biome.accentHex);

  const timberDark = scaleRgb(pillarRgb, 0.32);
  const timberLit = mixRgb(pillarRgb, [242, 214, 162], 0.25);
  const roofBody = scaleRgb(pillarRgb, 0.48);
  const roofTrim = mixRgb(accent, [216, 178, 98], 0.45);
  const terraceWall = scaleRgb(floorTopRgb, 0.42);
  const terraceRim = mixRgb(floorTopRgb, [238, 224, 196], 0.22);

  // Low carved stone courtyard balustrade (keeps sky & mountains wide open)
  const wallY = h - 22;
  ctx.fillStyle = rgbaCss(terraceWall, 0.96);
  ctx.fillRect(0, wallY, w, 22);
  ctx.fillStyle = rgbaCss(terraceRim, 0.5);
  ctx.fillRect(0, wallY, w, 2);
  for (let bx = 0; bx < w; bx += 64) {
    ctx.fillStyle = 'rgba(10, 8, 6, 0.42)';
    ctx.fillRect(bx + 10, wallY + 6, 44, 10);
    // Stone balustrade post finial
    ctx.fillStyle = rgbaCss(terraceRim, 0.55);
    ctx.fillRect(bx - 2, wallY - 5, 6, 5);
  }

  // Open-vista mountain courtyard rhythm (per 512px):
  // 1) Gnarled cliffside pine on left (x = 92)
  drawGnarledPine(ctx, 92, wallY, scaleRgb(timberDark, 0.72), roofTrim);

  // 2) Weathered stone lantern (x = 204)
  drawStoneLantern(ctx, 204, wallY, scaleRgb(terraceWall, 1.15), accent);

  // 3) Ornate single-bay curved-eave Wuxia Paifang archway (centered at x = 356)
  const archCx = 356;
  const halfSpan = 64;
  const colTop = 44;
  for (const side of [-1, 1]) {
    const px = archCx + side * halfSpan;
    // Stone plinth
    ctx.fillStyle = rgbaCss(terraceRim, 0.6);
    ctx.fillRect(px - 7, wallY - 7, 14, 7);
    // Lacquered timber column
    ctx.fillStyle = rgbaCss(timberDark, 0.98);
    ctx.fillRect(px - 4.5, colTop, 9, wallY - colTop - 7);
    ctx.fillStyle = rgbaCss(timberLit, 0.42);
    ctx.fillRect(px - 4.5, colTop, 2, wallY - colTop - 7);
    // Dougong bracket
    ctx.fillStyle = rgbaCss(roofBody, 0.98);
    ctx.fillRect(px - 10, colTop - 4, 20, 6);
  }

  // Carved horizontal lintel beam + central plaque
  ctx.fillStyle = rgbaCss(timberDark, 0.98);
  ctx.fillRect(archCx - halfSpan - 12, colTop + 4, halfSpan * 2 + 24, 9);
  ctx.fillStyle = rgbaCss(roofTrim, 0.52);
  ctx.fillRect(archCx - halfSpan - 12, colTop + 4, halfSpan * 2 + 24, 1.5);
  // Central lacquered inscription plaque
  ctx.fillStyle = '#18110e';
  ctx.fillRect(archCx - 20, colTop - 2, 40, 14);
  ctx.strokeStyle = rgbaCss(roofTrim, 0.75);
  ctx.lineWidth = 1;
  ctx.strokeRect(archCx - 20, colTop - 2, 40, 14);

  // Sweeping double-tiered upturned paifang gable roof
  ctx.fillStyle = rgbaCss(roofBody, 0.99);
  ctx.beginPath();
  ctx.moveTo(archCx - halfSpan - 34, colTop - 2);
  ctx.quadraticCurveTo(archCx - halfSpan * 0.5, colTop - 8, archCx, colTop - 22);
  ctx.quadraticCurveTo(archCx + halfSpan * 0.5, colTop - 8, archCx + halfSpan + 34, colTop - 2);
  ctx.lineTo(archCx + halfSpan + 22, colTop + 5);
  ctx.lineTo(archCx - halfSpan - 22, colTop + 5);
  ctx.closePath();
  ctx.fill();

  // Upper crown gable
  ctx.beginPath();
  ctx.moveTo(archCx - 48, colTop - 16);
  ctx.quadraticCurveTo(archCx, colTop - 32, archCx + 48, colTop - 16);
  ctx.lineTo(archCx + 38, colTop - 10);
  ctx.lineTo(archCx - 38, colTop - 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rgbaCss(roofTrim, 0.58);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(archCx - halfSpan - 32, colTop - 2);
  ctx.quadraticCurveTo(archCx, colTop - 21, archCx + halfSpan + 32, colTop - 2);
  ctx.stroke();

  // Two glowing hanging paper lanterns beneath the paifang eaves
  drawGlowingPaperLantern(ctx, archCx - 34, colTop + 13, 18, accent);
  drawGlowingPaperLantern(ctx, archCx + 34, colTop + 13, 18, accent);

  // 4) Delicate ink-wash bamboo cluster on right edge (x = 468)
  ctx.strokeStyle = rgbaCss(scaleRgb(timberDark, 0.85), 0.72);
  ctx.lineWidth = 2;
  for (let s = 0; s < 3; s += 1) {
    const sx = 456 + s * 13;
    const lean = (s - 1) * 8;
    ctx.beginPath();
    ctx.moveTo(sx, wallY);
    ctx.quadraticCurveTo(sx + lean * 0.4, wallY - 52, sx + lean, wallY - 104 + s * 10);
    ctx.stroke();
    // Pointed bamboo leaf blades
    ctx.fillStyle = rgbaCss(scaleRgb(mixRgb(accent, timberDark, 0.65), 0.85), 0.62);
    for (let k = 0; k < 3; k += 1) {
      const ly = wallY - 68 - k * 14 + s * 6;
      const lx = sx + lean * (0.55 + k * 0.14);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + 11, ly - 5, lx + 18, ly - 2);
      ctx.quadraticCurveTo(lx + 10, ly + 1, lx, ly);
      ctx.fill();
    }
  }
};

const paintHd2dFloorCanvas = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: BiomeDefinition
): void => {
  const floorTop = hexIntToRgb(biome.floorTopHex);
  const floorBody = hexIntToRgb(biome.floorBodyHex);
  const accent = parseAccentRgb(biome.accentHex);
  const rng = mulberry32(hashTextSeed(`${biome.id}_floor`));

  // Weathered carved stone promenade curb at Y=0..10
  const curbHighlight = mixRgb(floorTop, [238, 224, 196], 0.16);
  ctx.fillStyle = rgbaCss(scaleRgb(floorTop, 0.62), 1);
  ctx.fillRect(0, 0, w, 10);
  ctx.fillStyle = rgbaCss(curbHighlight, 0.42);
  ctx.fillRect(0, 0, w, 2);
  ctx.fillStyle = 'rgba(10, 8, 6, 0.35)';
  for (let cx = 0; cx < w; cx += 32) {
    ctx.fillRect(cx, 0, 2, 10);
  }

  // Deep warm sumi courtyard surface receding into dark shadow
  const walkGrad = ctx.createLinearGradient(0, 10, 0, h);
  walkGrad.addColorStop(0, rgbaCss(mixRgb(floorBody, floorTop, 0.16), 1));
  walkGrad.addColorStop(0.32, rgbaCss(scaleRgb(floorBody, 0.78), 1));
  walkGrad.addColorStop(0.7, rgbaCss(scaleRgb(floorBody, 0.42), 1));
  walkGrad.addColorStop(1, '#0b0908');
  ctx.fillStyle = walkGrad;
  ctx.fillRect(0, 10, w, h - 10);

  // Cast shadow right underneath curb lip
  const lipShadow = ctx.createLinearGradient(0, 10, 0, 26);
  lipShadow.addColorStop(0, 'rgba(8, 6, 5, 0.65)');
  lipShadow.addColorStop(1, 'rgba(8, 6, 5, 0)');
  ctx.fillStyle = lipShadow;
  ctx.fillRect(0, 10, w, 16);

  // Irregular hand-laid flagstone slabs with subtle organic tonal variation
  const rows = [12, 24, 40, 62, 92, 134, 184, h];
  const stoneWarmEdge = mixRgb(floorTop, [238, 224, 196], 0.18);
  for (let r = 0; r < rows.length - 1; r += 1) {
    const y0 = rows[r] ?? 12;
    const y1 = rows[r + 1] ?? h;
    const rowH = y1 - y0;
    const rowFade = Math.max(0.12, 1 - (r / (rows.length - 1)) * 0.75);
    const offset = r % 2 === 0 ? 0 : 32;
    const segW = 64;

    for (let sx = offset; sx < w; sx += segW) {
      const shadeDelta = (rng() - 0.5) * 0.08;
      if (shadeDelta > 0) {
        ctx.fillStyle = `rgba(238, 224, 196, ${(shadeDelta * rowFade).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(8, 6, 5, ${(Math.abs(shadeDelta) * 1.6 * rowFade).toFixed(3)})`;
      }
      ctx.fillRect(sx + 2, y0 + 2, segW - 3, Math.max(2, rowH - 3));

      // Subtle vertical mortar joint
      ctx.fillStyle = `rgba(8, 6, 5, ${(0.38 * rowFade).toFixed(2)})`;
      ctx.fillRect(sx, y0, 1.5, rowH);
    }

    // Horizontal mortar seam + faint top edge catchlight
    ctx.fillStyle = `rgba(8, 6, 5, ${(0.44 * rowFade).toFixed(2)})`;
    ctx.fillRect(0, y0, w, 1.5);
    ctx.fillStyle = rgbaCss(stoneWarmEdge, 0.14 * rowFade);
    ctx.fillRect(0, y0 + 2, w, 1);
  }

  // Subtle elongated lantern sheen near upper promenade (never circular yellow blobs)
  const sheen = ctx.createLinearGradient(0, 12, 0, 56);
  sheen.addColorStop(0, rgbaCss(accent, 0.09));
  sheen.addColorStop(0.4, 'rgba(228, 192, 118, 0.05)');
  sheen.addColorStop(1, 'rgba(228, 192, 118, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 12, w, 44);

  // Scattered fallen plum petals / leaves on stone
  for (let i = 0; i < 9; i += 1) {
    const px = Math.round(rng() * w);
    const py = 16 + Math.round(rng() * 88);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(176, 68, 56, 0.36)' : 'rgba(212, 178, 108, 0.28)';
    ctx.fillRect(px, py, 3, 1.5);
  }
};

type EnemyEntity = {
  id: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  statusBadge?: Phaser.GameObjects.Text;
  name: string;
  isBoss: boolean;
  isMiniBoss: boolean;
  isSplitClone: boolean;
  hp: number;
  maxHp: number;
  hitShield: number;
  atk: number;
  atkIntervalSec: number;
  atkTimer: number;
  speed: number;
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
  mitosisDone: boolean;
  lastGoldenThreshold: number;
  mutations: MutationId[];
  mechanic: BiomeMechanicId | null;
  flawTimer: number;
  flawCooldown: number;
  flawRing: Phaser.GameObjects.Arc | null;
  flawText: Phaser.GameObjects.Text | null;
  heavyChargeTimer: number;
  heavyCooldown: number;
  heavyTelegraphGfx: Phaser.GameObjects.Arc | null;
  archetype: 'bruiser' | 'ranged' | 'flanker' | 'boss';
  preferredDist: number;
  isTotem: boolean;
  totemOwnerId: number | null;
  totemSummonTimer: number;
  totemGlowRing: Phaser.GameObjects.Arc | null;
};

type ProjectileEntity = {
  sprite: Phaser.GameObjects.Image;
  auraSprite: Phaser.GameObjects.Image | null;
  auraRotationSpeed: number;
  auraPulsePhase: number;
  targetId: number | null;
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  pierceLeft: number;
  hitIds: Set<number>;
  applyRoot: boolean;
  applyChill: boolean;
  isWave: boolean;
  isChainProc: boolean;
  dropFalconLoot: boolean;
  labelTag: string | null;
  life: number;
  trailHex: number | null;
  explosionRadius: number;
  explosionColor: number;
  isSpinning: boolean;
  bouncesLeft: number;
  bypassSmoke: boolean;
  pullTowardHit: boolean;
};

type EnemyProjectileEntity = {
  sprite: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  life: number;
};

type LootDropEntity = {
  sprite: Phaser.GameObjects.Image;
  kind: 'coin' | 'orb' | 'chest';
  value: number;
  vx: number;
  vy: number;
  age: number;
};

type HazardEntity = {
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  fuse: number;
  damage: number;
};

export type DungeonSceneCallbacks = {
  onHudUpdate: (hud: RunHudSnapshot) => void;
  onRequestDraft: (floor: number, equippedBuffIds: string[], silverMult: number) => void;
  onRequestRoulette: (floor: number, count: number, exclude: MutationId[]) => void;
  onRequestExtraction: (floor: number, gold: number, shards: number, cores: number) => void;
  onRunEnded: (payload: RunEndPayload) => void;
  onRegisterBridge: (bridge: DungeonBridge) => void;
};

export class DungeonScene extends Scene {
  private callbacks: DungeonSceneCallbacks | null = null;

  private skyImage: Phaser.GameObjects.Image | null = null;
  private farMountainsTile: Phaser.GameObjects.TileSprite | null = null;
  private midPagodaTile: Phaser.GameObjects.TileSprite | null = null;
  private floorTile: Phaser.GameObjects.TileSprite | null = null;
  private horizonGlow: Phaser.GameObjects.Image | null = null;
  private vignetteImage: Phaser.GameObjects.Image | null = null;
  private ambientMotes: AmbientMote[] = [];

  private heroShadow: Phaser.GameObjects.Image | null = null;
  private heroSprite: Phaser.GameObjects.Image | null = null;
  private heroCapeSprite: Phaser.GameObjects.Image | null = null;
  private heroTopSprite: Phaser.GameObjects.Image | null = null;
  private heroHelmSprite: Phaser.GameObjects.Image | null = null;
  private heroWeaponSprite: Phaser.GameObjects.Image | null = null;
  private heroClassId: ClassId = 'warrior';
  private heroAnimState: 'idle' | 'walk' | 'attack' | 'dash' = 'idle';
  private heroAttackAnimTimer: number = 0;
  private heroDashAnimTimer: number = 0;
  private weaponAngle: number = 0;
  private weaponSwingOffsetX: number = 0;
  private weaponSwingOffsetY: number = 0;
  private weaponTween: Phaser.Tweens.Tween | null = null;
  private heroSutraAuraGfx: Phaser.GameObjects.Graphics | null = null;
  private heroOverheadGfx: Phaser.GameObjects.Graphics | null = null;
  private heroHpText: Phaser.GameObjects.Text | null = null;
  private hawkSprite: Phaser.GameObjects.Image | null = null;
  private wolfSprite: Phaser.GameObjects.Image | null = null;
  private runeBooks: Phaser.GameObjects.Image[] = [];
  private activeFloatingTexts: { text: Phaser.GameObjects.Text; isCritical: boolean }[] = [];

  private runConfig: RunStartPayload | null = null;
  private activeBiome: BiomeDefinition = getBiomeById('slime_bog');
  private rng: () => number = mulberry32(1);

  private phase: 'idle' | 'walking' | 'combat' | 'paused' = 'idle';
  private floor: number = 1;
  private waveIndex: number = 1;
  private totalWavesOnFloor: number = 2;
  private walkTimer: number = 0;
  private pendingWaveClearTimer: number = 0;
  private pendingWaveClearActive: boolean = false;
  private elapsedRunMs: number = 0;
  private speedMult: 1 | 2 = 1;
  private autoSkill: boolean = true;

  private stats: ComputedHeroStats | null = null;
  private activeDecree: DailySectDecree | null = null;
  private heroHp: number = 200;
  private heroShield: number = 0;
  private heroX: number = 170;
  private groundY: number = 500;

  private attackTimer: number = 0;
  private attackCount: number = 0;
  private skillTimer: number = 0;
  private potionCharges: number = 1;
  private potionCooldown: number = 0;
  private fastingFloorsLeft: number = 0;
  private unhitTimer: number = 0;
  private invulnHitsLeft: number = 0;
  private dashCooldown: number = 0;
  private hawkTimer: number = 0;
  private wolfTimer: number = 0;
  private runeZapTimer: number = 0;
  private meteorTimer: number = 0;
  private tribulationTimer: number = 0;
  private volatileSoulTimer: number = 0;
  private battleMomentumTimer: number = 0;
  private battleMomentumStacks: number = 0;
  private vampiricTouchCd: number = 0;
  private phoenixReviveUsed: boolean = false;
  private dodgeCount: number = 0;

  private goldCollected: number = 0;
  private shardsCollected: number = 0;
  private coresCollected: number = 0;
  private draftedBuffIds: string[] = [];
  private wuxiaArtTimers: Record<string, number> = {};
  private currentBossMutations: MutationId[] = [];
  private lastBossMutations: MutationId[] = [];
  private floorsCleared: number = 0;

  private nextEnemyId: number = 1;
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private enemyProjectiles: EnemyProjectileEntity[] = [];
  private loots: LootDropEntity[] = [];
  private hazards: HazardEntity[] = [];
  private hudSyncTimer: number = 0;
  private ultimateGauge: number = 0;
  private ultimateStocks: number = 0;
  private readonly maxUltimateStocks: number = 3;
  private nonCritTextCooldown: number = 0;
  private hitstopTimer: number = 0;
  private floorElapsedSec: number = 0;
  private coldJadeFreezeUsed: boolean = false;
  private volcanicPulseTimer: number = 0;

  constructor() {
    super('DungeonScene');
  }

  public setCallbacks(callbacks: DungeonSceneCallbacks): void {
    this.callbacks = callbacks;
    callbacks.onRegisterBridge({
      startRun: (payload) => this.startRun(payload),
      stopToIdle: () => this.stopToIdle(),
      triggerActiveSkill: () => this.triggerActiveSkill(),
      triggerUltimateSkill: () => this.triggerUltimateSkill(),
      triggerDash: () => this.triggerDash(),
      triggerPotion: () => this.triggerPotion(),
      toggleSpeed: () => this.toggleSpeed(),
      toggleAutoSkill: () => this.toggleAutoSkill(),
      resumeAfterDraft: (buffId) => this.resumeAfterDraft(buffId),
      resumeAfterRoulette: (mutations) => this.resumeAfterRoulette(mutations),
      resumeAfterExtraction: (extractNow) => this.resumeAfterExtraction(extractNow),
      retreatWithLoot: () => this.retreatWithLoot(),
    });
  }

  create(): void {
    registerPixelTextures(this);
    this.createWorldLayers();
    this.createHeroDisplay('warrior', 1);
    this.refreshLayout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.refreshLayout(gameSize.width, gameSize.height);
    });

    this.input.on('pointerdown', () => {
      if (this.phase !== 'combat' || this.enemies.length === 0) return;
      const flawed = this.getFlawedEnemy();
      if (flawed && this.triggerMeridianShatter(flawed)) {
        this.emitHud();
        return;
      }
      this.attackTimer += 0.22;
      this.skillTimer = Math.max(0, this.skillTimer - 0.25);
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.phase !== 'combat') return;
      if (event.code === 'KeyQ') {
        const flawed = this.getFlawedEnemy();
        if (flawed && this.triggerMeridianShatter(flawed)) {
          this.emitHud();
          return;
        }
        this.triggerActiveSkill();
      } else if (event.code === 'KeyR' || event.code === 'KeyX') {
        this.triggerUltimateSkill();
      } else if (event.code === 'KeyE' || event.code === 'Space') {
        event.preventDefault();
        this.triggerDash();
      } else if (event.code === 'KeyW') {
        this.triggerPotion();
      }
    });

    if (this.callbacks) {
      this.callbacks.onRegisterBridge({
        startRun: (payload) => this.startRun(payload),
        stopToIdle: () => this.stopToIdle(),
        triggerActiveSkill: () => this.triggerActiveSkill(),
        triggerUltimateSkill: () => this.triggerUltimateSkill(),
        triggerDash: () => this.triggerDash(),
        triggerPotion: () => this.triggerPotion(),
        toggleSpeed: () => this.toggleSpeed(),
        toggleAutoSkill: () => this.toggleAutoSkill(),
        resumeAfterDraft: (buffId) => this.resumeAfterDraft(buffId),
        resumeAfterRoulette: (mutations) => this.resumeAfterRoulette(mutations),
        resumeAfterExtraction: (extractNow) => this.resumeAfterExtraction(extractNow),
        retreatWithLoot: () => this.retreatWithLoot(),
      });
    }
  }

  private ensureCanvasTexture(
    key: string,
    width: number,
    height: number,
    painter: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, width, height);
    if (!tex) return;
    painter(tex.getContext(), width, height);
    tex.refresh();
  }

  private ensureHd2dSharedTextures(): void {
    this.ensureCanvasTexture('hd2d_shadow', 64, 24, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.48);
      grad.addColorStop(0, 'rgba(11, 9, 7, 0.72)');
      grad.addColorStop(0.55, 'rgba(11, 9, 7, 0.36)');
      grad.addColorStop(1, 'rgba(11, 9, 7, 0)');
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, 0.38);
      ctx.translate(-w / 2, -h / 2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.ensureCanvasTexture('hd2d_horizon', 128, 96, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.45, 'rgba(255, 250, 235, 0.95)');
      grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.7)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    this.ensureCanvasTexture('hd2d_vignette', 512, 512, (ctx, w, h) => {
      // Top & bottom tilt-shift DoF soft darkening bands
      const topBlur = ctx.createLinearGradient(0, 0, 0, h * 0.16);
      topBlur.addColorStop(0, 'rgba(10, 8, 6, 0.52)');
      topBlur.addColorStop(1, 'rgba(10, 8, 6, 0)');
      ctx.fillStyle = topBlur;
      ctx.fillRect(0, 0, w, h * 0.16);

      const botBlur = ctx.createLinearGradient(0, h * 0.85, 0, h);
      botBlur.addColorStop(0, 'rgba(10, 8, 6, 0)');
      botBlur.addColorStop(1, 'rgba(10, 8, 6, 0.58)');
      ctx.fillStyle = botBlur;
      ctx.fillRect(0, h * 0.85, w, h * 0.15);

      // Optical lens corner vignette
      const cornerGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        w * 0.32,
        w * 0.5,
        h * 0.5,
        w * 0.72
      );
      cornerGrad.addColorStop(0, 'rgba(10, 8, 6, 0)');
      cornerGrad.addColorStop(0.68, 'rgba(10, 8, 6, 0.16)');
      cornerGrad.addColorStop(1, 'rgba(10, 8, 6, 0.54)');
      ctx.fillStyle = cornerGrad;
      ctx.fillRect(0, 0, w, h);
    });

    this.ensureCanvasTexture('blood_qi_totem', 36, 68, (ctx, w, h) => {
      const cx = Math.round(w / 2);
      // Crimson-brass base aura
      const aura = ctx.createRadialGradient(cx, h * 0.45, 2, cx, h * 0.45, 18);
      aura.addColorStop(0, 'rgba(220, 38, 38, 0.55)');
      aura.addColorStop(0.55, 'rgba(245, 158, 11, 0.28)');
      aura.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      // Stone plinth base
      ctx.fillStyle = '#29201c';
      ctx.fillRect(cx - 10, h - 9, 20, 8);
      ctx.fillStyle = '#c49f54';
      ctx.fillRect(cx - 9, h - 10, 18, 2);

      // Brass pole & spear finial
      ctx.fillStyle = '#b48a3c';
      ctx.fillRect(cx - 2, 10, 4, h - 18);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(cx, 2);
      ctx.lineTo(cx + 4, 11);
      ctx.lineTo(cx - 4, 11);
      ctx.closePath();
      ctx.fill();

      // Ornate crossbar
      ctx.fillStyle = '#c49f54';
      ctx.fillRect(cx - 13, 14, 26, 3);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(cx - 14, 13, 3, 5);
      ctx.fillRect(cx + 11, 13, 3, 5);

      // Crimson-vermilion war banner cloth
      const bannerGrad = ctx.createLinearGradient(cx, 17, cx, 52);
      bannerGrad.addColorStop(0, '#991b1b');
      bannerGrad.addColorStop(0.5, '#dc2626');
      bannerGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = bannerGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 17);
      ctx.lineTo(cx + 10, 17);
      ctx.lineTo(cx + 9, 49);
      ctx.lineTo(cx, 54);
      ctx.lineTo(cx - 9, 49);
      ctx.closePath();
      ctx.fill();

      // Antique brass trim & glowing blood-qi rune seal
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 8, 19, 16, 26);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, 32, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx - 1, 25, 2, 14);
      ctx.fillRect(cx - 5, 31, 10, 2);
    });
  }

  private ensureHd2dBiomeTextures(biome: BiomeDefinition): void {
    this.ensureCanvasTexture(`hd2d_sky_${biome.id}`, 512, 360, (ctx, w, h) =>
      paintHd2dSkyCanvas(ctx, w, h, biome)
    );
    this.ensureCanvasTexture(`hd2d_far_${biome.id}`, 512, 210, (ctx, w, h) =>
      paintHd2dFarMountainsCanvas(ctx, w, h, biome)
    );
    this.ensureCanvasTexture(`hd2d_mid_${biome.id}`, 512, 190, (ctx, w, h) =>
      paintHd2dMidPavilionCanvas(ctx, w, h, biome)
    );
    this.ensureCanvasTexture(`hd2d_floor_${biome.id}`, 256, 220, (ctx, w, h) =>
      paintHd2dFloorCanvas(ctx, w, h, biome)
    );
  }

  private createWorldLayers(): void {
    const w = this.scale.width || 1024;
    const h = this.scale.height || 768;
    this.groundY = Math.round(h * 0.78);
    const groundY = this.groundY;
    const floorH = Math.max(96, h - groundY);

    this.ensureHd2dSharedTextures();
    this.ensureHd2dBiomeTextures(this.activeBiome);

    const accentHex = rgbToHexInt(parseAccentRgb(this.activeBiome.accentHex));

    this.skyImage = this.add
      .image(w / 2, h / 2, `hd2d_sky_${this.activeBiome.id}`)
      .setDisplaySize(w, h)
      .setDepth(0);

    this.farMountainsTile = this.add
      .tileSprite(w / 2, groundY - 97, w, 210, `hd2d_far_${this.activeBiome.id}`)
      .setDepth(1);

    this.midPagodaTile = this.add
      .tileSprite(w / 2, groundY - 85, w, 190, `hd2d_mid_${this.activeBiome.id}`)
      .setDepth(2);

    this.floorTile = this.add
      .tileSprite(w / 2, groundY + floorH / 2, w, floorH, `hd2d_floor_${this.activeBiome.id}`)
      .setTileScale(1, floorH / 220)
      .setDepth(3);

    this.horizonGlow = this.add
      .image(w / 2, groundY - 4, 'hd2d_horizon')
      .setDisplaySize(w, 108)
      .setTint(accentHex)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3.2);

    for (const mote of this.ambientMotes) mote.arc.destroy();
    this.ambientMotes = [];
    const moteRng = mulberry32(hashTextSeed(`${this.activeBiome.id}_motes`));
    const moteTint = rgbToHexInt(mixRgb(parseAccentRgb(this.activeBiome.accentHex), [254, 243, 199], 0.42));
    for (let i = 0; i < 28; i += 1) {
      const isForeground = i < 8;
      const radius = isForeground ? 2.6 + moteRng() * 1.8 : 1.2 + moteRng() * 1.3;
      const baseAlpha = isForeground ? 0.22 + moteRng() * 0.16 : 0.28 + moteRng() * 0.24;
      const arc = this.add
        .circle(moteRng() * w, moteRng() * h, radius, moteTint, baseAlpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(isForeground ? 13.5 : 3.5);
      this.ambientMotes.push({
        arc,
        speedY: -(isForeground ? 16 + moteRng() * 18 : 8 + moteRng() * 12),
        speedX: (moteRng() - 0.5) * 14,
        baseAlpha,
        phase: moteRng() * Math.PI * 2,
        isForeground,
      });
    }

    this.vignetteImage = this.add
      .image(w / 2, h / 2, 'hd2d_vignette')
      .setDisplaySize(w, h)
      .setDepth(14.5);
  }

  private createHeroDisplay(classId: ClassId, _level: number): void {
    this.heroShadow?.destroy();
    this.heroSutraAuraGfx?.destroy();
    this.heroOverheadGfx?.destroy();
    this.heroHpText?.destroy();
    this.heroCapeSprite?.destroy();
    this.heroSprite?.destroy();
    this.heroTopSprite?.destroy();
    this.heroHelmSprite?.destroy();
    this.heroWeaponSprite?.destroy();
    this.hawkSprite?.destroy();
    this.wolfSprite?.destroy();
    for (const book of this.runeBooks) book.destroy();
    this.runeBooks = [];
    this.weaponAngle = 0;
    this.weaponSwingOffsetX = 0;
    this.weaponSwingOffsetY = 0;
    this.heroClassId = classId;
    this.heroAnimState = 'idle';
    this.heroAttackAnimTimer = 0;
    this.heroDashAnimTimer = 0;

    const equipped = this.runConfig?.profile.classes[classId].equipped ?? {
      weapon: null,
      headgear: null,
      top: null,
      cape: null,
    };
    const gearStyle = getGearVisualStyle(classId, equipped);

    this.heroSutraAuraGfx = this.add.graphics().setDepth(4.3);

    this.heroShadow = this.add
      .image(this.heroX, this.groundY - 4, 'hd2d_shadow')
      .setScale(0.95, 0.85)
      .setDepth(4.1);

    this.heroCapeSprite = this.add
      .image(this.heroX, this.groundY - 28, 'gear_cape')
      .setTint(gearStyle.capeTint)
      .setVisible(gearStyle.hasCape)
      .setDepth(5);

    const idleTex = this.textures.exists(`hero_${classId}_idle`)
      ? `hero_${classId}_idle`
      : `hero_${classId}`;
    this.heroSprite = this.add
      .image(this.heroX, this.groundY - 28, idleTex)
      .setDepth(6);

    this.heroTopSprite = this.add
      .image(this.heroX, this.groundY - 28, `gear_top_${classId}`)
      .setTint(gearStyle.topTint)
      .setVisible(gearStyle.hasTop)
      .setDepth(6.2);

    this.heroHelmSprite = this.add
      .image(this.heroX, this.groundY - 28, `gear_head_${classId}`)
      .setTint(gearStyle.headTint)
      .setVisible(gearStyle.hasHead)
      .setDepth(6.4);

    this.heroWeaponSprite = this.add
      .image(this.heroX + 16, this.groundY - 26, `gear_wep_${classId}`)
      .setTint(gearStyle.weaponTint)
      .setVisible(gearStyle.hasWeapon)
      .setDepth(6.6);

    this.heroOverheadGfx = this.add.graphics().setDepth(9);
    this.heroHpText = this.add
      .text(this.heroX, this.groundY - 88, '', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ede3cf',
        stroke: '#0d0a08',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9.5);

    if (this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
      this.hawkSprite = this.add
        .image(this.heroX - 38, this.groundY - 92, 'pet_hawk')
        .setDepth(6);
    } else {
      this.hawkSprite = null;
    }
    this.wolfSprite = null;
    this.syncHeroWuxiaWeapon();
  }

  private applyHeroAnimTexture(state: 'idle' | 'walk' | 'attack' | 'dash'): void {
    if (!this.heroSprite || !this.heroSprite.active) return;
    const cls = this.runConfig?.classId ?? this.heroClassId;
    const stateKey = `hero_${cls}_${state}`;
    const idleKey = `hero_${cls}_idle`;
    const baseKey = `hero_${cls}`;
    const nextKey = this.textures.exists(stateKey)
      ? stateKey
      : this.textures.exists(idleKey)
        ? idleKey
        : baseKey;
    if (this.heroSprite.texture.key !== nextKey && this.textures.exists(nextKey)) {
      this.heroSprite.setTexture(nextKey);
    }
    this.heroAnimState = state;
  }

  private updateHeroAnimState(dtSec: number): void {
    if (this.heroAttackAnimTimer > 0) {
      this.heroAttackAnimTimer = Math.max(0, this.heroAttackAnimTimer - dtSec);
    }
    if (this.heroDashAnimTimer > 0) {
      this.heroDashAnimTimer = Math.max(0, this.heroDashAnimTimer - dtSec);
    }
    const desired: 'idle' | 'walk' | 'attack' | 'dash' =
      this.heroDashAnimTimer > 0
        ? 'dash'
        : this.heroAttackAnimTimer > 0
          ? 'attack'
          : this.phase === 'walking'
            ? 'walk'
            : 'idle';
    if (this.heroAnimState !== desired) {
      this.applyHeroAnimTexture(desired);
    }
  }

  private syncHeroWuxiaWeapon(activeStyle?: WuxiaArtStyle | null): void {
    if (!this.heroWeaponSprite || !this.runConfig) return;
    const equipped = this.runConfig.profile.classes[this.runConfig.classId].equipped;
    const gearStyle = getGearVisualStyle(this.runConfig.classId, equipped);
    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const firstArt = loadout.actives[0] ? getWuxiaActiveArtById(loadout.actives[0].id) : null;
    const style = activeStyle !== undefined ? activeStyle : (firstArt?.style ?? null);

    if (style === 'jade_swords' || style === 'six_pulse') {
      this.heroWeaponSprite
        .setTexture('wep_wuxia_sword')
        .setTint(style === 'six_pulse' ? 0x0ea5e9 : 0x38bdf8)
        .setVisible(true);
    } else if (style === 'staff_spin') {
      this.heroWeaponSprite.setTexture('wep_wuxia_staff').setTint(0x10b981).setVisible(true);
    } else if (style === 'iron_cleave') {
      this.heroWeaponSprite.setTexture('wep_wuxia_heavy_sword').setTint(0xa855f7).setVisible(true);
    } else if (style === 'flute_sonic') {
      this.heroWeaponSprite.setTexture('wep_wuxia_flute').setTint(0x2dd4bf).setVisible(true);
    } else if (
      style === 'palm_wave' ||
      style === 'venom_needles' ||
      style === 'flicking_finger' ||
      !gearStyle.hasWeapon
    ) {
      this.heroWeaponSprite.setVisible(false);
    } else {
      this.heroWeaponSprite
        .setTexture(`gear_wep_${this.runConfig.classId}`)
        .setTint(gearStyle.weaponTint)
        .setVisible(true);
    }
  }

  private refreshLayout(width: number, height: number): void {
    this.cameras.resize(width, height);
    this.groundY = Math.round(height * 0.78);
    this.heroX = Math.max(90, Math.round(width * 0.18));
    const floorH = Math.max(96, height - this.groundY);

    if (this.skyImage) {
      this.skyImage.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    }
    if (this.farMountainsTile) {
      this.farMountainsTile.setPosition(width / 2, this.groundY - 97).setSize(width, 210);
    }
    if (this.midPagodaTile) {
      this.midPagodaTile.setPosition(width / 2, this.groundY - 85).setSize(width, 190);
    }
    if (this.floorTile) {
      this.floorTile
        .setPosition(width / 2, this.groundY + floorH / 2)
        .setSize(width, floorH)
        .setTileScale(1, floorH / 220);
    }
    if (this.horizonGlow) {
      this.horizonGlow.setPosition(width / 2, this.groundY - 4).setDisplaySize(width, 108);
    }
    if (this.vignetteImage) {
      this.vignetteImage.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    }
    if (this.heroShadow) {
      this.heroShadow.setPosition(this.heroX, this.groundY - 4);
    }
    if (this.heroSprite) {
      this.heroSprite.setPosition(this.heroX, this.groundY - 28);
      this.updateCompanionVisuals();
    }
    for (const e of this.enemies) {
      const ey = this.groundY - (e.isTotem ? 28 : e.isBoss && !e.isMiniBoss ? 52 : e.isBoss ? 40 : 24);
      e.sprite.y = ey;
      e.sprite.x = Math.max(this.heroX + 74, Math.min(width - 55, e.sprite.x));
      e.shadow.setPosition(e.sprite.x, this.groundY - 4);
      if (e.totemGlowRing) {
        e.totemGlowRing.setPosition(e.sprite.x, ey);
      }
    }
  }

  private applyBiomeVisuals(biome: BiomeDefinition): void {
    this.activeBiome = biome;
    this.ensureHd2dBiomeTextures(biome);
    this.skyImage?.setTexture(`hd2d_sky_${biome.id}`);
    this.farMountainsTile?.setTexture(`hd2d_far_${biome.id}`);
    this.midPagodaTile?.setTexture(`hd2d_mid_${biome.id}`);
    this.floorTile?.setTexture(`hd2d_floor_${biome.id}`);
    const accentHex = rgbToHexInt(parseAccentRgb(biome.accentHex));
    this.horizonGlow?.setTint(accentHex);
    const moteTint = rgbToHexInt(mixRgb(parseAccentRgb(biome.accentHex), [254, 243, 199], 0.42));
    for (const mote of this.ambientMotes) {
      mote.arc.setFillStyle(moteTint, mote.baseAlpha);
    }
  }

  private updateAmbientMotes(dt: number): void {
    if (this.ambientMotes.length === 0) return;
    const w = this.scale.width || 1024;
    const h = this.scale.height || 768;
    const tSec = this.elapsedRunMs * 0.0024;
    const scrollBias = this.phase === 'walking' ? 28 : 0;
    for (const mote of this.ambientMotes) {
      let nx = mote.arc.x + (mote.speedX - scrollBias) * dt + Math.sin(tSec + mote.phase) * 6 * dt;
      let ny = mote.arc.y + mote.speedY * dt;
      if (ny < -8) ny = h + 8;
      if (nx < -8) nx = w + 8;
      if (nx > w + 8) nx = -8;
      const pulse = 0.72 + Math.sin(tSec * 1.4 + mote.phase) * 0.28;
      mote.arc.setPosition(nx, ny).setAlpha(mote.baseAlpha * pulse);
    }
  }

  private clearCombatEntities(): void {
    for (const e of this.enemies) {
      e.shadow.destroy();
      e.sprite.destroy();
      e.hpBg.destroy();
      e.hpFill.destroy();
      e.nameText.destroy();
      e.statusBadge?.destroy();
      e.flawRing?.destroy();
      e.flawText?.destroy();
      e.heavyTelegraphGfx?.destroy();
      e.totemGlowRing?.destroy();
    }
    this.enemies = [];

    for (const ft of this.activeFloatingTexts) {
      this.tweens.killTweensOf(ft.text);
      ft.text.destroy();
    }
    this.activeFloatingTexts = [];

    for (const p of this.projectiles) {
      p.sprite.destroy();
      p.auraSprite?.destroy();
    }
    this.projectiles = [];

    for (const ep of this.enemyProjectiles) {
      ep.sprite.destroy();
      ep.glow.destroy();
    }
    this.enemyProjectiles = [];

    for (const l of this.loots) l.sprite.destroy();
    this.loots = [];

    for (const h of this.hazards) {
      h.sprite.destroy();
      h.ring.destroy();
    }
    this.hazards = [];
  }

  public stopToIdle(): void {
    this.phase = 'idle';
    this.heroAttackAnimTimer = 0;
    this.heroDashAnimTimer = 0;
    this.applyHeroAnimTexture('idle');
    this.clearCombatEntities();
    musicFX.setMood('camp');
  }

  public startRun(payload: RunStartPayload): void {
    this.clearCombatEntities();
    this.runConfig = payload;
    this.activeDecree = payload.mode === 'daily' ? getDailySectDecree(getUtcDateKey()) : null;
    this.rng = mulberry32(payload.seed);
    this.applyBiomeVisuals(getBiomeById(payload.biomeId));

    const clsLevel = payload.profile.classes[payload.classId].level;
    this.createHeroDisplay(payload.classId, clsLevel);
    musicFX.setMood('combat');

    this.floor = 1;
    this.waveIndex = 1;
    this.totalWavesOnFloor = 1;
    this.elapsedRunMs = 0;
    this.goldCollected = 0;
    this.shardsCollected = 0;
    this.coresCollected = 0;
    this.draftedBuffIds = [];
    this.wuxiaArtTimers = {};
    this.currentBossMutations = [];
    this.lastBossMutations = [];
    this.floorsCleared = 0;

    this.potionCharges = 1;
    this.potionCooldown = 0;
    this.fastingFloorsLeft = 0;
    this.attackTimer = 0;
    this.attackCount = 0;
    this.skillTimer = 0;
    this.unhitTimer = 5;
    this.dashCooldown = 0;
    this.hawkTimer = 0;
    this.wolfTimer = 0;
    this.runeZapTimer = 0;
    this.meteorTimer = 0;
    this.tribulationTimer = 0;
    this.volatileSoulTimer = 0;
    this.battleMomentumTimer = 0;
    this.battleMomentumStacks = 0;
    this.vampiricTouchCd = 0;
    this.phoenixReviveUsed = false;
    this.dodgeCount = 0;
    this.ultimateGauge = 0;
    this.ultimateStocks = 0;
    this.nonCritTextCooldown = 0;
    this.hitstopTimer = 0;
    this.floorElapsedSec = 0;
    this.coldJadeFreezeUsed = false;
    this.volcanicPulseTimer = 0;
    this.pendingWaveClearTimer = 0;
    this.pendingWaveClearActive = false;

    this.recomputeStats();
    this.heroHp = this.stats ? this.stats.maxHp : 200;
    this.applyFloorStartShieldsAndPassives();

    this.spawnCompanionVisuals();
    this.beginFloor(1);
    this.emitHud();
  }

  private hasEquippedLegendary(legendaryId: string): boolean {
    if (!this.runConfig) return false;
    const cls = this.runConfig.profile.classes[this.runConfig.classId];
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    for (const s of slots) {
      if (cls.equipped[s]?.legendaryId === legendaryId) return true;
    }
    return false;
  }

  private isEquippedLegendaryCursed(legendaryId: string): boolean {
    if (!this.runConfig) return false;
    const cls = this.runConfig.profile.classes[this.runConfig.classId];
    const slots: readonly GearSlot[] = ['weapon', 'headgear', 'top', 'cape'];
    for (const s of slots) {
      const item = cls.equipped[s];
      if (item?.legendaryId === legendaryId) return item.isCursed;
    }
    return false;
  }

  private getWeaponSockets(): ElementId[] {
    if (!this.runConfig) return [];
    const wep = this.runConfig.profile.classes[this.runConfig.classId].equipped.weapon;
    return wep ? wep.sockets : [];
  }

  private spawnCompanionVisuals(): void {
    if (!this.runConfig) return;
    if (
      (this.hasEquippedLegendary('bow_head_beastmaster') ||
        this.draftedBuffIds.includes('prism_bow_spectral_pack')) &&
      !this.wolfSprite
    ) {
      this.wolfSprite = this.add
        .image(this.heroX + 36, this.groundY - 18, 'pet_wolf')
        .setDepth(6);
    }

    if (this.hasEquippedLegendary('bow_cape_goldenfalcon') && !this.hawkSprite) {
      this.hawkSprite = this.add
        .image(this.heroX - 38, this.groundY - 92, 'pet_hawk')
        .setDepth(6);
    }

    if (this.hasEquippedLegendary('mage_cape_tome') && this.runeBooks.length === 0) {
      this.runeBooks = [
        this.add.image(this.heroX, this.groundY - 60, 'rune_book').setDepth(7),
        this.add.image(this.heroX, this.groundY - 60, 'rune_book').setDepth(7),
      ];
    }
  }

  private recomputeStats(): void {
    if (!this.runConfig) return;
    const baseStats = computeHeroCombatStats(
      this.runConfig.profile,
      this.runConfig.classId,
      this.draftedBuffIds,
      this.goldCollected,
      this.floorsCleared
    );
    if (this.activeDecree) {
      this.stats = {
        ...baseStats,
        atk: Math.max(1, Math.round(baseStats.atk * this.activeDecree.playerAtkMult)),
        critRate: Math.min(1, Math.max(0.01, baseStats.critRate + this.activeDecree.critRateBonus)),
      };
    } else {
      this.stats = baseStats;
    }
  }

  private applyFloorStartShieldsAndPassives(): void {
    if (!this.stats) return;
    const wuxia = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    this.heroShield =
      computeFloorStartShield(
        this.stats.maxHp,
        this.draftedBuffIds,
        this.hasEquippedLegendary('war_cape_aegis'),
        this.isEquippedLegendaryCursed('war_cape_aegis')
      ) + wuxia.aggregatedStats.shieldOnFloor;
    this.invulnHitsLeft = 0;
  }

  private beginFloor(floorNum: number): void {
    this.floor = floorNum;
    this.waveIndex = 1;
    this.potionCharges = 1;
    this.currentBossMutations = [];
    this.floorElapsedSec = 0;
    this.coldJadeFreezeUsed = false;
    this.volcanicPulseTimer = 0;
    this.pendingWaveClearTimer = 0;
    this.pendingWaveClearActive = false;
    if (this.runConfig) {
      const prevBiomeId = this.activeBiome.id;
      this.applyBiomeVisuals(
        getBiomeForFloor(this.runConfig.biomeId, floorNum, this.runConfig.seed)
      );
      if (floorNum > 1 && floorNum % 10 === 1 && prevBiomeId !== this.activeBiome.id) {
        this.cameras.main.flash(320, 255, 245, 200);
        this.spawnFloatingText(
          this.scale.width / 2,
          this.groundY - 185,
          `NEW ZONE: ${this.activeBiome.name.toUpperCase()}`,
          this.activeBiome.accentHex,
          20
        );
      }
    }
    this.applyFloorStartShieldsAndPassives();

    const isMountHuaSummit = floorNum >= 25 && floorNum % 10 === 5;
    if (
      isCultLeaderFloor(floorNum) ||
      isRandomMiniBossFloor(floorNum, this.runConfig?.seed ?? 1) ||
      isMountHuaSummit
    ) {
      this.totalWavesOnFloor = 1;
      this.phase = 'paused';
      const baseCount = isCultLeaderFloor(floorNum)
        ? Math.min(3, Math.max(1, Math.floor(floorNum / 10)))
        : isMountHuaSummit
          ? 2
          : 1;
      const count = Math.max(baseCount, computeBossRouletteCount(floorNum, this.draftedBuffIds));
      this.callbacks?.onRequestRoulette(floorNum, count, this.lastBossMutations);
      this.emitHud();
      return;
    }

    this.totalWavesOnFloor = floorNum <= 1 ? 1 : 2;
    this.phase = 'walking';
    this.walkTimer = floorNum <= 3 ? 0.55 : 0.7;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 140, `FLOOR ${floorNum}`, '#ecd492', 26);
    this.emitHud();
  }

  public resumeAfterRoulette(mutations: MutationId[]): void {
    this.currentBossMutations = [...mutations];
    this.lastBossMutations = [...mutations];
    this.phase = 'walking';
    this.walkTimer = 0.75;
    const baseBiomeId = this.runConfig?.biomeId ?? this.activeBiome.id;
    const runSeed = this.runConfig?.seed ?? 1;
    const isCultLeader = isCultLeaderFloor(this.floor);
    const isMountHuaSummit = !isCultLeader && this.floor >= 25 && this.floor % 10 === 5;
    const label = isCultLeader
      ? `BOSS (F${this.floor}): ${getEndBossNameForFloor(baseBiomeId, this.floor, runSeed)}`
      : isMountHuaSummit
        ? `BOSS FLOOR (F${this.floor}): DUAL MASTERS`
        : `MINI-BOSS: ${getMiniBossForFloor(baseBiomeId, this.floor, runSeed).name}`;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 150, label, '#d9534f', 22);
    soundFX.playBossRoar();
    this.emitHud();
  }

  private spawnWave(): void {
    const w = this.scale.width || 1024;
    const hpMult =
      computeEnemySpawnHpMult(this.draftedBuffIds) * (this.activeDecree?.enemyHpMult ?? 1);
    const runSeed = this.runConfig?.seed ?? 1;
    const isCultLeader = isCultLeaderFloor(this.floor);
    const isMountHuaSummit = !isCultLeader && this.floor >= 25 && this.floor % 10 === 5;
    const isMiniBoss = isRandomMiniBossFloor(this.floor, runSeed) || isMountHuaSummit;
    const bracket = Math.floor((this.floor - 1) / 10);
    const realmHpMult =
      this.floor <= 10
        ? 1 + (this.floor - 1) * 0.08
        : this.floor <= 20
          ? 1.72 * Math.pow(1.1, this.floor - 10)
          : this.floor <= 30
            ? 4.46 * Math.pow(1.1, this.floor - 20)
            : 11.57 * Math.pow(1.045, this.floor - 30);
    const realmAtkMult =
      this.floor <= 10
        ? 1 + (this.floor - 1) * 0.04
        : this.floor <= 20
          ? 1.36 + (this.floor - 10) * 0.08
          : this.floor <= 30
            ? 2.16 + (this.floor - 20) * 0.12
            : 3.36 * Math.pow(1.025, this.floor - 30);

    if (isCultLeader || isMiniBoss) {
      musicFX.setMood('boss');
      const isEndBoss = isCultLeader;
      const bossTier = Math.max(1, Math.floor(this.floor / 10));
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
        : Math.round((360 + this.floor * 85) * realmHpMult * (this.floor >= 11 ? 2.6 : 1.65));
      const baseAtk = isEndBoss
        ? cultLeaderAtk
        : Math.round((14 + this.floor * 3.2) * realmAtkMult * 1.65);
      const baseBiomeId = this.runConfig?.biomeId ?? this.activeBiome.id;
      const miniBossSpec = getMiniBossForFloor(baseBiomeId, this.floor, runSeed);
      const name = isEndBoss
        ? `${getEndBossNameForFloor(baseBiomeId, this.floor, runSeed)} (F${this.floor})`
        : miniBossSpec.name;

      if (isMountHuaSummit) {
        const secondSpec = getMiniBossForFloor(baseBiomeId, this.floor + 2, runSeed + 7919);
        this.spawnBossEntity(
          miniBossSpec.name,
          w - 195,
          Math.round(baseHp * 0.85 * hpMult),
          baseAtk,
          false,
          false,
          miniBossSpec
        );
        this.spawnBossEntity(
          secondSpec.name,
          w - 95,
          Math.round(baseHp * 0.85 * hpMult),
          baseAtk,
          false,
          false,
          secondSpec
        );
        this.spawnFloatingText(
          w / 2,
          this.groundY - 155,
          'BOSS FLOOR: DUAL MASTERS',
          '#fde047',
          19
        );
      } else if (this.currentBossMutations.includes('twin_soul')) {
        this.spawnBossEntity(
          name,
          w - 160,
          Math.round(baseHp * 0.65 * hpMult),
          baseAtk,
          isEndBoss,
          false,
          isEndBoss ? undefined : miniBossSpec
        );
        this.spawnBossEntity(
          `${name} (Shade)`,
          w - 95,
          Math.round(baseHp * 0.35 * hpMult),
          Math.round(baseAtk * 0.75),
          isEndBoss,
          true,
          isEndBoss ? undefined : miniBossSpec
        );
      } else {
        this.spawnBossEntity(
          name,
          w - 150,
          Math.round(baseHp * hpMult),
          baseAtk,
          isEndBoss,
          false,
          isEndBoss ? undefined : miniBossSpec
        );
      }
      return;
    }

    musicFX.setMood('combat');
    const isFinalWave = this.waveIndex === this.totalWavesOnFloor;
    const isEliteFloor = this.floor > 1 && (this.floor % 10 === 7 || this.floor % 10 === 9);
    const mobCount =
      this.floor === 1
        ? 3
        : 3 + Math.min(5, Math.floor(this.floor / 4)) + (isFinalWave ? 1 : 0);
    const eliteChance =
      this.floor < 3 ? 0 : Math.min(0.65, 0.18 + bracket * 0.14 + (this.floor % 10) * 0.015);
    const spacing = Math.min(
      84,
      Math.max(38, Math.floor((w - this.heroX - 200) / Math.max(1, mobCount - 1)))
    );
    const frontAnchorX = this.waveIndex > 1 ? Math.max(this.heroX + 210, w - 260) : w - 75;
    for (let i = 0; i < mobCount; i++) {
      const kindIdx = Math.floor(this.rng() * 3);
      const textureKey = `mob_${kindIdx}`;
      const tint = this.activeBiome.mobColors[kindIdx] ?? 0x6ede8a;
      const mobName = this.activeBiome.mobNames[kindIdx] ?? 'Cultist';
      const archetype: 'bruiser' | 'ranged' | 'flanker' =
        kindIdx === 0 ? 'bruiser' : kindIdx === 1 ? 'ranged' : 'flanker';
      const archetypeHpMult = archetype === 'bruiser' ? 1.22 : archetype === 'flanker' ? 0.82 : 1;
      const archetypeSpeedMult = archetype === 'bruiser' ? 0.85 : archetype === 'flanker' ? 1.32 : 1;
      const archetypeAtkIntervalMult = archetype === 'flanker' ? 0.85 : 1;
      const preferredDist =
        archetype === 'ranged'
          ? this.heroX + 260 + Math.floor(this.rng() * 70)
          : this.heroX + 74;
      const isElite =
        (isEliteFloor && i === mobCount - 1) ||
        (this.floor >= 3 && (this.rng() < eliteChance || (isFinalWave && i === 0 && this.floor >= 5)));
      const maxHp = Math.round(
        (46 + this.floor * 28 + this.waveIndex * 14) *
          realmHpMult *
          (isElite ? 2.15 : 1) *
          archetypeHpMult *
          hpMult
      );
      const atk = Math.round((7 + this.floor * 2.2) * realmAtkMult * (isElite ? 1.45 : 1));
      const x = Math.max(
        this.heroX + 130,
        this.waveIndex > 1 ? frontAnchorX + i * spacing * 0.65 : w - 75 - i * spacing
      );
      const y = this.groundY - 24;

      const shadow = this.add
        .image(x, this.groundY - 4, 'hd2d_shadow')
        .setScale(isElite ? 1.02 : 0.78, isElite ? 0.9 : 0.72)
        .setDepth(4.1);
      const sprite = this.add.image(x, y, textureKey).setTint(tint).setDepth(6);
      if (isElite) sprite.setScale(1.3);

      const hpBg = this.add
        .rectangle(x, y - 42, 46, 6, 0x120e0c)
        .setStrokeStyle(1, 0x0d0a08, 0.92)
        .setVisible(isElite)
        .setDepth(8);
      const hpFill = this.add
        .rectangle(x, y - 42, 46, 6, isElite ? 0x9d68a8 : 0xb8352a)
        .setVisible(isElite)
        .setDepth(9);
      const nameText = this.add
        .text(x, y - 54, isElite ? `Elite ${mobName}` : mobName, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '10px',
          fontStyle: isElite ? 'bold' : 'normal',
          color: isElite ? '#e6d8be' : '#d8ccb8',
          stroke: '#0d0a08',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setVisible(isElite)
        .setDepth(9);
      const statusBadge = this.add
        .text(x + 27, y - 42, '', {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#7da6c7',
          stroke: '#0d0a08',
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5)
        .setVisible(false)
        .setDepth(9.5);

      this.enemies.push({
        id: this.nextEnemyId++,
        sprite,
        shadow,
        hpBg,
        hpFill,
        nameText,
        statusBadge,
        name: mobName,
        isBoss: false,
        isMiniBoss: isElite,
        isSplitClone: false,
        hp: maxHp,
        maxHp,
        hitShield: isElite && this.floor >= 11 ? Math.min(6, 1 + bracket) : 0,
        atk,
        atkIntervalSec: Math.max(
          0.65,
          ((isElite ? 1.28 : 1.52) - this.floor * 0.018) * archetypeAtkIntervalMult
        ),
        atkTimer: 0.5 + this.rng() * 0.6,
        speed: (36 + Math.min(48, this.floor * 1.5)) * (isElite ? 1.18 : 1) * archetypeSpeedMult,
        armorShred: 0,
        burnStacks: 0,
        burnTimer: 0,
        bleedStacks: 0,
        bleedTimer: 0,
        chillTimer: 0,
        rootTimer: 0,
        stunTimer: 0,
        smokeTimer: 0,
        smokeActiveTimer: 0,
        permafrostTimer: 0,
        overheatTimer: 0,
        enrageTimer: 0,
        enrageStacks: 0,
        volatileTimer: 0,
        mitosisDone: false,
        lastGoldenThreshold: 100,
        mutations: [],
        mechanic: null,
        flawTimer: 0,
        flawCooldown: isElite ? 2.6 + this.rng() * 1.6 : 4.2 + this.rng() * 2.5,
        flawRing: null,
        flawText: null,
        heavyChargeTimer: 0,
        heavyCooldown: 99,
        heavyTelegraphGfx: null,
        archetype,
        preferredDist,
        isTotem: false,
        totemOwnerId: null,
        totemSummonTimer: 99,
        totemGlowRing: null,
      });
    }
  }

  private spawnBossEntity(
    name: string,
    x: number,
    baseHp: number,
    baseAtk: number,
    isEndBoss: boolean,
    isSplitClone: boolean,
    miniBossSpec?: ReturnType<typeof getMiniBossForFloor>
  ): void {
    const mutations = this.currentBossMutations;
    let maxHp = baseHp;
    let atkIntervalSec = Math.max(0.68, (isEndBoss ? 1.15 : 1.32) - this.floor * 0.012);
    let scale = isSplitClone ? 0.78 : 1;

    if (mutations.includes('juggernaut')) {
      maxHp = Math.round(maxHp * 1.3);
      atkIntervalSec *= 1.2;
      scale *= 1.2;
    }
    if (mutations.includes('hasted')) {
      maxHp = Math.round(maxHp * 0.8);
      atkIntervalSec = Math.max(0.55, atkIntervalSec * 0.72);
    }

    const y = this.groundY - (isEndBoss ? 52 : 40);
    const barOffset = isEndBoss ? 68 : 56;
    const key = isEndBoss ? 'endboss' : (miniBossSpec?.spriteKey ?? 'miniboss_0');
    const baseColor = isEndBoss
      ? (this.activeBiome.mobColors[0] ?? 0xef4444)
      : (miniBossSpec?.tintHex ?? this.activeBiome.mobColors[0] ?? 0xef4444);
    const tint = mutations.includes('golden_gilded')
      ? 0xffd700
      : isSplitClone
        ? 0xc084fc
        : baseColor;

    const shadow = this.add
      .image(x, this.groundY - 4, 'hd2d_shadow')
      .setScale(isEndBoss ? 1.65 : 1.35, isEndBoss ? 1.2 : 1.05)
      .setDepth(4.1);
    const sprite = this.add.image(x, y, key).setTint(tint).setScale(scale).setDepth(6);
    const hpBg = this.add
      .rectangle(x, y - barOffset, 96, 8, 0x120e0c)
      .setStrokeStyle(1, 0x0d0a08, 0.92)
      .setVisible(false)
      .setDepth(8);
    const hpFill = this.add.rectangle(x, y - barOffset, 96, 8, 0xc23b2f).setVisible(false).setDepth(9);
    const nameText = this.add
      .text(x, y - barOffset - 14, name, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ecd492',
        stroke: '#0d0a08',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(9);
    const statusBadge = this.add
      .text(x, y - barOffset, '', {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#7da6c7',
        stroke: '#0d0a08',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(9.5);

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite,
      shadow,
      hpBg,
      hpFill,
      nameText,
      statusBadge,
      name,
      isBoss: true,
      isMiniBoss: !isEndBoss,
      isSplitClone,
      hp: maxHp,
      maxHp,
      hitShield:
        this.activeDecree && this.activeDecree.bonusBossShield > 0
          ? this.activeDecree.bonusBossShield
          : 0,
      atk: baseAtk,
      atkIntervalSec,
      atkTimer: 0.9,
      speed: 28 + Math.min(28, this.floor * 0.8),
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
      mitosisDone: isSplitClone,
      lastGoldenThreshold: 100,
      mutations: [...mutations],
      mechanic: isEndBoss ? this.activeBiome.mechanicId : (miniBossSpec?.mechanicId ?? this.activeBiome.mechanicId),
      flawTimer: 0,
      flawCooldown: isEndBoss ? 2.4 : 2.8,
      flawRing: null,
      flawText: null,
      heavyChargeTimer: 0,
      heavyCooldown: 6.5 + this.rng() * 1.5,
      heavyTelegraphGfx: null,
      archetype: 'boss',
      preferredDist: this.heroX + 74,
      isTotem: false,
      totemOwnerId: null,
      totemSummonTimer: isEndBoss && !isSplitClone ? 10.5 + this.rng() * 1.5 : 99,
      totemGlowRing: null,
    });
  }

  private spawnBloodQiTotem(boss: EnemyEntity): void {
    if (this.enemies.some((o) => o.isTotem && o.hp > 0)) return;
    const totemHp = Math.max(1, Math.round(boss.maxHp * 0.12));
    const tx = Math.max(this.heroX + 108, boss.sprite.x - 58);
    const ty = this.groundY - 28;

    const shadow = this.add
      .image(tx, this.groundY - 4, 'hd2d_shadow')
      .setScale(0.75, 0.7)
      .setDepth(4.1);
    const totemGlowRing = this.add
      .circle(tx, ty, 30, 0xdc2626, 0.18)
      .setStrokeStyle(2.5, 0xf59e0b, 0.9)
      .setDepth(5.4);
    const sprite = this.add.image(tx, ty, 'blood_qi_totem').setDepth(6.2);
    const hpBg = this.add
      .rectangle(tx, ty - 44, 54, 6, 0x120e0c)
      .setStrokeStyle(1, 0xf59e0b, 0.9)
      .setVisible(true)
      .setDepth(8);
    const hpFill = this.add
      .rectangle(tx, ty - 44, 54, 6, 0xdc2626)
      .setVisible(true)
      .setDepth(9);
    const nameText = this.add
      .text(tx, ty - 56, 'Blood-Qi Totem', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f59e0b',
        stroke: '#0d0a08',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(true)
      .setDepth(9);

    soundFX.playBossTelegraph();
    this.spawnQiShockwaveRing(tx, ty, 0xdc2626, 95, 240);
    this.spawnFloatingText(tx, ty - 74, 'BLOOD-QI TOTEM!', '#f59e0b', 14);

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite,
      shadow,
      hpBg,
      hpFill,
      nameText,
      name: 'Blood-Qi Totem',
      isBoss: false,
      isMiniBoss: false,
      isSplitClone: false,
      hp: totemHp,
      maxHp: totemHp,
      hitShield: 0,
      atk: 0,
      atkIntervalSec: 99,
      atkTimer: 99,
      speed: 0,
      armorShred: 0,
      burnStacks: 0,
      burnTimer: 0,
      bleedStacks: 0,
      bleedTimer: 0,
      chillTimer: 0,
      rootTimer: 0,
      stunTimer: 0,
      smokeTimer: 0,
      smokeActiveTimer: 0,
      permafrostTimer: 0,
      overheatTimer: 0,
      enrageTimer: 0,
      enrageStacks: 0,
      volatileTimer: 0,
      mitosisDone: true,
      lastGoldenThreshold: 100,
      mutations: [],
      mechanic: null,
      flawTimer: 0,
      flawCooldown: 99,
      flawRing: null,
      flawText: null,
      heavyChargeTimer: 0,
      heavyCooldown: 99,
      heavyTelegraphGfx: null,
      archetype: 'bruiser',
      preferredDist: tx,
      isTotem: true,
      totemOwnerId: boss.id,
      totemSummonTimer: 99,
      totemGlowRing,
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (this.phase === 'idle' || this.phase === 'paused') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - deltaMs / 1000);
      return;
    }

    const realDt = Math.min(0.05, deltaMs / 1000);
    const dt = Math.min(0.05, (deltaMs / 1000) * this.speedMult);
    this.elapsedRunMs += deltaMs * this.speedMult;
    this.updateAmbientMotes(dt);

    if (this.phase === 'walking') {
      this.walkTimer -= dt;
      this.updateHeroAnimState(realDt);
      if (this.farMountainsTile) this.farMountainsTile.tilePositionX += 14 * dt;
      if (this.midPagodaTile) this.midPagodaTile.tilePositionX += 46 * dt;
      if (this.floorTile) this.floorTile.tilePositionX += 116 * dt;
      if (this.heroSprite) {
        const targetY = this.groundY - 28 + Math.sin(this.elapsedRunMs * 0.014) * 3.2;
        const targetRot = Math.sin(this.elapsedRunMs * 0.014) * 0.04;
        this.heroSprite.y = Phaser.Math.Linear(this.heroSprite.y, targetY, Math.min(1, dt * 14));
        this.heroSprite.rotation = Phaser.Math.Linear(
          this.heroSprite.rotation,
          targetRot,
          Math.min(1, dt * 14)
        );
      }
      this.updateProjectiles(dt);
      this.updateEnemyProjectiles(dt);
      this.updateHazards(dt);
      this.updateLootDrops(dt);
      if (this.walkTimer <= 0) {
        this.phase = 'combat';
        this.spawnWave();
      }
      this.updateCompanionVisuals();
      return;
    }

    if (this.phase === 'combat') {
      this.updateHeroAnimState(realDt);
      if (this.heroSprite && !this.tweens.isTweening(this.heroSprite)) {
        const combatY = this.groundY - 28 + Math.sin(this.elapsedRunMs * 0.005) * 1.8;
        this.heroSprite.y = Phaser.Math.Linear(this.heroSprite.y, combatY, Math.min(1, dt * 12));
        this.heroSprite.rotation = Phaser.Math.Linear(
          this.heroSprite.rotation,
          0,
          Math.min(1, dt * 12)
        );
      }
      this.updateCombat(dt);
      this.updateProjectiles(dt);
      this.updateEnemyProjectiles(dt);
      this.updateHazards(dt);
      this.updateLootDrops(dt);
      this.updateCompanionVisuals();

      this.hudSyncTimer += deltaMs;
      if (this.hudSyncTimer >= 90) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }
  }

  private updateCompanionVisuals(): void {
    if (this.heroSprite) {
      const hx = this.heroSprite.x;
      const hy = this.heroSprite.y;
      const hRot = this.heroSprite.rotation;
      if (this.heroShadow) {
        const lift = Math.max(0, this.groundY - 28 - hy);
        const shScale = Math.max(0.55, 1 - lift * 0.008);
        this.heroShadow
          .setPosition(hx, this.groundY - 4)
          .setScale(0.95 * shScale, 0.85 * shScale)
          .setAlpha(Math.max(0.35, 1 - lift * 0.01));
      }
      if (this.heroSutraAuraGfx) {
        this.heroSutraAuraGfx.clear();
        const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
        if (loadout.innerQis.length > 0) {
          const t = this.elapsedRunMs * 0.003;
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
          const totalLevels = loadout.innerQis.reduce((sum, s) => sum + s.level, 0);
          const primarySutra = getWuxiaInnerQiById(loadout.innerQis[0]?.id ?? '');
          const baseColor = primarySutra?.colorHex ?? 0x38bdf8;
          const ringRadiusX = 34 + Math.min(16, totalLevels * 1.2) + pulse * 3;
          const ringRadiusY = 11 + Math.min(5, totalLevels * 0.4) + pulse * 1.2;

          // Subtle ground Passive Skill ellipse ring
          this.heroSutraAuraGfx.lineStyle(1.5, baseColor, 0.42 + pulse * 0.24);
          this.heroSutraAuraGfx.strokeEllipse(hx, this.groundY - 4, ringRadiusX * 2, ringRadiusY * 2);
          this.heroSutraAuraGfx.fillStyle(baseColor, 0.06 + pulse * 0.05);
          this.heroSutraAuraGfx.fillEllipse(hx, this.groundY - 4, ringRadiusX * 1.8, ringRadiusY * 1.8);

          // Orbiting spirit motes — one per learned Passive Skill
          const count = loadout.innerQis.length;
          for (let i = 0; i < count; i++) {
            const slot = loadout.innerQis[i];
            if (!slot) continue;
            const sutra = getWuxiaInnerQiById(slot.id);
            const moteColor = sutra?.colorHex ?? baseColor;
            const angle = t * 1.15 + (i * Math.PI * 2) / count;
            const ox = hx + Math.cos(angle) * (34 + slot.level * 1.8);
            const oy = hy - 6 + Math.sin(angle) * 20;
            const moteSize = 3.2 + Math.min(2.5, slot.level * 0.45);
            this.heroSutraAuraGfx.fillStyle(moteColor, 0.85);
            this.heroSutraAuraGfx.fillCircle(ox, oy, moteSize + 1.5);
            this.heroSutraAuraGfx.fillStyle(0xffffff, 0.95);
            this.heroSutraAuraGfx.fillCircle(ox, oy, Math.max(1.5, moteSize * 0.55));
          }
        }
      }
      if (this.heroCapeSprite) {
        const flutter = Math.sin(this.elapsedRunMs * 0.01) * 0.06;
        this.heroCapeSprite.setPosition(hx, hy).setRotation(hRot + flutter);
      }
      if (this.heroTopSprite) {
        this.heroTopSprite.setPosition(hx, hy).setRotation(hRot);
      }
      if (this.heroHelmSprite) {
        this.heroHelmSprite.setPosition(hx, hy).setRotation(hRot);
      }
      if (this.heroWeaponSprite) {
        this.heroWeaponSprite
          .setPosition(hx + 16 + this.weaponSwingOffsetX, hy - 2 + this.weaponSwingOffsetY)
          .setRotation(this.weaponAngle + hRot);
      }

      // Player Overhead HP + Shield + Qi Bar (replaces bottom-left HUD vitals pane)
      if (this.heroOverheadGfx && this.stats) {
        this.heroOverheadGfx.clear();
        const barW = 58;
        const hpH = 6;
        const qiH = 3;
        const barX = Math.round(hx - barW / 2);
        const barY = Math.round(hy - 50);
        const maxHp = Math.max(1, this.stats.maxHp);
        const hpRatio = Math.max(0, Math.min(1, this.heroHp / maxHp));
        const hpColor = hpRatio > 0.5 ? 0x5fa882 : hpRatio > 0.25 ? 0xd49b38 : 0xc23b2f;

        // Outer sumi lacquer border + recessed dark rosewood track
        this.heroOverheadGfx.fillStyle(0x0d0a08, 0.94);
        this.heroOverheadGfx.fillRect(barX - 2, barY - 2, barW + 4, hpH + 4);
        this.heroOverheadGfx.fillStyle(0x1b1411, 0.92);
        this.heroOverheadGfx.fillRect(barX, barY, barW, hpH);
        // Subtle 1px antique brass top & side bevel rim around the HP bar
        this.heroOverheadGfx.fillStyle(0xc49f54, 0.65);
        this.heroOverheadGfx.fillRect(barX - 1, barY - 1, barW + 2, 1);
        this.heroOverheadGfx.fillRect(barX - 1, barY, 1, hpH);
        this.heroOverheadGfx.fillRect(barX + barW, barY, 1, hpH);
        // Bottom lacquer shadow rim for crisp bevel
        this.heroOverheadGfx.fillStyle(0x2e2119, 0.85);
        this.heroOverheadGfx.fillRect(barX - 1, barY + hpH, barW + 2, 1);

        if (hpRatio > 0) {
          const fillW = Math.round(barW * hpRatio);
          this.heroOverheadGfx.fillStyle(hpColor, 1);
          this.heroOverheadGfx.fillRect(barX, barY, fillW, hpH);
          // Subtle 1px upper specular highlight on pigment fill
          this.heroOverheadGfx.fillStyle(0xf5ecd8, 0.2);
          this.heroOverheadGfx.fillRect(barX, barY, fillW, 1);
        }

        // Shield overlay strip on top edge of HP bar when active
        if (this.heroShield > 0) {
          const shieldRatio = Math.max(0, Math.min(1, this.heroShield / maxHp));
          this.heroOverheadGfx.fillStyle(0x6a96bd, 0.95);
          this.heroOverheadGfx.fillRect(barX, barY, Math.max(2, Math.round(barW * shieldRatio)), 2);
        }

        // Qi micro-bar tucked directly below HP bar
        const qiY = barY + hpH + 3;
        const qiRatio =
          this.ultimateStocks >= this.maxUltimateStocks
            ? 1
            : Math.max(0, Math.min(1, this.ultimateGauge / 100));
        this.heroOverheadGfx.fillStyle(0x0d0a08, 0.9);
        this.heroOverheadGfx.fillRect(barX - 1, qiY - 1, barW + 2, qiH + 2);
        this.heroOverheadGfx.fillStyle(0x1b1411, 0.9);
        this.heroOverheadGfx.fillRect(barX, qiY, barW, qiH);
        if (qiRatio > 0) {
          this.heroOverheadGfx.fillStyle(this.ultimateStocks > 0 ? 0xecd492 : 0xc8a254, 1);
          this.heroOverheadGfx.fillRect(barX, qiY, Math.round(barW * qiRatio), qiH);
        }

        if (this.heroHpText) {
          const hpInt = Math.max(0, Math.round(this.heroHp));
          const shInt = Math.round(this.heroShield);
          const label = shInt > 0 ? `${hpInt}/${maxHp} +${shInt}` : `${hpInt}/${maxHp}`;
          if (this.heroHpText.text !== label) {
            this.heroHpText.setText(label);
          }
          this.heroHpText.setPosition(hx, barY - 9);
        }
      }
    }
    if (this.hawkSprite) {
      this.hawkSprite.setPosition(
        this.heroX - 30 + Math.sin(this.elapsedRunMs * 0.004) * 14,
        this.groundY - 94 + Math.cos(this.elapsedRunMs * 0.006) * 8
      );
    }
    if (this.wolfSprite) {
      this.wolfSprite.setPosition(
        this.heroX + 36 + Math.sin(this.elapsedRunMs * 0.007) * 10,
        this.groundY - 16
      );
    }
    for (let i = 0; i < this.runeBooks.length; i++) {
      const book = this.runeBooks[i];
      if (!book) continue;
      const angle = this.elapsedRunMs * 0.004 + i * Math.PI;
      book.setPosition(
        this.heroX + Math.cos(angle) * 44,
        this.groundY - 34 + Math.sin(angle) * 24
      );
    }
  }

  private updateCombat(dt: number): void {
    if (!this.stats || !this.runConfig) return;

    this.floorElapsedSec += dt;
    this.unhitTimer += dt;
    if (this.potionCooldown > 0) this.potionCooldown = Math.max(0, this.potionCooldown - dt);
    if (this.skillTimer > 0) this.skillTimer = Math.max(0, this.skillTimer - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.vampiricTouchCd > 0) this.vampiricTouchCd = Math.max(0, this.vampiricTouchCd - dt);
    if (this.nonCritTextCooldown > 0) {
      this.nonCritTextCooldown = Math.max(0, this.nonCritTextCooldown - dt);
    }
    if (this.battleMomentumTimer > 0) {
      this.battleMomentumTimer -= dt;
      if (this.battleMomentumTimer <= 0) this.battleMomentumStacks = 0;
    }

    // 1st Job Warrior regen (Lv. 15+)
    if (this.runConfig.classId === 'warrior' && this.runConfig.profile.classes.warrior.level >= 15) {
      this.healHero(this.stats.maxHp * 0.015 * dt, false);
    }

    // Auto-Skill check (Dantian Burst)
    if (this.autoSkill && this.skillTimer <= 0 && this.enemies.length > 0) {
      this.triggerActiveSkill();
    }

    // Vampire-Survivors-style passive auto-cycle for drafted Wuxia Martial Arts
    if (this.enemies.length > 0) {
      const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
      const cdMult = 1 - this.stats.cooldownReductionPct / 100;
      for (const slot of loadout.actives) {
        const art = getWuxiaActiveArtById(slot.id);
        if (!art) continue;
        const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
        const baseCdMs = syn ? syn.cooldownMs : (art.cooldownsMs[slot.level - 1] ?? 2600);
        const cdSec = Math.max(0.75, (baseCdMs / 1000) * cdMult);
        const curTimer = (this.wuxiaArtTimers[art.id] ?? 0.35) - dt;
        if (curTimer <= 0) {
          this.wuxiaArtTimers[art.id] = cdSec;
          this.castWuxiaActiveArt(art.id, false);
        } else {
          this.wuxiaArtTimers[art.id] = curTimer;
        }
      }

      // Nine-Heavens Tribulation Lightning (periodic sky lightning pillars)
      const tribStacks = loadout.enlightenmentCounts['enlighten_tribulation_thunder'] ?? 0;
      if (tribStacks > 0) {
        this.tribulationTimer += dt;
        if (this.tribulationTimer >= 3.5) {
          this.tribulationTimer = 0;
          const pillarDmg = Math.max(
            1,
            Math.round(this.stats.atk * 2.6 * tribStacks * this.stats.allDamageMult)
          );
          const leadTarget = this.getClosestEnemy() ?? this.enemies[0];
          if (leadTarget) {
            soundFX.playSpell();
            this.cameras.main.shake(105, 0.005);
            this.spawnFloatingText(
              leadTarget.sprite.x,
              this.groundY - 140,
              `THUNDER (×${tribStacks})`,
              '#c084fc',
              16
            );
            this.spawnQiShockwaveRing(
              leadTarget.sprite.x,
              leadTarget.sprite.y,
              0xc084fc,
              180,
              260
            );
            for (const e of [...this.enemies]) {
              if (Math.abs(e.sprite.x - leadTarget.sprite.x) <= 185) {
                this.spawnHitSpark(e.sprite.x, e.sprite.y, true, 0xc084fc);
                this.damageEnemy(e, pillarDmg, true, 'TRIBULATION', true);
                if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.45);
              }
            }
          }
        }
      }
    }

    // Volcanic Armor (war_top_volcanic): every 2.0s (2.8s cursed), 45% ATK AoE fire pulse within 220px
    if (this.hasEquippedLegendary('war_top_volcanic') && this.enemies.length > 0) {
      this.volcanicPulseTimer += dt;
      const interval = this.isEquippedLegendaryCursed('war_top_volcanic') ? 2.8 : 2.0;
      if (this.volcanicPulseTimer >= interval) {
        this.volcanicPulseTimer = 0;
        this.spawnQiShockwaveRing(this.heroX + 20, this.groundY - 28, 0xf97316, 220, 260);
        const pulseDmg = Math.max(1, Math.round(this.stats.atk * 0.45 * this.stats.allDamageMult));
        for (const e of [...this.enemies]) {
          if (e.hp > 0 && Math.abs(e.sprite.x - this.heroX) <= 220) {
            this.damageEnemy(e, pulseDmg, false, 'VOLCANIC', true);
          }
        }
      }
    }

    // Cape: Cloak of the Arcane Tempest meteor every 10s (14s cursed)
    if (this.hasEquippedLegendary('mage_cape_tempest')) {
      this.meteorTimer += dt;
      const interval = this.isEquippedLegendaryCursed('mage_cape_tempest') ? 14 : 10;
      if (this.meteorTimer >= interval && this.enemies.length > 0) {
        this.meteorTimer = 0;
        const dmg = this.stats.atk * 2.6 * this.stats.allDamageMult;
        for (const e of [...this.enemies]) {
          this.damageEnemy(e, dmg, false, 'METEOR', true);
        }
        soundFX.playSpell();
      }
    }

    // Cursed: Volatile Soul AoE pulse every 5s
    if (this.draftedBuffIds.includes('cursed_volatile_soul')) {
      this.volatileSoulTimer += dt;
      if (this.volatileSoulTimer >= 5 && this.enemies.length > 0) {
        this.volatileSoulTimer = 0;
        this.heroHp = Math.max(1, this.heroHp * 0.98);
        const dmg = this.stats.atk * 1.8 * this.stats.allDamageMult;
        for (const e of [...this.enemies]) {
          this.damageEnemy(e, dmg, false, 'PULSE', true);
        }
      }
    }

    // Orbiting Rune Books
    if (this.runeBooks.length > 0) {
      this.runeZapTimer += dt;
      if (this.runeZapTimer >= 1.2 && this.enemies.length > 0) {
        this.runeZapTimer = 0;
        const target = this.getClosestEnemy();
        const book = this.runeBooks[0];
        if (target && book) {
          const vx = 560;
          const travelSec = Math.max(0.08, (target.sprite.x - book.x) / vx);
          const vy = (target.sprite.y - book.y) / travelSec;
          this.spawnProjectile(
            'proj_bolt',
            book.x,
            book.y,
            vx,
            vy,
            this.stats.atk * 0.65,
            false,
            1,
            false,
            false,
            false,
            target.id,
            false,
            false,
            'RUNE'
          );
        }
      }
    }

    // Relic Companions (Golden Falcon & Spectral Wolf)
    if (this.hawkSprite || this.hasEquippedLegendary('bow_cape_goldenfalcon')) {
      this.hawkTimer += dt;
      if (this.hawkTimer >= 1.5 && this.enemies.length > 0) {
        this.hawkTimer = 0;
        const target = this.getClosestEnemy();
        if (target) {
          const inherit = this.hasEquippedLegendary('bow_top_apexpredator')
            ? this.isEquippedLegendaryCursed('bow_top_apexpredator')
              ? 0.75
              : 1
            : 0;
          const isCrit = inherit > 0 && this.rng() < this.stats.critRate;
          const dmg =
            this.stats.atk *
            0.65 *
            (isCrit ? 1 + (this.stats.critDmg - 1) * inherit : 1);
          const hx = this.hawkSprite ? this.hawkSprite.x : this.heroX - 24;
          const hy = this.hawkSprite ? this.hawkSprite.y : this.groundY - 92;
          const vx = 680;
          const travelSec = Math.max(0.08, (target.sprite.x - hx) / vx);
          const vy = (target.sprite.y - hy) / travelSec;
          const dropFalconLoot =
            this.hasEquippedLegendary('bow_cape_goldenfalcon') &&
            this.rng() < (this.isEquippedLegendaryCursed('bow_cape_goldenfalcon') ? 0.25 : 0.45);
          if (this.hawkSprite) {
            this.tweens.add({
              targets: this.hawkSprite,
              scale: 1.28,
              duration: 85,
              yoyo: true,
            });
          }
          this.spawnProjectile(
            'proj_hawk_feather',
            hx + 10,
            hy,
            vx,
            vy,
            dmg,
            isCrit,
            1,
            false,
            false,
            false,
            target.id,
            false,
            dropFalconLoot,
            'HAWK'
          );
        }
      }
    }

    if (this.wolfSprite) {
      this.wolfTimer += dt;
      const interval = this.isEquippedLegendaryCursed('bow_head_beastmaster') ? 1.5 : 1.3;
      if (this.wolfTimer >= interval && this.enemies.length > 0) {
        this.wolfTimer = 0;
        const target = this.getClosestEnemy();
        if (target) {
          this.tweens.add({
            targets: this.wolfSprite,
            scaleX: 1.3,
            scaleY: 0.85,
            duration: 90,
            yoyo: true,
          });
          this.spawnProjectile(
            'proj_wolf_fang',
            this.wolfSprite.x + 16,
            this.groundY - 22,
            640,
            0,
            this.stats.atk * 0.85,
            false,
            1,
            false,
            false,
            false,
            target.id,
            false,
            false,
            'WOLF'
          );
        }
      }
    }

    // Move enemies & tick enemy status effects / boss mechanics
    const frontEnemy = this.getClosestEnemy();
    const attackRange = Math.max(240, this.stats.range);
    const inRange = frontEnemy ? frontEnemy.sprite.x - this.heroX <= attackRange : false;

    if (!inRange && this.enemies.length > 0) {
      if (this.farMountainsTile) this.farMountainsTile.tilePositionX += 9 * dt;
      if (this.midPagodaTile) this.midPagodaTile.tilePositionX += 28 * dt;
      if (this.floorTile) this.floorTile.tilePositionX += 74 * dt;
    }

    for (const e of [...this.enemies]) {
      this.updateEnemy(e, dt, inRange);
    }

    // Hero basic attack
    if (frontEnemy && inRange) {
      const glassBonus =
        this.draftedBuffIds.includes('gold_glass_tempest') && this.unhitTimer >= 3 ? 0.45 : 0;
      const momentumBonus = this.battleMomentumStacks * 0.05;
      const berserkerSpdBonus = this.isBerserkerActive() ? 0.3 : 0;
      const effectiveSpeed =
        this.stats.attackSpeed * (1 + glassBonus + momentumBonus + berserkerSpdBonus);
      this.attackTimer += dt;
      const interval = 1 / Math.max(0.3, effectiveSpeed);

      if (this.attackTimer >= interval) {
        this.attackTimer = 0;
        this.performHeroAttack(frontEnemy);
      }
    }

    // Wave clear check: let in-flight projectiles, death VFX, and loot settle before opening the Draft modal
    if (this.enemies.length === 0 && this.phase === 'combat') {
      if (!this.pendingWaveClearActive) {
        this.pendingWaveClearActive = true;
        const isEndOfFloor = this.waveIndex >= this.totalWavesOnFloor;
        this.pendingWaveClearTimer = (isEndOfFloor ? 0.55 : 0.22) * this.speedMult;
      } else {
        const hasProjectiles = this.projectiles.length > 0;
        const step = hasProjectiles ? dt * 0.55 : dt;
        this.pendingWaveClearTimer -= step;
        if (this.pendingWaveClearTimer <= 0) {
          this.pendingWaveClearActive = false;
          this.pendingWaveClearTimer = 0;
          this.onWaveCleared();
        }
      }
    } else if (this.pendingWaveClearActive) {
      this.pendingWaveClearActive = false;
      this.pendingWaveClearTimer = 0;
    }
  }

  private isBerserkerActive(): boolean {
    if (!this.hasEquippedLegendary('war_head_berserker')) return false;
    const dur = this.isEquippedLegendaryCursed('war_head_berserker') ? 4 : 6;
    return this.floorElapsedSec <= dur;
  }

  private isEclipseCritActive(): boolean {
    if (!this.hasEquippedLegendary('thief_head_eclipse')) return false;
    const dur = this.isEquippedLegendaryCursed('thief_head_eclipse') ? 2.5 : 4.0;
    return this.floorElapsedSec <= dur;
  }

  private applyEnemyKnockback(e: EnemyEntity, pushPx: number): void {
    if (e.isTotem || e.mutations.includes('juggernaut') || e.hp <= 0 || pushPx <= 0) return;
    const maxW = this.scale.width || 1024;
    const wallEdge = maxW - 70;
    e.sprite.x = Math.min(maxW - 55, e.sprite.x + pushPx);
    if (
      this.hasEquippedLegendary('war_wep_worldbreaker') &&
      this.stats &&
      e.sprite.x >= wallEdge
    ) {
      const slamDmg = Math.max(1, Math.round(this.stats.atk * 2 * this.stats.allDamageMult));
      this.spawnHitSpark(e.sprite.x, e.sprite.y, true, 0xf97316);
      this.spawnFloatingText(e.sprite.x, e.sprite.y - 54, 'WALL SLAM!', '#fb923c', 14);
      this.damageEnemy(e, slamDmg, false, 'SLAM', true);
    }
  }

  private triggerAfterimageDecoy(): void {
    if (!this.stats || !this.hasEquippedLegendary('thief_cape_afterimage')) return;
    const cx = this.heroX + 60;
    const cy = this.groundY - 28;
    this.spawnQiShockwaveRing(cx, cy, 0xc084fc, 140, 220);
    this.spawnFloatingText(cx, cy - 44, 'DECOY BLAST!', '#e9d5ff', 13);
    const decoyDmg = Math.max(1, Math.round(this.stats.atk * 1.6 * this.stats.allDamageMult));
    for (const e of [...this.enemies]) {
      if (e.hp > 0 && Math.abs(e.sprite.x - cx) <= 140) {
        this.damageEnemy(e, decoyDmg, false, 'DECOY', true);
      }
    }
  }

  private openFlawWindow(e: EnemyEntity, duration = 2.6): void {
    if (e.hp <= 0) return;
    const barOffset = e.isBoss && !e.isMiniBoss ? 68 : e.isBoss ? 56 : 42;
    const barY = e.sprite.y - barOffset;
    e.flawTimer = duration;
    if (!e.flawRing) {
      e.flawRing = this.add
        .circle(e.sprite.x, e.sprite.y, e.isBoss ? 34 : 24, 0xecd492, 0.14)
        .setStrokeStyle(3, 0xc23b2f)
        .setDepth(11);
    }
    if (!e.flawText) {
      e.flawText = this.add
        .text(e.sprite.x, barY - 26, 'FLAW!', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ecd492',
          stroke: '#5e1714',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(12);
    }
  }

  private spawnEnemyDart(e: EnemyEntity): void {
    const startX = e.sprite.x - 16;
    const startY = e.sprite.y - 6;
    const speed = 340;
    const dx = this.heroX - startX;
    const dy = this.groundY - 28 - startY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    const glow = this.add.circle(startX, startY, 10, 0xf43f5e, 0.35).setDepth(7.2);
    const sprite = this.add
      .circle(startX, startY, 5, 0xfef08a, 0.95)
      .setStrokeStyle(2, 0xef4444)
      .setDepth(7.5);
    this.enemyProjectiles.push({
      sprite,
      glow,
      vx,
      vy,
      damage: e.atk,
      life: 3.0,
    });
  }

  private updateEnemyProjectiles(dt: number): void {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      if (!ep) continue;
      ep.life -= dt;
      ep.sprite.x += ep.vx * dt;
      ep.sprite.y += ep.vy * dt;
      ep.glow.setPosition(ep.sprite.x, ep.sprite.y);

      const hitHero = this.phase === 'combat' && Math.abs(ep.sprite.x - this.heroX) <= 26;
      const expired = ep.life <= 0 || ep.sprite.x < -40;
      if (hitHero) {
        this.spawnHitSpark(this.heroX + 10, this.groundY - 28, false, 0xf43f5e);
        this.damageHero(ep.damage, null);
      }
      if (hitHero || expired) {
        ep.sprite.destroy();
        ep.glow.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private getClosestEnemy(): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = e.sprite.x - this.heroX;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private spawnHeroAfterimage(tintHex: number): void {
    if (!this.heroSprite) return;
    const x = this.heroSprite.x;
    const y = this.heroSprite.y;
    const ghost = this.add
      .image(x, y, this.heroSprite.texture.key)
      .setTint(tintHex)
      .setAlpha(0.55)
      .setScale(this.heroSprite.scaleX, this.heroSprite.scaleY)
      .setDepth(5.6);
    this.tweens.add({
      targets: ghost,
      x: x - 14,
      alpha: 0,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private spawnQiShockwaveRing(
    x: number,
    y: number,
    colorHex: number,
    maxRadius: number,
    durationMs = 260
  ): void {
    const ring = this.add
      .circle(x, y, 14)
      .setStrokeStyle(5, colorHex, 0.95)
      .setFillStyle(colorHex, 0.08)
      .setDepth(10);
    this.tweens.add({
      targets: ring,
      scale: Math.max(1.5, maxRadius / 14),
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnWhirlingStaffVfx(
    x: number,
    y: number,
    radius: number,
    tintHex: number,
    textureKey: string = 'fx_staff_wheel',
    targetScaleBoost: number = 1
  ): void {
    const wheel = this.add
      .image(x, y, textureKey)
      .setTint(tintHex)
      .setScale(0.65 * targetScaleBoost)
      .setAlpha(0.95)
      .setDepth(11);
    this.tweens.add({
      targets: wheel,
      scale: Math.max(1.4, radius / 48) * targetScaleBoost,
      rotation: Math.PI * 3.5,
      alpha: 0.05,
      duration: 340,
      ease: 'Cubic.easeOut',
      onComplete: () => wheel.destroy(),
    });
    this.spawnQiShockwaveRing(x, y, tintHex, Math.min(310, radius * 0.78), 300);
  }

  private spawnFallingGreatswordVfx(
    targetX: number,
    targetY: number,
    tintHex: number,
    isSynergy: boolean,
    textureKey: string = 'fx_iron_cleave',
    scaleBoost: number = 1
  ): void {
    const sword = this.add
      .image(targetX, targetY - 175, textureKey)
      .setRotation(Math.PI / 2)
      .setTint(tintHex)
      .setScale((isSynergy ? 1.55 : 1.2) * scaleBoost)
      .setDepth(12);
    this.tweens.add({
      targets: sword,
      y: targetY - 8,
      scaleY: (isSynergy ? 1.65 : 1.3) * scaleBoost,
      duration: 110,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.spawnQiShockwaveRing(
          targetX,
          targetY,
          tintHex,
          (isSynergy ? 185 : 125) * scaleBoost,
          280
        );
        const fissure = this.add
          .rectangle(targetX, targetY + 18, (isSynergy ? 195 : 130) * scaleBoost, 8, tintHex, 0.9)
          .setDepth(9);
        this.tweens.add({
          targets: fissure,
          scaleX: 1.25,
          alpha: 0,
          duration: 240,
          onComplete: () => fissure.destroy(),
        });
        this.cameras.main.shake(120, isSynergy ? 0.009 : 0.005);
        this.tweens.add({
          targets: sword,
          alpha: 0,
          duration: 190,
          onComplete: () => sword.destroy(),
        });
      },
    });
  }

  private playHeroAttackAnimation(classId: ClassId, scaleMult = 1): void {
    this.heroAttackAnimTimer = Math.max(this.heroAttackAnimTimer, 0.18);
    if (this.heroDashAnimTimer <= 0) {
      this.applyHeroAnimTexture('attack');
    }
    if (this.heroSprite) {
      this.tweens.killTweensOf(this.heroSprite);
      this.heroSprite.setPosition(this.heroX, this.groundY - 28).setScale(1, 1).setRotation(0);
      this.spawnHeroAfterimage(
        classId === 'thief' ? 0x38bdf8 : classId === 'mage' ? 0x2dd4bf : 0xfbbf24
      );
      this.tweens.add({
        targets: this.heroSprite,
        x: this.heroX + (classId === 'warrior' || classId === 'thief' ? 36 : 20) * scaleMult,
        y: this.groundY - 28 - 10 * scaleMult,
        rotation: 0.16,
        scaleX: 1.18,
        scaleY: 0.9,
        duration: 105,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.heroSprite?.active) {
            this.heroSprite
              .setPosition(this.heroX, this.groundY - 28)
              .setScale(1, 1)
              .setRotation(0);
          }
        },
      });
    }

    if (this.weaponTween) {
      this.weaponTween.stop();
      this.weaponTween = null;
    }

    const isUnarmed = !this.heroWeaponSprite?.visible;
    if (isUnarmed) {
      const seal = this.add
        .image(this.heroX + 34, this.groundY - 30, 'fx_taiji_seal')
        .setScale(0.45 * scaleMult)
        .setAlpha(0.92)
        .setDepth(10);
      this.tweens.add({
        targets: seal,
        x: this.heroX + 54,
        scale: 1.15 * scaleMult,
        rotation: Math.PI,
        alpha: 0,
        duration: 210,
        ease: 'Quad.easeOut',
        onComplete: () => seal.destroy(),
      });
      this.spawnSlashVfx(this.heroX + 46, this.groundY - 28, 0xfef08a, 1.25 * scaleMult);
      this.spawnSlashVfx(this.heroX + 34, this.groundY - 36, 0x38bdf8, 0.95 * scaleMult);
    }

    if (classId === 'warrior') {
      this.weaponAngle = -0.95;
      this.weaponSwingOffsetX = 4;
      this.weaponSwingOffsetY = -10;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 1.35,
        weaponSwingOffsetX: 22,
        weaponSwingOffsetY: 10,
        duration: 115,
        ease: 'Cubic.easeOut',
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      if (!isUnarmed) {
        this.spawnSlashVfx(this.heroX + 48, this.groundY - 28, 0xf59e0b, 1.32 * scaleMult);
        this.spawnSlashVfx(this.heroX + 54, this.groundY - 26, 0xdc2626, 1.02 * scaleMult);
      }
    } else if (classId === 'mage') {
      this.weaponAngle = -0.35;
      this.weaponSwingOffsetX = 6;
      this.weaponSwingOffsetY = -10;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.2,
        weaponSwingOffsetX: 12,
        weaponSwingOffsetY: -4,
        duration: 110,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      this.spawnHitSpark(this.heroX + 32, this.groundY - 36, false, 0x38bdf8);
    } else if (classId === 'thief') {
      this.weaponAngle = -0.55;
      this.weaponSwingOffsetX = 16;
      this.weaponSwingOffsetY = 0;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.95,
        weaponSwingOffsetX: 24,
        weaponSwingOffsetY: 4,
        duration: 85,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
      this.spawnSlashVfx(this.heroX + 36, this.groundY - 28, 0xc084fc, 0.95 * scaleMult);
    } else {
      this.weaponAngle = -0.2;
      this.weaponSwingOffsetX = -5;
      this.weaponSwingOffsetY = 0;
      this.weaponTween = this.tweens.add({
        targets: this,
        weaponAngle: 0.1,
        weaponSwingOffsetX: 6,
        weaponSwingOffsetY: 0,
        duration: 85,
        yoyo: true,
        onComplete: () => {
          this.weaponAngle = 0;
          this.weaponSwingOffsetX = 0;
          this.weaponSwingOffsetY = 0;
          this.weaponTween = null;
        },
      });
    }
  }

  private spawnSlashVfx(x: number, y: number, tintHex: number, scale = 1): void {
    const slash = this.add
      .image(x, y, 'fx_slash_arc')
      .setTint(tintHex)
      .setScale(0.75 * scale)
      .setAlpha(0.95)
      .setDepth(10);
    this.tweens.add({
      targets: slash,
      x: x + 16,
      scale: 1.3 * scale,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private spawnHitSpark(x: number, y: number, isCrit: boolean, tintHex = 0xfef08a): void {
    const spark = this.add
      .image(x, y, 'fx_hit_spark')
      .setTint(isCrit ? 0xfbbf24 : tintHex)
      .setScale(isCrit ? 1.15 : 0.75)
      .setDepth(11);
    this.tweens.add({
      targets: spark,
      scale: isCrit ? 1.8 : 1.25,
      rotation: 0.65,
      alpha: 0,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  private spawnLightningVfx(x1: number, y1: number, x2: number, y2: number, colorHex = 0x38bdf8): void {
    const gfx = this.add.graphics().setDepth(11);
    gfx.lineStyle(3, colorHex, 0.95);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    const segments = 4;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const mx = Phaser.Math.Linear(x1, x2, t) + (this.rng() - 0.5) * 18;
      const my = Phaser.Math.Linear(y1, y2, t) + (this.rng() - 0.5) * 16;
      gfx.lineTo(mx, my);
    }
    gfx.lineTo(x2, y2);
    gfx.strokePath();
    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 170,
      onComplete: () => gfx.destroy(),
    });
  }

  private triggerStaticDischarge(originEnemy: EnemyEntity, atkMult = 0.8): void {
    if (!this.stats) return;
    const isCrit = this.rng() < this.stats.critRate;
    const raw =
      this.stats.atk *
      atkMult *
      this.stats.allDamageMult *
      (isCrit ? this.stats.critDmg : 1);
    const dmg = Math.max(1, Math.round(raw));

    const others = this.enemies.filter(
      (o) => o.id !== originEnemy.id && o.hp > 0 && Math.abs(o.sprite.x - originEnemy.sprite.x) <= 200
    );
    const targets = others.length > 0 ? others.slice(0, 2) : originEnemy.hp > 0 ? [originEnemy] : [];
    for (const e of targets) {
      this.spawnLightningVfx(originEnemy.sprite.x, originEnemy.sprite.y - 6, e.sprite.x, e.sprite.y, 0x38bdf8);
      this.damageEnemy(e, dmg, isCrit, 'CHAIN');
    }
  }

  private performHeroAttack(target: EnemyEntity): void {
    if (!this.stats || !this.runConfig) return;
    this.attackCount += 1;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const primarySlot = loadout.actives[0];
    const primaryArt = primarySlot ? getWuxiaActiveArtById(primarySlot.id) : null;
    const stanceStyle = primaryArt?.style ?? null;
    this.syncHeroWuxiaWeapon(stanceStyle);

    const equippedWep = this.runConfig.profile.classes[this.runConfig.classId].equipped.weapon;
    const hasRelicWep = equippedWep !== null && !equippedWep.id.startsWith('starter_wep_');
    const animStyleClass: ClassId =
      stanceStyle === 'jade_swords'
        ? 'thief'
        : stanceStyle === 'flute_sonic'
          ? 'mage'
          : stanceStyle === 'six_pulse'
            ? 'bowman'
            : this.runConfig.classId;
    this.playHeroAttackAnimation(animStyleClass, 1);

    const rollHit = (dmgMult: number, forceCrit: boolean = false): { dmg: number; isCrit: boolean } => {
      if (!this.stats) return { dmg: 10, isCrit: false };
      let missingAtkBonus = 0;
      if (this.hasEquippedLegendary('war_head_unbroken')) {
        const missingPct = ((this.stats.maxHp - this.heroHp) / this.stats.maxHp) * 100;
        missingAtkBonus += Math.floor(missingPct / 2) * 0.01;
      }
      if (this.draftedBuffIds.includes('prism_war_undying_rage')) {
        const missingPct = ((this.stats.maxHp - this.heroHp) / this.stats.maxHp) * 100;
        missingAtkBonus += missingPct * 0.015;
      }

      const glassCritDmg =
        this.draftedBuffIds.includes('gold_glass_tempest') && this.unhitTimer >= 3 ? 0.25 : 0;

      const isCrit = forceCrit || this.isEclipseCritActive() || this.rng() < this.stats.critRate;
      const berserkerAtkMult = this.isBerserkerActive() ? 1.2 : 1;
      let raw =
        this.stats.atk *
        berserkerAtkMult *
        dmgMult *
        (this.stats.allDamageMult + missingAtkBonus);
      if (isCrit) {
        raw *= this.stats.critDmg + glassCritDmg;
      } else if (this.draftedBuffIds.includes('cursed_reckless_gamble')) {
        raw *= 0.5;
      }
      return { dmg: Math.max(1, Math.round(raw)), isCrit };
    };

    const triggerStatic =
      this.draftedBuffIds.includes('silver_static_discharge') && this.attackCount % 4 === 0;
    const echoChance = this.draftedBuffIds.includes('silver_echo_strike')
      ? this.hasEquippedLegendary('bow_cape_endlesssky')
        ? this.isEquippedLegendaryCursed('bow_cape_endlesssky')
          ? 0.375
          : 0.5
        : 0.25
      : 0;
    const echoProcs = echoChance > 0 && this.rng() < echoChance;

    let projTexture = 'proj_palm_qi';
    let projTint: number | null = null;
    const primaryLevel = primarySlot ? primarySlot.level : 1;
    const primaryHasSyn = primaryArt ? Boolean(getActiveAwakenedSynergy(primaryArt.id, loadout.awakenedSynergies)) : false;
    const basicEvolveScale = primaryHasSyn || primaryLevel >= 4 ? 1.35 : primaryLevel >= 3 ? 1.2 : 1;
    if (stanceStyle === 'jade_swords') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_jade_condor_array'
          : primaryLevel >= 3
            ? 'fx_jade_twin_lotus'
            : 'fx_jade_sword';
      soundFX.playSwordSlash();
    } else if (stanceStyle === 'iron_cleave' || (stanceStyle === null && hasRelicWep)) {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_iron_sword_tomb'
          : primaryLevel >= 3
            ? 'fx_iron_colossus_blade'
            : 'proj_wave';
      soundFX.playHeavyCleave();
    } else if (stanceStyle === 'flute_sonic') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_flute_tidal_dragon'
          : primaryLevel >= 3
            ? 'fx_flute_phoenix_chord'
            : 'fx_flute_wave';
      soundFX.playFluteNote();
    } else if (stanceStyle === 'venom_needles') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_ice_blizzard_lotus'
          : primaryLevel >= 3
            ? 'fx_ice_crystal_spear'
            : 'fx_ice_needle';
      soundFX.playPalmImpact();
    } else if (stanceStyle === 'staff_spin') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_staff_bagua_domain'
          : primaryLevel >= 3
            ? 'fx_staff_dragon_vortex'
            : 'proj_palm_qi';
      projTint = primaryLevel >= 3 ? null : 0x34d399;
      soundFX.playSwing();
    } else if (stanceStyle === 'six_pulse') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_six_pulse_sovereign'
          : primaryLevel >= 3
            ? 'fx_six_pulse_lance'
            : 'proj_bolt';
      soundFX.playSwordSlash();
    } else if (stanceStyle === 'flicking_finger') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_finger_supernova'
          : primaryLevel >= 3
            ? 'fx_finger_solar_orb'
            : 'proj_arrow';
      soundFX.playPalmImpact();
    } else {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_dragon_sovereign'
          : primaryLevel >= 3
            ? 'fx_dragon_palm'
            : 'proj_palm_qi';
      soundFX.playPalmImpact();
    }

    const extraShots =
      (this.hasEquippedLegendary('bow_wep_galeforce') ? 2 : 0) +
      (this.draftedBuffIds.includes('prism_bow_split_arrow') ? 2 : 0) +
      (this.hasEquippedLegendary('mage_wep_starlight') ? 2 : 0);
    const totalShots = 1 + extraShots;
    const guaranteedMark =
      this.draftedBuffIds.includes('prism_bow_snipers_mark') && this.attackCount % 3 === 0;
    const thunderInterval = this.isEquippedLegendaryCursed('bow_wep_thunderbird') ? 7 : 5;
    const isThunder =
      this.hasEquippedLegendary('bow_wep_thunderbird') && this.attackCount % thunderInterval === 0;
    const pierce = this.hasEquippedLegendary('thief_head_bandana')
      ? this.isEquippedLegendaryCursed('thief_head_bandana')
        ? 2
        : 3
      : projTexture === 'proj_wave'
        ? 2
        : 1;

    const vx = 650;
    const startX = this.heroX + 24;
    const startY = this.groundY - 30;
    const baseVy =
      (target.sprite.y - startY) / Math.max(0.08, (target.sprite.x - startX) / vx);

    for (let i = 0; i < totalShots; i++) {
      const { dmg, isCrit } = rollHit(i === 0 ? 1 : 0.6, guaranteedMark && i === 0);
      const spreadVy = (i - (totalShots - 1) / 2) * 26;
      const tex = isThunder && i === 0 ? 'proj_lightning' : projTexture;
      this.spawnProjectile(
        tex,
        startX,
        startY,
        vx,
        baseVy + spreadVy,
        dmg * (guaranteedMark && i === 0 ? 1.25 : 1),
        isCrit,
        isThunder && i === 0 ? 4 : pierce,
        this.hasEquippedLegendary('bow_wep_worldtree') && this.rng() < 0.25,
        this.hasEquippedLegendary('mage_wep_glacial'),
        tex === 'proj_wave',
        target.id,
        i === 0 && triggerStatic,
        false,
        null,
        tex === 'proj_lightning' ? null : projTint,
        basicEvolveScale
      );
    }

    if (
      this.draftedBuffIds.includes('prism_thief_shadow_partner') ||
      (this.hasEquippedLegendary('thief_wep_shadowfang') && this.attackCount % 2 === 0)
    ) {
      const shadowHit = rollHit(this.isEquippedLegendaryCursed('thief_wep_shadowfang') ? 0.4 : 0.6);
      this.spawnProjectile(
        projTexture,
        this.heroX + 10,
        this.groundY - 40,
        vx,
        baseVy,
        shadowHit.dmg,
        false,
        1,
        false,
        false,
        projTexture === 'proj_wave',
        target.id,
        false,
        false,
        'SHADOW',
        projTint
      );
    }

    if (this.hasEquippedLegendary('war_wep_ragnarok') && this.attackCount % 3 === 0) {
      const waveHit = rollHit(1.4);
      this.spawnProjectile(
        'proj_wave',
        startX,
        this.groundY - 34,
        vx,
        0,
        waveHit.dmg,
        waveHit.isCrit,
        99,
        false,
        false,
        true
      );
    }

    if (this.hasEquippedLegendary('mage_wep_abyssal') && this.rng() < 0.2) {
      for (const e of this.enemies) {
        e.sprite.x = Phaser.Math.Linear(e.sprite.x, target.sprite.x, 0.55);
      }
    }

    // Distinct class signature basic attack procs
    const heroClass = this.runConfig.classId;
    if (heroClass === 'warrior' && this.attackCount % 3 === 0) {
      // Blade: heavier golden-cinnabar cleave arc + extra stagger on every 3rd strike
      this.spawnSlashVfx(this.heroX + 56, this.groundY - 28, 0xf59e0b, 1.55);
      this.spawnSlashVfx(target.sprite.x, target.sprite.y, 0xdc2626, 1.35);
      this.cameras.main.shake(60, 0.003);
      const cleaveDmg = Math.max(1, Math.round(this.stats.atk * 0.35 * this.stats.allDamageMult));
      for (const e of [...this.enemies]) {
        if (e.hp > 0 && Math.abs(e.sprite.x - target.sprite.x) <= 115) {
          e.stunTimer = Math.max(e.stunTimer, 0.45);
          this.applyEnemyKnockback(e, 20);
          if (e.id !== target.id) {
            this.damageEnemy(e, cleaveDmg, false, 'CLEAVE', true);
          }
        }
      }
    } else if (heroClass === 'mage' && this.attackCount % 3 === 0) {
      // Scholar: shimmering meridian resonance bolt that chains to 1 nearby enemy
      const chainCandidate = this.enemies.find(
        (o) => o.id !== target.id && o.hp > 0 && Math.abs(o.sprite.x - target.sprite.x) <= 240
      );
      this.spawnQiShockwaveRing(target.sprite.x, target.sprite.y, 0x38bdf8, 64, 180);
      if (chainCandidate) {
        this.spawnLightningVfx(
          target.sprite.x,
          target.sprite.y - 8,
          chainCandidate.sprite.x,
          chainCandidate.sprite.y - 8,
          0x67e8f9
        );
        this.spawnHitSpark(chainCandidate.sprite.x, chainCandidate.sprite.y, false, 0x67e8f9);
        const chainHit = rollHit(0.65);
        this.damageEnemy(chainCandidate, chainHit.dmg, chainHit.isCrit, 'RESONANCE', true);
      } else if (target.hp > 0) {
        this.spawnHitSpark(target.sprite.x, target.sprite.y - 6, false, 0x67e8f9);
        const echoHit = rollHit(0.35);
        this.damageEnemy(target, echoHit.dmg, echoHit.isCrit, 'RESONANCE', true);
      }
    } else if (heroClass === 'thief' && this.attackCount % 4 === 0) {
      // Shadow: rapid shadow double-strike afterimage on every 4th strike
      this.spawnHeroAfterimage(0xa855f7);
      this.spawnSlashVfx(this.heroX + 42, this.groundY - 30, 0xc084fc, 1.15);
      this.time.delayedCall(85, () => {
        if (this.phase !== 'combat' || !this.stats || !this.runConfig) return;
        const shadowTarget = target.hp > 0 ? target : this.getClosestEnemy();
        if (!shadowTarget) return;
        this.spawnHeroAfterimage(0x38bdf8);
        this.spawnSlashVfx(this.heroX + 48, this.groundY - 26, 0xa855f7, 1.1);
        soundFX.playSwordSlash();
        const shadowHit = rollHit(0.7);
        const svy =
          (shadowTarget.sprite.y - startY) /
          Math.max(0.08, (shadowTarget.sprite.x - startX) / vx);
        this.spawnProjectile(
          projTexture,
          startX + 6,
          startY - 4,
          vx + 90,
          svy,
          shadowHit.dmg,
          shadowHit.isCrit,
          1,
          false,
          false,
          false,
          shadowTarget.id,
          false,
          false,
          'SHADOW',
          0xc084fc,
          basicEvolveScale,
          0xa855f7
        );
      });
    } else if (heroClass === 'bowman' && this.attackCount % 3 === 0) {
      // Archer: crisp twin-feather spread on every 3rd strike
      this.spawnHitSpark(startX, startY, false, 0xfef08a);
      const featherTex = this.textures.exists('proj_hawk_feather')
        ? 'proj_hawk_feather'
        : 'proj_arrow';
      for (const vyDelta of [-42, 42]) {
        const featherHit = rollHit(0.65);
        this.spawnProjectile(
          featherTex,
          startX,
          startY,
          vx + 70,
          baseVy + vyDelta,
          featherHit.dmg,
          featherHit.isCrit,
          2,
          false,
          false,
          false,
          target.id,
          false,
          false,
          'FEATHER',
          0xfef08a,
          1.05,
          0x6ee7b7
        );
      }
    }

    if (echoProcs) {
      this.time.delayedCall(90, () => {
        if (this.phase !== 'combat' || !this.stats || !this.runConfig) return;
        const echoTarget = this.getClosestEnemy();
        if (!echoTarget) return;
        soundFX.playSwing();
        const echoHit = rollHit(0.75);
        const evy =
          (echoTarget.sprite.y - startY) /
          Math.max(0.08, (echoTarget.sprite.x - startX) / vx);
        this.spawnProjectile(
          projTexture,
          startX,
          startY,
          vx,
          evy,
          echoHit.dmg,
          echoHit.isCrit,
          1,
          false,
          false,
          projTexture === 'proj_wave',
          echoTarget.id,
          false,
          false,
          'ECHO',
          projTint
        );
      });
    }
  }

  private spawnProjectile(
    textureKey: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    isCrit: boolean,
    pierceLeft: number,
    applyRoot: boolean,
    applyChill: boolean,
    isWave: boolean,
    targetId: number | null = null,
    isChainProc: boolean = false,
    dropFalconLoot: boolean = false,
    labelTag: string | null = null,
    tintHex: number | null = null,
    scaleOverride: number = 1,
    trailHex: number | null = null,
    explosionRadius: number = 0,
    explosionColor: number = 0xfef08a,
    auraKey: string | null = null,
    auraScaleMult: number = 1.35,
    auraRotationSpeed: number = 2.5,
    bouncesLeft: number = 0,
    bypassSmoke: boolean = false,
    pullTowardHit: boolean = false
  ): void {
    const sprite = this.add.image(x, y, textureKey).setDepth(7);
    if (tintHex !== null) {
      sprite.setTint(tintHex);
    }
    const spinningKeys = new Set([
      'proj_star',
      'fx_staff_wheel',
      'fx_staff_dragon_vortex',
      'fx_staff_bagua_domain',
      'fx_finger_supernova',
      'fx_taiji_seal',
      'proj_vortex_staff',
      'proj_vortex_qiankun',
      'proj_vortex_shifting_stars',
    ]);
    const isSpinning = spinningKeys.has(textureKey);
    if (!isSpinning && textureKey !== 'proj_orb_hp') {
      sprite.setRotation(Math.atan2(vy, vx));
    }
    let defaultScale = 1;
    if (textureKey === 'fx_dragon_palm' || textureKey.startsWith('proj_palm_')) {
      defaultScale = 1.25;
    } else if (
      textureKey === 'fx_jade_sword' ||
      textureKey === 'fx_iron_cleave' ||
      textureKey.startsWith('proj_sword_') ||
      textureKey.startsWith('proj_blade_')
    ) {
      defaultScale = 1.15;
    }
    sprite.setScale(defaultScale * scaleOverride);

    let auraSprite: Phaser.GameObjects.Image | null = null;
    if (auraKey !== null && this.textures.exists(auraKey)) {
      auraSprite = this.add.image(x, y, auraKey).setDepth(6.85);
      if (tintHex !== null) {
        auraSprite.setTint(tintHex);
      }
      auraSprite.setScale(defaultScale * scaleOverride * auraScaleMult);
      auraSprite.setAlpha(0.9);
    }

    this.projectiles.push({
      sprite,
      auraSprite,
      auraRotationSpeed,
      auraPulsePhase: this.rng() * Math.PI * 2,
      targetId,
      vx,
      vy,
      damage,
      isCrit,
      pierceLeft,
      hitIds: new Set(),
      applyRoot,
      applyChill,
      isWave,
      isChainProc,
      dropFalconLoot,
      labelTag,
      life: 2.2,
      trailHex,
      explosionRadius,
      explosionColor,
      isSpinning,
      bouncesLeft,
      bypassSmoke,
      pullTowardHit,
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p) continue;
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      if (p.auraSprite) {
        p.auraSprite.x = p.sprite.x;
        p.auraSprite.y = p.sprite.y;
        p.auraSprite.rotation += p.auraRotationSpeed * dt;
        p.auraPulsePhase += dt * 5;
        const pulse = 1 + Math.sin(p.auraPulsePhase) * 0.08;
        p.auraSprite.setScale(p.sprite.scaleX * 1.35 * pulse, p.sprite.scaleY * 1.35 * pulse);
      }

      const key = p.sprite.texture.key;
      if (p.isSpinning) {
        p.sprite.rotation += 16 * dt;
      } else if (key !== 'proj_orb_hp') {
        p.sprite.rotation = Math.atan2(p.vy, p.vx);
      }

      if (key.startsWith('fx_') || key.startsWith('proj_')) {
        const isEvolved = p.trailHex !== null;
        if (this.rng() < (isEvolved ? 0.65 : 0.2)) {
          const sparkColor =
            p.trailHex ??
            (key === 'fx_dragon_palm' || key.startsWith('proj_palm_') || key === 'proj_palm_qi' || key === 'proj_wave'
              ? 0xfef08a
              : key === 'fx_jade_sword' || key.startsWith('proj_sword_')
                ? 0x38bdf8
                : key === 'fx_iron_cleave' || key.startsWith('proj_blade_')
                  ? 0xc084fc
                  : key === 'fx_flute_wave' || key.startsWith('proj_wave_')
                    ? 0x5eead4
                    : key === 'fx_ice_needle' || key.startsWith('proj_lance_')
                      ? 0xc4b5fd
                      : 0xe2e8f0);
          const sz = isEvolved ? 6 : 4;
          const spark = this.add
            .rectangle(
              p.sprite.x - 10,
              p.sprite.y + (this.rng() - 0.5) * (isEvolved ? 14 : 6),
              sz,
              sz,
              sparkColor,
              isEvolved ? 0.92 : 0.85
            )
            .setDepth(6.8);
          this.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 0.35,
            duration: isEvolved ? 170 : 110,
            onComplete: () => spark.destroy(),
          });
        }
      }

      let destroyed =
        p.life <= 0 ||
        p.sprite.x < -60 ||
        p.sprite.x > (this.scale.width || 1024) + 60;
      if (!destroyed) {
        const scaleBoost = Math.max(1, p.sprite.scaleX);
        const hitX = (p.isWave || key.startsWith('fx_') ? 68 : 42) * Math.min(1.75, scaleBoost);
        const hitY = (p.isWave || key.startsWith('fx_') ? 88 : 76) * Math.min(1.65, scaleBoost);
        for (const e of [...this.enemies]) {
          if (e.hp <= 0 || p.hitIds.has(e.id)) continue;
          const dx = Math.abs(p.sprite.x - e.sprite.x);
          const dy = Math.abs(p.sprite.y - e.sprite.y);
          if (dx <= hitX && dy <= hitY) {
            p.hitIds.add(e.id);
            this.spawnHitSpark(e.sprite.x, e.sprite.y, p.isCrit, p.trailHex ?? 0xfef08a);
            if (p.explosionRadius > 0) {
              this.spawnQiShockwaveRing(
                e.sprite.x,
                e.sprite.y,
                p.explosionColor,
                p.explosionRadius,
                220
              );
              for (const near of [...this.enemies]) {
                if (
                  near.id !== e.id &&
                  near.hp > 0 &&
                  !p.hitIds.has(near.id) &&
                  Math.abs(near.sprite.x - e.sprite.x) <= p.explosionRadius * 0.85
                ) {
                  p.hitIds.add(near.id);
                  this.damageEnemy(near, Math.round(p.damage * 0.45), false, p.labelTag, true);
                }
              }
            }
            if (p.pullTowardHit) {
              const centerX = Math.max(this.heroX + 85, e.sprite.x);
              for (const near of this.enemies) {
                if (near.hp > 0 && !near.mutations.includes('juggernaut')) {
                  if (Math.abs(near.sprite.x - centerX) <= 155) {
                    near.sprite.x = Math.max(
                      this.heroX + 85,
                      Phaser.Math.Linear(near.sprite.x, centerX, 0.35)
                    );
                  }
                }
              }
            }
            this.damageEnemy(e, p.damage, p.isCrit, p.labelTag, p.bypassSmoke);
            if (p.isChainProc) {
              p.isChainProc = false;
              this.triggerStaticDischarge(e);
            }
            if (p.dropFalconLoot) {
              p.dropFalconLoot = false;
              this.spawnLootDrop(e.sprite.x, e.sprite.y, this.rng() < 0.6 ? 'coin' : 'orb', 14);
            }
            if (e.hp > 0) {
              const push = (this.stats?.knockbackPower ?? 16) * 0.45;
              this.applyEnemyKnockback(e, push);
            }
            if (p.applyRoot) e.rootTimer = Math.max(e.rootTimer, this.isEquippedLegendaryCursed('bow_wep_worldtree') ? 1 : 2);
            if (p.applyChill) e.chillTimer = Math.max(e.chillTimer, 3);

            // Jade Flute Ricochet retargeting
            if (p.bouncesLeft > 0) {
              let nextTarget: EnemyEntity | null = null;
              let bestDist = Number.POSITIVE_INFINITY;
              for (const cand of this.enemies) {
                if (cand.hp <= 0 || cand.id === e.id || p.hitIds.has(cand.id)) continue;
                const d = Math.hypot(cand.sprite.x - e.sprite.x, cand.sprite.y - e.sprite.y);
                if (d < bestDist) {
                  bestDist = d;
                  nextTarget = cand;
                }
              }
              if (!nextTarget && this.enemies.length > 1) {
                p.hitIds.clear();
                p.hitIds.add(e.id);
                for (const cand of this.enemies) {
                  if (cand.hp <= 0 || cand.id === e.id) continue;
                  const d = Math.hypot(cand.sprite.x - e.sprite.x, cand.sprite.y - e.sprite.y);
                  if (d < bestDist) {
                    bestDist = d;
                    nextTarget = cand;
                  }
                }
              }
              if (nextTarget) {
                p.bouncesLeft -= 1;
                const speed = Math.max(480, Math.hypot(p.vx, p.vy));
                const rdx = nextTarget.sprite.x - p.sprite.x;
                const rdy = nextTarget.sprite.y - p.sprite.y;
                const rdist = Math.max(1, Math.hypot(rdx, rdy));
                p.vx = (rdx / rdist) * speed;
                p.vy = (rdy / rdist) * speed;
                p.life = Math.max(p.life, 1.4);
                break;
              }
            }

            p.pierceLeft -= 1;
            if (p.pierceLeft <= 0) {
              destroyed = true;
              break;
            }
          }
        }
      }

      if (destroyed) {
        p.sprite.destroy();
        p.auraSprite?.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damageEnemy(
    enemy: EnemyEntity,
    rawDamage: number,
    isCrit: boolean,
    labelTag: string | null = null,
    bypassSmoke: boolean = false
  ): void {
    if (!this.stats || !this.runConfig) return;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
      return;
    }

    // Smoke Bomb dodge check
    if (!bypassSmoke && enemy.smokeActiveTimer > 0 && this.rng() < 0.5) {
      return;
    }

    const duguStacks =
      computeWuxiaLoadout(this.draftedBuffIds, this.floor).enlightenmentCounts[
        'enlighten_sword_intent'
      ] ?? 0;

    // Permafrost Armor hit-shield check
    if (enemy.hitShield > 0 && labelTag !== 'SHATTER' && labelTag !== 'TOTEM_SHATTER') {
      const shieldBreak = 1 + duguStacks;
      enemy.hitShield = Math.max(0, enemy.hitShield - shieldBreak);
      this.spawnFloatingText(
        enemy.sprite.x,
        enemy.sprite.y - 34,
        duguStacks > 0
          ? `SHIELD BREAK -${shieldBreak} (${enemy.hitShield})`
          : `ICE SHIELD (${enemy.hitShield})`,
        duguStacks > 0 ? '#fde047' : '#67e8f9',
        12
      );
      return;
    }

    let dmg = rawDamage;
    if (
      enemy.isBoss &&
      !enemy.isMiniBoss &&
      labelTag !== 'TOTEM_SHATTER' &&
      this.enemies.some((o) => o.isTotem && o.hp > 0)
    ) {
      dmg *= 0.75;
    }
    if ((enemy.isBoss || enemy.isMiniBoss) && duguStacks > 0) {
      dmg *= 1 + 0.15 * duguStacks;
    }
    if (enemy.mutations.includes('golden_gilded')) dmg *= 1.15;
    if (enemy.chillTimer > 0 && this.draftedBuffIds.includes('silver_frostbite_aura')) dmg *= 1.12;
    if (enemy.isBoss && this.draftedBuffIds.includes('prism_war_titan_cleave')) dmg *= 1.25;
    if (enemy.isBoss && this.draftedBuffIds.includes('gold_executioners_verdict') && enemy.hp / enemy.maxHp <= 0.3) {
      dmg *= 1.3;
    }
    if (
      this.runConfig.classId === 'thief' &&
      this.runConfig.profile.classes.thief.level >= 15 &&
      (enemy.bleedStacks > 0 || enemy.burnStacks > 0 || enemy.hp >= enemy.maxHp)
    ) {
      dmg *= 1.25;
    }
    if (this.hasEquippedLegendary('bow_head_hawkeye')) {
      const distRatio = Math.min(1, Math.max(0, (enemy.sprite.x - this.heroX) / 450));
      const maxBonus = this.isEquippedLegendaryCursed('bow_head_hawkeye') ? 0.5 : 0.8;
      dmg *= 1 + distRatio * maxBonus;
    }

    dmg *= 1 + enemy.armorShred * 0.06;
    const finalDmg = Math.max(1, Math.round(dmg));
    enemy.hp = Math.max(0, enemy.hp - finalDmg);

    if (enemy.sprite.active) {
      enemy.sprite.setAlpha(0.45);
      this.time.delayedCall(75, () => {
        if (enemy.sprite.active) enemy.sprite.setAlpha(1);
      });
      if (enemy.hp > 0 && !this.tweens.isTweening(enemy.sprite)) {
        const baseScaleX = enemy.sprite.scaleX;
        const baseScaleY = enemy.sprite.scaleY;
        const recoilX = Math.min((this.scale.width || 1024) - 45, enemy.sprite.x + 8);
        this.tweens.add({
          targets: enemy.sprite,
          x: recoilX,
          scaleX: baseScaleX * 1.18,
          scaleY: baseScaleY * 0.88,
          duration: 75,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (enemy.sprite.active) {
              enemy.sprite.setScale(baseScaleX, baseScaleY);
            }
          },
        });
      }
    }

    if (isCrit || labelTag !== null) {
      this.spawnSlashVfx(
        enemy.sprite.x,
        enemy.sprite.y,
        isCrit ? 0xfbbf24 : 0xe0f2fe,
        isCrit ? 1.15 : 0.85
      );
    }

    if (isCrit) {
      soundFX.playCrit();
      const callout = this.getWuxiaCritCallout(labelTag, finalDmg);
      this.spawnFloatingText(
        enemy.sprite.x + (this.rng() - 0.5) * 20,
        enemy.sprite.y - 34 - Math.floor(this.rng() * 14),
        callout.text,
        callout.color,
        callout.size,
        1,
        true,
        callout.stroke
      );

      if (this.draftedBuffIds.includes('silver_vampiric_touch') && this.vampiricTouchCd <= 0) {
        this.vampiricTouchCd = 0.5;
        this.healHero(this.stats.maxHp * 0.02, true);
      }
      if (this.draftedBuffIds.includes('gold_stormcaller_conduit')) {
        const skyDmg = Math.max(1, Math.round(this.stats.atk * 1.2));
        for (const other of [...this.enemies]) {
          if (other.id !== enemy.id && other.hp > 0 && Math.abs(other.sprite.x - enemy.sprite.x) <= 95) {
            other.hp = Math.max(0, other.hp - skyDmg);
            this.spawnLightningVfx(other.sprite.x, other.sprite.y - 110, other.sprite.x, other.sprite.y, 0x38bdf8);
            this.spawnHitSpark(other.sprite.x, other.sprite.y, false, 0x38bdf8);
            if (other.hp <= 0) {
              this.killEnemy(other);
            }
          }
        }
      }
      if (this.hasEquippedLegendary('thief_cape_batwing')) {
        const pct = this.isEquippedLegendaryCursed('thief_cape_batwing') ? 0.1 : 0.15;
        this.healHero(finalDmg * pct, false);
      }
      if (this.draftedBuffIds.includes('prism_thief_coin_toss') && this.rng() < 0.35) {
        this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, 'coin', 8);
      }
    } else if (this.nonCritTextCooldown <= 0) {
      this.nonCritTextCooldown = 0.22;
      this.spawnFloatingText(
        enemy.sprite.x + (this.rng() - 0.5) * 16,
        enemy.sprite.y - 24,
        `${finalDmg}`,
        '#e8dfd0',
        11,
        0.78,
        false
      );
    }

    // Lifesteal
    if (this.stats.lifestealPct > 0) {
      this.healHero((finalDmg * this.stats.lifestealPct) / 100, false);
    }

    // Apply Bleed & Weapon Elements
    if (this.draftedBuffIds.includes('silver_serrated_wounds') || this.hasEquippedLegendary('thief_wep_phantom')) {
      enemy.bleedStacks = Math.min(5, enemy.bleedStacks + 1);
      enemy.bleedTimer = this.isEquippedLegendaryCursed('thief_wep_phantom') ? 2 : 3;
    }

    const sockets = this.getWeaponSockets();
    const hybrid = getHybridElement(sockets);
    for (const elem of sockets) {
      if (elem === 'fire') {
        enemy.burnStacks = Math.min(5, enemy.burnStacks + 1);
        enemy.burnTimer = 3;
      } else if (elem === 'ice') {
        enemy.chillTimer = 3;
      } else if (elem === 'dark') {
        enemy.armorShred = Math.min(5, enemy.armorShred + 1);
        enemy.burnStacks = Math.min(5, enemy.burnStacks + 1);
        enemy.burnTimer = 3;
      } else if (elem === 'lightning' && this.rng() < 0.35) {
        const other = this.enemies.find((o) => o.id !== enemy.id && o.hp > 0);
        if (other) {
          const arcDmg = Math.max(1, Math.round(finalDmg * 0.4));
          other.hp = Math.max(0, other.hp - arcDmg);
          this.spawnLightningVfx(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y, 0x60a5fa);
          if (other.hp <= 0) {
            this.killEnemy(other);
          }
        }
      }
    }
    if (hybrid?.name === 'Plasma' && enemy.burnStacks > 0 && this.rng() < 0.25) {
      enemy.hp = Math.max(0, enemy.hp - Math.round(this.stats.atk * 0.7));
    }

    // Golden-Gilded boss coin showers every 10% HP lost
    if (enemy.mutations.includes('golden_gilded') && enemy.hp > 0) {
      const pct = Math.floor((enemy.hp / enemy.maxHp) * 100);
      while (enemy.lastGoldenThreshold - 10 >= pct) {
        enemy.lastGoldenThreshold -= 10;
        this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, 'coin', 22);
      }
    }

    // Mitosis split at 50% HP
    if (
      enemy.isBoss &&
      enemy.mechanic === 'mitosis' &&
      !enemy.mitosisDone &&
      enemy.hp > 0 &&
      enemy.hp <= enemy.maxHp * 0.5
    ) {
      enemy.mitosisDone = true;
      this.spawnBossEntity(
        `${enemy.name} Jr.`,
        Math.min(this.scale.width - 70, enemy.sprite.x + 55),
        Math.round(enemy.maxHp * 0.45),
        Math.round(enemy.atk * 0.7),
        false,
        true
      );
    }

    // Execution check
    const execThreshold = this.draftedBuffIds.includes('gold_executioners_verdict')
      ? 0.18
      : this.hasEquippedLegendary('thief_cape_crimsonmoon')
        ? this.isEquippedLegendaryCursed('thief_cape_crimsonmoon')
          ? 0.1
          : 0.2
        : 0;
    if (!enemy.isBoss && !enemy.isTotem && execThreshold > 0 && enemy.hp > 0 && enemy.hp / enemy.maxHp <= execThreshold) {
      enemy.hp = 0;
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 40, 'EXECUTE!', '#d9534f', 15);
    }

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyEntity): void {
    const idx = this.enemies.findIndex((e) => e.id === enemy.id);
    if (idx === -1) return;

    const ex = enemy.sprite.x;
    const ey = enemy.sprite.y;
    const wasChilled = enemy.chillTimer > 0;

    if (enemy.isBoss) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
    }

    this.spawnHitSpark(ex, ey, enemy.isBoss || enemy.isMiniBoss, 0xf8fafc);
    const popRing = this.add.circle(ex, ey, enemy.isBoss ? 26 : 16, 0xf8fafc, 0.45).setDepth(10);
    this.tweens.add({
      targets: popRing,
      scale: 2.1,
      alpha: 0,
      duration: 180,
      onComplete: () => popRing.destroy(),
    });

    enemy.shadow.destroy();
    enemy.sprite.destroy();
    enemy.hpBg.destroy();
    enemy.hpFill.destroy();
    enemy.nameText.destroy();
    enemy.statusBadge?.destroy();
    enemy.flawRing?.destroy();
    enemy.flawRing = null;
    enemy.flawText?.destroy();
    enemy.flawText = null;
    enemy.heavyTelegraphGfx?.destroy();
    enemy.heavyTelegraphGfx = null;
    enemy.totemGlowRing?.destroy();
    enemy.totemGlowRing = null;
    this.enemies.splice(idx, 1);

    // Blood-Qi Totem shatter: 8% maxHP true burst + 1.0s stun on Cult Leader
    if (enemy.isTotem) {
      const boss =
        this.enemies.find((o) => o.id === enemy.totemOwnerId && o.hp > 0) ??
        this.enemies.find((o) => o.isBoss && !o.isMiniBoss && o.hp > 0);
      if (boss) {
        const burstDmg = Math.max(1, Math.round(boss.maxHp * 0.08));
        boss.stunTimer = Math.max(boss.stunTimer, 1.0);
        soundFX.playMeridianShatter();
        this.cameras.main.shake(130, 0.007);
        this.spawnQiShockwaveRing(ex, ey, 0xf59e0b, 165, 260);
        this.spawnQiShockwaveRing(boss.sprite.x, boss.sprite.y, 0xdc2626, 145, 240);
        this.spawnFloatingText(
          boss.sprite.x,
          boss.sprite.y - 84,
          'TOTEM SHATTERED!',
          '#fde047',
          18
        );
        this.damageEnemy(boss, burstDmg, true, 'TOTEM_SHATTER', true);
      }
    }

    // If Cult Leader falls, clean up any remaining Blood-Qi Totems it summoned
    if (enemy.isBoss && !enemy.isMiniBoss) {
      for (let ti = this.enemies.length - 1; ti >= 0; ti -= 1) {
        const totem = this.enemies[ti];
        if (totem && totem.isTotem && totem.totemOwnerId === enemy.id) {
          totem.shadow.destroy();
          totem.sprite.destroy();
          totem.hpBg.destroy();
          totem.hpFill.destroy();
          totem.nameText.destroy();
          totem.statusBadge?.destroy();
          totem.totemGlowRing?.destroy();
          this.enemies.splice(ti, 1);
        }
      }
    }

    if (wasChilled && this.hasEquippedLegendary('mage_wep_glacial') && this.stats) {
      this.spawnQiShockwaveRing(ex, ey, 0x67e8f9, 130, 220);
      const frostDmg = Math.max(1, Math.round(this.stats.atk * 0.65 * this.stats.allDamageMult));
      for (const near of [...this.enemies]) {
        if (near.hp > 0 && Math.abs(near.sprite.x - ex) <= 130) {
          near.chillTimer = Math.max(near.chillTimer, 2.5);
          this.damageEnemy(near, frostDmg, false, 'FROSTWAVE', true);
        }
      }
    }

    const qiGain = enemy.isBoss ? (enemy.isMiniBoss ? 60 : 100) : enemy.isMiniBoss ? 30 : 16;
    this.addUltimateGauge(qiGain);

    if (this.draftedBuffIds.includes('silver_battle_momentum')) {
      this.battleMomentumStacks = Math.min(5, this.battleMomentumStacks + 1);
      this.battleMomentumTimer = 3;
    }

    if (this.hasEquippedLegendary('war_wep_souldrinker') && this.stats) {
      this.healHero(this.stats.maxHp * 0.03, false);
    }

    // Drop bouncy coins / chests
    const goldBonusMult = this.stats ? 1 + this.stats.goldBonusPct / 100 : 1;
    const coinCount = enemy.isBoss ? 6 : enemy.isMiniBoss ? 3 : 1;
    const baseGold = enemy.isBoss ? 36 : enemy.isMiniBoss ? 22 : 12 + this.floor * 3;
    for (let c = 0; c < coinCount; c++) {
      this.spawnLootDrop(ex, ey, 'coin', Math.round(baseGold * goldBonusMult));
    }
    if (enemy.isBoss || enemy.isMiniBoss) {
      const chestCount = computeBossChestCount(this.draftedBuffIds);
      for (let c = 0; c < chestCount; c++) {
        this.spawnLootDrop(ex, ey, 'chest', enemy.isBoss ? 1 : 0);
      }
      this.shardsCollected += enemy.isBoss ? 12 : 5;
      if (enemy.isBoss) {
        this.coresCollected += 1;
      }
    }
  }

  private updateEnemy(e: EnemyEntity, dt: number, heroInRange: boolean): void {
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }

    const isElementOverload = this.draftedBuffIds.includes('gold_elemental_overload');
    const dotMult = isElementOverload ? 2 : 1;

    // Burn / Bleed DoT ticks
    if (e.burnTimer > 0 && this.stats) {
      e.burnTimer -= dt;
      if (Math.floor((e.burnTimer + dt) * dotMult) !== Math.floor(e.burnTimer * dotMult)) {
        const dmg = this.stats.atk * 0.18 * e.burnStacks * (isElementOverload ? 1.5 : 1);
        this.damageEnemy(e, dmg, false, 'BURN');
        if (e.hp <= 0) return;
      }
    }

    if (e.bleedTimer > 0 && this.stats) {
      e.bleedTimer -= dt;
      const tickRate = this.draftedBuffIds.includes('prism_thief_fatal_venom') ? 2 : 1;
      if (Math.floor((e.bleedTimer + dt) * tickRate) !== Math.floor(e.bleedTimer * tickRate)) {
        const dmg = this.stats.atk * 0.15 * e.bleedStacks * tickRate;
        this.damageEnemy(e, dmg, this.draftedBuffIds.includes('prism_thief_fatal_venom'), 'BLEED');
        if (e.hp <= 0) return;
      }
    }

    if (e.chillTimer > 0) e.chillTimer = Math.max(0, e.chillTimer - dt);
    if (e.rootTimer > 0) e.rootTimer = Math.max(0, e.rootTimer - dt);
    if (e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt);
    if (e.smokeActiveTimer > 0) e.smokeActiveTimer = Math.max(0, e.smokeActiveTimer - dt);

    // Blood-Qi Totem stationary behavior & crimson-brass glow pulse
    if (e.isTotem) {
      const ty = this.groundY - 28;
      e.sprite.y = ty;
      e.shadow.setPosition(e.sprite.x, this.groundY - 4);
      if (e.totemGlowRing) {
        const pulse = 1 + Math.sin(this.elapsedRunMs * 0.012) * 0.14;
        e.totemGlowRing.setPosition(e.sprite.x, ty).setScale(pulse);
      }
      const barY = ty - 44;
      e.hpBg.setVisible(true).setPosition(e.sprite.x, barY);
      e.hpFill.setVisible(true).setPosition(e.sprite.x, barY);
      e.hpFill.width = 54 * Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
      e.nameText.setVisible(true).setPosition(e.sprite.x, barY - 12);
      return;
    }

    // Cult Leader periodic Blood-Qi Totem summon (every ~12s, max 1 active)
    if (
      e.isBoss &&
      !e.isMiniBoss &&
      !e.isSplitClone &&
      e.stunTimer <= 0 &&
      e.sprite.x <= (this.scale.width || 1024) - 40
    ) {
      e.totemSummonTimer -= dt;
      if (e.totemSummonTimer <= 0) {
        e.totemSummonTimer = 12;
        this.spawnBloodQiTotem(e);
      }
    }

    // Boss biome shared mechanics
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
          this.damageHero(Math.round(e.atk * 0.45), e);
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

    // Volatile mutation floor bombs
    if (e.mutations.includes('volatile')) {
      e.volatileTimer -= dt;
      if (e.volatileTimer <= 0) {
        e.volatileTimer = 4.5;
        this.spawnHazardBomb(this.heroX + (this.rng() - 0.5) * 40, this.groundY - 14, e.atk * 1.45);
      }
    }

    // Boss telegraphed heavy strike wind-up
    if (e.isBoss) {
      const isCultLeader = !e.isMiniBoss;
      if (e.heavyChargeTimer > 0) {
        if (e.stunTimer <= 0) {
          e.heavyChargeTimer = Math.max(0, e.heavyChargeTimer - dt);
        }
        if (e.heavyTelegraphGfx) {
          e.heavyTelegraphGfx.setPosition(e.sprite.x, e.sprite.y);
          const inPerfectWindow = e.heavyChargeTimer <= 0.55;
          const pulse = 1 + Math.sin(this.elapsedRunMs * (inPerfectWindow ? 0.036 : 0.02)) * 0.2;
          e.heavyTelegraphGfx.setScale(pulse);
          e.heavyTelegraphGfx.setFillStyle(
            isCultLeader ? 0xdc2626 : 0xef4444,
            inPerfectWindow ? 0.36 : isCultLeader ? 0.26 : 0.2
          );
          e.heavyTelegraphGfx.setStrokeStyle(
            inPerfectWindow ? 5 : isCultLeader ? 4 : 3.5,
            inPerfectWindow ? 0xfde047 : isCultLeader ? 0xdc2626 : 0xef4444,
            0.98
          );
        }
        if (e.heavyChargeTimer <= 0) {
          e.heavyTelegraphGfx?.destroy();
          e.heavyTelegraphGfx = null;
          e.heavyCooldown = 6.5 + this.rng() * 1.5;
          soundFX.playHeavyCleave();
          this.cameras.main.shake(150, 0.009);
          this.spawnQiShockwaveRing(this.heroX + 16, this.groundY - 28, 0xdc2626, 130, 220);
          this.spawnSlashVfx(this.heroX + 18, this.groundY - 28, 0xdc2626, 1.55);
          this.damageHero(Math.round(e.atk * 1.75), e);
        }
      } else if (e.stunTimer <= 0 && e.sprite.x <= (this.scale.width || 1024) - 40) {
        e.heavyCooldown -= dt;
        if (e.heavyCooldown <= 0) {
          e.heavyChargeTimer = 1.25;
          e.heavyTelegraphGfx = this.add
            .circle(
              e.sprite.x,
              e.sprite.y,
              isCultLeader ? 60 : 44,
              isCultLeader ? 0xdc2626 : 0xef4444,
              isCultLeader ? 0.26 : 0.2
            )
            .setStrokeStyle(isCultLeader ? 4 : 3.5, isCultLeader ? 0xdc2626 : 0xef4444, 0.95)
            .setDepth(10.5);
          soundFX.playBossTelegraph();
          this.spawnFloatingText(
            e.sprite.x,
            e.sprite.y - 78,
            isCultLeader ? 'CRIMSON CHARGE! [SPACE]' : 'HEAVY STRIKE!',
            '#d9534f',
            15
          );
        }
      }
    }

    // Movement & Attack
    if (this.draftedBuffIds.includes('silver_frostbite_aura') && e.sprite.x - this.heroX <= 165) {
      e.chillTimer = Math.max(e.chillTimer, 0.25);
    }
    const baseY = this.groundY - (e.isBoss && !e.isMiniBoss ? 52 : e.isBoss ? 40 : 24);
    const stopDist =
      e.archetype === 'ranged'
        ? Math.min((this.scale.width || 1024) - 65, e.preferredDist)
        : this.heroX + 74;
    if (e.stunTimer <= 0 && e.rootTimer <= 0 && e.sprite.x > stopDist) {
      const slow = e.chillTimer > 0 ? 0.75 : 1;
      const approachBoost = e.sprite.x > this.heroX + 215 ? 1.55 : 1;
      e.sprite.x = Math.max(stopDist, e.sprite.x - e.speed * approachBoost * slow * dt);
      e.sprite.y = baseY - Math.abs(Math.sin(this.elapsedRunMs * 0.01 + e.id)) * 3.5;
      e.sprite.setAngle(Math.sin(this.elapsedRunMs * 0.009 + e.id) * 3.2);
    } else if (!this.tweens.isTweening(e.sprite)) {
      e.sprite.y = baseY;
      e.sprite.setAngle(0);
    }

    if (e.stunTimer <= 0 && (e.sprite.x <= stopDist + 16 || (e.isBoss && heroInRange))) {
      const enrageSpeed = 1 + e.enrageStacks * 0.15;
      const chillSlow = e.chillTimer > 0 ? 0.8 : 1;
      e.atkTimer -= dt * enrageSpeed * chillSlow;
      if (e.atkTimer <= 0) {
        e.atkTimer = e.atkIntervalSec;
        if (e.archetype === 'ranged') {
          if (!this.tweens.isTweening(e.sprite)) {
            const baseScaleX = e.sprite.scaleX;
            const baseScaleY = e.sprite.scaleY;
            this.tweens.add({
              targets: e.sprite,
              scaleX: baseScaleX * 1.15,
              scaleY: baseScaleY * 0.92,
              duration: 90,
              yoyo: true,
              onComplete: () => {
                if (e.sprite.active) e.sprite.setScale(baseScaleX, baseScaleY);
              },
            });
          }
          this.spawnEnemyDart(e);
        } else {
          if (!this.tweens.isTweening(e.sprite)) {
            const baseScaleX = e.sprite.scaleX;
            const baseScaleY = e.sprite.scaleY;
            this.tweens.add({
              targets: e.sprite,
              x: e.sprite.x - 28,
              scaleX: baseScaleX * 1.12,
              scaleY: baseScaleY * 1.06,
              duration: 95,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                if (e.sprite.active) e.sprite.setScale(baseScaleX, baseScaleY);
              },
            });
          }
          this.spawnSlashVfx(this.heroX + 18, this.groundY - 28, 0xef4444, 1.1);
          this.spawnHitSpark(this.heroX + 12, this.groundY - 28, false, 0xf87171);
          this.damageHero(e.atk, e);
        }
      }
    }

    // Sync HP bar positions
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    const barOffset = e.isBoss && !e.isMiniBoss ? 68 : e.isBoss ? 56 : 42;
    const barY = e.sprite.y - barOffset;
    e.shadow.setPosition(e.sprite.x, this.groundY - 4);
    if (e.isBoss) {
      e.hpBg.setVisible(false);
      e.hpFill.setVisible(false);
      e.nameText.setVisible(false);
    } else {
      const showMobBar = e.isMiniBoss || e.hp < e.maxHp;
      e.hpBg.setVisible(showMobBar);
      e.hpFill.setVisible(showMobBar);
      e.nameText.setVisible(e.isMiniBoss);
      if (showMobBar) {
        e.hpBg.setPosition(e.sprite.x, barY);
        e.hpFill.setPosition(e.sprite.x, barY);
        const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
        e.hpFill.width = 46 * ratio;
      }
      if (e.isMiniBoss) {
        e.nameText.setPosition(e.sprite.x, barY - 14);
      }
    }

    if (e.statusBadge) {
      const parts: string[] = [];
      if (e.hitShield > 0) parts.push(`[SH ${e.hitShield}]`);
      if (e.enrageStacks > 0) parts.push(`[EN x${e.enrageStacks}]`);
      if (e.isBoss && !e.isMiniBoss && this.enemies.some((o) => o.isTotem && o.hp > 0)) {
        parts.push('[WARD -25%]');
      }
      if (parts.length > 0) {
        e.statusBadge
          .setText(parts.join(' '))
          .setColor(e.hitShield > 0 ? '#7da6c7' : '#d49b38')
          .setPosition(e.isBoss ? e.sprite.x : e.sprite.x + 27, barY)
          .setVisible(true);
      } else {
        e.statusBadge.setVisible(false);
      }
    }

    // Interactive Qi Flaw exposure & tracking
    if (e.flawTimer > 0) {
      e.flawTimer = Math.max(0, e.flawTimer - dt);
      if (e.flawRing) {
        e.flawRing.setPosition(e.sprite.x, e.sprite.y);
        const pulse = 1 + Math.sin(this.elapsedRunMs * 0.015) * 0.14;
        e.flawRing.setScale(pulse);
      }
      if (e.flawText) {
        e.flawText.setPosition(e.sprite.x, barY - 30);
      }
      if (e.flawTimer <= 0) {
        e.flawRing?.destroy();
        e.flawRing = null;
        e.flawText?.destroy();
        e.flawText = null;
        e.flawCooldown = e.isBoss ? 4.2 + this.rng() * 2.2 : 6.0 + this.rng() * 2.5;
      }
    } else if (
      (e.isBoss || e.isMiniBoss || this.floor >= 20) &&
      e.sprite.x <= (this.scale.width || 1024) - 40
    ) {
      e.flawCooldown -= dt;
      if (e.flawCooldown <= 0) {
        this.openFlawWindow(e, 2.6);
      }
    }
  }

  private getFlawedEnemy(): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    for (const e of this.enemies) {
      if (e.hp > 0 && e.flawTimer > 0) {
        if (!best || (e.isBoss && !best.isBoss) || e.hp > best.hp) {
          best = e;
        }
      }
    }
    return best;
  }

  private triggerMeridianShatter(target: EnemyEntity): boolean {
    if (!this.stats || this.phase !== 'combat' || target.flawTimer <= 0 || target.hp <= 0) {
      return false;
    }
    target.flawTimer = 0;
    target.flawCooldown = target.isBoss ? 4.8 : 6.2;
    target.flawRing?.destroy();
    target.flawRing = null;
    target.flawText?.destroy();
    target.flawText = null;

    target.hitShield = Math.max(0, target.hitShield - 3);
    target.stunTimer = Math.max(target.stunTimer, 1.4);

    // Refund 50% of active martial art cooldowns & Dantian Burst cooldown
    this.skillTimer *= 0.5;
    for (const key of Object.keys(this.wuxiaArtTimers)) {
      const cur = this.wuxiaArtTimers[key] ?? 0;
      this.wuxiaArtTimers[key] = cur * 0.5;
    }

    const bonusGold = 8 * this.floor;
    this.goldCollected += bonusGold;
    if (target.isBoss) this.shardsCollected += 1;
    this.addUltimateGauge(20);

    soundFX.playMeridianShatter();
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
    this.playHeroAttackAnimation('thief', 1.45);
    this.cameras.main.shake(140, 0.008);
    this.spawnSlashVfx(target.sprite.x, target.sprite.y, 0xef4444, 1.85);
    this.spawnQiShockwaveRing(target.sprite.x, target.sprite.y, 0xfde047, 175, 260);
    this.spawnFloatingText(
      target.sprite.x,
      target.sprite.y - 84,
      `SHATTER! 3.5x CRIT (+${bonusGold}g)`,
      '#fef08a',
      16
    );

    const shatterDmg = Math.max(
      1,
      Math.round(this.stats.atk * 3.5 * this.stats.allDamageMult * this.stats.critDmg)
    );
    this.damageEnemy(target, shatterDmg, true, 'SHATTER', true);
    return true;
  }

  private damageHero(rawAtk: number, attacker: EnemyEntity | null): void {
    if (!this.stats || this.phase !== 'combat') return;

    // Camouflage (bow_top_camouflage): enemies cannot deal melee damage during first 2.0s (1.2s cursed)
    if (attacker !== null && this.hasEquippedLegendary('bow_top_camouflage')) {
      const camDur = this.isEquippedLegendaryCursed('bow_top_camouflage') ? 1.2 : 2.0;
      if (this.floorElapsedSec <= camDur) {
        return;
      }
    }

    if (this.invulnHitsLeft > 0) {
      this.invulnHitsLeft -= 1;
      return;
    }

    if (this.rng() < this.stats.dodgeRate) {
      this.dodgeCount += 1;
      if (this.hasEquippedLegendary('thief_head_fox') && attacker) {
        const mult = this.isEquippedLegendaryCursed('thief_head_fox') ? 0.8 : 1;
        this.damageEnemy(attacker, this.stats.atk * 1.1 * mult, false, 'COUNTER');
      }
      const windNeed = this.isEquippedLegendaryCursed('bow_top_windrunner') ? 4 : 3;
      if (this.hasEquippedLegendary('bow_top_windrunner') && this.dodgeCount % windNeed === 0) {
        for (let i = 0; i < 5; i++) {
          this.spawnProjectile('proj_arrow', this.heroX + 20, this.groundY - 30 + (i - 2) * 8, 600, 0, this.stats.atk * 0.7, false, 1, false, false, false);
        }
      }
      this.triggerAfterimageDecoy();
      return;
    }

    this.unhitTimer = 0;
    const armorMitigation = 100 / (100 + Math.max(0, this.stats.armor));
    const elitePenalty =
      attacker?.isMiniBoss && this.hasEquippedLegendary('war_wep_souldrinker') ? 1.1 : 1;
    let dmg = Math.max(1, Math.round(rawAtk * armorMitigation * this.stats.damageTakenMult * elitePenalty));

    // Thornmail / Dragonscale reflection
    if (attacker && this.draftedBuffIds.includes('silver_thornmail_plating')) {
      this.damageEnemy(attacker, Math.round(this.stats.armor * 0.8), false, 'THORNS');
    }
    if (attacker && this.hasEquippedLegendary('war_top_dragonscale')) {
      const mitigated = Math.max(1, Math.round(rawAtk * (1 - armorMitigation)));
      this.damageEnemy(attacker, Math.round(mitigated * 1.2), false, 'REFLECT');
    }

    if (attacker?.mutations.includes('vampiric')) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(dmg * 0.15));
    }

    if (this.heroShield > 0) {
      const absorbed = Math.min(this.heroShield, dmg);
      this.heroShield -= absorbed;
      dmg -= absorbed;
    }

    if (dmg > 0) {
      this.heroHp = Math.max(0, this.heroHp - dmg);
      soundFX.playHit();
      this.spawnFloatingText(this.heroX, this.groundY - 68, `-${dmg}`, '#d9534f', 15);
      if (
        this.heroHp > 0 &&
        !this.coldJadeFreezeUsed &&
        this.hasEquippedLegendary('mage_top_frost') &&
        this.heroHp / this.stats.maxHp < 0.3
      ) {
        this.coldJadeFreezeUsed = true;
        const freezeDur = this.isEquippedLegendaryCursed('mage_top_frost') ? 1.2 : 2.0;
        this.cameras.main.flash(220, 103, 232, 249);
        this.spawnQiShockwaveRing(this.heroX, this.groundY - 28, 0x38bdf8, 280, 300);
        this.spawnFloatingText(this.heroX + 20, this.groundY - 102, 'FROST NOVA!', '#67e8f9', 16);
        for (const e of this.enemies) {
          if (e.hp > 0) {
            e.stunTimer = Math.max(e.stunTimer, freezeDur);
            e.chillTimer = Math.max(e.chillTimer, freezeDur + 1.5);
          }
        }
      }
    }

    if (this.heroHp <= 0) {
      if (this.hasEquippedLegendary('mage_top_phoenix') && !this.phoenixReviveUsed) {
        this.phoenixReviveUsed = true;
        const pct = this.isEquippedLegendaryCursed('mage_top_phoenix') ? 0.25 : 0.5;
        this.heroHp = Math.round(this.stats.maxHp * pct);
        this.cameras.main.flash(260, 251, 146, 60);
        this.cameras.main.shake(200, 0.01);
        this.spawnQiShockwaveRing(this.heroX + 40, this.groundY - 40, 0xf97316, 320, 320);
        this.spawnFloatingText(this.heroX, this.groundY - 96, 'PHOENIX REBIRTH!', '#fb923c', 18);
        const novaDmg = Math.max(1, Math.round(this.stats.atk * 3.5 * this.stats.allDamageMult));
        for (const e of [...this.enemies]) {
          if (e.hp > 0) {
            e.stunTimer = Math.max(e.stunTimer, 1.2);
            this.damageEnemy(e, novaDmg, true, 'PHOENIX', true);
          }
        }
        return;
      }
      this.finishRun('died');
    }
  }

  private healHero(amount: number, showText: boolean): void {
    if (!this.stats || amount <= 0) return;
    if (this.fastingFloorsLeft > 0) return;
    const rounded = Math.max(1, Math.round(amount));
    const missing = Math.max(0, this.stats.maxHp - this.heroHp);
    const actual = Math.min(missing, rounded);
    const overheal = rounded - actual;
    this.heroHp += actual;

    if (overheal > 0 && this.draftedBuffIds.includes('prism_war_blood_shield')) {
      this.heroShield = Math.min(this.stats.maxHp, this.heroShield + overheal);
    }

    if (showText && actual > 0) {
      this.spawnFloatingText(this.heroX, this.groundY - 76, `+${actual}`, '#6eb88d', 13);
    }
  }

  private castWuxiaActiveArt(artId: string, isBurst = false, isMutualMirror = false): void {
    if (this.phase !== 'combat' || !this.stats || this.enemies.length === 0) return;
    const art = getWuxiaActiveArtById(artId);
    if (!art) return;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const level = Math.min(5, Math.max(1, loadout.activeLevels[artId] ?? 1));
    const syn = getActiveAwakenedSynergy(art.id, loadout.awakenedSynergies);
    const tier: 'base' | 'ultimate' | 'grandmaster' | 'transcendent' =
      syn !== null || level >= 5
        ? 'transcendent'
        : level >= 4
          ? 'grandmaster'
          : level >= 3
            ? 'ultimate'
            : 'base';
    const isHighTier = tier === 'transcendent' || tier === 'grandmaster';

    const powerMult =
      (syn ? syn.powerMult : (art.powerMults[level - 1] ?? 1.2)) *
      (tier === 'transcendent' ? 1.25 : 1) *
      (isBurst ? 1.3 : 1) *
      this.stats.allDamageMult *
      (1 + this.stats.skillPowerPct / 100);
    const rawCount = syn ? syn.projectileCount : (art.projectileCounts[level - 1] ?? 1);
    const count = Math.min(8, Math.max(1, rawCount));
    const hitCrit =
      syn !== null || isBurst || this.isEclipseCritActive() || this.rng() < this.stats.critRate;
    const berserkerAtkMult = this.isBerserkerActive() ? 1.2 : 1;
    const dmg = Math.max(
      1,
      Math.round(this.stats.atk * berserkerAtkMult * powerMult * (hitCrit ? this.stats.critDmg : 1))
    );
    const target = this.getClosestEnemy() ?? this.enemies[0];
    if (!target) return;

    this.syncHeroWuxiaWeapon(art.style);

    if (art.style === 'palm_wave') {
      soundFX.playPalmImpact();
      if (tier !== 'base') {
        this.cameras.main.shake(135, tier === 'transcendent' ? 0.014 : tier === 'grandmaster' ? 0.009 : 0.005);
      }
      this.playHeroAttackAnimation('warrior', tier === 'transcendent' ? 1.8 : tier === 'grandmaster' ? 1.55 : tier === 'ultimate' ? 1.3 : 1.1);
      this.spawnHeroAfterimage(tier === 'transcendent' ? 0xc084fc : tier === 'grandmaster' ? 0xfef08a : 0xf59e0b);
      this.spawnQiShockwaveRing(
        this.heroX + 30,
        this.groundY - 30,
        tier === 'transcendent' ? 0xc084fc : tier === 'grandmaster' ? 0xfef08a : 0xf59e0b,
        tier === 'transcendent' ? 250 : tier === 'grandmaster' ? 210 : tier === 'ultimate' ? 145 : 95,
        300
      );
      if (tier === 'transcendent') {
        this.spawnQiShockwaveRing(this.heroX + 46, this.groundY - 30, 0xfef08a, 185, 230);
      } else if (tier === 'grandmaster') {
        this.spawnQiShockwaveRing(this.heroX + 42, this.groundY - 30, 0xef4444, 155, 220);
      }
      this.spawnFloatingText(
        this.heroX + 36,
        this.groundY - 104,
        syn
          ? syn.name.toUpperCase()
          : tier === 'transcendent'
            ? 'DRAGON PALMS MAX'
            : tier === 'grandmaster'
              ? 'GRANDMASTER 18 DRAGONS'
              : tier === 'ultimate'
                ? 'ULTIMATE DRAGON PALMS'
                : 'DRAGON PALM!',
        tier === 'transcendent' ? '#f5d0fe' : tier === 'grandmaster' ? '#fef08a' : '#fbbf24',
        tier === 'transcendent' ? 18 : tier === 'grandmaster' ? 17 : tier === 'ultimate' ? 15 : 13
      );
      const tex =
        isHighTier
          ? 'fx_dragon_sovereign'
          : tier === 'ultimate'
            ? 'proj_palm_dragon'
            : 'proj_palm_dragon';
      const aura = tier !== 'base' ? 'fx_ascended_halo_dragon' : null;
      const auraScale = tier === 'transcendent' ? 1.6 : tier === 'grandmaster' ? 1.45 : 1.3;
      const auraSpin = tier === 'transcendent' ? 4.2 : tier === 'grandmaster' ? 3.4 : 2.2;
      const scale = tier === 'transcendent' ? 2.45 : tier === 'grandmaster' ? 2.05 : tier === 'ultimate' ? 1.55 : 1.15;
      for (let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        this.spawnProjectile(
          tex,
          this.heroX + 26,
          this.groundY - 34 + offset * 18,
          tier === 'transcendent' ? 680 : tier === 'grandmaster' ? 600 : tier === 'ultimate' ? 530 : 470,
          offset * 24,
          dmg,
          hitCrit,
          isHighTier ? 99 : tier === 'ultimate' ? 7 : 3,
          false,
          false,
          true,
          null,
          false,
          false,
          tier === 'transcendent' ? 'TRANSCENDENT' : tier === 'grandmaster' ? 'SOVEREIGN' : tier === 'ultimate' ? 'DRAGON' : 'PALM',
          null,
          scale,
          tier === 'base' ? null : tier === 'transcendent' ? 0xc084fc : tier === 'grandmaster' ? 0xfef08a : 0xf59e0b,
          tier === 'transcendent' ? 180 : tier === 'grandmaster' ? 140 : tier === 'ultimate' ? 90 : 0,
          tier === 'transcendent' ? 0xf5d0fe : 0xfbbf24,
          aura,
          auraScale,
          auraSpin
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 185 && e.hp > 0) {
          this.applyEnemyKnockback(e, 28);
        }
      }
    } else if (art.style === 'jade_swords') {
      soundFX.playSwordSlash();
      this.playHeroAttackAnimation(
        'thief',
        tier === 'transcendent' ? 1.65 : isHighTier ? 1.45 : tier === 'ultimate' ? 1.25 : 1.05
      );
      const isTaiji = art.id === 'art_taiji_sword';
      if (isTaiji) {
        this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 1);
      }
      const swordVfxColor = isTaiji
        ? 0x67e8f9
        : isHighTier
          ? 0x38bdf8
          : 0xf472b6;
      this.spawnHeroAfterimage(swordVfxColor);
      this.spawnSlashVfx(
        this.heroX + 38,
        this.groundY - 32,
        swordVfxColor,
        tier === 'transcendent' ? 2.0 : isHighTier ? 1.75 : tier === 'ultimate' ? 1.4 : 1.1
      );
      if (tier !== 'base') {
        this.spawnQiShockwaveRing(
          this.heroX + 22,
          this.groundY - 30,
          swordVfxColor,
          tier === 'transcendent' ? 190 : isHighTier ? 165 : 115,
          240
        );
        const swordText = isTaiji
          ? syn
            ? 'TAIJI SUPREME VOID!'
            : isHighTier
              ? 'TAIJI SWORD SPHERE!'
              : 'TAIJI YIN-YANG SWORD!'
          : syn
            ? 'CONDOR SWORD ARRAY!'
            : isHighTier
              ? 'GRANDMASTER CONDOR ARRAY!'
              : 'TWIN JADE LOTUS!';
        const swordColor = isTaiji ? '#67e8f9' : '#7dd3fc';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          swordText,
          swordColor,
          tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
        );
      }
      const tex = isTaiji
        ? (isHighTier ? 'fx_taiji_seal' : 'proj_sword_taiji')
        : (isHighTier
          ? 'fx_jade_condor_array'
          : tier === 'ultimate'
            ? 'fx_jade_twin_lotus'
            : 'proj_sword_jade');
      const aura = tier !== 'base' ? (isTaiji ? 'fx_ascended_halo_bagua' : 'fx_ascended_halo_lotus') : null;
      const auraScale = tier === 'transcendent' ? 1.7 : isHighTier ? 1.55 : 1.35;
      const auraSpin = isTaiji ? -2.6 : 2.4;
      const scale = tier === 'transcendent' ? 2.15 : isHighTier ? 1.9 : tier === 'ultimate' ? 1.5 : 1.15;
      const vx = tier === 'transcendent' ? 740 : isHighTier ? 700 : 640;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const spreadY = (i - (count - 1) / 2) * 14;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 30) + spreadY) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 20)) / vx);
        this.spawnProjectile(
          tex,
          this.heroX + 22,
          this.groundY - 30 + spreadY * 0.45,
          vx,
          vy,
          dmg,
          hitCrit,
          tier === 'transcendent' ? 7 : isHighTier ? 5 : tier === 'ultimate' ? 3 : 1,
          false,
          false,
          tier !== 'base',
          aimEnemy.id,
          false,
          false,
          isHighTier ? 'CONDOR' : tier === 'ultimate' ? 'LOTUS' : 'JADE',
          null,
          scale,
          tier === 'base' ? null : isHighTier ? 0x38bdf8 : 0xf472b6,
          tier === 'transcendent' ? 140 : isHighTier ? 120 : tier === 'ultimate' ? 75 : 0,
          0x38bdf8,
          aura,
          auraScale,
          auraSpin,
          0,
          true,
          isTaiji
        );
      }
    } else if (art.style === 'staff_spin') {
      if (tier !== 'base') {
        soundFX.playHeavyCleave();
      } else {
        soundFX.playSwing();
      }
      this.playHeroAttackAnimation(
        'warrior',
        tier === 'transcendent' ? 1.75 : isHighTier ? 1.55 : tier === 'ultimate' ? 1.3 : 1.1
      );
      const radius =
        tier === 'transcendent' ? 395 : isHighTier ? 345 : tier === 'ultimate' ? 265 : 165 + level * 25;
      const staffTex =
        isHighTier
          ? 'fx_staff_bagua_domain'
          : tier === 'ultimate'
            ? 'fx_staff_dragon_vortex'
            : 'proj_vortex_staff';
      const staffAura = tier !== 'base' ? 'fx_ascended_halo_bagua' : null;
      const staffColor = isHighTier ? 0xfde047 : tier === 'ultimate' ? 0x6ee7b7 : 0x10b981;
      this.spawnHeroAfterimage(staffColor);
      this.spawnWhirlingStaffVfx(
        this.heroX + 20,
        this.groundY - 28,
        radius,
        staffColor,
        staffTex,
        tier === 'transcendent' ? 1.65 : isHighTier ? 1.45 : tier === 'ultimate' ? 1.2 : 1
      );
      this.spawnSlashVfx(
        this.heroX + 24,
        this.groundY - 28,
        staffColor,
        tier === 'transcendent' ? 2.15 : isHighTier ? 1.9 : tier === 'ultimate' ? 1.45 : 1.15
      );
      if (tier !== 'base') {
        this.cameras.main.shake(105, tier === 'transcendent' ? 0.009 : isHighTier ? 0.007 : 0.004);
        this.spawnFloatingText(
          this.heroX + 32,
          this.groundY - 98,
          syn ? 'HEAVEN UNDER STAFF!' : isHighTier ? 'BAGUA STAFF DOMAIN!' : 'DRAGON CYCLONE!',
          '#6ee7b7',
          tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
        );
        // Launch evolved whirling staff cyclones down the lane
        this.spawnProjectile(
          staffTex,
          this.heroX + 30,
          this.groundY - 30,
          tier === 'transcendent' ? 580 : isHighTier ? 540 : 480,
          0,
          Math.round(dmg * 0.7),
          hitCrit,
          99,
          false,
          true,
          true,
          null,
          false,
          false,
          isHighTier ? 'BAGUA' : 'VORTEX',
          null,
          tier === 'transcendent' ? 1.85 : isHighTier ? 1.65 : 1.35,
          staffColor,
          tier === 'transcendent' ? 135 : isHighTier ? 115 : 70,
          staffColor,
          staffAura,
          1.5,
          3.2,
          0,
          true
        );
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.sprite.x - this.heroX) <= radius) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, staffColor);
          this.damageEnemy(e, dmg, hitCrit, isHighTier ? 'BAGUA' : 'STAFF', true);
          if (e.hp > 0) {
            e.chillTimer = Math.max(e.chillTimer, 1.5);
            if (tier !== 'base' || level >= 2) {
              e.stunTimer = Math.max(
                e.stunTimer,
                tier === 'transcendent' ? 1.0 : isHighTier ? 0.85 : 0.4
              );
            }
          }
        }
      }
    } else if (art.style === 'iron_cleave') {
      soundFX.playHeavyCleave();
      this.playHeroAttackAnimation(
        'warrior',
        tier === 'transcendent' ? 1.8 : isHighTier ? 1.6 : tier === 'ultimate' ? 1.35 : 1.15
      );
      const strikeX = target.sprite.x;
      const isDragonSaber = art.id === 'art_dragon_saber';
      const isToad = art.id === 'art_toad_stance';
      const bladeTex = isToad
        ? 'proj_palm_toad'
        : isDragonSaber
          ? (isHighTier ? 'fx_dragon_sovereign' : 'proj_blade_dragon_saber')
          : (isHighTier
            ? 'fx_iron_sword_tomb'
            : tier === 'ultimate'
              ? 'fx_iron_colossus_blade'
              : 'proj_blade_iron');
      const cleaveAura = tier !== 'base'
        ? (isToad ? 'fx_ascended_halo_venom' : isDragonSaber ? 'fx_ascended_halo_dragon' : 'fx_ascended_halo_bagua')
        : null;
      const cleaveAuraSpin = isToad ? -3.0 : 2.5;
      const bladeTint = isToad
        ? isHighTier
          ? 0x4ade80
          : tier === 'ultimate'
            ? 0x22c55e
            : 0x16a34a
        : isDragonSaber
          ? isHighTier
            ? 0xf59e0b
            : tier === 'ultimate'
              ? 0xfbbf24
              : 0xd97706
          : isHighTier
            ? 0xf43f5e
            : tier === 'ultimate'
              ? 0xe879f9
              : 0xa855f7;
      this.spawnFallingGreatswordVfx(
        strikeX,
        target.sprite.y,
        bladeTint,
        isHighTier,
        bladeTex,
        tier === 'transcendent' ? 1.65 : isHighTier ? 1.45 : tier === 'ultimate' ? 1.25 : 1
      );
      if (isHighTier) {
        this.spawnFallingGreatswordVfx(
          strikeX - 75,
          target.sprite.y,
          0xc084fc,
          true,
          'fx_iron_colossus_blade',
          tier === 'transcendent' ? 1.3 : 1.15
        );
        this.spawnFallingGreatswordVfx(
          strikeX + 75,
          target.sprite.y,
          0xfde047,
          true,
          'fx_iron_colossus_blade',
          tier === 'transcendent' ? 1.3 : 1.15
        );
      }
      this.spawnSlashVfx(
        strikeX,
        target.sprite.y,
        bladeTint,
        tier === 'transcendent' ? 2.35 : isHighTier ? 2.1 : tier === 'ultimate' ? 1.6 : 1.25
      );
      if (tier !== 'base') {
        const cleaveText = isToad
          ? syn
            ? 'REVERSED NINE-YIN TOAD!'
            : isHighTier
              ? 'MOUNT HUA TOAD LEAP!'
              : 'WESTERN TOAD STANCE!'
          : isDragonSaber
            ? syn
              ? 'HEAVENLY DRAGON DOMINION!'
              : isHighTier
                ? 'DRAGON SABER CATACLYSM!'
                : 'PRECIOUS DRAGON SABER!'
            : syn || isHighTier
              ? 'SWORD TOMB CATACLYSM!'
              : 'COLOSSUS CLEAVE!';
        const cleaveColor = isToad ? '#4ade80' : isDragonSaber ? '#fbbf24' : '#e879f9';
        this.spawnFloatingText(
          strikeX,
          target.sprite.y - 58,
          cleaveText,
          cleaveColor,
          tier === 'transcendent' ? 18 : isHighTier ? 17 : 15
        );
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (
          Math.abs(e.sprite.x - strikeX) <=
          (tier === 'transcendent' ? 240 : isHighTier ? 210 : tier === 'ultimate' ? 165 : 130)
        ) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, bladeTint);
          this.damageEnemy(e, dmg, hitCrit, isHighTier ? 'CATACLYSM' : 'IRON', true);
          if (e.hp > 0) {
            e.stunTimer = Math.max(
              e.stunTimer,
              tier === 'transcendent' ? 1.3 : isHighTier ? 1.15 : 0.7
            );
          }
        }
      }
      if (tier !== 'base') {
        this.spawnProjectile(
          bladeTex,
          this.heroX + 24,
          this.groundY - 40,
          tier === 'transcendent' ? 620 : isHighTier ? 580 : 510,
          0,
          Math.round(dmg * 0.55),
          true,
          99,
          false,
          false,
          true,
          null,
          false,
          false,
          isHighTier ? 'TOMB' : 'CLEAVE',
          null,
          tier === 'transcendent' ? 2.1 : isHighTier ? 1.85 : 1.45,
          bladeTint,
          tier === 'transcendent' ? 155 : isHighTier ? 135 : 85,
          bladeTint,
          cleaveAura,
          1.5,
          cleaveAuraSpin,
          0,
          true
        );
      }
    } else if (art.style === 'flute_sonic') {
      soundFX.playFluteNote();
      this.playHeroAttackAnimation(
        'mage',
        tier === 'transcendent' ? 1.55 : isHighTier ? 1.4 : 1.15
      );
      const isGreatShift = art.id === 'art_great_shift';
      if (isGreatShift) {
        this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 1);
      }
      const fluteColor = isGreatShift
        ? isHighTier
          ? 0xfef08a
          : 0xfbbf24
        : isHighTier
          ? 0x2dd4bf
          : tier === 'ultimate'
            ? 0xf472b6
            : 0x2dd4bf;
      this.spawnQiShockwaveRing(
        this.heroX + 18,
        this.groundY - 30,
        fluteColor,
        tier === 'transcendent' ? 215 : isHighTier ? 185 : tier === 'ultimate' ? 135 : 95,
        250
      );
      if (tier !== 'base') {
        const sonicText = isGreatShift
          ? syn
            ? 'BRIGHT SUMMIT QIANKUN!'
            : isHighTier
              ? 'SEVENTH-LEVEL QIANKUN!'
              : 'GREAT SHIFT OF HEAVEN AND EARTH!'
          : syn
            ? 'AZURE SYMPHONY!'
            : isHighTier
              ? 'TIDAL DRAGON CHORD!'
              : 'PHOENIX FLUTE CREST!';
        const sonicTextColor = isGreatShift ? '#fef08a' : '#5eead4';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 96,
          sonicText,
          sonicTextColor,
          tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
        );
      }
      const tex = isGreatShift
        ? (isHighTier ? 'fx_taiji_seal' : 'proj_vortex_qiankun')
        : (isHighTier
          ? 'fx_flute_tidal_dragon'
          : tier === 'ultimate'
            ? 'fx_flute_phoenix_chord'
            : 'proj_wave_flute');
      const sonicAura = tier !== 'base'
        ? (isGreatShift ? 'fx_ascended_halo_dragon' : 'fx_ascended_halo_lotus')
        : null;
      const sonicAuraSpin = isGreatShift ? -3.5 : 2.2;
      const scale = tier === 'transcendent' ? 2.2 : isHighTier ? 1.95 : tier === 'ultimate' ? 1.5 : 1.15;
      const vx = tier === 'transcendent' ? 660 : isHighTier ? 610 : 550;
      const sparksBonus = this.hasEquippedLegendary('mage_head_sparks')
        ? this.isEquippedLegendaryCursed('mage_head_sparks')
          ? 1
          : 2
        : 0;
      const fluteBounces = (isHighTier ? 3 : 2) + sparksBonus;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32)) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          tex,
          this.heroX + 22,
          this.groundY - 32 + ((i % 3) - 1) * 12,
          vx,
          vy,
          dmg,
          hitCrit,
          isHighTier ? 99 : tier === 'ultimate' ? 5 : 2 + level,
          false,
          false,
          true,
          aimEnemy.id,
          false,
          false,
          isHighTier ? 'SYMPHONY' : tier === 'ultimate' ? 'PHOENIX' : 'NOTE',
          null,
          scale,
          tier === 'base' ? null : fluteColor,
          tier === 'transcendent' ? 150 : isHighTier ? 130 : tier === 'ultimate' ? 85 : 0,
          fluteColor,
          sonicAura,
          1.45,
          sonicAuraSpin,
          fluteBounces,
          true,
          isGreatShift
        );
      }
    } else if (art.style === 'six_pulse') {
      soundFX.playSwordSlash();
      this.playHeroAttackAnimation(
        'bowman',
        tier === 'transcendent' ? 1.7 : isHighTier ? 1.5 : 1.2
      );
      const isShiftingStars = art.id === 'art_shifting_stars';
      const pulseColor = isShiftingStars
        ? isHighTier
          ? 0xc7d2fe
          : 0x818cf8
        : isHighTier
          ? 0xfde047
          : 0x38bdf8;
      this.spawnHeroAfterimage(pulseColor);
      this.spawnQiShockwaveRing(
        this.heroX + 26,
        this.groundY - 30,
        pulseColor,
        tier === 'transcendent' ? 215 : isHighTier ? 185 : tier === 'ultimate' ? 130 : 90,
        240
      );
      if (tier !== 'base') {
        const pulseText = isShiftingStars
          ? syn
            ? 'CELESTIAL RIPPLE RETURN!'
            : isHighTier
              ? 'STELLAR STAR SHIFT!'
              : 'SHIFTING STARS!'
          : syn
            ? 'HEAVEN-PIERCING SIX PULSE!'
            : isHighTier
              ? 'SOVEREIGN MERIDIAN BEAM!'
              : 'SIX-PULSE DRAGON LANCE!';
        const pulseTextColor = isShiftingStars ? '#a5b4fc' : '#38bdf8';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          pulseText,
          pulseTextColor,
          tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
        );
      }
      const tex = isShiftingStars
        ? (isHighTier ? 'fx_taiji_seal' : 'proj_vortex_shifting_stars')
        : (isHighTier
          ? 'fx_six_pulse_sovereign'
          : tier === 'ultimate'
            ? 'fx_six_pulse_lance'
            : 'proj_lance_six_pulse');
      const pulseAura = tier !== 'base'
        ? (isShiftingStars ? 'fx_ascended_halo_stellar' : 'fx_ascended_halo_bagua')
        : null;
      const pulseAuraSpin = isShiftingStars ? 3.6 : -2.8;
      const scale = tier === 'transcendent' ? 2.35 : isHighTier ? 2.1 : tier === 'ultimate' ? 1.6 : 1.25;
      const vx = tier === 'transcendent' ? 880 : isHighTier ? 840 : 760;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const spreadY = (i - (count - 1) / 2) * 12;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32) + spreadY) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          tex,
          this.heroX + 24,
          this.groundY - 32 + spreadY * 0.45,
          vx,
          vy,
          dmg,
          hitCrit,
          isHighTier ? 99 : tier === 'ultimate' ? 6 : level + 1,
          false,
          false,
          true,
          null,
          isHighTier && i === 0,
          false,
          isHighTier ? 'SOVEREIGN' : tier === 'ultimate' ? 'LANCE' : 'SIX-PULSE',
          null,
          scale,
          tier === 'base' ? null : pulseColor,
          tier === 'transcendent' ? 160 : isHighTier ? 140 : tier === 'ultimate' ? 85 : 0,
          pulseColor,
          pulseAura,
          1.45,
          pulseAuraSpin
        );
      }
    } else if (art.style === 'flicking_finger') {
      soundFX.playPalmImpact();
      this.playHeroAttackAnimation(
        'warrior',
        tier === 'transcendent' ? 1.75 : isHighTier ? 1.55 : 1.2
      );
      const orbColor = isHighTier ? 0xef4444 : 0xfb923c;
      this.spawnQiShockwaveRing(
        this.heroX + 28,
        this.groundY - 30,
        orbColor,
        tier === 'transcendent' ? 225 : isHighTier ? 195 : tier === 'ultimate' ? 140 : 105,
        250
      );
      if (tier !== 'base') {
        this.cameras.main.shake(115, tier === 'transcendent' ? 0.01 : isHighTier ? 0.008 : 0.005);
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          syn ? 'TEN-DRAGON SUPERNOVA!' : isHighTier ? 'GRANDMASTER METEOR STAR!' : 'SOLAR METEOR FINGER!',
          '#fb923c',
          tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
        );
      }
      const tex =
        isHighTier
          ? 'fx_finger_supernova'
          : tier === 'ultimate'
            ? 'fx_finger_solar_orb'
            : 'proj_lance_finger';
      const fingerAura = tier !== 'base' ? 'fx_ascended_halo_dragon' : null;
      const scale = tier === 'transcendent' ? 2.2 : isHighTier ? 1.95 : tier === 'ultimate' ? 1.55 : 1.25;
      const vx = tier === 'transcendent' ? 780 : isHighTier ? 730 : 680;
      for (let i = 0; i < count; i++) {
        const aimEnemy = this.enemies[i % this.enemies.length] ?? target;
        const offset = (i - (count - 1) / 2) * 14;
        const vy =
          (aimEnemy.sprite.y - (this.groundY - 32) + offset) /
          Math.max(0.08, (aimEnemy.sprite.x - (this.heroX + 22)) / vx);
        this.spawnProjectile(
          tex,
          this.heroX + 24,
          this.groundY - 32 + offset * 0.4,
          vx,
          vy,
          dmg,
          hitCrit,
          tier === 'transcendent' ? 8 : isHighTier ? 6 : tier === 'ultimate' ? 3 : 2,
          false,
          false,
          true,
          aimEnemy.id,
          false,
          false,
          isHighTier ? 'SUPERNOVA' : tier === 'ultimate' ? 'SOLAR' : 'THRUM',
          null,
          scale,
          tier === 'base' ? null : orbColor,
          tier === 'transcendent' ? 175 : isHighTier ? 150 : tier === 'ultimate' ? 95 : 0,
          orbColor,
          fingerAura,
          1.4,
          3.2
        );
      }
      for (const e of [...this.enemies]) {
        if (
          Math.abs(e.sprite.x - target.sprite.x) <=
            (tier === 'transcendent' ? 190 : isHighTier ? 165 : 100) &&
          e.hp > 0
        ) {
          this.damageEnemy(e, Math.round(dmg * 0.35), false, 'SHOCK', true);
        }
      }
    } else {
      soundFX.playPalmImpact();
      if (tier !== 'base') {
        this.cameras.main.shake(120, tier === 'transcendent' ? 0.01 : isHighTier ? 0.008 : 0.005);
      }
      this.playHeroAttackAnimation(
        'warrior',
        tier === 'transcendent' ? 1.7 : isHighTier ? 1.5 : tier === 'ultimate' ? 1.25 : 1.1
      );
      const isTianshan = art.id === 'art_tianshan_six_yang';
      const tideColor = isTianshan
        ? isHighTier
          ? 0xf43f5e
          : 0xfb7185
        : isHighTier
          ? 0x818cf8
          : 0x38bdf8;
      this.spawnHeroAfterimage(tideColor);
      this.spawnQiShockwaveRing(
        this.heroX + 26,
        this.groundY - 32,
        tideColor,
        tier === 'transcendent' ? 225 : isHighTier ? 195 : tier === 'ultimate' ? 140 : 100,
        260
      );
      const tideText = isTianshan
        ? syn
          ? 'EIGHT DESOLATIONS FROST!'
          : isHighTier
            ? 'SIX-YANG PLUM STORM!'
            : 'TIANSHAN PLUM HAND!'
        : syn
          ? 'SOVEREIGN SOUL-SEVERING PALM!'
          : isHighTier
            ? 'ABYSSAL SEA-TIDE PALM!'
            : tier === 'ultimate'
              ? 'HEARTBREAK TIDE PALM!'
              : 'MELANCHOLIC PALM!';
      const tideTextColor = isTianshan ? '#fbcfe8' : '#a5b4fc';
      this.spawnFloatingText(
        this.heroX + 36,
        this.groundY - 100,
        tideText,
        tideTextColor,
        tier === 'transcendent' ? 17 : isHighTier ? 16 : 14
      );
      const tex = isTianshan
        ? (isHighTier ? 'fx_ice_blizzard_lotus' : 'proj_palm_tianshan')
        : (isHighTier ? 'fx_ice_crystal_spear' : 'proj_palm_melancholic');
      const palmAura = tier !== 'base' ? 'fx_ascended_halo_lotus' : null;
      const palmAuraSpin = isTianshan ? 2.8 : -2.6;
      const scale = tier === 'transcendent' ? 2.2 : isHighTier ? 1.95 : tier === 'ultimate' ? 1.55 : 1.2;
      const vx = tier === 'transcendent' ? 620 : isHighTier ? 580 : 510;
      for (let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        this.spawnProjectile(
          tex,
          this.heroX + 24,
          this.groundY - 34 + offset * 18,
          vx,
          offset * 22,
          dmg,
          hitCrit,
          isHighTier ? 99 : tier === 'ultimate' ? 6 : 3,
          isHighTier,
          true,
          true,
          null,
          false,
          false,
          isHighTier ? 'SOUL-SEVER' : tier === 'ultimate' ? 'HEARTBREAK' : 'MELANCHOLIC',
          null,
          scale,
          tier === 'base' ? null : tideColor,
          tier === 'transcendent' ? 160 : isHighTier ? 140 : tier === 'ultimate' ? 90 : 0,
          tideColor,
          palmAura,
          1.45,
          palmAuraSpin,
          0,
          true
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 185 && e.hp > 0) {
          this.applyEnemyKnockback(e, 26);
        }
      }
    }

    // Chaos Crown (mage_head_chaos): 35% (20% cursed) chance to fire a secondary 50% ATK spirit bolt
    if (this.hasEquippedLegendary('mage_head_chaos')) {
      const chaosChance = this.isEquippedLegendaryCursed('mage_head_chaos') ? 0.2 : 0.35;
      if (this.rng() < chaosChance) {
        const boltTarget = this.getClosestEnemy();
        if (boltTarget) {
          const bvx = 680;
          const bvy =
            (boltTarget.sprite.y - (this.groundY - 32)) /
            Math.max(0.08, (boltTarget.sprite.x - (this.heroX + 24)) / bvx);
          this.spawnProjectile(
            'proj_bolt',
            this.heroX + 24,
            this.groundY - 32,
            bvx,
            bvy,
            Math.max(1, Math.round(this.stats.atk * 0.5 * this.stats.allDamageMult)),
            false,
            1,
            false,
            false,
            false,
            boltTarget.id,
            false,
            false,
            'CHAOS',
            0xc084fc,
            1.15,
            0xc084fc,
            0,
            0xc084fc,
            null,
            1.35,
            2.5,
            0,
            true
          );
        }
      }
    }

    // Left-Right Mutual Hands (enlighten_qi_surge) double-cast chance
    if (!isMutualMirror) {
      const mutualStacks = loadout.enlightenmentCounts['enlighten_qi_surge'] ?? 0;
      if (mutualStacks > 0 && this.rng() < Math.min(0.75, mutualStacks * 0.25)) {
        this.spawnFloatingText(
          this.heroX + 18,
          this.groundY - 122,
          'DOUBLE-CAST!',
          '#fef08a',
          14
        );
        this.time.delayedCall(180, () => {
          if (this.phase === 'combat' && this.enemies.length > 0) {
            this.castWuxiaActiveArt(artId, isBurst, true);
          }
        });
      }
    }
  }

  private getWuxiaCritCallout(
    labelTag: string | null,
    finalDmg: number
  ): { text: string; color: string; size: number; stroke: string } {
    if (labelTag === 'ULTIMATE') {
      return { text: `ULTIMATE CRIT! ${finalDmg}`, color: '#ecd492', size: 16, stroke: '#120e0c' };
    }
    if (labelTag === 'SHATTER') {
      return { text: `MERIDIAN SHATTER! ${finalDmg}`, color: '#ecd492', size: 18, stroke: '#7a1c17' };
    }
    if (labelTag === 'DEFLECT') {
      return { text: `DEFLECT COUNTER! ${finalDmg}`, color: '#fde047', size: 17, stroke: '#120e0c' };
    }
    if (labelTag === 'TOTEM_SHATTER') {
      return { text: `TOTEM BURST! ${finalDmg}`, color: '#fde047', size: 17, stroke: '#7a1c17' };
    }
    const callouts: readonly string[] = [
      'MERIDIAN PIERCE!',
      'CRITICAL STRIKE!',
      'SWORD SEVER!',
      'BURST RUPTURE!',
      'YIN-YANG RUPTURE!',
      'PRECISION STRIKE!',
      'HEAVEN CRIT!',
    ];
    const phrase = callouts[Math.floor(this.rng() * callouts.length)] ?? 'CRITICAL STRIKE!';
    return { text: `${phrase} ${finalDmg}`, color: '#ecd492', size: 15, stroke: '#120e0c' };
  }

  private addUltimateGauge(amount: number): void {
    if (amount <= 0) return;
    if (this.ultimateStocks >= this.maxUltimateStocks) {
      this.ultimateGauge = 100;
      return;
    }
    this.ultimateGauge += amount;
    while (this.ultimateGauge >= 100 && this.ultimateStocks < this.maxUltimateStocks) {
      this.ultimateGauge -= 100;
      this.ultimateStocks += 1;
      soundFX.playDraft();
      this.spawnFloatingText(
        this.heroX + 20,
        this.groundY - 112,
        `ULTIMATE READY (${this.ultimateStocks}/${this.maxUltimateStocks}) [R]`,
        '#ecd492',
        15
      );
    }
    if (this.ultimateStocks >= this.maxUltimateStocks) {
      this.ultimateGauge = 100;
    }
  }

  private getUltimateSkillName(): string {
    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const primarySlot = loadout.actives[0];
    const primaryArt = primarySlot ? getWuxiaActiveArtById(primarySlot.id) : null;
    switch (primaryArt?.style) {
      case 'palm_wave':
        return 'Heaven-Shaking 18 Dragons';
      case 'jade_swords':
        return 'Nine-Heavens Sword Domain';
      case 'staff_spin':
        return 'Heavenly Pillar Bagua Seal';
      case 'iron_cleave':
        return 'Demon-Severing Saber Purgatory';
      case 'flute_sonic':
        return 'Eight-Trigram Sonic Cataclysm';
      case 'venom_needles':
        return 'Melancholic Soul-Severing Tide';
      case 'six_pulse':
        return 'Six-Pulse Sovereign Judgment';
      case 'flicking_finger':
        return 'Solar Supernova Extinction';
      default:
        return 'Taiji Primordial Annihilation';
    }
  }

  public triggerUltimateSkill(): void {
    if (
      this.phase !== 'combat' ||
      !this.stats ||
      !this.runConfig ||
      this.ultimateStocks <= 0 ||
      this.enemies.length === 0
    ) {
      return;
    }

    if (this.ultimateStocks === this.maxUltimateStocks && this.ultimateGauge >= 100) {
      this.ultimateGauge = 0;
    }
    this.ultimateStocks -= 1;

    const ultName = this.getUltimateSkillName();
    soundFX.playBossRoar();
    soundFX.playVictory();
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.06);
    this.cameras.main.flash(240, 255, 238, 150);
    this.cameras.main.shake(300, 0.013);
    this.playHeroAttackAnimation('warrior', 1.65);
    this.spawnHeroAfterimage(0xfef08a);

    const w = this.scale.width || 1024;
    const centerX = w * 0.55;
    const centerY = this.groundY - 70;
    this.spawnQiShockwaveRing(centerX, centerY, 0xfef08a, 240, 320);
    this.spawnQiShockwaveRing(centerX, centerY, 0xf97316, 190, 260);
    this.spawnQiShockwaveRing(centerX, centerY, 0x38bdf8, 140, 220);

    const taijiSeal = this.add
      .image(centerX, centerY, 'fx_taiji_seal')
      .setScale(1.6)
      .setDepth(11);
    this.tweens.add({
      targets: taijiSeal,
      scale: 3.1,
      rotation: Math.PI * 2,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => taijiSeal.destroy(),
    });

    this.spawnRelicAcquisitionBanner(
      `ULTIMATE: ${ultName.toUpperCase()}!`,
      'Stored Qi Unleashed • All Enemies Stunned & Shields Shattered',
      0xf59e0b
    );

    this.heroShield = Math.min(
      this.stats.maxHp * 1.5,
      this.heroShield + Math.round(this.stats.maxHp * 0.25)
    );
    this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 2);

    const ultDmg = Math.max(
      1,
      Math.round(
        this.stats.atk *
          9.5 *
          this.stats.allDamageMult *
          (1 + this.stats.skillPowerPct / 100) *
          this.stats.critDmg
      )
    );

    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue;
      e.hitShield = Math.max(0, e.hitShield - 6);
      e.stunTimer = Math.max(e.stunTimer, 2.0);
      this.spawnLightningVfx(e.sprite.x, e.sprite.y - 160, e.sprite.x, e.sprite.y, 0xfef08a);
      this.spawnQiShockwaveRing(e.sprite.x, e.sprite.y, 0xf59e0b, 125, 240);
      this.damageEnemy(e, ultDmg, true, 'ULTIMATE', true);
    }

    this.emitHud();
  }

  public triggerActiveSkill(): void {
    if (this.phase !== 'combat' || !this.stats || !this.runConfig || this.skillTimer > 0) return;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.skillTimer = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);

    if (loadout.actives.length === 0) {
      soundFX.playPalmImpact();
      this.playHeroAttackAnimation('warrior', 1.4);
      this.spawnHeroAfterimage(0xfef08a);
      this.spawnQiShockwaveRing(this.heroX + 25, this.groundY - 30, 0xfef08a, 185, 290);
      const taijiSeal = this.add
        .image(this.heroX + 35, this.groundY - 32, 'fx_taiji_seal')
        .setScale(1.1)
        .setDepth(11);
      this.tweens.add({
        targets: taijiSeal,
        scale: 2.3,
        rotation: Math.PI * 2,
        alpha: 0,
        duration: 340,
        ease: 'Cubic.easeOut',
        onComplete: () => taijiSeal.destroy(),
      });
      this.cameras.main.shake(100, 0.005);
      this.spawnFloatingText(this.heroX + 35, this.groundY - 102, 'TAIJI PALM BREAK!', '#ecd492', 16);
      const dmg = Math.max(
        1,
        Math.round(this.stats.atk * 2.1 * this.stats.allDamageMult * this.stats.critDmg)
      );
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 210) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, true, 0xfef08a);
          this.damageEnemy(e, dmg, true, 'TAIJI', true);
          if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.75);
        }
      }
      this.emitHud();
      return;
    }

    this.spawnQiShockwaveRing(this.heroX + 25, this.groundY - 30, 0xfde047, 175, 280);
    this.cameras.main.shake(110, 0.006);
    this.spawnFloatingText(this.heroX + 40, this.groundY - 110, 'DANTIAN UNLEASHED!', '#ecd492', 16);
    for (const slot of loadout.actives) {
      this.castWuxiaActiveArt(slot.id, true);
    }
    this.emitHud();
  }

  public triggerPotion(): void {
    if (this.phase !== 'combat' || !this.stats) return;
    if (this.fastingFloorsLeft > 0 || this.potionCharges <= 0 || this.potionCooldown > 0) return;

    this.potionCharges -= 1;
    this.potionCooldown = 10;
    const potionMult = this.activeDecree?.potionHealMult ?? 1;
    this.healHero(this.stats.maxHp * 0.35 * potionMult, true);
    soundFX.playDraft();
    this.emitHud();
  }

  public triggerDash(): void {
    if (this.phase !== 'combat' || !this.stats || this.dashCooldown > 0) return;

    this.heroDashAnimTimer = 0.26;
    this.applyHeroAnimTexture('dash');

    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.dashCooldown = Math.max(2.0, 5 * cdMult);
    const hasSilentStep = this.hasEquippedLegendary('thief_top_silentstep');
    this.invulnHitsLeft = Math.max(this.invulnHitsLeft, hasSilentStep ? 2 : 1);
    if (hasSilentStep) {
      this.attackTimer += 0.5;
    }

    // Qinggong Perfect Deflect check: boss in final 0.55s of heavyChargeTimer
    const perfectBoss = this.enemies.find(
      (e) => e.isBoss && e.hp > 0 && e.heavyChargeTimer > 0 && e.heavyChargeTimer <= 0.55
    );
    if (perfectBoss) {
      perfectBoss.heavyChargeTimer = 0;
      perfectBoss.heavyCooldown = 6.5 + this.rng() * 1.5;
      perfectBoss.heavyTelegraphGfx?.destroy();
      perfectBoss.heavyTelegraphGfx = null;
      perfectBoss.stunTimer = Math.max(perfectBoss.stunTimer, 1.5);

      this.addUltimateGauge(25);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
      this.cameras.main.flash(180, 253, 224, 71);
      this.cameras.main.shake(130, 0.008);
      soundFX.playPerfectDodge();
      this.spawnHeroAfterimage(0xfde047);
      this.spawnQiShockwaveRing(perfectBoss.sprite.x, perfectBoss.sprite.y, 0xfde047, 185, 280);
      this.spawnFloatingText(
        this.heroX + 34,
        this.groundY - 114,
        'PERFECT DEFLECT!',
        '#fde047',
        19
      );
      this.spawnSlashVfx(perfectBoss.sprite.x, perfectBoss.sprite.y, 0xfde047, 1.8);

      const counterDmg = Math.max(
        1,
        Math.round(this.stats.atk * 2.2 * this.stats.allDamageMult)
      );
      this.damageEnemy(perfectBoss, counterDmg, true, 'DEFLECT', true);
      if (perfectBoss.hp > 0) {
        this.openFlawWindow(perfectBoss, 2.6);
      }
    } else {
      soundFX.playSwing();
      this.spawnFloatingText(this.heroX + 20, this.groundY - 96, 'DASH!', '#ede3cf', 15);
    }

    // Defuse volatile hazards within 140px of hero
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h) continue;
      if (Math.abs(h.sprite.x - this.heroX) <= 140) {
        this.spawnHitSpark(h.sprite.x, h.sprite.y, false, 0x38bdf8);
        this.spawnFloatingText(h.sprite.x, h.sprite.y - 26, 'DEFUSED!', '#ede3cf', 14);
        h.sprite.destroy();
        h.ring.destroy();
        this.hazards.splice(i, 1);
      }
    }

    // Deflect incoming enemy Qi darts within 160px of hero
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      if (!ep) continue;
      if (Math.abs(ep.sprite.x - this.heroX) <= 160) {
        this.spawnHitSpark(ep.sprite.x, ep.sprite.y, false, 0x38bdf8);
        this.spawnFloatingText(ep.sprite.x, ep.sprite.y - 22, 'DEFLECTED!', '#ede3cf', 13);
        ep.sprite.destroy();
        ep.glow.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }

    if (this.heroSprite) {
      this.tweens.add({
        targets: this.heroSprite,
        x: this.heroX - 24,
        duration: 90,
        yoyo: true,
      });
    }

    for (const e of [...this.enemies]) {
      if (e.sprite.x - this.heroX <= 180) {
        this.applyEnemyKnockback(e, 110);
        if (e.hp > 0) {
          e.stunTimer = Math.max(e.stunTimer, 0.6);
        }
      }
    }

    this.triggerAfterimageDecoy();

    if (!perfectBoss) {
      const closest = this.getClosestEnemy();
      if (closest) {
        this.damageEnemy(closest, this.stats.atk * 0.9 * this.stats.allDamageMult, false, 'COUNTER');
      }
    }

    this.emitHud();
  }

  public toggleSpeed(): 1 | 2 {
    this.speedMult = this.speedMult === 1 ? 2 : 1;
    this.emitHud();
    return this.speedMult;
  }

  public toggleAutoSkill(): boolean {
    this.autoSkill = !this.autoSkill;
    this.emitHud();
    return this.autoSkill;
  }

  private spawnHazardBomb(x: number, y: number, damage: number): void {
    const sprite = this.add.image(x, y, 'bomb_hazard').setDepth(5);
    const ring = this.add.circle(x, y, 42, 0xef4444, 0.22).setDepth(4);
    this.hazards.push({ sprite, ring, fuse: 2.0, damage });
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h) continue;
      h.fuse -= dt;
      h.ring.setScale(1 + (2 - h.fuse) * 0.2);
      if (h.fuse <= 0) {
        if (Math.abs(h.sprite.x - this.heroX) <= 64) {
          this.damageHero(h.damage, null);
        }
        h.sprite.destroy();
        h.ring.destroy();
        this.hazards.splice(i, 1);
      }
    }
  }

  private spawnRelicAcquisitionBanner(title: string, subtitle: string, borderHex = 0xc49f54): void {
    const w = this.scale.width || 1024;
    const plaqueW = Math.min(430, w - 40);
    const plaqueH = 54;
    const container = this.add.container(w / 2, 74).setDepth(26).setScale(0.7).setAlpha(0);
    const shadow = this.add.rectangle(0, 3, plaqueW + 4, plaqueH + 4, 0x090706, 0.52);
    const bg = this.add
      .rectangle(0, 0, plaqueW, plaqueH, 0x16110e, 0.96)
      .setStrokeStyle(2, borderHex, 0.9);
    const innerRim = this.add
      .rectangle(0, 0, plaqueW - 20, plaqueH - 10, 0x1c1511, 0.28)
      .setStrokeStyle(1, 0xc49f54, 0.38);
    const leftCap = this.add.rectangle(-plaqueW / 2 + 6, 0, 4, plaqueH - 14, 0x9e2a22, 0.92);
    const rightCap = this.add.rectangle(plaqueW / 2 - 6, 0, 4, plaqueH - 14, 0x9e2a22, 0.92);
    const titleTxt = this.add
      .text(0, -10, title, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ecd492',
        stroke: '#0d0a08',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const subTxt = this.add
      .text(0, 10, subtitle, {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '11px',
        color: '#ede3cf',
      })
      .setOrigin(0.5);
    container.add([shadow, bg, innerRim, leftCap, rightCap, titleTxt, subTxt]);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 210,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1900, () => {
          if (!container.scene) return;
          this.tweens.add({
            targets: container,
            y: container.y - 16,
            alpha: 0,
            duration: 260,
            onComplete: () => container.destroy(),
          });
        });
      },
    });
  }

  private spawnLootDrop(x: number, y: number, kind: 'coin' | 'orb' | 'chest', value: number): void {
    const key = kind === 'coin' ? 'loot_coin' : kind === 'chest' ? 'loot_chest' : 'proj_orb_hp';
    const scaledValue =
      kind === 'coin' && this.activeDecree
        ? Math.max(1, Math.round(value * this.activeDecree.goldMult))
        : value;
    const sprite = this.add.image(x, y - 10, key).setDepth(7);
    if (kind === 'chest') {
      sprite.setScale(1.3);
      this.spawnQiShockwaveRing(x, y - 10, 0xfde047, 72, 240);
    }
    this.loots.push({
      sprite,
      kind,
      value: scaledValue,
      vx: (this.rng() - 0.5) * 140,
      vy: -190 - this.rng() * 90,
      age: 0,
    });
  }

  private updateLootDrops(dt: number): void {
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const l = this.loots[i];
      if (!l) continue;
      l.age += dt;
      if (l.age < 0.45) {
        l.vy += 580 * dt;
        l.sprite.x += l.vx * dt;
        l.sprite.y = Math.min(this.groundY - 8, l.sprite.y + l.vy * dt);
      } else {
        l.sprite.x = Phaser.Math.Linear(l.sprite.x, this.heroX, Math.min(1, dt * 10));
        l.sprite.y = Phaser.Math.Linear(l.sprite.y, this.groundY - 26, Math.min(1, dt * 10));
      }

      if (Phaser.Math.Distance.Between(l.sprite.x, l.sprite.y, this.heroX, this.groundY - 26) < 28) {
        if (l.kind === 'coin') {
          this.goldCollected += l.value;
          soundFX.playCoin();
        } else if (l.kind === 'orb' && this.stats) {
          this.healHero(this.stats.maxHp * 0.08, true);
        } else if (l.kind === 'chest') {
          this.goldCollected += 35;
          this.shardsCollected += 4;
          soundFX.playVictory();
          this.spawnQiShockwaveRing(this.heroX, this.groundY - 28, 0xfde047, 130, 280);
          this.spawnFloatingText(
            this.heroX + 20,
            this.groundY - 108,
            'Relic Chest · +35g · +4s',
            '#ecd492',
            15
          );
          this.spawnRelicAcquisitionBanner(
            isCultLeaderFloor(this.floor)
              ? 'LEGENDARY RELIC SECURED'
              : this.floor >= 25 && this.floor % 10 === 5
                ? 'SUMMIT CHESTS UNLOCKED'
                : 'RELIC CHEST UNLOCKED',
            isCultLeaderFloor(this.floor)
              ? `Floor ${this.floor} Boss Trophy • Purify at Run End (+4 Shards)`
              : 'Relic Spoils · +4 Shards'
          );
        }
        l.sprite.destroy();
        this.loots.splice(i, 1);
      }
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    msg: string,
    color: string,
    sizePx: number,
    alpha = 1,
    isCritical = sizePx >= 15,
    strokeColor = '#120e0c'
  ): void {
    const maxFloatingTexts = 14;
    while (this.activeFloatingTexts.length >= maxFloatingTexts) {
      let evictIdx = this.activeFloatingTexts.findIndex((entry) => !entry.isCritical);
      if (evictIdx === -1) evictIdx = 0;
      const evicted = this.activeFloatingTexts.splice(evictIdx, 1)[0];
      if (evicted) {
        this.tweens.killTweensOf(evicted.text);
        evicted.text.destroy();
      }
    }

    const isNumericOnly = /^[+-]?\d+$/.test(msg.trim());
    const fontFamily = isNumericOnly
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      : 'Georgia, "Times New Roman", serif';

    const txt = this.add
      .text(x, y, msg, {
        fontFamily,
        fontSize: `${sizePx}px`,
        fontStyle: 'bold',
        color,
        stroke: strokeColor,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(alpha)
      .setDepth(12);

    const entry = { text: txt, isCritical };
    this.activeFloatingTexts.push(entry);

    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 620,
      onComplete: () => {
        const idx = this.activeFloatingTexts.indexOf(entry);
        if (idx !== -1) this.activeFloatingTexts.splice(idx, 1);
        txt.destroy();
      },
    });
  }

  private onWaveCleared(): void {
    if (this.waveIndex < this.totalWavesOnFloor) {
      this.waveIndex += 1;
      this.phase = 'walking';
      this.walkTimer = 0.45;
      this.emitHud();
      return;
    }

    // Collect remaining loots instantaneously
    let collectedChest = false;
    for (const l of this.loots) {
      if (l.kind === 'coin') this.goldCollected += l.value;
      if (l.kind === 'chest') {
        this.goldCollected += 35;
        this.shardsCollected += 4;
        collectedChest = true;
      }
      l.sprite.destroy();
    }
    this.loots = [];
    if (collectedChest) {
      soundFX.playVictory();
      this.spawnRelicAcquisitionBanner(
        isCultLeaderFloor(this.floor)
          ? 'LEGENDARY RELIC SECURED'
          : this.floor >= 25 && this.floor % 10 === 5
            ? 'SUMMIT CHESTS UNLOCKED'
            : 'RELIC CHEST UNLOCKED',
        isCultLeaderFloor(this.floor)
          ? `Floor ${this.floor} Boss Trophy • Purify at Run End (+4 Shards)`
          : `Floor ${this.floor} Gear Drop (35% Legendary chance) + 4 Shards`
      );
    }

    this.floorsCleared += 1;
    if (this.fastingFloorsLeft > 0) this.fastingFloorsLeft -= 1;

    if (this.stats) {
      const floorHeal = computeFloorClearHeal(
        this.stats.maxHp,
        this.draftedBuffIds,
        this.fastingFloorsLeft
      );
      if (floorHeal > 0) {
        this.healHero(floorHeal, true);
      }
    }

    if (isCultLeaderFloor(this.floor)) {
      soundFX.playVictory();
      this.spawnFloatingText(
        this.heroX + 35,
        this.groundY - 125,
        this.runConfig?.mode === 'daily' && this.floor >= 30
          ? 'SUPREME CULT LEADER VANQUISHED! DAILY SPIRE CONQUERED!'
          : `CULT LEADER FLOOR ${this.floor} VANQUISHED!`,
        '#fde047',
        18
      );
    }

    if (this.runConfig?.mode === 'daily' && this.floor >= 30) {
      this.finishRun('cleared');
      return;
    }

    // Pause for 3-Buff Draft after floors 1-9
    this.phase = 'paused';
    const silverMult = this.hasEquippedLegendary('bow_cape_sylvanspirit')
      ? this.isEquippedLegendaryCursed('bow_cape_sylvanspirit')
        ? 1.5
        : 2
      : 1;
    this.callbacks?.onRequestDraft(this.floor, [...this.draftedBuffIds], silverMult);
    this.emitHud();
  }

  public resumeAfterDraft(chosenBuffId: string): void {
    if (chosenBuffId && chosenBuffId !== 'skip') {
      const prevMaxHp = this.stats?.maxHp ?? 200;
      this.draftedBuffIds.push(chosenBuffId);
      if (chosenBuffId === 'cursed_fasting_vow') {
        this.fastingFloorsLeft = 3;
      }
      this.recomputeStats();
      this.spawnCompanionVisuals();
      this.syncHeroWuxiaWeapon();

      if (this.stats && this.stats.maxHp > prevMaxHp) {
        this.heroHp += this.stats.maxHp - prevMaxHp;
      } else if (this.stats) {
        this.heroHp = Math.min(this.heroHp, this.stats.maxHp);
      }
    } else if (chosenBuffId === 'skip') {
      soundFX.playDraft();
      this.spawnFloatingText(
        this.heroX + 24,
        this.groundY - 84,
        'DRAFT SKIPPED (+1 REROLL)',
        '#38bdf8',
        15
      );
    }

    if (isCultLeaderFloor(this.floor)) {
      if (this.runConfig?.mode === 'daily' && this.floor >= 30) {
        soundFX.playVictory();
        this.spawnFloatingText(
          this.heroX + 35,
          this.groundY - 145,
          'DAILY SPIRE CONQUERED! FLOOR 30 CLEARED!',
          '#fde047',
          20
        );
        this.time.delayedCall(1200, () => {
          this.finishRun('cleared');
        });
        return;
      }
      this.phase = 'paused';
      this.callbacks?.onRequestExtraction(
        this.floor,
        this.goldCollected,
        this.shardsCollected,
        this.coresCollected
      );
      this.emitHud();
      return;
    }

    this.beginFloor(this.floor + 1);
  }

  public resumeAfterExtraction(extractNow: boolean): void {
    if (extractNow) {
      soundFX.playVictory();
      this.finishRun('extracted');
      return;
    }
    this.beginFloor(this.floor + 1);
  }

  public retreatWithLoot(): void {
    if (!this.runConfig || this.phase === 'idle') return;
    soundFX.playVictory();
    this.finishRun('extracted', Math.max(0, this.floor - 1));
  }

  private finishRun(outcome: RunOutcome, overrideFloorReached?: number): void {
    if (outcome === 'died') soundFX.playDefeat();
    this.phase = 'idle';
    this.heroAttackAnimTimer = 0;
    this.heroDashAnimTimer = 0;
    this.applyHeroAnimTexture('idle');
    this.clearCombatEntities();
    musicFX.setMood('camp');

    if (!this.runConfig) return;
    this.callbacks?.onRunEnded({
      runId: this.runConfig.runId,
      mode: this.runConfig.mode,
      classId: this.runConfig.classId,
      floorReached: overrideFloorReached ?? this.floor,
      outcome,
      durationMs: Math.max(2000, Math.round(this.elapsedRunMs)),
      goldCollected: this.goldCollected,
      shardsCollected: this.shardsCollected,
      coresCollected: this.coresCollected,
      draftedBuffIds: [...this.draftedBuffIds],
      bossMutations: [...this.lastBossMutations],
      greedGamblePurified: false,
    });
  }

  private emitHud(): void {
    if (!this.runConfig || !this.stats) return;
    const boss = this.enemies.find((e) => e.isBoss);
    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);

    const mutNames = this.currentBossMutations.map((m) => getMutationById(m).id);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    const totalCd = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);
    const totalDashCd = Math.max(2.0, 5 * cdMult);

    this.callbacks?.onHudUpdate({
      floor: this.floor,
      maxFloors: this.runConfig.mode === 'daily' ? 30 : Math.ceil(Math.max(1, this.floor) / 10) * 10,
      waveLabel: isCultLeaderFloor(this.floor)
        ? `Cult Leader F${this.floor}`
        : isRandomMiniBossFloor(this.floor, this.runConfig.seed)
          ? 'Hall Master Ambush'
          : `Wave ${this.waveIndex}/${this.totalWavesOnFloor}`,
      hp: Math.round(this.heroHp),
      maxHp: this.stats.maxHp,
      shield: Math.round(this.heroShield),
      gold: this.goldCollected,
      shards: this.shardsCollected,
      cores: this.coresCollected,
      skillCooldownPct: Math.min(1, Math.max(0, this.skillTimer / totalCd)),
      skillReady: this.skillTimer <= 0,
      skillName: loadout.actives.length > 0 ? 'Dantian Burst' : 'Taiji Palm Break',
      ultimateGauge: Math.min(100, Math.floor(this.ultimateGauge)),
      ultimateStocks: this.ultimateStocks,
      maxUltimateStocks: this.maxUltimateStocks,
      ultimateName: this.getUltimateSkillName(),
      dashCooldownPct: Math.min(1, Math.max(0, this.dashCooldown / totalDashCd)),
      dashReady: this.dashCooldown <= 0,
      potionCharges: this.potionCharges,
      potionDisabledReason: this.fastingFloorsLeft > 0 ? `Fasting Vow (${this.fastingFloorsLeft}f)` : null,
      speedMult: this.speedMult,
      autoSkill: this.autoSkill,
      draftedBuffIds: [...this.draftedBuffIds],
      activeBossName: boss ? boss.name : null,
      activeBossHp: boss ? boss.hp : 0,
      activeBossMaxHp: boss ? boss.maxHp : 0,
      activeBossShield: boss ? boss.hitShield : 0,
      activeMutations: mutNames,
    });
  }
}
