import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  getBiomeById,
  getBiomeForFloor,
  getEndBossNameForFloor,
  getMiniBossForFloor,
  getMutationById,
} from '../../shared/catalogs/biomes.ts';
import { getClassDefinition } from '../../shared/catalogs/classes.ts';
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
  ElementId,
  GearSlot,
  MutationId,
} from '../../shared/types.ts';
import { mulberry32 } from '../../shared/utils.ts';
import { getGearVisualStyle, registerPixelTextures } from '../fx/pixelArt.ts';
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
  skyGrad.addColorStop(0, rgbaCss(scaleRgb(skyTop, 0.68), 1));
  skyGrad.addColorStop(0.45, rgbaCss(skyTop, 1));
  skyGrad.addColorStop(0.8, rgbaCss(skyBot, 1));
  skyGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, accent, 0.36), 1));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Deterministic stars
  const rng = mulberry32(hashTextSeed(biome.id));
  for (let i = 0; i < 48; i += 1) {
    const sx = Math.round(rng() * w);
    const sy = Math.round(rng() * h * 0.56);
    const alpha = 0.25 + rng() * 0.65;
    ctx.fillStyle = i % 7 === 0 ? rgbaCss(accent, alpha) : `rgba(248, 250, 252, ${alpha})`;
    const sz = i % 9 === 0 ? 2 : 1;
    ctx.fillRect(sx, sy, sz, sz);
    if (i % 15 === 0) {
      ctx.fillStyle = `rgba(255, 251, 235, ${alpha * 0.55})`;
      ctx.fillRect(sx - 2, sy, 5, 1);
      ctx.fillRect(sx, sy - 2, 1, 5);
    }
  }

  // Celestial moon / sun disc with Octopath double corona bloom
  const moonX = Math.round(w * 0.74);
  const moonY = Math.round(h * 0.25);
  const outerBloom = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 118);
  outerBloom.addColorStop(0, 'rgba(255, 250, 230, 0.38)');
  outerBloom.addColorStop(0.35, rgbaCss(accent, 0.22));
  outerBloom.addColorStop(1, rgbaCss(accent, 0));
  ctx.fillStyle = outerBloom;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 118, 0, Math.PI * 2);
  ctx.fill();

  const moonDiscGrad = ctx.createRadialGradient(moonX - 7, moonY - 7, 3, moonX, moonY, 26);
  moonDiscGrad.addColorStop(0, '#fffdf5');
  moonDiscGrad.addColorStop(0.68, rgbaCss(mixRgb([254, 243, 199], accent, 0.25), 0.96));
  moonDiscGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, accent, 0.55), 0.9));
  ctx.fillStyle = moonDiscGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
  ctx.fill();

  // High-altitude drifting ink cloud wisps
  for (let c = 0; c < 4; c += 1) {
    const cx = 65 + c * 118 + (rng() - 0.5) * 32;
    const cy = 62 + (c % 2) * 38 + rng() * 24;
    const cloudCol = mixRgb(skyBot, accent, 0.32);
    ctx.fillStyle = rgbaCss(cloudCol, 0.22);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 58, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 28, cy + 4, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diagonal volumetric god-rays streaming from celestial disc
  for (let r = 0; r < 4; r += 1) {
    const spread = (r - 1.5) * 44;
    const beamStartX = moonX + spread * 0.28;
    const beamEndX = moonX - 240 + spread * 1.45;
    const rayGrad = ctx.createLinearGradient(beamStartX, moonY, beamEndX, h);
    rayGrad.addColorStop(0, 'rgba(255, 248, 225, 0.14)');
    rayGrad.addColorStop(0.55, rgbaCss(accent, 0.08));
    rayGrad.addColorStop(1, rgbaCss(accent, 0));
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(beamStartX - 10, moonY);
    ctx.lineTo(beamStartX + 18, moonY);
    ctx.lineTo(beamEndX + 52, h);
    ctx.lineTo(beamEndX - 28, h);
    ctx.closePath();
    ctx.fill();
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
  const rng = mulberry32(hashTextSeed(`${biome.id}_far`));
  const phaseA = rng() * Math.PI * 2;
  const phaseB = rng() * Math.PI * 2;
  const phaseC = rng() * Math.PI * 2;

  // Back ridge range using periodic Fourier waves so X=0 seamlessly meets X=w
  const farFill = mixRgb(hillRgb, skyBot, 0.45);
  ctx.fillStyle = rgbaCss(farFill, 0.88);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const theta = (x / w) * Math.PI * 2;
    const wave =
      Math.sin(theta * 2 + phaseA) * 28 +
      Math.sin(theta * 5 + phaseB) * 18 +
      Math.cos(theta * 9 + phaseC) * 7;
    const y = Math.round(h * 0.44 + wave);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Sharp Wuxia karst spires (closer ridge) with sunlit ridge rim
  const nearPeakFill = scaleRgb(mixRgb(hillRgb, pillarRgb, 0.35), 0.78);
  const rimCol = mixRgb([255, 244, 214], accent, 0.42);
  ctx.fillStyle = rgbaCss(nearPeakFill, 0.96);
  ctx.beginPath();
  ctx.moveTo(0, h);
  const ridgeYs: number[] = [];
  for (let x = 0; x <= w; x += 4) {
    const theta = (x / w) * Math.PI * 2;
    const spire = Math.abs(Math.sin(theta * 3 + phaseB)) * 38;
    const crag = Math.sin(theta * 7 + phaseA) * 14 + Math.cos(theta * 13 + phaseC) * 6;
    const y = Math.round(h * 0.66 - spire + crag);
    ridgeYs.push(y);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rgbaCss(rimCol, 0.32);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < ridgeYs.length; i += 1) {
    const x = i * 4;
    const y = ridgeYs[i] ?? h * 0.6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Two cliffside silhouette pagodas perched along peaks
  const idxA = Math.floor((136 / w) * (ridgeYs.length - 1));
  const idxB = Math.floor((392 / w) * (ridgeYs.length - 1));
  const winGlow = mixRgb([254, 240, 138], accent, 0.2);
  drawDistantPagoda(ctx, 136, (ridgeYs[idxA] ?? h * 0.55) + 4, nearPeakFill, winGlow);
  drawDistantPagoda(ctx, 392, (ridgeYs[idxB] ?? h * 0.52) + 4, nearPeakFill, winGlow);

  // Horizon ink-wash valley mist
  const mistGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
  mistGrad.addColorStop(0, rgbaCss(skyBot, 0));
  mistGrad.addColorStop(0.65, rgbaCss(mixRgb(skyBot, accent, 0.22), 0.38));
  mistGrad.addColorStop(1, rgbaCss(mixRgb(skyBot, [245, 245, 255], 0.25), 0.64));
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, Math.round(h * 0.58), w, Math.round(h * 0.42));
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

  const timberDark = scaleRgb(pillarRgb, 0.36);
  const timberLit = mixRgb(pillarRgb, [255, 228, 180], 0.28);
  const roofBody = scaleRgb(pillarRgb, 0.54);
  const roofTrim = mixRgb(accent, [251, 191, 36], 0.45);
  const terraceWall = scaleRgb(floorTopRgb, 0.5);
  const terraceRim = mixRgb(floorTopRgb, [255, 245, 220], 0.25);

  // Stone balustrade terrace base
  const wallY = h - 28;
  ctx.fillStyle = rgbaCss(terraceWall, 0.96);
  ctx.fillRect(0, wallY, w, 28);
  ctx.fillStyle = rgbaCss(terraceRim, 0.55);
  ctx.fillRect(0, wallY, w, 2);
  ctx.fillStyle = 'rgba(6, 8, 16, 0.45)';
  for (let bx = 0; bx < w; bx += 64) {
    ctx.fillRect(bx + 12, wallY + 7, 40, 11);
    ctx.fillRect(bx, wallY, 2, 28);
  }

  // Timber columns & stone plinths across 4 evenly wrapping 128px pavilion bays
  const bayWidth = 128;
  for (let bay = 0; bay < 4; bay += 1) {
    const px = bay * bayWidth + 16;
    // Bamboo & foliage vignette in alternating bays
    if (bay % 2 === 0) {
      const bx = px + 68;
      ctx.strokeStyle = rgbaCss(scaleRgb(mixRgb(accent, pillarRgb, 0.5), 0.55), 0.72);
      ctx.lineWidth = 2.5;
      for (let stalk = 0; stalk < 3; stalk += 1) {
        const sx = bx + (stalk - 1) * 11;
        const topX = sx + (stalk - 1) * 6;
        ctx.beginPath();
        ctx.moveTo(sx, wallY);
        ctx.lineTo(topX, 42 + stalk * 10);
        ctx.stroke();
        ctx.fillStyle = rgbaCss(mixRgb(accent, [74, 222, 128], 0.3), 0.45);
        ctx.beginPath();
        ctx.ellipse(topX + 5, 58 + stalk * 9, 8, 2.5, -0.35, 0, Math.PI * 2);
        ctx.ellipse(topX - 6, 72 + stalk * 8, 7, 2.5, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Plinth & lacquered pillar
    ctx.fillStyle = rgbaCss(terraceRim, 0.65);
    ctx.fillRect(px - 3, wallY - 6, 16, 6);
    ctx.fillStyle = rgbaCss(timberDark, 0.96);
    ctx.fillRect(px, 34, 10, wallY - 40);
    // Warm left-side HD-2D rim highlight
    ctx.fillStyle = rgbaCss(timberLit, 0.5);
    ctx.fillRect(px, 34, 2, wallY - 40);

    // Bracket capital (dougong)
    ctx.fillStyle = rgbaCss(roofBody, 0.98);
    ctx.fillRect(px - 7, 30, 24, 6);
  }

  // Sweeping upturned Chinese eaves lintel & ceramic tiled roof band
  ctx.fillStyle = rgbaCss(timberDark, 0.96);
  ctx.fillRect(0, 26, w, 7);
  ctx.fillStyle = rgbaCss(roofBody, 0.98);
  ctx.fillRect(0, 12, w, 15);
  for (let tx = 0; tx < w; tx += 16) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(tx, 12, 2, 15);
    ctx.fillStyle = rgbaCss(roofTrim, 0.45);
    ctx.fillRect(tx + 2, 10, 12, 2);
  }
  ctx.fillStyle = rgbaCss(roofTrim, 0.72);
  ctx.fillRect(0, 25, w, 2);

  // Sweeping roof corner flares at pavilion bays
  for (let bay = 0; bay < 4; bay += 1) {
    const eaveX = bay * bayWidth + 21;
    ctx.fillStyle = rgbaCss(roofBody, 0.98);
    ctx.beginPath();
    ctx.moveTo(eaveX - 24, 26);
    ctx.quadraticCurveTo(eaveX, 18, eaveX + 24, 26);
    ctx.lineTo(eaveX + 18, 30);
    ctx.lineTo(eaveX - 18, 30);
    ctx.closePath();
    ctx.fill();
  }

  // Warm glowing hanging paper lanterns in all 4 bays
  for (let bay = 0; bay < 4; bay += 1) {
    const lx = bay * bayWidth + 68;
    const drop = 16 + (bay % 2) * 6;
    drawGlowingPaperLantern(ctx, lx, 32, drop, accent);
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

  // Carved stone balustrade curb lip at Y=0..14
  const curbHighlight = mixRgb(floorTop, [255, 248, 228], 0.34);
  ctx.fillStyle = rgbaCss(floorTop, 1);
  ctx.fillRect(0, 0, w, 12);
  ctx.fillStyle = rgbaCss(curbHighlight, 0.9);
  ctx.fillRect(0, 0, w, 2.5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let cx = 0; cx < w; cx += 32) {
    ctx.fillRect(cx, 0, 2, 12);
  }

  // Deep promenade gradient receding toward bottom edge
  const walkGrad = ctx.createLinearGradient(0, 12, 0, h);
  walkGrad.addColorStop(0, rgbaCss(mixRgb(floorBody, floorTop, 0.22), 1));
  walkGrad.addColorStop(0.45, rgbaCss(floorBody, 1));
  walkGrad.addColorStop(1, rgbaCss(scaleRgb(floorBody, 0.48), 1));
  ctx.fillStyle = walkGrad;
  ctx.fillRect(0, 12, w, h - 12);

  // Cast shadow right underneath curb lip for 3D diorama separation
  const lipShadow = ctx.createLinearGradient(0, 12, 0, 26);
  lipShadow.addColorStop(0, 'rgba(3, 5, 14, 0.62)');
  lipShadow.addColorStop(1, 'rgba(3, 5, 14, 0)');
  ctx.fillStyle = lipShadow;
  ctx.fillRect(0, 12, w, 14);

  // Perspective-foreshortened stone courses
  const rows = [14, 24, 38, 56, 79, 108, 144, 184, h];
  const stoneWarmEdge = mixRgb(floorTop, [255, 245, 220], 0.22);
  for (let r = 0; r < rows.length - 1; r += 1) {
    const y0 = rows[r] ?? 14;
    const y1 = rows[r + 1] ?? h;
    const rowH = y1 - y0;
    const rowMidFade = 1 - (r / (rows.length - 1)) * 0.45;

    // Horizontal mortar crease & warm top specular highlight
    ctx.fillStyle = 'rgba(4, 6, 14, 0.45)';
    ctx.fillRect(0, y0, w, 1.5);
    ctx.fillStyle = rgbaCss(stoneWarmEdge, 0.2 * rowMidFade);
    ctx.fillRect(0, y0 + 2, w, 1);

    // Alternating staggered vertical joints cleanly wrapping modulo 256
    const offset = r % 2 === 0 ? 0 : 32;
    const segW = 64;
    for (let sx = offset; sx < w; sx += segW) {
      ctx.fillStyle = 'rgba(4, 6, 14, 0.36)';
      ctx.fillRect(sx, y0, 2, rowH);
      ctx.fillStyle = rgbaCss(stoneWarmEdge, 0.1 * rowMidFade);
      ctx.fillRect((sx + 2) % w, y0 + 2, 1, Math.max(2, rowH - 3));
    }
  }

  // Reflected warm lantern light pools on wet/ancient stone terrace
  for (const poolX of [64, 192]) {
    const pool = ctx.createRadialGradient(poolX, 46, 4, poolX, 46, 56);
    pool.addColorStop(0, 'rgba(255, 212, 128, 0.16)');
    pool.addColorStop(0.5, rgbaCss(accent, 0.08));
    pool.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(poolX, 46, 56, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

type EnemyEntity = {
  id: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
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
  private weaponAngle: number = 0;
  private weaponSwingOffsetX: number = 0;
  private weaponSwingOffsetY: number = 0;
  private weaponTween: Phaser.Tweens.Tween | null = null;
  private heroAura: Phaser.GameObjects.Arc | null = null;
  private heroSutraAuraGfx: Phaser.GameObjects.Graphics | null = null;
  private heroGlow: Phaser.GameObjects.Arc | null = null;
  private hawkSprite: Phaser.GameObjects.Image | null = null;
  private wolfSprite: Phaser.GameObjects.Image | null = null;
  private runeBooks: Phaser.GameObjects.Image[] = [];

  private runConfig: RunStartPayload | null = null;
  private activeBiome: BiomeDefinition = getBiomeById('slime_bog');
  private rng: () => number = mulberry32(1);

  private phase: 'idle' | 'walking' | 'combat' | 'paused' = 'idle';
  private floor: number = 1;
  private waveIndex: number = 1;
  private totalWavesOnFloor: number = 2;
  private walkTimer: number = 0;
  private elapsedRunMs: number = 0;
  private speedMult: 1 | 2 = 1;
  private autoSkill: boolean = true;

  private stats: ComputedHeroStats | null = null;
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
  private loots: LootDropEntity[] = [];
  private hazards: HazardEntity[] = [];
  private hudSyncTimer: number = 0;
  private ultimateGauge: number = 0;
  private ultimateStocks: number = 0;
  private readonly maxUltimateStocks: number = 3;
  private nonCritTextCooldown: number = 0;

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
        if (event.code === 'Space') {
          const flawed = this.getFlawedEnemy();
          if (flawed && this.triggerMeridianShatter(flawed)) {
            this.emitHud();
            return;
          }
        }
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
      grad.addColorStop(0, 'rgba(3, 5, 14, 0.72)');
      grad.addColorStop(0.55, 'rgba(5, 8, 20, 0.36)');
      grad.addColorStop(1, 'rgba(5, 8, 20, 0)');
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
      topBlur.addColorStop(0, 'rgba(4, 6, 16, 0.52)');
      topBlur.addColorStop(1, 'rgba(4, 6, 16, 0)');
      ctx.fillStyle = topBlur;
      ctx.fillRect(0, 0, w, h * 0.16);

      const botBlur = ctx.createLinearGradient(0, h * 0.85, 0, h);
      botBlur.addColorStop(0, 'rgba(3, 5, 12, 0)');
      botBlur.addColorStop(1, 'rgba(3, 5, 12, 0.58)');
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
      cornerGrad.addColorStop(0, 'rgba(4, 6, 14, 0)');
      cornerGrad.addColorStop(0.68, 'rgba(4, 6, 14, 0.16)');
      cornerGrad.addColorStop(1, 'rgba(2, 4, 12, 0.54)');
      ctx.fillStyle = cornerGrad;
      ctx.fillRect(0, 0, w, h);
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
    const groundY = this.groundY || Math.round(h * 0.68);
    const floorH = Math.max(140, h - groundY);

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

  private createHeroDisplay(classId: ClassId, level: number): void {
    this.heroShadow?.destroy();
    this.heroAura?.destroy();
    this.heroSutraAuraGfx?.destroy();
    this.heroGlow?.destroy();
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

    const equipped = this.runConfig?.profile.classes[classId].equipped ?? {
      weapon: null,
      headgear: null,
      top: null,
      cape: null,
    };
    const gearStyle = getGearVisualStyle(classId, equipped);
    const clsColor = getClassDefinition(classId).colorInt;

    this.heroAura = this.add
      .circle(this.heroX, this.groundY - 28, 36, clsColor, level >= 60 ? 0.28 : level >= 35 ? 0.16 : 0.08)
      .setDepth(4);

    this.heroSutraAuraGfx = this.add.graphics().setDepth(4.3);

    this.heroShadow = this.add
      .image(this.heroX, this.groundY - 4, 'hd2d_shadow')
      .setScale(0.95, 0.85)
      .setDepth(4.1);

    this.heroGlow = this.add
      .circle(
        this.heroX + 16,
        this.groundY - 26,
        17,
        gearStyle.weaponGlowTint ?? 0xfef08a,
        gearStyle.weaponGlowTint ? 0.42 : level >= 15 ? 0.28 : 0.12
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4.5);

    this.heroCapeSprite = this.add
      .image(this.heroX, this.groundY - 28, 'gear_cape')
      .setTint(gearStyle.capeTint)
      .setVisible(gearStyle.hasCape)
      .setDepth(5);

    this.heroSprite = this.add
      .image(this.heroX, this.groundY - 28, `hero_${classId}`)
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
    this.groundY = Math.round(height * 0.68);
    this.heroX = Math.max(90, Math.round(width * 0.18));
    const floorH = Math.max(140, height - this.groundY);

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
      const ey = this.groundY - (e.isBoss && !e.isMiniBoss ? 44 : e.isBoss ? 34 : 24);
      e.sprite.y = ey;
      e.sprite.x = Math.max(this.heroX + 74, Math.min(width - 55, e.sprite.x));
      e.shadow.setPosition(e.sprite.x, this.groundY - 4);
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
      e.flawRing?.destroy();
      e.flawText?.destroy();
    }
    this.enemies = [];

    for (const p of this.projectiles) {
      p.sprite.destroy();
      p.auraSprite?.destroy();
    }
    this.projectiles = [];

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
    this.clearCombatEntities();
  }

  public startRun(payload: RunStartPayload): void {
    this.clearCombatEntities();
    this.runConfig = payload;
    this.rng = mulberry32(payload.seed);
    this.applyBiomeVisuals(getBiomeById(payload.biomeId));

    const clsLevel = payload.profile.classes[payload.classId].level;
    this.createHeroDisplay(payload.classId, clsLevel);

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
    this.stats = computeHeroCombatStats(
      this.runConfig.profile,
      this.runConfig.classId,
      this.draftedBuffIds,
      this.goldCollected,
      this.floorsCleared
    );
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
    this.walkTimer = 0.9;
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 140, `FLOOR ${floorNum}`, '#fde047', 26);
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
    this.spawnFloatingText(this.scale.width / 2, this.groundY - 150, label, '#f97316', 22);
    soundFX.playBossRoar();
    this.emitHud();
  }

  private spawnWave(): void {
    const w = this.scale.width || 1024;
    const hpMult = computeEnemySpawnHpMult(this.draftedBuffIds);
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
            : 11.57 * Math.pow(1.06, this.floor - 30);
    const realmAtkMult =
      this.floor <= 10
        ? 1 + (this.floor - 1) * 0.04
        : this.floor <= 20
          ? 1.36 + (this.floor - 10) * 0.08
          : this.floor <= 30
            ? 2.16 + (this.floor - 20) * 0.12
            : 3.36 * Math.pow(1.035, this.floor - 30);

    if (isCultLeader || isMiniBoss) {
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
      const isElite =
        (isEliteFloor && i === mobCount - 1) ||
        (this.floor >= 3 && (this.rng() < eliteChance || (isFinalWave && i === 0 && this.floor >= 5)));
      const maxHp = Math.round(
        (46 + this.floor * 28 + this.waveIndex * 14) *
          realmHpMult *
          (isElite ? 2.15 : 1) *
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

      const hpBg = this.add.rectangle(x, y - 42, 46, 6, 0x0f172a).setDepth(8);
      const hpFill = this.add.rectangle(x, y - 42, 46, 6, isElite ? 0xa855f7 : 0xef4444).setDepth(9);
      const nameText = this.add
        .text(x, y - 54, isElite ? `Elite ${mobName}` : mobName, {
          fontSize: '10px',
          color: isElite ? '#e9d5ff' : '#cbd5e1',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setVisible(isElite)
        .setDepth(9);

      this.enemies.push({
        id: this.nextEnemyId++,
        sprite,
        shadow,
        hpBg,
        hpFill,
        nameText,
        name: mobName,
        isBoss: false,
        isMiniBoss: isElite,
        isSplitClone: false,
        hp: maxHp,
        maxHp,
        hitShield: isElite && this.floor >= 11 ? Math.min(6, 1 + bracket) : 0,
        atk,
        atkIntervalSec: Math.max(0.78, (isElite ? 1.28 : 1.52) - this.floor * 0.018),
        atkTimer: 0.5 + this.rng() * 0.6,
        speed: (36 + Math.min(48, this.floor * 1.5)) * (isElite ? 1.18 : 1),
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
    const hpBg = this.add.rectangle(x, y - barOffset, 96, 8, 0x0f172a).setDepth(8);
    const hpFill = this.add.rectangle(x, y - barOffset, 96, 8, 0xf97316).setDepth(9);
    const nameText = this.add
      .text(x, y - barOffset - 14, name, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.enemies.push({
      id: this.nextEnemyId++,
      sprite,
      shadow,
      hpBg,
      hpFill,
      nameText,
      name,
      isBoss: true,
      isMiniBoss: !isEndBoss,
      isSplitClone,
      hp: maxHp,
      maxHp,
      hitShield: 0,
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
    });
  }

  override update(_time: number, deltaMs: number): void {
    if (this.phase === 'idle' || this.phase === 'paused') return;

    const dt = Math.min(0.05, (deltaMs / 1000) * this.speedMult);
    this.elapsedRunMs += deltaMs * this.speedMult;
    this.updateAmbientMotes(dt);

    if (this.phase === 'walking') {
      this.walkTimer -= dt;
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
      if (this.heroAura) this.heroAura.setPosition(hx, hy);
      if (this.heroSutraAuraGfx) {
        this.heroSutraAuraGfx.clear();
        const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
        if (loadout.innerQis.length > 0) {
          const t = this.elapsedRunMs * 0.003;
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
          const totalLevels = loadout.innerQis.reduce((sum, s) => sum + s.level, 0);
          const primarySutra = getWuxiaInnerQiById(loadout.innerQis[0]?.id ?? '');
          const baseColor = primarySutra?.colorHex ?? 0x38bdf8;
          const ringRadiusX = 36 + Math.min(18, totalLevels * 1.4) + pulse * 4;
          const ringRadiusY = 12 + Math.min(6, totalLevels * 0.5) + pulse * 1.5;

          // Ground Passive Skill lotus/aura ring
          this.heroSutraAuraGfx.lineStyle(2, baseColor, 0.55 + pulse * 0.35);
          this.heroSutraAuraGfx.strokeEllipse(hx, this.groundY - 4, ringRadiusX * 2, ringRadiusY * 2);
          this.heroSutraAuraGfx.fillStyle(baseColor, 0.1 + pulse * 0.08);
          this.heroSutraAuraGfx.fillEllipse(hx, this.groundY - 4, ringRadiusX * 1.8, ringRadiusY * 1.8);

          // Vertical spirit halo around the hero body
          const haloRadius = 34 + Math.min(14, loadout.innerQis.length * 3) + pulse * 3.5;
          this.heroSutraAuraGfx.lineStyle(2, baseColor, 0.38 + pulse * 0.25);
          this.heroSutraAuraGfx.strokeCircle(hx, hy - 2, haloRadius);

          // Awakened Secret Synergy outer golden resonance ring
          if (loadout.awakenedSynergies.length > 0) {
            this.heroSutraAuraGfx.lineStyle(2, 0xfbbf24, 0.5 + pulse * 0.35);
            this.heroSutraAuraGfx.strokeCircle(hx, hy - 2, haloRadius + 6);
          }

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
      if (this.heroGlow) {
        this.heroGlow.setPosition(
          hx + 16 + this.weaponSwingOffsetX,
          hy - 2 + this.weaponSwingOffsetY
        );
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
                this.damageEnemy(e, pillarDmg, true, 'TRIBULATION');
                if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.45);
              }
            }
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
          this.damageEnemy(e, dmg, false, 'METEOR');
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
          this.damageEnemy(e, dmg, false, 'PULSE');
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
      const effectiveSpeed = this.stats.attackSpeed * (1 + glassBonus + momentumBonus);
      this.attackTimer += dt;
      const interval = 1 / Math.max(0.3, effectiveSpeed);

      if (this.attackTimer >= interval) {
        this.attackTimer = 0;
        this.performHeroAttack(frontEnemy);
      }
    }

    // Wave clear check
    if (this.enemies.length === 0 && this.phase === 'combat') {
      this.onWaveCleared();
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
        this.spawnSlashVfx(this.heroX + 48, this.groundY - 28, 0xfef08a, 1.2 * scaleMult);
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
            : 'warrior';
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

      const isCrit = forceCrit || this.rng() < this.stats.critRate;
      let raw = this.stats.atk * dmgMult * (this.stats.allDamageMult + missingAtkBonus);
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
      soundFX.playArrow();
    } else if (stanceStyle === 'iron_cleave' || (stanceStyle === null && hasRelicWep)) {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_iron_sword_tomb'
          : primaryLevel >= 3
            ? 'fx_iron_colossus_blade'
            : 'proj_wave';
      soundFX.playSwing();
    } else if (stanceStyle === 'flute_sonic') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_flute_tidal_dragon'
          : primaryLevel >= 3
            ? 'fx_flute_phoenix_chord'
            : 'fx_flute_wave';
      soundFX.playSpell();
    } else if (stanceStyle === 'venom_needles') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_ice_blizzard_lotus'
          : primaryLevel >= 3
            ? 'fx_ice_crystal_spear'
            : 'fx_ice_needle';
      soundFX.playSwing();
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
      soundFX.playCrit();
    } else if (stanceStyle === 'flicking_finger') {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_finger_supernova'
          : primaryLevel >= 3
            ? 'fx_finger_solar_orb'
            : 'proj_arrow';
      soundFX.playSpell();
    } else {
      projTexture =
        primaryHasSyn || primaryLevel >= 4
          ? 'fx_dragon_sovereign'
          : primaryLevel >= 3
            ? 'fx_dragon_palm'
            : 'proj_palm_qi';
      soundFX.playSwing();
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
      this.spawnFloatingText(target.sprite.x, target.sprite.y - 45, 'VOID PULL!', '#c084fc', 14);
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
    auraRotationSpeed: number = 2.5
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

      let destroyed = p.life <= 0 || p.sprite.x > (this.scale.width || 1024) + 60;
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
                  this.damageEnemy(near, Math.round(p.damage * 0.45), false, p.labelTag);
                }
              }
            }
            this.damageEnemy(e, p.damage, p.isCrit, p.labelTag);
            if (p.isChainProc) {
              p.isChainProc = false;
              this.triggerStaticDischarge(e);
            }
            if (p.dropFalconLoot) {
              p.dropFalconLoot = false;
              this.spawnLootDrop(e.sprite.x, e.sprite.y, this.rng() < 0.6 ? 'coin' : 'orb', 14);
            }
            if (!e.mutations.includes('juggernaut') && e.hp > 0) {
              const push = (this.stats?.knockbackPower ?? 16) * 0.45;
              e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + push);
            }
            if (p.applyRoot) e.rootTimer = Math.max(e.rootTimer, this.isEquippedLegendaryCursed('bow_wep_worldtree') ? 1 : 2);
            if (p.applyChill) e.chillTimer = Math.max(e.chillTimer, 3);
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
    labelTag: string | null = null
  ): void {
    if (!this.stats || !this.runConfig) return;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
      return;
    }

    // Smoke Bomb dodge check
    if (enemy.smokeActiveTimer > 0 && this.rng() < 0.5) {
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 36, 'DODGE!', '#cbd5e1', 12);
      return;
    }

    const duguStacks =
      computeWuxiaLoadout(this.draftedBuffIds, this.floor).enlightenmentCounts[
        'enlighten_sword_intent'
      ] ?? 0;

    // Permafrost Armor hit-shield check
    if (enemy.hitShield > 0 && labelTag !== 'SHATTER') {
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
        callout.size
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
            this.spawnFloatingText(other.sprite.x, other.sprite.y - 26, `ZAP! ${skyDmg}`, '#38bdf8', 13);
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
        '#cbd5e1',
        12
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
          this.spawnFloatingText(other.sprite.x, other.sprite.y - 26, `ARC ${arcDmg}`, '#60a5fa', 12);
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
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 60, 'MITOSIS SPLIT!', '#6ee7b7', 16);
    }

    // Execution check
    const execThreshold = this.draftedBuffIds.includes('gold_executioners_verdict')
      ? 0.18
      : this.hasEquippedLegendary('thief_cape_crimsonmoon')
        ? this.isEquippedLegendaryCursed('thief_cape_crimsonmoon')
          ? 0.1
          : 0.2
        : 0;
    if (!enemy.isBoss && execThreshold > 0 && enemy.hp > 0 && enemy.hp / enemy.maxHp <= execThreshold) {
      enemy.hp = 0;
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 40, 'EXECUTE!', '#ef4444', 15);
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
    enemy.flawRing?.destroy();
    enemy.flawRing = null;
    enemy.flawText?.destroy();
    enemy.flawText = null;
    this.enemies.splice(idx, 1);

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

    // Boss biome shared mechanics
    if (e.isBoss && e.mechanic) {
      if (e.mechanic === 'permafrost_armor') {
        e.permafrostTimer -= dt;
        if (e.permafrostTimer <= 0) {
          e.permafrostTimer = 10;
          e.hitShield = e.isMiniBoss ? 8 : 14;
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 60, 'PERMAFROST ARMOR!', '#67e8f9', 14);
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
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 55, 'SMOKE BOMB!', '#c084fc', 14);
        }
      } else if (e.mechanic === 'enrage_timer') {
        e.enrageTimer -= dt;
        if (e.enrageTimer <= 0) {
          e.enrageTimer = 5;
          e.enrageStacks = Math.min(6, e.enrageStacks + 1);
          this.spawnFloatingText(e.sprite.x, e.sprite.y - 55, `ENRAGE x${e.enrageStacks}`, '#ef4444', 13);
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

    // Movement & Attack
    if (this.draftedBuffIds.includes('silver_frostbite_aura') && e.sprite.x - this.heroX <= 165) {
      e.chillTimer = Math.max(e.chillTimer, 0.25);
    }
    const baseY = this.groundY - (e.isBoss && !e.isMiniBoss ? 52 : e.isBoss ? 40 : 24);
    const meleeDist = this.heroX + 74;
    if (e.stunTimer <= 0 && e.rootTimer <= 0 && e.sprite.x > meleeDist) {
      const slow = e.chillTimer > 0 ? 0.75 : 1;
      const approachBoost = e.sprite.x > this.heroX + 215 ? 1.55 : 1;
      e.sprite.x = Math.max(meleeDist, e.sprite.x - e.speed * approachBoost * slow * dt);
      e.sprite.y = baseY - Math.abs(Math.sin(this.elapsedRunMs * 0.01 + e.id)) * 3.5;
      e.sprite.setAngle(Math.sin(this.elapsedRunMs * 0.009 + e.id) * 3.2);
    } else if (!this.tweens.isTweening(e.sprite)) {
      e.sprite.y = baseY;
      e.sprite.setAngle(0);
    }

    if (e.stunTimer <= 0 && (e.sprite.x <= meleeDist + 16 || (e.isBoss && heroInRange))) {
      const enrageSpeed = 1 + e.enrageStacks * 0.15;
      const chillSlow = e.chillTimer > 0 ? 0.8 : 1;
      e.atkTimer -= dt * enrageSpeed * chillSlow;
      if (e.atkTimer <= 0) {
        e.atkTimer = e.atkIntervalSec;
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

    // Sync HP bar positions
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    const barOffset = e.isBoss && !e.isMiniBoss ? 68 : e.isBoss ? 56 : 42;
    const barY = e.sprite.y - barOffset;
    e.shadow.setPosition(e.sprite.x, this.groundY - 4);
    e.hpBg.setPosition(e.sprite.x, barY);
    e.hpFill.setPosition(e.sprite.x, barY);
    const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    e.hpFill.width = (e.isBoss ? 96 : 46) * ratio;
    e.nameText.setPosition(e.sprite.x, barY - 14);

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
        e.flawTimer = 2.6;
        e.flawRing = this.add
          .circle(e.sprite.x, e.sprite.y, e.isBoss ? 34 : 24, 0xfef08a, 0.14)
          .setStrokeStyle(3, 0xef4444)
          .setDepth(11);
        e.flawText = this.add
          .text(e.sprite.x, barY - 30, 'FLAW! [Q / CLICK]', {
            fontFamily: 'monospace',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#7f1d1d',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(12);
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

    soundFX.playBossRoar();
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
    this.damageEnemy(target, shatterDmg, true, 'SHATTER');
    return true;
  }

  private damageHero(rawAtk: number, attacker: EnemyEntity | null): void {
    if (!this.stats || this.phase !== 'combat') return;

    if (this.invulnHitsLeft > 0) {
      this.invulnHitsLeft -= 1;
      this.spawnFloatingText(this.heroX, this.groundY - 72, 'NEGATED!', '#93c5fd', 14);
      return;
    }

    if (this.rng() < this.stats.dodgeRate) {
      this.dodgeCount += 1;
      this.spawnFloatingText(this.heroX, this.groundY - 72, 'DODGE!', '#a7f3d0', 14);
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
      this.spawnFloatingText(this.heroX, this.groundY - 68, `-${dmg}`, '#f87171', 15);
    }

    if (this.heroHp <= 0) {
      if (this.hasEquippedLegendary('mage_top_phoenix') && !this.phoenixReviveUsed) {
        this.phoenixReviveUsed = true;
        const pct = this.isEquippedLegendaryCursed('mage_top_phoenix') ? 0.25 : 0.5;
        this.heroHp = Math.round(this.stats.maxHp * pct);
        this.spawnFloatingText(this.heroX, this.groundY - 96, 'PHOENIX REBIRTH!', '#fb923c', 18);
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
      this.spawnFloatingText(this.heroX, this.groundY - 76, `+${actual}`, '#4ade80', 13);
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
    const count =
      tier === 'transcendent'
        ? Math.max(1, Math.min(4, rawCount))
        : tier === 'grandmaster'
          ? Math.max(1, Math.min(3, rawCount))
          : tier === 'ultimate'
            ? Math.max(1, Math.min(2, rawCount))
            : rawCount;
    const hitCrit = syn !== null || isBurst || this.rng() < this.stats.critRate;
    const dmg = Math.max(
      1,
      Math.round(this.stats.atk * powerMult * (hitCrit ? this.stats.critDmg : 1))
    );
    const target = this.getClosestEnemy() ?? this.enemies[0];
    if (!target) return;

    this.syncHeroWuxiaWeapon(art.style);

    if (art.style === 'palm_wave') {
      if (tier !== 'base') {
        soundFX.playBossRoar();
        this.cameras.main.shake(135, tier === 'transcendent' ? 0.014 : tier === 'grandmaster' ? 0.009 : 0.005);
      } else {
        soundFX.playSwing();
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
        if (Math.abs(e.sprite.x - this.heroX) <= 185 && !e.mutations.includes('juggernaut') && e.hp > 0) {
          e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + 28);
        }
      }
    } else if (art.style === 'jade_swords') {
      soundFX.playCrit();
      this.playHeroAttackAnimation('thief', tier === 'grandmaster' ? 1.45 : tier === 'ultimate' ? 1.25 : 1.05);
      const isTaiji = art.id === 'art_taiji_sword';
      const swordVfxColor = isTaiji
        ? 0x67e8f9
        : tier === 'grandmaster'
          ? 0x38bdf8
          : 0xf472b6;
      this.spawnHeroAfterimage(swordVfxColor);
      this.spawnSlashVfx(
        this.heroX + 38,
        this.groundY - 32,
        swordVfxColor,
        tier === 'grandmaster' ? 1.75 : tier === 'ultimate' ? 1.4 : 1.1
      );
      if (tier !== 'base') {
        this.spawnQiShockwaveRing(
          this.heroX + 22,
          this.groundY - 30,
          swordVfxColor,
          tier === 'grandmaster' ? 165 : 115,
          240
        );
        const swordText = isTaiji
          ? syn
            ? 'TAIJI SUPREME VOID!'
            : tier === 'grandmaster'
              ? 'TAIJI SWORD SPHERE!'
              : 'TAIJI YIN-YANG SWORD!'
          : syn
            ? 'CONDOR SWORD ARRAY!'
            : tier === 'grandmaster'
              ? 'GRANDMASTER CONDOR ARRAY!'
              : 'TWIN JADE LOTUS!';
        const swordColor = isTaiji ? '#67e8f9' : '#7dd3fc';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          swordText,
          swordColor,
          tier === 'grandmaster' ? 16 : 14
        );
      }
      const tex = isTaiji
        ? (tier === 'grandmaster' ? 'fx_taiji_seal' : 'proj_sword_taiji')
        : (tier === 'grandmaster'
          ? 'fx_jade_condor_array'
          : tier === 'ultimate'
            ? 'fx_jade_twin_lotus'
            : 'proj_sword_jade');
      const aura = tier !== 'base' ? (isTaiji ? 'fx_ascended_halo_bagua' : 'fx_ascended_halo_lotus') : null;
      const auraScale = tier === 'grandmaster' ? 1.55 : 1.35;
      const auraSpin = isTaiji ? -2.6 : 2.4;
      const scale = tier === 'grandmaster' ? 1.9 : tier === 'ultimate' ? 1.5 : 1.15;
      const vx = tier === 'grandmaster' ? 700 : 640;
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
          tier === 'grandmaster' ? 5 : tier === 'ultimate' ? 3 : 1,
          false,
          false,
          tier !== 'base',
          aimEnemy.id,
          false,
          false,
          tier === 'grandmaster' ? 'CONDOR' : tier === 'ultimate' ? 'LOTUS' : 'JADE',
          null,
          scale,
          tier === 'base' ? null : tier === 'grandmaster' ? 0x38bdf8 : 0xf472b6,
          tier === 'grandmaster' ? 120 : tier === 'ultimate' ? 75 : 0,
          0x38bdf8,
          aura,
          auraScale,
          auraSpin
        );
      }
    } else if (art.style === 'staff_spin') {
      soundFX.playSwing();
      this.playHeroAttackAnimation('warrior', tier === 'grandmaster' ? 1.55 : tier === 'ultimate' ? 1.3 : 1.1);
      const radius = tier === 'grandmaster' ? 345 : tier === 'ultimate' ? 265 : 165 + level * 25;
      const staffTex =
        tier === 'grandmaster'
          ? 'fx_staff_bagua_domain'
          : tier === 'ultimate'
            ? 'fx_staff_dragon_vortex'
            : 'proj_vortex_staff';
      const staffAura = tier !== 'base' ? 'fx_ascended_halo_bagua' : null;
      const staffColor = tier === 'grandmaster' ? 0xfde047 : tier === 'ultimate' ? 0x6ee7b7 : 0x10b981;
      this.spawnHeroAfterimage(staffColor);
      this.spawnWhirlingStaffVfx(
        this.heroX + 20,
        this.groundY - 28,
        radius,
        staffColor,
        staffTex,
        tier === 'grandmaster' ? 1.45 : tier === 'ultimate' ? 1.2 : 1
      );
      this.spawnSlashVfx(
        this.heroX + 24,
        this.groundY - 28,
        staffColor,
        tier === 'grandmaster' ? 1.9 : tier === 'ultimate' ? 1.45 : 1.15
      );
      if (tier !== 'base') {
        this.cameras.main.shake(105, tier === 'grandmaster' ? 0.007 : 0.004);
        this.spawnFloatingText(
          this.heroX + 32,
          this.groundY - 98,
          syn ? 'HEAVEN UNDER STAFF!' : tier === 'grandmaster' ? 'BAGUA STAFF DOMAIN!' : 'DRAGON CYCLONE!',
          '#6ee7b7',
          tier === 'grandmaster' ? 16 : 14
        );
        // Launch evolved whirling staff cyclones down the lane
        this.spawnProjectile(
          staffTex,
          this.heroX + 30,
          this.groundY - 30,
          tier === 'grandmaster' ? 540 : 480,
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
          tier === 'grandmaster' ? 'BAGUA' : 'VORTEX',
          null,
          tier === 'grandmaster' ? 1.65 : 1.35,
          staffColor,
          tier === 'grandmaster' ? 115 : 70,
          staffColor,
          staffAura,
          1.5,
          3.2
        );
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.sprite.x - this.heroX) <= radius) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, staffColor);
          this.damageEnemy(e, dmg, hitCrit, tier === 'grandmaster' ? 'BAGUA' : 'STAFF');
          if (e.hp > 0) {
            e.chillTimer = Math.max(e.chillTimer, 1.5);
            if (tier !== 'base' || level >= 2) e.stunTimer = Math.max(e.stunTimer, tier === 'grandmaster' ? 0.85 : 0.4);
          }
        }
      }
    } else if (art.style === 'iron_cleave') {
      soundFX.playBossRoar();
      this.playHeroAttackAnimation('warrior', tier === 'grandmaster' ? 1.6 : tier === 'ultimate' ? 1.35 : 1.15);
      const strikeX = target.sprite.x;
      const isDragonSaber = art.id === 'art_dragon_saber';
      const isToad = art.id === 'art_toad_stance';
      const bladeTex = isToad
        ? 'proj_palm_toad'
        : isDragonSaber
          ? (tier === 'grandmaster' ? 'fx_dragon_sovereign' : 'proj_blade_dragon_saber')
          : (tier === 'grandmaster'
            ? 'fx_iron_sword_tomb'
            : tier === 'ultimate'
              ? 'fx_iron_colossus_blade'
              : 'proj_blade_iron');
      const cleaveAura = tier !== 'base'
        ? (isToad ? 'fx_ascended_halo_venom' : isDragonSaber ? 'fx_ascended_halo_dragon' : 'fx_ascended_halo_bagua')
        : null;
      const cleaveAuraSpin = isToad ? -3.0 : 2.5;
      const bladeTint = isToad
        ? tier === 'grandmaster'
          ? 0x4ade80
          : tier === 'ultimate'
            ? 0x22c55e
            : 0x16a34a
        : isDragonSaber
          ? tier === 'grandmaster'
            ? 0xf59e0b
            : tier === 'ultimate'
              ? 0xfbbf24
              : 0xd97706
          : tier === 'grandmaster'
            ? 0xf43f5e
            : tier === 'ultimate'
              ? 0xe879f9
              : 0xa855f7;
      this.spawnFallingGreatswordVfx(
        strikeX,
        target.sprite.y,
        bladeTint,
        tier === 'grandmaster',
        bladeTex,
        tier === 'grandmaster' ? 1.45 : tier === 'ultimate' ? 1.25 : 1
      );
      if (tier === 'grandmaster') {
        this.spawnFallingGreatswordVfx(
          strikeX - 75,
          target.sprite.y,
          0xc084fc,
          true,
          'fx_iron_colossus_blade',
          1.15
        );
        this.spawnFallingGreatswordVfx(
          strikeX + 75,
          target.sprite.y,
          0xfde047,
          true,
          'fx_iron_colossus_blade',
          1.15
        );
      }
      this.spawnSlashVfx(
        strikeX,
        target.sprite.y,
        bladeTint,
        tier === 'grandmaster' ? 2.1 : tier === 'ultimate' ? 1.6 : 1.25
      );
      if (tier !== 'base') {
        const cleaveText = isToad
          ? syn
            ? 'REVERSED NINE-YIN TOAD!'
            : tier === 'grandmaster'
              ? 'MOUNT HUA TOAD LEAP!'
              : 'WESTERN TOAD STANCE!'
          : isDragonSaber
            ? syn
              ? 'HEAVENLY DRAGON DOMINION!'
              : tier === 'grandmaster'
                ? 'DRAGON SABER CATACLYSM!'
                : 'PRECIOUS DRAGON SABER!'
            : syn || tier === 'grandmaster'
              ? 'SWORD TOMB CATACLYSM!'
              : 'COLOSSUS CLEAVE!';
        const cleaveColor = isToad ? '#4ade80' : isDragonSaber ? '#fbbf24' : '#e879f9';
        this.spawnFloatingText(
          strikeX,
          target.sprite.y - 58,
          cleaveText,
          cleaveColor,
          tier === 'grandmaster' ? 17 : 15
        );
      }
      for (const e of [...this.enemies]) {
        if (e.hp <= 0) continue;
        if (Math.abs(e.sprite.x - strikeX) <= (tier === 'grandmaster' ? 210 : tier === 'ultimate' ? 165 : 130)) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, hitCrit, bladeTint);
          this.damageEnemy(e, dmg, hitCrit, tier === 'grandmaster' ? 'CATACLYSM' : 'IRON');
          if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, tier === 'grandmaster' ? 1.15 : 0.7);
        }
      }
      if (tier !== 'base') {
        this.spawnProjectile(
          bladeTex,
          this.heroX + 24,
          this.groundY - 40,
          tier === 'grandmaster' ? 580 : 510,
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
          tier === 'grandmaster' ? 'TOMB' : 'CLEAVE',
          null,
          tier === 'grandmaster' ? 1.85 : 1.45,
          bladeTint,
          tier === 'grandmaster' ? 135 : 85,
          bladeTint,
          cleaveAura,
          1.5,
          cleaveAuraSpin
        );
      }
    } else if (art.style === 'flute_sonic') {
      soundFX.playSpell();
      this.playHeroAttackAnimation('mage', tier === 'grandmaster' ? 1.4 : 1.15);
      const isGreatShift = art.id === 'art_great_shift';
      const fluteColor = isGreatShift
        ? tier === 'grandmaster'
          ? 0xfef08a
          : 0xfbbf24
        : tier === 'grandmaster'
          ? 0x2dd4bf
          : tier === 'ultimate'
            ? 0xf472b6
            : 0x2dd4bf;
      this.spawnQiShockwaveRing(
        this.heroX + 18,
        this.groundY - 30,
        fluteColor,
        tier === 'grandmaster' ? 185 : tier === 'ultimate' ? 135 : 95,
        250
      );
      if (tier !== 'base') {
        const sonicText = isGreatShift
          ? syn
            ? 'BRIGHT SUMMIT QIANKUN!'
            : tier === 'grandmaster'
              ? 'SEVENTH-LEVEL QIANKUN!'
              : 'GREAT SHIFT OF HEAVEN AND EARTH!'
          : syn
            ? 'AZURE SYMPHONY!'
            : tier === 'grandmaster'
              ? 'TIDAL DRAGON CHORD!'
              : 'PHOENIX FLUTE CREST!';
        const sonicTextColor = isGreatShift ? '#fef08a' : '#5eead4';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 96,
          sonicText,
          sonicTextColor,
          tier === 'grandmaster' ? 16 : 14
        );
      }
      const tex = isGreatShift
        ? (tier === 'grandmaster' ? 'fx_taiji_seal' : 'proj_vortex_qiankun')
        : (tier === 'grandmaster'
          ? 'fx_flute_tidal_dragon'
          : tier === 'ultimate'
            ? 'fx_flute_phoenix_chord'
            : 'proj_wave_flute');
      const sonicAura = tier !== 'base'
        ? (isGreatShift ? 'fx_ascended_halo_dragon' : 'fx_ascended_halo_lotus')
        : null;
      const sonicAuraSpin = isGreatShift ? -3.5 : 2.2;
      const scale = tier === 'grandmaster' ? 1.95 : tier === 'ultimate' ? 1.5 : 1.15;
      const vx = tier === 'grandmaster' ? 610 : 550;
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
          tier === 'grandmaster' ? 99 : tier === 'ultimate' ? 5 : 2 + level,
          false,
          false,
          true,
          aimEnemy.id,
          false,
          false,
          tier === 'grandmaster' ? 'SYMPHONY' : tier === 'ultimate' ? 'PHOENIX' : 'NOTE',
          null,
          scale,
          tier === 'base' ? null : fluteColor,
          tier === 'grandmaster' ? 130 : tier === 'ultimate' ? 85 : 0,
          fluteColor,
          sonicAura,
          1.45,
          sonicAuraSpin
        );
      }
    } else if (art.style === 'six_pulse') {
      soundFX.playCrit();
      this.playHeroAttackAnimation('bowman', tier === 'grandmaster' ? 1.5 : 1.2);
      const isShiftingStars = art.id === 'art_shifting_stars';
      const pulseColor = isShiftingStars
        ? tier === 'grandmaster'
          ? 0xc7d2fe
          : 0x818cf8
        : tier === 'grandmaster'
          ? 0xfde047
          : 0x38bdf8;
      this.spawnHeroAfterimage(pulseColor);
      this.spawnQiShockwaveRing(
        this.heroX + 26,
        this.groundY - 30,
        pulseColor,
        tier === 'grandmaster' ? 185 : tier === 'ultimate' ? 130 : 90,
        240
      );
      if (tier !== 'base') {
        const pulseText = isShiftingStars
          ? syn
            ? 'CELESTIAL RIPPLE RETURN!'
            : tier === 'grandmaster'
              ? 'STELLAR STAR SHIFT!'
              : 'SHIFTING STARS!'
          : syn
            ? 'HEAVEN-PIERCING SIX PULSE!'
            : tier === 'grandmaster'
              ? 'SOVEREIGN MERIDIAN BEAM!'
              : 'SIX-PULSE DRAGON LANCE!';
        const pulseTextColor = isShiftingStars ? '#a5b4fc' : '#38bdf8';
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          pulseText,
          pulseTextColor,
          tier === 'grandmaster' ? 16 : 14
        );
      }
      const tex = isShiftingStars
        ? (tier === 'grandmaster' ? 'fx_taiji_seal' : 'proj_vortex_shifting_stars')
        : (tier === 'grandmaster'
          ? 'fx_six_pulse_sovereign'
          : tier === 'ultimate'
            ? 'fx_six_pulse_lance'
            : 'proj_lance_six_pulse');
      const pulseAura = tier !== 'base'
        ? (isShiftingStars ? 'fx_ascended_halo_stellar' : 'fx_ascended_halo_bagua')
        : null;
      const pulseAuraSpin = isShiftingStars ? 3.6 : -2.8;
      const scale = tier === 'grandmaster' ? 2.1 : tier === 'ultimate' ? 1.6 : 1.25;
      const vx = tier === 'grandmaster' ? 840 : 760;
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
          tier === 'grandmaster' ? 99 : tier === 'ultimate' ? 6 : level + 1,
          false,
          false,
          true,
          null,
          tier === 'grandmaster' && i === 0,
          false,
          tier === 'grandmaster' ? 'SOVEREIGN' : tier === 'ultimate' ? 'LANCE' : 'SIX-PULSE',
          null,
          scale,
          tier === 'base' ? null : pulseColor,
          tier === 'grandmaster' ? 140 : tier === 'ultimate' ? 85 : 0,
          pulseColor,
          pulseAura,
          1.45,
          pulseAuraSpin
        );
      }
    } else if (art.style === 'flicking_finger') {
      soundFX.playSpell();
      this.playHeroAttackAnimation('warrior', tier === 'grandmaster' ? 1.55 : 1.2);
      const orbColor = tier === 'grandmaster' ? 0xef4444 : 0xfb923c;
      this.spawnQiShockwaveRing(
        this.heroX + 28,
        this.groundY - 30,
        orbColor,
        tier === 'grandmaster' ? 195 : tier === 'ultimate' ? 140 : 105,
        250
      );
      if (tier !== 'base') {
        this.cameras.main.shake(115, tier === 'grandmaster' ? 0.008 : 0.005);
        this.spawnFloatingText(
          this.heroX + 36,
          this.groundY - 98,
          syn ? 'TEN-DRAGON SUPERNOVA!' : tier === 'grandmaster' ? 'GRANDMASTER METEOR STAR!' : 'SOLAR METEOR FINGER!',
          '#fb923c',
          tier === 'grandmaster' ? 16 : 14
        );
      }
      const tex =
        tier === 'grandmaster'
          ? 'fx_finger_supernova'
          : tier === 'ultimate'
            ? 'fx_finger_solar_orb'
            : 'proj_lance_finger';
      const fingerAura = tier !== 'base' ? 'fx_ascended_halo_dragon' : null;
      const scale = tier === 'grandmaster' ? 1.95 : tier === 'ultimate' ? 1.55 : 1.25;
      const vx = tier === 'grandmaster' ? 730 : 680;
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
          tier === 'grandmaster' ? 6 : tier === 'ultimate' ? 3 : 2,
          false,
          false,
          true,
          aimEnemy.id,
          false,
          false,
          tier === 'grandmaster' ? 'SUPERNOVA' : tier === 'ultimate' ? 'SOLAR' : 'THRUM',
          null,
          scale,
          tier === 'base' ? null : orbColor,
          tier === 'grandmaster' ? 150 : tier === 'ultimate' ? 95 : 0,
          orbColor,
          fingerAura,
          1.4,
          3.2
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - target.sprite.x) <= (tier === 'grandmaster' ? 165 : 100) && e.hp > 0) {
          this.damageEnemy(e, Math.round(dmg * 0.35), false, 'SHOCK');
        }
      }
    } else {
      if (tier !== 'base') {
        soundFX.playBossRoar();
        this.cameras.main.shake(120, tier === 'grandmaster' ? 0.008 : 0.005);
      } else {
        soundFX.playSwing();
      }
      this.playHeroAttackAnimation('warrior', tier === 'grandmaster' ? 1.5 : tier === 'ultimate' ? 1.25 : 1.1);
      const isTianshan = art.id === 'art_tianshan_six_yang';
      const tideColor = isTianshan
        ? tier === 'grandmaster'
          ? 0xf43f5e
          : 0xfb7185
        : tier === 'grandmaster'
          ? 0x818cf8
          : 0x38bdf8;
      this.spawnHeroAfterimage(tideColor);
      this.spawnQiShockwaveRing(
        this.heroX + 26,
        this.groundY - 32,
        tideColor,
        tier === 'grandmaster' ? 195 : tier === 'ultimate' ? 140 : 100,
        260
      );
      const tideText = isTianshan
        ? syn
          ? 'EIGHT DESOLATIONS FROST!'
          : tier === 'grandmaster'
            ? 'SIX-YANG PLUM STORM!'
            : 'TIANSHAN PLUM HAND!'
        : syn
          ? 'SOVEREIGN SOUL-SEVERING PALM!'
          : tier === 'grandmaster'
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
        tier === 'grandmaster' ? 16 : 14
      );
      const tex = isTianshan
        ? (tier === 'grandmaster' ? 'fx_ice_blizzard_lotus' : 'proj_palm_tianshan')
        : (tier === 'grandmaster' ? 'fx_ice_crystal_spear' : 'proj_palm_melancholic');
      const palmAura = tier !== 'base' ? 'fx_ascended_halo_lotus' : null;
      const palmAuraSpin = isTianshan ? 2.8 : -2.6;
      const scale = tier === 'grandmaster' ? 1.95 : tier === 'ultimate' ? 1.55 : 1.2;
      const vx = tier === 'grandmaster' ? 580 : 510;
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
          tier === 'grandmaster' ? 99 : tier === 'ultimate' ? 6 : 3,
          tier === 'grandmaster',
          true,
          true,
          null,
          false,
          false,
          tier === 'grandmaster' ? 'SOUL-SEVER' : tier === 'ultimate' ? 'HEARTBREAK' : 'MELANCHOLIC',
          null,
          scale,
          tier === 'base' ? null : tideColor,
          tier === 'grandmaster' ? 140 : tier === 'ultimate' ? 90 : 0,
          tideColor,
          palmAura,
          1.45,
          palmAuraSpin
        );
      }
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 185 && !e.mutations.includes('juggernaut') && e.hp > 0) {
          e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + 26);
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
  ): { text: string; color: string; size: number } {
    if (labelTag === 'ULTIMATE') {
      return { text: `ULTIMATE CRIT! ${finalDmg}`, color: '#fef08a', size: 19 };
    }
    if (labelTag === 'SHATTER') {
      return { text: `MERIDIAN SHATTER! ${finalDmg}`, color: '#fde047', size: 18 };
    }
    const callouts: readonly { phrase: string; color: string }[] = [
      { phrase: 'MERIDIAN PIERCE!', color: '#fde047' },
      { phrase: 'CRITICAL STRIKE!', color: '#fbbf24' },
      { phrase: 'SWORD SEVER!', color: '#38bdf8' },
      { phrase: 'BURST RUPTURE!', color: '#fb923c' },
      { phrase: 'YIN-YANG RUPTURE!', color: '#e879f9' },
      { phrase: 'PRECISION STRIKE!', color: '#f87171' },
      { phrase: 'HEAVEN CRIT!', color: '#fef08a' },
    ];
    const picked = callouts[Math.floor(this.rng() * callouts.length)] ?? callouts[0];
    const phrase = picked?.phrase ?? 'MERIDIAN PIERCE!';
    const color = picked?.color ?? '#fde047';
    return { text: `${phrase} ${finalDmg}`, color, size: 16 };
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
        '#fde047',
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
      this.damageEnemy(e, ultDmg, true, 'ULTIMATE');
    }

    this.emitHud();
  }

  public triggerActiveSkill(): void {
    if (this.phase !== 'combat' || !this.stats || !this.runConfig || this.skillTimer > 0) return;

    const loadout = computeWuxiaLoadout(this.draftedBuffIds, this.floor);
    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.skillTimer = Math.max(2.5, (loadout.actives.length > 0 ? 7.5 : 4.5) * cdMult);

    if (loadout.actives.length === 0) {
      soundFX.playBossRoar();
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
      this.spawnFloatingText(this.heroX + 35, this.groundY - 102, 'TAIJI PALM BREAK!', '#fef08a', 16);
      const dmg = Math.max(
        1,
        Math.round(this.stats.atk * 2.1 * this.stats.allDamageMult * this.stats.critDmg)
      );
      for (const e of [...this.enemies]) {
        if (Math.abs(e.sprite.x - this.heroX) <= 210) {
          this.spawnHitSpark(e.sprite.x, e.sprite.y, true, 0xfef08a);
          this.damageEnemy(e, dmg, true, 'TAIJI');
          if (e.hp > 0) e.stunTimer = Math.max(e.stunTimer, 0.75);
        }
      }
      this.emitHud();
      return;
    }

    this.spawnQiShockwaveRing(this.heroX + 25, this.groundY - 30, 0xfde047, 175, 280);
    this.cameras.main.shake(110, 0.006);
    this.spawnFloatingText(this.heroX + 40, this.groundY - 110, 'DANTIAN UNLEASHED!', '#fde047', 16);
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
    this.healHero(this.stats.maxHp * 0.35, true);
    soundFX.playDraft();
    this.emitHud();
  }

  public triggerDash(): void {
    if (this.phase !== 'combat' || !this.stats || this.dashCooldown > 0) return;

    const cdMult = 1 - this.stats.cooldownReductionPct / 100;
    this.dashCooldown = Math.max(2.0, 5 * cdMult);
    this.invulnHitsLeft = Math.max(this.invulnHitsLeft, 1);

    soundFX.playSwing();
    this.spawnFloatingText(this.heroX + 20, this.groundY - 96, 'DASH!', '#38bdf8', 15);

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
        if (!e.mutations.includes('juggernaut')) {
          e.sprite.x = Math.min((this.scale.width || 1024) - 55, e.sprite.x + 110);
        }
        e.stunTimer = Math.max(e.stunTimer, 0.6);
      }
    }

    const closest = this.getClosestEnemy();
    if (closest) {
      this.damageEnemy(closest, this.stats.atk * 0.9 * this.stats.allDamageMult, false, 'COUNTER');
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

  private spawnRelicAcquisitionBanner(title: string, subtitle: string, borderHex = 0xfde047): void {
    const w = this.scale.width || 1024;
    const container = this.add.container(w / 2, 74).setDepth(26).setScale(0.7).setAlpha(0);
    const bg = this.add
      .rectangle(0, 0, Math.min(430, w - 40), 52, 0x0f172a, 0.92)
      .setStrokeStyle(2, borderHex, 1);
    const titleTxt = this.add
      .text(0, -10, title, {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const subTxt = this.add
      .text(0, 10, subtitle, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
    container.add([bg, titleTxt, subTxt]);

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
    const sprite = this.add.image(x, y - 10, key).setDepth(7);
    if (kind === 'chest') {
      sprite.setScale(1.3);
      this.spawnQiShockwaveRing(x, y - 10, 0xfde047, 72, 240);
    }
    this.loots.push({
      sprite,
      kind,
      value,
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
            'REWARD CHEST! +35 Gold • +4 Shards',
            '#fde047',
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
              : `Floor ${this.floor} Gear Drop (35% Legendary chance) + 4 Shards`
          );
        }
        l.sprite.destroy();
        this.loots.splice(i, 1);
      }
    }
  }

  private spawnFloatingText(x: number, y: number, msg: string, color: string, sizePx: number): void {
    const txt = this.add
      .text(x, y, msg, {
        fontFamily: 'monospace',
        fontSize: `${sizePx}px`,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 620,
      onComplete: () => txt.destroy(),
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
    this.finishRun('extracted');
  }

  private finishRun(outcome: 'cleared' | 'extracted' | 'died'): void {
    if (outcome === 'died') soundFX.playDefeat();
    this.phase = 'idle';
    this.clearCombatEntities();

    if (!this.runConfig) return;
    this.callbacks?.onRunEnded({
      runId: this.runConfig.runId,
      mode: this.runConfig.mode,
      classId: this.runConfig.classId,
      floorReached: this.floor,
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
