import type * as Phaser from 'phaser';
import { CLASS_IDS } from '../../shared/catalogs/classes.ts';
import type { ClassId, ElementId, GearItem, GearSlot } from '../../shared/types.ts';

type PixelGrid = readonly string[];
type Palette = Record<string, string>;

export type GearVisualStyle = {
  hasCape: boolean;
  hasTop: boolean;
  hasHead: boolean;
  hasWeapon: boolean;
  capeTint: number;
  topTint: number;
  headTint: number;
  weaponTint: number;
  weaponGlowTint: number | null;
  capeCss: string;
  topCss: string;
  headCss: string;
  weaponCss: string;
  weaponGlowCss: string | null;
};

const TIER_COLORS: Record<'normal' | 'rare' | 'legendary', { hex: number; css: string }> = {
  normal: { hex: 0xc9beab, css: '#c9beab' },
  rare: { hex: 0x6a96bd, css: '#6a96bd' },
  legendary: { hex: 0xdfc073, css: '#dfc073' },
};

const CURSED_COLOR = { hex: 0xa67aa8, css: '#a67aa8' };

const ELEMENT_COLORS: Record<ElementId, { hex: number; css: string }> = {
  fire: { hex: 0xd46b34, css: '#d46b34' },
  ice: { hex: 0x7ab4c7, css: '#7ab4c7' },
  lightning: { hex: 0xdfc073, css: '#dfc073' },
  dark: { hex: 0x9b6fa3, css: '#9b6fa3' },
};

const resolveItemColor = (
  item: GearItem | null,
  fallbackHex: number,
  fallbackCss: string
): { hex: number; css: string } => {
  if (!item) return { hex: fallbackHex, css: fallbackCss };
  if (item.isCursed) return CURSED_COLOR;
  const lastSocket = item.sockets[item.sockets.length - 1];
  if (lastSocket) return ELEMENT_COLORS[lastSocket];
  return TIER_COLORS[item.tier];
};

export const getGearVisualStyle = (
  classId: ClassId,
  equipped: Record<GearSlot, GearItem | null>
): GearVisualStyle => {
  const defaultWeaponByClass: Record<ClassId, { hex: number; css: string }> = {
    warrior: { hex: 0xe2e8f0, css: '#e2e8f0' },
    mage: { hex: 0x60a5fa, css: '#60a5fa' },
    thief: { hex: 0xc084fc, css: '#c084fc' },
    bowman: { hex: 0xfbbf24, css: '#fbbf24' },
  };
  const baseWep = defaultWeaponByClass[classId];

  const capeCol = resolveItemColor(equipped.cape, 0x64748b, '#64748b');
  const topCol = resolveItemColor(equipped.top, 0x94a3b8, '#94a3b8');
  const headCol = resolveItemColor(equipped.headgear, 0x94a3b8, '#94a3b8');
  const wepCol = resolveItemColor(equipped.weapon, baseWep.hex, baseWep.css);
  const lastSocket = equipped.weapon?.sockets[equipped.weapon.sockets.length - 1];
  const glowCol = lastSocket
    ? ELEMENT_COLORS[lastSocket]
    : equipped.weapon?.isCursed
      ? CURSED_COLOR
      : equipped.weapon?.tier === 'legendary'
        ? TIER_COLORS.legendary
        : null;

  return {
    hasCape: equipped.cape !== null,
    hasTop: equipped.top !== null,
    hasHead: equipped.headgear !== null,
    hasWeapon: equipped.weapon !== null && !equipped.weapon.id.startsWith('starter_wep_'),
    capeTint: capeCol.hex,
    topTint: topCol.hex,
    headTint: headCol.hex,
    weaponTint: wepCol.hex,
    weaponGlowTint: glowCol ? glowCol.hex : null,
    capeCss: capeCol.css,
    topCss: topCol.css,
    headCss: headCol.css,
    weaponCss: wepCol.css,
    weaponGlowCss: glowCol ? glowCol.css : null,
  };
};

const multiplyHex = (baseCss: string, tintCss: string): string => {
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    const n = Number.parseInt(clean, 16);
    if (Number.isNaN(n)) return [255, 255, 255];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [br, bg, bb] = parse(baseCss);
  const [tr, tg, tb] = parse(tintCss);
  const r = Math.round((br * tr) / 255);
  const g = Math.round((bg * tg) / 255);
  const b = Math.round((bb * tb) / 255);
  return `rgb(${r}, ${g}, ${b})`;
};

const drawGridToContext = (
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  palette: Palette,
  pixelSize: number,
  offsetX = 0,
  offsetY = 0,
  tintCss: string | null = null,
  hd2dStyle = true,
  borderCss: string | null = null,
  rimCss: string | null = null
): void => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const isFilled = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    const ch = grid[r]?.[c];
    return Boolean(ch && ch !== '.' && palette[ch]);
  };

  // Sumi-ink silhouette outer border pass
  if (hd2dStyle && pixelSize >= 3) {
    ctx.fillStyle = borderCss ?? '#0e0a08';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isFilled(r, c)) continue;
        const x = offsetX + c * pixelSize;
        const y = offsetY + r * pixelSize;
        if (!isFilled(r - 1, c) || !isFilled(r + 1, c) || !isFilled(r, c - 1) || !isFilled(r, c + 1)) {
          ctx.fillRect(x - 1, y - 1, pixelSize + 2, pixelSize + 2);
        }
      }
    }
  }

  // Base crisp pixel pass
  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = tintCss ? multiplyHex(color, tintCss) : color;
      ctx.fillRect(offsetX + c * pixelSize, offsetY + r * pixelSize, pixelSize, pixelSize);
    }
  }

  // Subtle warm lantern rim light & grounded ink bottom shade
  if (hd2dStyle && pixelSize >= 3) {
    const rimTop = rimCss ?? 'rgba(248, 232, 194, 0.28)';
    const rimLeft = rimCss ?? 'rgba(248, 232, 194, 0.16)';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isFilled(r, c)) continue;
        const x = offsetX + c * pixelSize;
        const y = offsetY + r * pixelSize;
        if (!isFilled(r - 1, c)) {
          ctx.fillStyle = rimTop;
          ctx.fillRect(x, y, pixelSize, 1);
        }
        if (!isFilled(r, c - 1)) {
          ctx.fillStyle = rimLeft;
          ctx.fillRect(x, y, 1, pixelSize);
        }
        if (!isFilled(r + 1, c)) {
          ctx.fillStyle = 'rgba(12, 8, 6, 0.38)';
          ctx.fillRect(x, y + pixelSize - 1, pixelSize, 1);
        }
      }
    }
  }
};

const drawPixelGrid = (
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  palette: Palette,
  pixelSize: number,
  borderCss: string | null = null,
  rimCss: string | null = null
): void => {
  if (scene.textures.exists(key)) return;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  const tex = scene.textures.createCanvas(key, cols * pixelSize, rows * pixelSize);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, cols * pixelSize, rows * pixelSize);
  drawGridToContext(ctx, grid, palette, pixelSize, 0, 0, null, true, borderCss, rimCss);
  tex.refresh();
};

// ==================== SUMI-E INK-BRUSH PAINTERLY CHARACTER & GEAR ENGINE ====================

type HeroPose = 'idle' | 'walk' | 'attack' | 'dash';
type WuxiaWeaponKind = 'sword' | 'heavy_sword' | 'staff' | 'flute' | 'needles';

type HeroSumiPalette = {
  robeMain: string;
  robeDark: string;
  robeLight: string;
  inner: string;
  innerLight: string;
  trim: string;
  trimDark: string;
  scarf: string;
  scarfEdge: string;
  hair: string;
  hairHi: string;
  eye: string;
  eyeGlint: string;
  boots: string;
};

const INK = '#0e0a08';
const WARM_RIM = 'rgba(244, 224, 176, 0.42)';
const WARM_RIM_SOFT = 'rgba(244, 224, 176, 0.24)';

const HERO_SUMI_PALETTES: Record<ClassId, HeroSumiPalette> = {
  warrior: {
    robeMain: '#a62c24',
    robeDark: '#631712',
    robeLight: '#d4483c',
    inner: '#1c1715',
    innerLight: '#332924',
    trim: '#dfc073',
    trimDark: '#9e7b36',
    scarf: '#c23429',
    scarfEdge: '#e8cb82',
    hair: '#171210',
    hairHi: '#382d27',
    eye: '#14100e',
    eyeGlint: '#f7e8c4',
    boots: '#1a1411',
  },
  mage: {
    robeMain: '#2b4e6e',
    robeDark: '#193047',
    robeLight: '#4979a3',
    inner: '#e8dbb9',
    innerLight: '#f6edd5',
    trim: '#7bc4b2',
    trimDark: '#448071',
    scarf: '#dfd0a8',
    scarfEdge: '#80ccb9',
    hair: '#17151b',
    hairHi: '#342e3d',
    eye: '#141218',
    eyeGlint: '#c2f0e6',
    boots: '#19171f',
  },
  thief: {
    robeMain: '#3c2b4a',
    robeDark: '#21162b',
    robeLight: '#5d4470',
    inner: '#18121c',
    innerLight: '#2f2438',
    trim: '#b88abc',
    trimDark: '#6b4570',
    scarf: '#b82e26',
    scarfEdge: '#e5584c',
    hair: '#141017',
    hairHi: '#312638',
    eye: '#dc4438',
    eyeGlint: '#ffe8ad',
    boots: '#151019',
  },
  bowman: {
    robeMain: '#274a3c',
    robeDark: '#152b22',
    robeLight: '#41755f',
    inner: '#1e2b24',
    innerLight: '#33473d',
    trim: '#dbb86c',
    trimDark: '#8f7238',
    scarf: '#cca962',
    scarfEdge: '#edd69a',
    hair: '#181512',
    hairHi: '#352d26',
    eye: '#141210',
    eyeGlint: '#e8f5c8',
    boots: '#1a1612',
  },
};

const registerCanvasTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void => {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, width, height);
  tex.refresh();
};

const fillStrokePath = (
  ctx: CanvasRenderingContext2D,
  fillStyle: string | CanvasGradient,
  strokeWidth = 1.6,
  strokeStyle = INK
): void => {
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
};

const parseCssRgb = (hex: string): [number, number, number] => {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const drawTintedLayer = (
  targetCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tintCss: string,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  paint: (ctx: CanvasRenderingContext2D) => void
): void => {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  if (!octx) return;
  octx.imageSmoothingEnabled = true;
  octx.lineJoin = 'round';
  octx.lineCap = 'round';
  paint(octx);

  const img = octx.getImageData(0, 0, w, h);
  const data = img.data;
  const [tr, tg, tb] = parseCssRgb(tintCss);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a === 0) continue;
    data[i] = Math.round(((data[i] ?? 0) * tr) / 255);
    data[i + 1] = Math.round(((data[i + 1] ?? 0) * tg) / 255);
    data[i + 2] = Math.round(((data[i + 2] ?? 0) * tb) / 255);
  }
  octx.putImageData(img, 0, 0);
  targetCtx.drawImage(off, destX, destY, destW, destH);
};

// Paint a 64x68 Sumi-e ink-brush Wuxia Hero facing RIGHT (+X), feet grounded at y = 62
const paintSumiHero = (
  ctx: CanvasRenderingContext2D,
  classId: ClassId,
  pose: HeroPose = 'idle'
): void => {
  const p = HERO_SUMI_PALETTES[classId];
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const isWalk = pose === 'walk';
  const isAttack = pose === 'attack';
  const isDash = pose === 'dash';

  // Pose-driven kinematics (64x68 canvas, feet around y = 62)
  const hipX = isDash ? 34 : isAttack ? 34 : isWalk ? 32 : 31;
  const hipY = isDash ? 47 : isAttack ? 45 : 43;
  const torsoShiftX = isDash ? 8 : isAttack ? 6 : isWalk ? 3 : 0;
  const torsoShiftY = isDash ? 5 : isAttack ? 2 : 0;
  const shoulderX = hipX + torsoShiftX;
  const shoulderY = 27 + torsoShiftY;
  const headX = shoulderX + (isDash ? 4 : isAttack ? 2.5 : isWalk ? 1.5 : 0.5);
  const headY = 17 + torsoShiftY + (isDash ? 2 : 0);

  // 0. Dash Qinggong wind-step trailing ink wisps
  if (isDash) {
    const wispYs = [22, 34, 46, 56];
    for (let i = 0; i < wispYs.length; i++) {
      const wy = wispYs[i] ?? 34;
      const g = ctx.createLinearGradient(2, wy, shoulderX - 2, wy);
      g.addColorStop(0, 'rgba(14, 10, 8, 0)');
      g.addColorStop(0.5, i % 2 === 0 ? 'rgba(20, 15, 13, 0.55)' : 'rgba(232, 206, 148, 0.38)');
      g.addColorStop(1, 'rgba(14, 10, 8, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = i === 1 ? 2.4 : 1.5;
      ctx.beginPath();
      ctx.moveTo(2 + i * 2, wy + 2);
      ctx.quadraticCurveTo(16, wy - 2, shoulderX - 4, wy);
      ctx.stroke();
    }
  }

  // 1. Billowing scarf / silk ribbon trailing left
  ctx.beginPath();
  if (isDash) {
    ctx.moveTo(shoulderX - 3, shoulderY + 1);
    ctx.quadraticCurveTo(18, shoulderY - 3, 3, shoulderY + 1);
    ctx.quadraticCurveTo(17, shoulderY + 6, shoulderX - 4, shoulderY + 6);
  } else if (isAttack) {
    ctx.moveTo(shoulderX - 4, shoulderY + 1);
    ctx.quadraticCurveTo(16, shoulderY - 6, 5, shoulderY + 4);
    ctx.quadraticCurveTo(18, shoulderY + 5, shoulderX - 5, shoulderY + 7);
  } else if (isWalk) {
    ctx.moveTo(shoulderX - 3, shoulderY + 1);
    ctx.quadraticCurveTo(15, shoulderY + 2, 6, shoulderY + 11);
    ctx.quadraticCurveTo(18, shoulderY + 11, shoulderX - 4, shoulderY + 7);
  } else {
    ctx.moveTo(shoulderX - 3, shoulderY + 2);
    ctx.quadraticCurveTo(16, shoulderY + 7, 10, shoulderY + 18);
    ctx.quadraticCurveTo(19, shoulderY + 15, shoulderX - 4, shoulderY + 8);
  }
  ctx.closePath();
  fillStrokePath(ctx, p.scarf, 1.4);

  // Ribbon gold/bright edge accent
  ctx.strokeStyle = p.scarfEdge;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(shoulderX - 5, shoulderY + 3);
  ctx.quadraticCurveTo(
    16,
    isDash ? shoulderY - 1 : isAttack ? shoulderY - 3 : shoulderY + 6,
    isDash ? 6 : isAttack ? 8 : 12,
    isDash ? shoulderY + 2 : isAttack ? shoulderY + 4 : shoulderY + 15
  );
  ctx.stroke();

  // 2. Back leg & martial boot
  const backFootX = isDash ? 12 : isAttack ? 18 : isWalk ? 20 : 25;
  const backFootY = isDash ? 55 : 61;
  ctx.beginPath();
  ctx.moveTo(hipX - 4, hipY);
  ctx.quadraticCurveTo((hipX + backFootX) * 0.5 - 2, (hipY + backFootY) * 0.5, backFootX - 3, backFootY - 3);
  ctx.lineTo(backFootX + 5, backFootY - 2);
  ctx.lineTo(backFootX + 6, backFootY + 1);
  ctx.lineTo(backFootX - 4, backFootY + 1);
  ctx.lineTo(hipX + 2, hipY + 3);
  ctx.closePath();
  fillStrokePath(ctx, p.boots, 1.5);

  // 3. Back arm / sleeve
  ctx.beginPath();
  if (isAttack) {
    // Counter-balance trailing arm back-left
    ctx.moveTo(shoulderX - 5, shoulderY + 2);
    ctx.quadraticCurveTo(shoulderX - 15, shoulderY + 7, shoulderX - 18, shoulderY + 14);
    ctx.lineTo(shoulderX - 13, shoulderY + 16);
    ctx.quadraticCurveTo(shoulderX - 9, shoulderY + 11, shoulderX - 2, shoulderY + 8);
  } else if (isDash) {
    ctx.moveTo(shoulderX - 5, shoulderY + 2);
    ctx.lineTo(shoulderX - 19, shoulderY + 8);
    ctx.lineTo(shoulderX - 16, shoulderY + 13);
    ctx.lineTo(shoulderX - 3, shoulderY + 8);
  } else {
    ctx.moveTo(shoulderX - 5, shoulderY + 2);
    ctx.quadraticCurveTo(shoulderX - 12, shoulderY + 9, shoulderX - 11, shoulderY + 16);
    ctx.lineTo(shoulderX - 6, shoulderY + 16);
    ctx.quadraticCurveTo(shoulderX - 6, shoulderY + 10, shoulderX - 2, shoulderY + 7);
  }
  ctx.closePath();
  fillStrokePath(ctx, p.robeDark, 1.4);

  // 4. Front leg & martial boot
  const frontFootX = isDash ? 26 : isAttack ? 45 : isWalk ? 42 : 38;
  const frontFootY = isDash ? 59 : 61;
  ctx.beginPath();
  ctx.moveTo(hipX + 1, hipY);
  ctx.quadraticCurveTo(
    (hipX + frontFootX) * 0.5 + 3,
    (hipY + frontFootY) * 0.5 - 2,
    frontFootX - 3,
    frontFootY - 3
  );
  ctx.lineTo(frontFootX + 5, frontFootY - 2);
  ctx.lineTo(frontFootX + 6, frontFootY + 1);
  ctx.lineTo(frontFootX - 4, frontFootY + 1);
  ctx.lineTo(hipX - 3, hipY + 3);
  ctx.closePath();
  fillStrokePath(ctx, p.boots, 1.5);

  // 5. Lower layered hanfu robe skirt / hakama (sweeps dynamically with pose)
  const skirtGrad = ctx.createLinearGradient(hipX - 14, hipY - 2, hipX + 14, 58);
  skirtGrad.addColorStop(0, p.robeDark);
  skirtGrad.addColorStop(0.55, p.robeMain);
  skirtGrad.addColorStop(1, p.robeLight);

  const hemLeftX = isDash ? 14 : isAttack ? 19 : isWalk ? 19 : 21;
  const hemRightX = isDash ? 39 : isAttack ? 45 : isWalk ? 42 : 42;
  const hemY = isDash ? 55 : classId === 'mage' ? 58 : 55;

  ctx.beginPath();
  ctx.moveTo(hipX - 7, hipY - 3);
  ctx.quadraticCurveTo(hemLeftX + 2, (hipY + hemY) * 0.5, hemLeftX, hemY);
  ctx.quadraticCurveTo(hipX - 1, hemY + 2.5, hipX + 1, hemY - 2);
  ctx.quadraticCurveTo(hipX + 6, hemY + 2, hemRightX, hemY - 1);
  ctx.quadraticCurveTo(hipX + 11, (hipY + hemY) * 0.5, hipX + 8, hipY - 3);
  ctx.closePath();
  fillStrokePath(ctx, skirtGrad, 1.6);

  // Inner robe fold ink creases
  ctx.strokeStyle = 'rgba(14, 10, 8, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hipX - 2, hipY + 1);
  ctx.lineTo(hemLeftX + 7, hemY - 1);
  ctx.moveTo(hipX + 3, hipY + 1);
  ctx.lineTo(hemRightX - 7, hemY - 1);
  ctx.stroke();

  // 6. Upper torso crossed-collar hanfu (jiaoling youren)
  const torsoGrad = ctx.createLinearGradient(shoulderX - 10, shoulderY, shoulderX + 11, hipY);
  torsoGrad.addColorStop(0, p.robeDark);
  torsoGrad.addColorStop(0.55, p.robeMain);
  torsoGrad.addColorStop(1, p.robeLight);

  ctx.beginPath();
  ctx.moveTo(shoulderX - 8, shoulderY + 1);
  ctx.quadraticCurveTo(shoulderX, shoulderY - 2, shoulderX + 9, shoulderY + 1);
  ctx.lineTo(hipX + 8, hipY - 1);
  ctx.lineTo(hipX - 7, hipY - 1);
  ctx.closePath();
  fillStrokePath(ctx, torsoGrad, 1.6);

  // Crossed Y-collar inner lapel & trim
  ctx.beginPath();
  ctx.moveTo(shoulderX - 3, shoulderY);
  ctx.lineTo(shoulderX + 3, shoulderY + 9);
  ctx.lineTo(shoulderX + 6, shoulderY);
  ctx.closePath();
  fillStrokePath(ctx, p.inner, 1.1);

  ctx.strokeStyle = p.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(shoulderX - 4, shoulderY + 1);
  ctx.lineTo(shoulderX + 4, shoulderY + 12);
  ctx.moveTo(shoulderX + 5, shoulderY + 1);
  ctx.lineTo(shoulderX + 1, shoulderY + 8);
  ctx.stroke();

  // Waist sash & hanging pendant tassel
  ctx.beginPath();
  ctx.roundRect(hipX - 8, hipY - 4, 16.5, 4.2, 1.5);
  fillStrokePath(ctx, p.trim, 1.3);

  ctx.beginPath();
  ctx.moveTo(hipX + 1, hipY);
  ctx.quadraticCurveTo(hipX - 1, hipY + 6, hipX - 3, hipY + 11);
  ctx.lineTo(hipX + 2, hipY + 11);
  ctx.quadraticCurveTo(hipX + 3, hipY + 5, hipX + 4, hipY);
  ctx.closePath();
  fillStrokePath(ctx, p.trimDark, 1.1);

  // 7. Neck & Head (facing right 3/4 view)
  ctx.beginPath();
  ctx.ellipse(headX, headY, 6.4, 6.8, 0, 0, Math.PI * 2);
  const skinGrad = ctx.createLinearGradient(headX - 5, headY - 4, headX + 6, headY + 5);
  skinGrad.addColorStop(0, '#cfa074');
  skinGrad.addColorStop(0.55, '#f0cfa6');
  skinGrad.addColorStop(1, '#fae2c0');
  fillStrokePath(ctx, skinGrad, 1.5);

  // Thief face veil across lower face
  if (classId === 'thief') {
    ctx.beginPath();
    ctx.moveTo(headX - 5.5, headY + 0.8);
    ctx.quadraticCurveTo(headX + 1, headY - 0.5, headX + 6.2, headY + 0.8);
    ctx.quadraticCurveTo(headX + 5, headY + 7.2, headX, headY + 7);
    ctx.quadraticCurveTo(headX - 5, headY + 6.8, headX - 5.5, headY + 0.8);
    ctx.closePath();
    fillStrokePath(ctx, p.inner, 1.2);
  }

  // Expressive Wuxia eyes & angled ink brows (looking right)
  const eyeY = headY - 0.2;
  ctx.fillStyle = p.eye;
  ctx.fillRect(headX + 0.3, eyeY - 0.8, 1.9, 2.0);
  ctx.fillRect(headX + 3.6, eyeY - 0.8, 1.7, 2.0);
  ctx.fillStyle = p.eyeGlint;
  ctx.fillRect(headX + 1.2, eyeY - 0.5, 0.8, 0.8);
  ctx.fillRect(headX + 4.3, eyeY - 0.5, 0.8, 0.8);

  // Determined calligraphic eyebrows
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(headX - 0.4, eyeY - 2.3);
  ctx.lineTo(headX + 2.4, eyeY - 1.6);
  ctx.moveTo(headX + 3.4, eyeY - 1.6);
  ctx.lineTo(headX + 5.7, eyeY - 2.2);
  ctx.stroke();

  // 8. Hair & Iconic Class Headpiece
  // Back sweeping hair locks
  ctx.beginPath();
  ctx.moveTo(headX - 4, headY - 5);
  ctx.quadraticCurveTo(headX - 10, headY + 1, headX - 11 - (isDash ? 4 : 0), headY + 9);
  ctx.quadraticCurveTo(headX - 6, headY + 7, headX - 4, headY + 2);
  ctx.closePath();
  fillStrokePath(ctx, p.hair, 1.3);

  // Hair crown cap
  ctx.beginPath();
  ctx.moveTo(headX - 6.5, headY - 1);
  ctx.quadraticCurveTo(headX - 6, headY - 8.5, headX + 1, headY - 7.5);
  ctx.quadraticCurveTo(headX + 6.8, headY - 6.5, headX + 6.4, headY - 2);
  ctx.quadraticCurveTo(headX + 1, headY - 4.2, headX - 6.5, headY - 1);
  ctx.closePath();
  fillStrokePath(ctx, p.hair, 1.4);

  if (classId === 'warrior') {
    // High martial topknot + antique brass hairpin
    ctx.beginPath();
    ctx.ellipse(headX - 1, headY - 9.2, 3.6, 3.0, -0.1, 0, Math.PI * 2);
    fillStrokePath(ctx, p.hair, 1.3);
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(headX - 7.5, headY - 8.5);
    ctx.lineTo(headX + 5.5, headY - 10.2);
    ctx.stroke();
    ctx.fillStyle = p.trim;
    ctx.beginPath();
    ctx.arc(headX - 7.5, headY - 8.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (classId === 'mage') {
    // Jade Daoist lotus crown (guan) + hairpin
    ctx.beginPath();
    ctx.moveTo(headX - 4.5, headY - 6.5);
    ctx.lineTo(headX - 3, headY - 12.2);
    ctx.lineTo(headX + 0.5, headY - 10.2);
    ctx.lineTo(headX + 3.5, headY - 12.2);
    ctx.lineTo(headX + 4.5, headY - 6.5);
    ctx.closePath();
    fillStrokePath(ctx, p.trim, 1.3);
    ctx.strokeStyle = '#dfc073';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(headX - 6.5, headY - 8.5);
    ctx.lineTo(headX + 6.5, headY - 8.5);
    ctx.stroke();
  } else if (classId === 'thief') {
    // Sleek assassin topknot + forehead crest band
    ctx.beginPath();
    ctx.ellipse(headX - 2, headY - 8.5, 3.2, 2.5, -0.25, 0, Math.PI * 2);
    fillStrokePath(ctx, p.hair, 1.3);
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(headX - 5.8, headY - 3.6);
    ctx.quadraticCurveTo(headX + 1, headY - 4.8, headX + 6, headY - 3.4);
    ctx.stroke();
  } else {
    // Bowman iconic woven bamboo conical hat (douli) matching wuxiaVista.ts
    const hatY = headY - 4.5;
    const hatGrad = ctx.createLinearGradient(headX - 15, hatY, headX + 15, hatY - 7);
    hatGrad.addColorStop(0, '#6e5734');
    hatGrad.addColorStop(0.55, '#b89b66');
    hatGrad.addColorStop(1, '#dfc48b');

    ctx.beginPath();
    ctx.moveTo(headX - 15.5, hatY + 1.5);
    ctx.lineTo(headX + 0.5, hatY - 8.5);
    ctx.lineTo(headX + 16, hatY + 1.5);
    ctx.quadraticCurveTo(headX + 0.5, hatY + 4.2, headX - 15.5, hatY + 1.5);
    ctx.closePath();
    fillStrokePath(ctx, hatGrad, 1.6);

    // Woven bamboo ribs
    ctx.strokeStyle = 'rgba(14, 10, 8, 0.36)';
    ctx.lineWidth = 0.85;
    for (const dx of [-8, -3, 3, 9]) {
      ctx.beginPath();
      ctx.moveTo(headX + 0.5, hatY - 7.8);
      ctx.lineTo(headX + dx, hatY + 2.1);
      ctx.stroke();
    }
    // Warm lantern rim on right slope of douli
    ctx.strokeStyle = WARM_RIM;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headX + 0.8, hatY - 8);
    ctx.lineTo(headX + 15, hatY + 1.1);
    ctx.stroke();
  }

  // 9. Front arm & wide martial sleeve (dynamic per pose)
  ctx.beginPath();
  if (isAttack) {
    // Extended martial strike forward-right
    ctx.moveTo(shoulderX + 3, shoulderY + 2);
    ctx.lineTo(shoulderX + 16, shoulderY + 5);
    ctx.lineTo(shoulderX + 15, shoulderY + 11);
    ctx.lineTo(shoulderX + 2, shoulderY + 9);
  } else if (isDash) {
    ctx.moveTo(shoulderX + 2, shoulderY + 2);
    ctx.lineTo(shoulderX + 12, shoulderY + 7);
    ctx.lineTo(shoulderX + 9, shoulderY + 12);
    ctx.lineTo(shoulderX, shoulderY + 8);
  } else {
    // Poised guard sleeve
    ctx.moveTo(shoulderX + 3, shoulderY + 2);
    ctx.quadraticCurveTo(shoulderX + 11, shoulderY + 8, shoulderX + 10, shoulderY + 16);
    ctx.lineTo(shoulderX + 3, shoulderY + 15);
    ctx.quadraticCurveTo(shoulderX + 4, shoulderY + 10, shoulderX + 1, shoulderY + 7);
  }
  ctx.closePath();
  fillStrokePath(ctx, p.robeLight, 1.45);

  // Front cuff / bracer & fist
  const handX = isAttack ? shoulderX + 16.5 : isDash ? shoulderX + 11 : shoulderX + 8.5;
  const handY = isAttack ? shoulderY + 7.5 : isDash ? shoulderY + 9.5 : shoulderY + 14.5;
  ctx.beginPath();
  ctx.arc(handX, handY, 2.3, 0, Math.PI * 2);
  fillStrokePath(ctx, '#f0cfa6', 1.2);

  // 10. Warm lantern rim-lighting along front-right silhouette edge
  ctx.strokeStyle = WARM_RIM;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(shoulderX + 8.5, shoulderY + 2);
  ctx.lineTo(hipX + 7.5, hipY - 2);
  ctx.lineTo(hemRightX - 1, hemY - 2);
  ctx.stroke();

  // 11. Attack frame calligraphic ink-brush slash arc + gold qi edge
  if (isAttack) {
    ctx.beginPath();
    ctx.moveTo(46, 10);
    ctx.quadraticCurveTo(63, 30, 44, 54);
    ctx.quadraticCurveTo(56, 32, 43, 14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 10, 8, 0.82)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 214, 138, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(47, 11);
    ctx.quadraticCurveTo(61.5, 30, 45, 53);
    ctx.stroke();
  }

  ctx.restore();
};

// Painterly 64x68 Gear Overlays (white/silver shaded for Phaser .setTint and Paperdoll multiply)
const paintSumiGearCape = (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(8, 24, 30, 56);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#d6dce6');
  g.addColorStop(1, '#8c96a6');
  ctx.beginPath();
  ctx.moveTo(24, 26);
  ctx.quadraticCurveTo(13, 32, 8, 52);
  ctx.quadraticCurveTo(16, 56, 22, 51);
  ctx.quadraticCurveTo(25, 42, 29, 31);
  ctx.closePath();
  fillStrokePath(ctx, g, 1.5);

  // Mantle fold strokes
  ctx.strokeStyle = 'rgba(14, 10, 8, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(23, 30);
  ctx.quadraticCurveTo(16, 40, 13, 50);
  ctx.moveTo(26, 32);
  ctx.quadraticCurveTo(21, 42, 18, 51);
  ctx.stroke();

  ctx.strokeStyle = WARM_RIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(23, 27);
  ctx.quadraticCurveTo(14, 34, 9.5, 50);
  ctx.stroke();
  ctx.restore();
};

const paintSumiGearTop = (ctx: CanvasRenderingContext2D, classId: ClassId): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(22, 26, 42, 44);
  g.addColorStop(0, '#cbd5e1');
  g.addColorStop(0.5, '#ffffff');
  g.addColorStop(1, '#e2e8f0');

  if (classId === 'warrior') {
    // Lamellar pauldrons & engraved cuirass
    ctx.beginPath();
    ctx.moveTo(21, 28);
    ctx.quadraticCurveTo(32, 24, 42, 28);
    ctx.lineTo(40, 42);
    ctx.lineTo(24, 42);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.4);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(24, 33);
    ctx.lineTo(40, 33);
    ctx.moveTo(25, 38);
    ctx.lineTo(39, 38);
    ctx.stroke();
  } else if (classId === 'mage') {
    // Embroidered cloud-collar mantle (yunjian)
    ctx.beginPath();
    ctx.moveTo(21, 29);
    ctx.quadraticCurveTo(32, 24, 43, 29);
    ctx.quadraticCurveTo(38, 36, 32, 39);
    ctx.quadraticCurveTo(26, 36, 21, 29);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.4);
  } else if (classId === 'thief') {
    // Fitted assassin harness & shoulder guards
    ctx.beginPath();
    ctx.moveTo(22, 28);
    ctx.lineTo(41, 28);
    ctx.lineTo(39, 41);
    ctx.lineTo(24, 41);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.3);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(24, 29);
    ctx.lineTo(38, 40);
    ctx.moveTo(39, 29);
    ctx.lineTo(25, 40);
    ctx.stroke();
  } else {
    // Ranger layered vest & shoulder clasp
    ctx.beginPath();
    ctx.moveTo(22, 28);
    ctx.quadraticCurveTo(32, 25, 41, 28);
    ctx.lineTo(40, 42);
    ctx.lineTo(24, 42);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.35);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(32, 27);
    ctx.lineTo(32, 41);
    ctx.stroke();
  }
  ctx.restore();
};

const paintSumiGearHead = (ctx: CanvasRenderingContext2D, classId: ClassId): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const g = ctx.createLinearGradient(22, 6, 42, 16);
  g.addColorStop(0, '#cbd5e1');
  g.addColorStop(0.5, '#ffffff');
  g.addColorStop(1, '#e2e8f0');

  if (classId === 'warrior') {
    // Winged war-crest diadem
    ctx.beginPath();
    ctx.moveTo(22, 12);
    ctx.lineTo(26, 6);
    ctx.lineTo(32, 10);
    ctx.lineTo(38, 6);
    ctx.lineTo(42, 12);
    ctx.quadraticCurveTo(32, 14, 22, 12);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.35);
  } else if (classId === 'mage') {
    // Tall celestial Daoist lotus crown
    ctx.beginPath();
    ctx.moveTo(25, 12);
    ctx.lineTo(27, 4);
    ctx.lineTo(32, 7.5);
    ctx.lineTo(37, 4);
    ctx.lineTo(39, 12);
    ctx.quadraticCurveTo(32, 14, 25, 12);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.35);
  } else if (classId === 'thief') {
    // Shadow brow-plate & crescent crest
    ctx.beginPath();
    ctx.moveTo(24, 13);
    ctx.quadraticCurveTo(32, 8, 40, 13);
    ctx.lineTo(38, 15.5);
    ctx.quadraticCurveTo(32, 12.5, 26, 15.5);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.3);
  } else {
    // Plumed ranger crest atop douli
    ctx.beginPath();
    ctx.moveTo(29, 7);
    ctx.quadraticCurveTo(38, 2, 46, 8);
    ctx.quadraticCurveTo(38, 9, 31, 10);
    ctx.closePath();
    fillStrokePath(ctx, g, 1.3);
  }
  ctx.restore();
};

// Painterly 40x40 Held Wuxia Weapons (white/silver shaded for Phaser tinting)
const paintSumiWeapon = (ctx: CanvasRenderingContext2D, kind: WuxiaWeaponKind): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const bladeGrad = ctx.createLinearGradient(8, 32, 36, 4);
  bladeGrad.addColorStop(0, '#cbd5e1');
  bladeGrad.addColorStop(0.55, '#ffffff');
  bladeGrad.addColorStop(1, '#f8fafc');

  if (kind === 'sword') {
    // Sleek double-edged Wuxia Jian
    ctx.beginPath();
    ctx.moveTo(13, 27);
    ctx.lineTo(34, 4);
    ctx.lineTo(36, 6);
    ctx.lineTo(16, 30);
    ctx.closePath();
    fillStrokePath(ctx, bladeGrad, 1.4);

    // Crossguard & hilt
    ctx.beginPath();
    ctx.moveTo(9, 24);
    ctx.lineTo(19, 32);
    ctx.lineTo(17, 34);
    ctx.lineTo(7, 26);
    ctx.closePath();
    fillStrokePath(ctx, '#fef08a', 1.2);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(12, 29);
    ctx.lineTo(6, 35);
    ctx.stroke();

    // Flowing silk pommel tassel
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6, 35);
    ctx.quadraticCurveTo(2, 37, 4, 39);
    ctx.stroke();
  } else if (kind === 'heavy_sword') {
    // Broad Xuantie heavy iron greatsword
    ctx.beginPath();
    ctx.moveTo(11, 25);
    ctx.lineTo(32, 3);
    ctx.lineTo(37, 4);
    ctx.lineTo(36, 9);
    ctx.lineTo(17, 31);
    ctx.closePath();
    fillStrokePath(ctx, bladeGrad, 1.6);

    // Central fuller spine
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(15, 27);
    ctx.lineTo(33, 7);
    ctx.stroke();

    // Heavy guard & grip
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.lineTo(20, 33);
    ctx.lineTo(18, 35);
    ctx.lineTo(6, 24);
    ctx.closePath();
    fillStrokePath(ctx, '#fef08a', 1.3);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 29);
    ctx.lineTo(5, 36);
    ctx.stroke();
  } else if (kind === 'staff') {
    // Ringed bamboo/spirit staff
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(5, 36);
    ctx.lineTo(35, 5);
    ctx.stroke();

    ctx.strokeStyle = bladeGrad;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(5, 36);
    ctx.lineTo(35, 5);
    ctx.stroke();

    // Bamboo nodes / gold rings
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.6;
    for (const t of [0.25, 0.5, 0.78]) {
      const rx = 5 + 30 * t;
      const ry = 36 - 31 * t;
      ctx.beginPath();
      ctx.moveTo(rx - 2, ry - 2);
      ctx.lineTo(rx + 2, ry + 2);
      ctx.stroke();
    }
  } else if (kind === 'flute') {
    // Slender jade Xiao flute + hanging silk tassel
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(7, 29);
    ctx.lineTo(35, 11);
    ctx.stroke();

    ctx.strokeStyle = bladeGrad;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(7, 29);
    ctx.lineTo(35, 11);
    ctx.stroke();

    // Hanging silk tassel
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(11, 27);
    ctx.quadraticCurveTo(9, 33, 12, 38);
    ctx.stroke();
  } else {
    // Fanned triad of silver meridian needles
    const needles: readonly [number, number, number, number][] = [
      [12, 26, 33, 6],
      [15, 30, 37, 13],
      [10, 32, 34, 22],
    ];
    for (const [x1, y1, x2, y2] of needles) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const CLASS_DEFAULT_WEAPON_KIND: Record<ClassId, WuxiaWeaponKind> = {
  warrior: 'heavy_sword',
  mage: 'flute',
  thief: 'needles',
  bowman: 'sword',
};

// ==================== SUMI-E CULTIST MOBS (56x60, FACING LEFT) ====================

const paintSumiMob = (ctx: CanvasRenderingContext2D, variant: 0 | 1 | 2): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Neutral warm ivory/silver shading so Phaser .setTint(biomeColor) colors each sect cleanly
  const robeGrad = ctx.createLinearGradient(14, 22, 46, 54);
  robeGrad.addColorStop(0, '#faf6ee');
  robeGrad.addColorStop(0.55, '#ddd4c4');
  robeGrad.addColorStop(1, '#a99e8d');

  const darkCloth = '#7a7063';
  const sashLight = '#fffaf0';
  const metalGrad = ctx.createLinearGradient(4, 14, 22, 38);
  metalGrad.addColorStop(0, '#ffffff');
  metalGrad.addColorStop(1, '#cbd5e1');

  // 1. Boots / legs (feet grounded at y = 55)
  ctx.beginPath();
  ctx.moveTo(20, 44);
  ctx.lineTo(16, 55);
  ctx.lineTo(24, 55);
  ctx.lineTo(26, 45);
  ctx.closePath();
  fillStrokePath(ctx, '#26211d', 1.4);

  ctx.beginPath();
  ctx.moveTo(31, 44);
  ctx.lineTo(34, 55);
  ctx.lineTo(41, 55);
  ctx.lineTo(37, 44);
  ctx.closePath();
  fillStrokePath(ctx, '#1e1916', 1.4);

  // 2. Flowing back sash / cloak tail (trailing right)
  ctx.beginPath();
  ctx.moveTo(37, 26);
  ctx.quadraticCurveTo(49, 32, 52, 45);
  ctx.quadraticCurveTo(44, 44, 37, 36);
  ctx.closePath();
  fillStrokePath(ctx, darkCloth, 1.4);

  // 3. Layered sect robe body
  ctx.beginPath();
  ctx.moveTo(21, 24);
  ctx.quadraticCurveTo(29, 21, 38, 25);
  ctx.lineTo(43, 49);
  ctx.quadraticCurveTo(29, 52, 16, 49);
  ctx.closePath();
  fillStrokePath(ctx, robeGrad, 1.6);

  // Crossed collar & waist sash
  ctx.strokeStyle = sashLight;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(23, 24);
  ctx.lineTo(32, 34);
  ctx.moveTo(35, 24);
  ctx.lineTo(29, 32);
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(19, 36, 20, 3.8, 1.4);
  fillStrokePath(ctx, sashLight, 1.3);

  // Robe vertical ink fold creases
  ctx.strokeStyle = 'rgba(14, 10, 8, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 40);
  ctx.lineTo(21, 49);
  ctx.moveTo(33, 40);
  ctx.lineTo(36, 49);
  ctx.stroke();

  // 4. Head & Variant Silhouette
  if (variant === 0) {
    // Hooded Cult Disciple
    ctx.beginPath();
    ctx.moveTo(20, 23);
    ctx.quadraticCurveTo(18, 10, 29, 8);
    ctx.quadraticCurveTo(40, 10, 39, 24);
    ctx.closePath();
    fillStrokePath(ctx, robeGrad, 1.6);

    // Shadowed cowl face interior
    ctx.beginPath();
    ctx.ellipse(26, 17.5, 5.2, 5.5, 0, 0, Math.PI * 2);
    fillStrokePath(ctx, '#181310', 1.2);

    // Glowing cult eyes looking left
    ctx.fillStyle = '#fff0b8';
    ctx.fillRect(22.5, 16.5, 2, 1.7);
    ctx.fillRect(26.5, 16.5, 2, 1.7);

    // Curved short saber (dao) held forward-left
    ctx.beginPath();
    ctx.moveTo(15, 34);
    ctx.quadraticCurveTo(7, 25, 6, 12);
    ctx.quadraticCurveTo(12, 18, 17, 31);
    ctx.closePath();
    fillStrokePath(ctx, metalGrad, 1.5);
  } else if (variant === 1) {
    // Conical Bamboo-Hat (Douli) Sect Assassin with twin daggers
    ctx.beginPath();
    ctx.ellipse(28, 18, 5.2, 5.4, 0, 0, Math.PI * 2);
    fillStrokePath(ctx, '#1b1512', 1.3);

    // Glowing eyes under hat rim
    ctx.fillStyle = '#fff0b8';
    ctx.fillRect(24, 17.5, 1.9, 1.6);
    ctx.fillRect(27.8, 17.5, 1.9, 1.6);

    // Wide conical woven bamboo douli hat
    const hatGrad = ctx.createLinearGradient(10, 16, 48, 8);
    hatGrad.addColorStop(0, '#faf3e4');
    hatGrad.addColorStop(0.6, '#d6c6a8');
    hatGrad.addColorStop(1, '#9c8c72');
    ctx.beginPath();
    ctx.moveTo(9, 16.5);
    ctx.lineTo(28.5, 6.5);
    ctx.lineTo(48, 16.5);
    ctx.quadraticCurveTo(28.5, 19.5, 9, 16.5);
    ctx.closePath();
    fillStrokePath(ctx, hatGrad, 1.6);

    // Twin curved assassin daggers (front-left & back-right)
    ctx.beginPath();
    ctx.moveTo(18, 33);
    ctx.lineTo(4, 27);
    ctx.lineTo(7, 33);
    ctx.lineTo(18, 36);
    ctx.closePath();
    fillStrokePath(ctx, metalGrad, 1.4);

    ctx.beginPath();
    ctx.moveTo(39, 34);
    ctx.lineTo(52, 31);
    ctx.lineTo(49, 36);
    ctx.lineTo(39, 37);
    ctx.closePath();
    fillStrokePath(ctx, metalGrad, 1.3);
  } else {
    // Heavy Armored Temple Enforcer with polearm/halberd
    // Broad lamellar pauldrons
    ctx.beginPath();
    ctx.ellipse(21, 27, 6.5, 4.2, -0.3, 0, Math.PI * 2);
    fillStrokePath(ctx, '#efeae0', 1.5);
    ctx.beginPath();
    ctx.ellipse(37, 27, 6.5, 4.2, 0.3, 0, Math.PI * 2);
    fillStrokePath(ctx, '#cfc6b6', 1.5);

    // Crested iron helm
    ctx.beginPath();
    ctx.ellipse(28, 17, 6, 6.2, 0, 0, Math.PI * 2);
    fillStrokePath(ctx, '#201a17', 1.5);
    ctx.beginPath();
    ctx.moveTo(21, 14);
    ctx.lineTo(24, 7);
    ctx.lineTo(28, 12);
    ctx.lineTo(33, 7);
    ctx.lineTo(36, 14);
    ctx.closePath();
    fillStrokePath(ctx, '#f5efe4', 1.4);

    // Fierce glowing eyes
    ctx.fillStyle = '#ff9d7a';
    ctx.fillRect(23.5, 16.8, 2, 1.7);
    ctx.fillRect(27.5, 16.8, 2, 1.7);

    // Tall crescent halberd / guandao on left
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(11, 54);
    ctx.lineTo(11, 13);
    ctx.stroke();
    ctx.strokeStyle = '#d6ccbc';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(11, 54);
    ctx.lineTo(11, 13);
    ctx.stroke();

    // Halberd crescent blade
    ctx.beginPath();
    ctx.moveTo(11, 6);
    ctx.quadraticCurveTo(3, 12, 5, 22);
    ctx.quadraticCurveTo(9, 19, 13, 18);
    ctx.closePath();
    fillStrokePath(ctx, metalGrad, 1.5);
  }

  // Front arm/sleeve gripping weapon
  ctx.beginPath();
  ctx.moveTo(21, 27);
  ctx.lineTo(13, 33);
  ctx.lineTo(16, 37);
  ctx.lineTo(24, 33);
  ctx.closePath();
  fillStrokePath(ctx, '#f2ece2', 1.4);

  // Subtle warm lantern rim along left-facing front silhouette
  ctx.strokeStyle = WARM_RIM_SOFT;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(20, 25);
  ctx.lineTo(17, 48);
  ctx.stroke();

  ctx.restore();
};

// ==================== SUMI-E HALL MASTER MINI-BOSSES (84x90, FACING LEFT) ====================

const paintSumiMiniBoss = (ctx: CanvasRenderingContext2D, variant: 0 | 1 | 2): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const robeGrad = ctx.createLinearGradient(20, 26, 68, 82);
  robeGrad.addColorStop(0, '#fcf8f0');
  robeGrad.addColorStop(0.5, '#dfd6c5');
  robeGrad.addColorStop(1, '#a39785');

  const mantleGrad = ctx.createLinearGradient(44, 24, 80, 74);
  mantleGrad.addColorStop(0, '#e8dfd0');
  mantleGrad.addColorStop(1, '#857a6b');

  const goldTrim = '#f5e2a8';
  const metalGrad = ctx.createLinearGradient(6, 16, 28, 56);
  metalGrad.addColorStop(0, '#ffffff');
  metalGrad.addColorStop(1, '#cbd5e1');

  // Variant 2: Radiant spoked celestial halo-wheel behind shoulders
  if (variant === 2) {
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(43, 34, 23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(43, 34, 25, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.strokeStyle = goldTrim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(43 + Math.cos(a) * 16, 34 + Math.sin(a) * 16);
      ctx.lineTo(43 + Math.cos(a) * 26, 34 + Math.sin(a) * 26);
      ctx.stroke();
    }
  }

  // 1. Billowing multi-layered grandmaster mantle (sweeping right)
  ctx.beginPath();
  ctx.moveTo(46, 30);
  ctx.quadraticCurveTo(68, 36, 78, 66);
  ctx.quadraticCurveTo(68, 74, 54, 68);
  ctx.quadraticCurveTo(50, 52, 42, 42);
  ctx.closePath();
  fillStrokePath(ctx, mantleGrad, 1.8);

  // 2. Grounded boots (y = 84)
  ctx.beginPath();
  ctx.moveTo(28, 68);
  ctx.lineTo(22, 84);
  ctx.lineTo(34, 84);
  ctx.lineTo(36, 70);
  ctx.closePath();
  fillStrokePath(ctx, '#1e1916', 1.6);

  ctx.beginPath();
  ctx.moveTo(46, 68);
  ctx.lineTo(50, 84);
  ctx.lineTo(61, 84);
  ctx.lineTo(55, 68);
  ctx.closePath();
  fillStrokePath(ctx, '#171311', 1.6);

  // 3. Imposing layered Hall Master battle robe
  ctx.beginPath();
  ctx.moveTo(27, 32);
  ctx.quadraticCurveTo(41, 27, 56, 33);
  ctx.lineTo(64, 75);
  ctx.quadraticCurveTo(42, 80, 21, 75);
  ctx.closePath();
  fillStrokePath(ctx, robeGrad, 1.8);

  // Ornate gilded waist sash & hanging imperial tabard
  ctx.beginPath();
  ctx.roundRect(25, 50, 33, 5.5, 2);
  fillStrokePath(ctx, goldTrim, 1.5);

  ctx.beginPath();
  ctx.moveTo(36, 55.5);
  ctx.lineTo(33, 74);
  ctx.lineTo(47, 74);
  ctx.lineTo(44, 55.5);
  ctx.closePath();
  fillStrokePath(ctx, '#efe6d5', 1.4);

  // Crossed collar & gilded trim
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(31, 32);
  ctx.lineTo(45, 49);
  ctx.moveTo(51, 32);
  ctx.lineTo(41, 44);
  ctx.stroke();

  // Ornate shoulder pauldrons
  ctx.beginPath();
  ctx.ellipse(27, 36, 8.5, 5, -0.32, 0, Math.PI * 2);
  fillStrokePath(ctx, '#f8f2e6', 1.6);
  ctx.beginPath();
  ctx.ellipse(54, 36, 8.5, 5, 0.32, 0, Math.PI * 2);
  fillStrokePath(ctx, '#cfc5b4', 1.6);

  // 4. Head, Mask & Ornate Crown
  ctx.beginPath();
  ctx.ellipse(40, 23, 8, 8.2, 0, 0, Math.PI * 2);
  fillStrokePath(ctx, variant === 1 ? '#221c1a' : '#191412', 1.6);

  if (variant === 0) {
    // Twin-pronged gilded Hall Master hairpin crown
    ctx.beginPath();
    ctx.moveTo(29, 17);
    ctx.lineTo(26, 6);
    ctx.lineTo(35, 13);
    ctx.lineTo(40, 7);
    ctx.lineTo(46, 13);
    ctx.lineTo(54, 6);
    ctx.lineTo(51, 17);
    ctx.closePath();
    fillStrokePath(ctx, goldTrim, 1.5);
  } else if (variant === 1) {
    // Demon-mask brow horns & gold crest
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.quadraticCurveTo(26, 7, 33, 4);
    ctx.lineTo(38, 14);
    ctx.lineTo(43, 14);
    ctx.lineTo(48, 4);
    ctx.quadraticCurveTo(54, 7, 48, 16);
    ctx.closePath();
    fillStrokePath(ctx, goldTrim, 1.5);
  } else {
    // Grandmaster Daoist diadem
    ctx.beginPath();
    ctx.moveTo(31, 16);
    ctx.lineTo(34, 7);
    ctx.lineTo(40, 11);
    ctx.lineTo(46, 7);
    ctx.lineTo(49, 16);
    ctx.closePath();
    fillStrokePath(ctx, goldTrim, 1.5);
  }

  // Intense glowing boss eyes looking left
  ctx.fillStyle = '#ff6b57';
  ctx.fillRect(34, 22, 2.8, 2.2);
  ctx.fillRect(39.5, 22, 2.8, 2.2);
  ctx.fillStyle = '#fff5d6';
  ctx.fillRect(34.5, 22.4, 1.1, 1.1);
  ctx.fillRect(40, 22.4, 1.1, 1.1);

  // 5. Signature Hall Master Weapons (facing left)
  if (variant === 0) {
    // Heavy gleaming broadsword / dao held diagonally forward-left
    ctx.beginPath();
    ctx.moveTo(22, 49);
    ctx.quadraticCurveTo(10, 32, 8, 12);
    ctx.quadraticCurveTo(17, 22, 26, 45);
    ctx.closePath();
    fillStrokePath(ctx, metalGrad, 1.7);
    ctx.beginPath();
    ctx.arc(23, 48, 3.8, 0, Math.PI * 2);
    fillStrokePath(ctx, goldTrim, 1.3);
  } else if (variant === 1) {
    // Wicked triple-blade iron soul-claws on front hand
    for (const dy of [-5, 0, 5]) {
      ctx.beginPath();
      ctx.moveTo(22, 44 + dy * 0.5);
      ctx.quadraticCurveTo(10, 41 + dy, 4, 48 + dy * 1.2);
      ctx.quadraticCurveTo(12, 46 + dy * 0.8, 23, 47 + dy * 0.4);
      ctx.closePath();
      fillStrokePath(ctx, metalGrad, 1.3);
    }
  } else {
    // Floating gilded chakram wheel at front hand
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.arc(14, 44, 9.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(14, 44, 9.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Front sleeve/arm
  ctx.beginPath();
  ctx.moveTo(28, 37);
  ctx.lineTo(17, 45);
  ctx.lineTo(22, 51);
  ctx.lineTo(32, 45);
  ctx.closePath();
  fillStrokePath(ctx, '#f7f1e6', 1.5);

  // Warm lantern rim on left-facing silhouette
  ctx.strokeStyle = WARM_RIM;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(26, 35);
  ctx.lineTo(22, 74);
  ctx.stroke();

  ctx.restore();
};

// ==================== SUMI-E SUPREME CULT LEADER (104x112, FACING LEFT) ====================

const paintSumiEndBoss = (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const robeGrad = ctx.createLinearGradient(22, 30, 82, 102);
  robeGrad.addColorStop(0, '#fffcf5');
  robeGrad.addColorStop(0.5, '#e2d9c8');
  robeGrad.addColorStop(1, '#9c907e');

  const capeGrad = ctx.createLinearGradient(54, 28, 100, 96);
  capeGrad.addColorStop(0, '#ece3d4');
  capeGrad.addColorStop(0.6, '#b5aa98');
  capeGrad.addColorStop(1, '#6e6457');

  const goldTrim = '#fae6a8';
  const metalGrad = ctx.createLinearGradient(6, 12, 30, 68);
  metalGrad.addColorStop(0, '#ffffff');
  metalGrad.addColorStop(1, '#cbd5e1');

  // 0. Swirling celestial ink-and-gold sovereign ribbon behind shoulders
  ctx.strokeStyle = 'rgba(250, 230, 168, 0.72)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(22, 44);
  ctx.bezierCurveTo(18, 16, 86, 14, 88, 48);
  ctx.stroke();

  // 1. Towering twin-tail imperial mantle billowing right
  ctx.beginPath();
  ctx.moveTo(56, 34);
  ctx.quadraticCurveTo(86, 40, 98, 82);
  ctx.quadraticCurveTo(84, 94, 68, 86);
  ctx.lineTo(62, 62);
  ctx.closePath();
  fillStrokePath(ctx, capeGrad, 2);

  // 2. Grounded sovereign armored boots (y = 105)
  ctx.beginPath();
  ctx.moveTo(35, 86);
  ctx.lineTo(28, 105);
  ctx.lineTo(43, 105);
  ctx.lineTo(45, 88);
  ctx.closePath();
  fillStrokePath(ctx, '#1b1613', 1.8);

  ctx.beginPath();
  ctx.moveTo(57, 86);
  ctx.lineTo(61, 105);
  ctx.lineTo(75, 105);
  ctx.lineTo(68, 86);
  ctx.closePath();
  fillStrokePath(ctx, '#14100e', 1.8);

  // 3. Layered imperial grandmaster battle robes
  ctx.beginPath();
  ctx.moveTo(33, 38);
  ctx.quadraticCurveTo(51, 31, 69, 39);
  ctx.lineTo(79, 94);
  ctx.quadraticCurveTo(52, 100, 24, 94);
  ctx.closePath();
  fillStrokePath(ctx, robeGrad, 2);

  // Embroidered crimson/gold center tabard & waist dragon-belt
  ctx.beginPath();
  ctx.roundRect(30, 62, 42, 7, 2.2);
  fillStrokePath(ctx, goldTrim, 1.6);

  ctx.beginPath();
  ctx.moveTo(44, 69);
  ctx.lineTo(40, 93);
  ctx.lineTo(60, 93);
  ctx.lineTo(56, 69);
  ctx.closePath();
  fillStrokePath(ctx, '#f2e8d5', 1.5);

  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(37, 39);
  ctx.lineTo(54, 61);
  ctx.moveTo(63, 39);
  ctx.lineTo(50, 54);
  ctx.stroke();

  // Winged imperial pauldrons
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.quadraticCurveTo(31, 32, 41, 41);
  ctx.quadraticCurveTo(33, 49, 23, 46);
  ctx.closePath();
  fillStrokePath(ctx, '#faf5ea', 1.8);

  ctx.beginPath();
  ctx.moveTo(61, 41);
  ctx.quadraticCurveTo(72, 32, 82, 41);
  ctx.quadraticCurveTo(74, 49, 63, 46);
  ctx.closePath();
  fillStrokePath(ctx, '#d4cab8', 1.8);

  // 4. Sovereign Head & Multi-Spired Imperial Crown (Mianguan / Dragon Diadem)
  ctx.beginPath();
  ctx.ellipse(50, 28, 9.5, 9.8, 0, 0, Math.PI * 2);
  fillStrokePath(ctx, '#181311', 1.8);

  ctx.beginPath();
  ctx.moveTo(37, 21);
  ctx.lineTo(33, 8);
  ctx.lineTo(42, 15);
  ctx.lineTo(50, 4);
  ctx.lineTo(58, 15);
  ctx.lineTo(67, 8);
  ctx.lineTo(63, 21);
  ctx.closePath();
  fillStrokePath(ctx, goldTrim, 1.7);

  // Glowing sovereign eyes
  ctx.fillStyle = '#fff0a6';
  ctx.fillRect(42.5, 26.5, 3.4, 2.5);
  ctx.fillRect(49.5, 26.5, 3.4, 2.5);

  // 5. Commanding Sovereign Glaive / Imperial Blade held forward-left
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(22, 98);
  ctx.lineTo(14, 24);
  ctx.stroke();
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(22, 98);
  ctx.lineTo(14, 24);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.quadraticCurveTo(3, 18, 6, 36);
  ctx.quadraticCurveTo(13, 30, 19, 28);
  ctx.closePath();
  fillStrokePath(ctx, metalGrad, 1.8);

  // Front armored arm gripping polearm
  ctx.beginPath();
  ctx.moveTo(34, 44);
  ctx.lineTo(16, 54);
  ctx.lineTo(22, 62);
  ctx.lineTo(39, 54);
  ctx.closePath();
  fillStrokePath(ctx, '#f8f2e6', 1.6);

  // Warm lantern rim on left silhouette
  ctx.strokeStyle = WARM_RIM;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(31, 42);
  ctx.lineTo(25, 93);
  ctx.stroke();

  ctx.restore();
};

const SLASH_ARC_GRID: PixelGrid = [
  '..TTTT....',
  '....TTTT..',
  '.....TTTT.',
  '......MMMM',
  '......MMMM',
  '......MMMM',
  '.....TTTT.',
  '....TTTT..',
  '..TTTT....',
  '..........',
];

const HIT_SPARK_GRID: PixelGrid = [
  '...TT...',
  '...MM...',
  '.T.MM.T.',
  'TTMMMMTT',
  '.T.MM.T.',
  '...MM...',
  '...TT...',
  '........',
];

const HAWK_GRID: PixelGrid = [
  '...AAAA...',
  '..AAAAAA..',
  '.AAAYYEAA.',
  'AAAAWWAAAA',
  '.AAAAAAAA.',
  '..AA..AA..',
];

const WOLF_GRID: PixelGrid = [
  '..AA..AA..',
  '.AAAAAAAA.',
  'AAEAEEAAAA',
  'AAAAAAAA..',
  '.AA.AA.AA.',
];

const RUNE_BOOK_GRID: PixelGrid = [
  '.BBBBBB.',
  'BWWWWWWB',
  'BWGGGGWB',
  'BWWWWWWB',
  '.BBBBBB.',
];

const COIN_GRID: PixelGrid = [
  '.YYYY.',
  'YYWWYY',
  'YYWWYY',
  'YYYYYY',
  '.YYYY.',
];

const CHEST_GRID: PixelGrid = [
  '.BBBBBB.',
  'BYYYYYYB',
  'BYYWWYYB',
  'BBBBBBBB',
  'BYYYYYYB',
  'BBBBBBBB',
];

const BOMB_GRID: PixelGrid = [
  '....RR..',
  '...KK...',
  '.KKKKKK.',
  'KKKRKKKK',
  'KKKKKKKK',
  '.KKKKKK.',
];

export const renderHeroPaperdollCanvas = (
  canvas: HTMLCanvasElement,
  classId: ClassId,
  equipped: Record<GearSlot, GearItem | null>
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;

  const style = getGearVisualStyle(classId, equipped);
  const srcW = 64;
  const srcH = 68;
  const scale = Math.min((w * 0.88) / srcW, (h * 0.88) / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const drawX = (w - drawW) * 0.5;
  const drawY = (h - drawH) * 0.52;

  // Grounded ink contact shadow
  const shadowCx = w * 0.5;
  const shadowCy = drawY + drawH * 0.91;
  ctx.save();
  ctx.translate(shadowCx, shadowCy);
  ctx.scale(1, 0.34);
  const shGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, drawW * 0.42);
  shGrad.addColorStop(0, 'rgba(10, 7, 5, 0.72)');
  shGrad.addColorStop(1, 'rgba(10, 7, 5, 0)');
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.arc(0, 0, drawW * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Optional weapon qi glow behind hero
  if (style.weaponGlowCss) {
    const gx = drawX + drawW * 0.74;
    const gy = drawY + drawH * 0.48;
    const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, drawW * 0.38);
    grad.addColorStop(0, `${style.weaponGlowCss}55`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 1. Equipped Cape behind body
  if (style.hasCape) {
    drawTintedLayer(ctx, srcW, srcH, style.capeCss, drawX, drawY, drawW, drawH, (octx) => {
      paintSumiGearCape(octx);
    });
  }

  // 2. Base Sumi-e Hero sprite
  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.scale(scale, scale);
  paintSumiHero(ctx, classId, 'idle');
  ctx.restore();

  // 3. Equipped Armor Top
  if (style.hasTop) {
    drawTintedLayer(ctx, srcW, srcH, style.topCss, drawX, drawY, drawW, drawH, (octx) => {
      paintSumiGearTop(octx, classId);
    });
  }

  // 4. Equipped Headgear
  if (style.hasHead) {
    drawTintedLayer(ctx, srcW, srcH, style.headCss, drawX, drawY, drawW, drawH, (octx) => {
      paintSumiGearHead(octx, classId);
    });
  }

  // 5. Held Weapon in front right hand
  if (style.hasWeapon) {
    const wepSize = 40 * scale;
    const wepX = drawX + drawW * 0.56;
    const wepY = drawY + drawH * 0.22;
    drawTintedLayer(ctx, 40, 40, style.weaponCss, wepX, wepY, wepSize, wepSize, (octx) => {
      paintSumiWeapon(octx, CLASS_DEFAULT_WEAPON_KIND[classId]);
    });
  }
};

// ==================== SHARED WUXIA MARTIAL ARTS ARCHETYPE PIXEL GRIDS ====================

// Shared Wuxia Palm Qi Strike Archetype Grid (16x11, palm wrist left, 5 finger ridges & forward thrust RIGHT +X)
// Reused across Guo Jing (Dragon Palms), Yang Guo (Melancholic Palm), Tianshan (Six-Yang Plum Hand), and Ouyang Feng (Toad Leap)
const ARCHETYPE_PALM_GRID: PixelGrid = [
  '.....OOOO.......',
  '...OOYYYYYYO....',
  '..OYYYYYWWYYYO..',
  'OOYYYYWWRRWWYYTT',
  'GYYYYWWWWWWWT...',
  'GGYYWWWWWWW.....',
  'GYYYYWWWWWWWT...',
  'OOYYYYWWWWWWWWTT',
  '..OYYYYYYYYYOO..',
  '....OOYYYYOO....',
  '......OOOO......',
];

// Shared Wuxia Flying Sword Archetype Grid (16x7, tassel/hilt left, crossguard, blade & tip RIGHT +X)
// Reused across Jade Maiden (Jade/Rose Lotus) and Wudang Taiji (Yin-Yang / Azure Meridian)
const ARCHETYPE_FLYING_SWORD_GRID: PixelGrid = [
  '.....G..........',
  '....GGG.........',
  'RR..GGBBBBBBBBT.',
  'RKKGGWWWWWWWWWTT',
  'RR..GGBBBBBBBBT.',
  '....GGG.........',
  '.....G..........',
];

// Shared Wuxia Heavy Blade / Saber Archetype Grid (16x9, pommel left, broad blade & tip RIGHT +X)
// Reused across Xuantie Heavy Iron (Obsidian / Purple) and Dragon-Slaying Saber (Imperial Bronze / Gold)
const ARCHETYPE_HEAVY_BLADE_GRID: PixelGrid = [
  '...SS...........',
  '...SS...........',
  '...SSBBBBBBBBBB.',
  'GKKSSPPPPPPPPBBT',
  'GKKSSWWWWWWWWTTT',
  'GKKSSPPPPPPPPBBT',
  '...SSBBBBBBBBBB.',
  '...SS...........',
  '...SS...........',
];

// Shared Wuxia Whirling Vortex / Celestial Wheel Archetype Grid (14x14 spinning wheel)
// Reused across Beggar Dog-Beating Staff, Ming Cult Qiankun Great Shift, and Murong Shifting Stars
const ARCHETYPE_VORTEX_WHEEL_GRID: PixelGrid = [
  '...CCCCCCCC...',
  '..CC......CC..',
  '.CC...WW....C.',
  'CC..........WC',
  '.C..........W.',
  'GGGGGGGGGGGGGG',
  'EWWEGGGGGGWWWE',
  'GGGGGGGGGGGGGG',
  '.W..........C.',
  'CW..........CC',
  '.C....WW...CC.',
  '..CC......CC..',
  '...CCCCCCCC...',
  '..............',
];

// Shared Wuxia Meridian Qi Lance / Beam Archetype Grid (16x7, piercing RIGHT +X)
// Reused across Dali Six-Pulse Divine Sword (Cyan Meridian) and Flicking Finger (Solar Meteor)
const ARCHETYPE_MERIDIAN_LANCE_GRID: PixelGrid = [
  '....YYCCCCCCC.....',
  '..YYCCWWWWWWWCC...',
  'GGYYWWTTTTTTTTTTTT',
  'YYYYTTTTTTTTTTTTTT',
  'GGYYWWTTTTTTTTTTTT',
  '..YYCCWWWWWWWCC...',
  '....YYCCCCCCC.....',
];

// Shared Wuxia Sonic Crescent Wave Grid (12x10, facing RIGHT +X)
const ARCHETYPE_SONIC_WAVE_GRID: PixelGrid = [
  '......CCCC..',
  '........CCW.',
  '..NNN....WCT',
  '..N.N....WCT',
  'NNN......WWT',
  'NNN......WWT',
  '..N......WCT',
  '........CCW.',
  '......CCCC..',
  '............',
];

// ==================== ASCENDED SKILL AURA & CELESTIAL HALO GRIDS ====================

// Radiant Flaming Dragon Solar Halo (18x18 open-center celestial aura ring with 4 corner flame prongs)
const ASCENDED_HALO_DRAGON_GRID: PixelGrid = [
  'TT....OOOOOO....TT',
  '.TT.OOYYYYYYOO.TT.',
  '..OOYY......YYOO..',
  '..OYY........YYO..',
  '.OYY..........YYO.',
  '.OY............YO.',
  'OY..............YO',
  'OY..............YO',
  'OY..............YO',
  'OY..............YO',
  'OY..............YO',
  'OY..............YO',
  '.OY............YO.',
  '.OYY..........YYO.',
  '..OYY........YYO..',
  '..OOYY......YYOO..',
  '.TT.OOYYYYYYOO.TT.',
  'TT....OOOOOO....TT',
];

// Blooming Celestial Lotus Halo (18x18 open-center crystal lotus halo with 4 cardinal petal points)
const ASCENDED_HALO_LOTUS_GRID: PixelGrid = [
  '.......TTTT.......',
  '.....PPWWWWPP.....',
  '...PPWW....WWPP...',
  '..PWW........WWP..',
  '.PWW..........WWP.',
  '.PW............WP.',
  'TPW............WPT',
  'TPW............WPT',
  'TPW............WPT',
  'TPW............WPT',
  '.PW............WP.',
  '.PWW..........WWP.',
  '..PWW........WWP..',
  '...PPWW....WWPP...',
  '.....PPWWWWPP.....',
  '.......TTTT.......',
];

// Octagonal Daoist Bagua Trigram Halo (16x16 open-center Daoist celestial seal ring)
const ASCENDED_HALO_BAGUA_GRID: PixelGrid = [
  '....YYYYYYYY....',
  '..YYCC....CCYY..',
  '.YCC........CCY.',
  '.YC..........CY.',
  'YC............CY',
  'YC...Y....Y...CY',
  'YC............CY',
  'YC............CY',
  'YC............CY',
  'YC...Y....Y...CY',
  'YC............CY',
  '.YC..........CY.',
  '.YCC........CCY.',
  '..YYCC....CCYY..',
  '....YYYYYYYY....',
];

// Western Toad / White Camel Venom Shockwave Halo (16x16 open-center toxic jade ring)
const ASCENDED_HALO_VENOM_GRID: PixelGrid = [
  '....GGGGGGGG....',
  '..GGYYYYYYYYGG..',
  '.GYY........YYG.',
  '.GY..........YG.',
  'GY............YG',
  'GY............YG',
  'GY............YG',
  'GY............YG',
  'GY............YG',
  'GY............YG',
  '.GY..........YG.',
  '.GYY........YYG.',
  '..GGYYYYYYYYGG..',
  '....GGGGGGGG....',
];

// Cosmic Shifting Stars Celestial Astral Halo (16x16 open-center starlight cosmos ring)
const ASCENDED_HALO_STELLAR_GRID: PixelGrid = [
  '....PPPPPPPP....',
  '..PPWWWWWWWWPP..',
  '.PWW........WWP.',
  '.PW..........WP.',
  'PW............WP',
  'PW............WP',
  'PW............WP',
  'PW............WP',
  'PW............WP',
  'PW............WP',
  '.PW..........WP.',
  '.PWW........WWP.',
  '..PPWWWWWWWWPP..',
  '....PPPPPPPP....',
];

export const registerPixelTextures = (scene: Phaser.Scene): void => {
  // Sumi-e ink-brush painted heroes (64x68, 4 animation frames per class + matching gear overlays)
  for (const classId of CLASS_IDS) {
    registerCanvasTexture(scene, `hero_${classId}`, 64, 68, (ctx) => {
      paintSumiHero(ctx, classId, 'idle');
    });
    registerCanvasTexture(scene, `hero_${classId}_idle`, 64, 68, (ctx) => {
      paintSumiHero(ctx, classId, 'idle');
    });
    registerCanvasTexture(scene, `hero_${classId}_walk`, 64, 68, (ctx) => {
      paintSumiHero(ctx, classId, 'walk');
    });
    registerCanvasTexture(scene, `hero_${classId}_attack`, 64, 68, (ctx) => {
      paintSumiHero(ctx, classId, 'attack');
    });
    registerCanvasTexture(scene, `hero_${classId}_dash`, 64, 68, (ctx) => {
      paintSumiHero(ctx, classId, 'dash');
    });
    registerCanvasTexture(scene, `gear_head_${classId}`, 64, 68, (ctx) => {
      paintSumiGearHead(ctx, classId);
    });
    registerCanvasTexture(scene, `gear_top_${classId}`, 64, 68, (ctx) => {
      paintSumiGearTop(ctx, classId);
    });
    registerCanvasTexture(scene, `gear_wep_${classId}`, 40, 40, (ctx) => {
      paintSumiWeapon(ctx, CLASS_DEFAULT_WEAPON_KIND[classId]);
    });
  }
  registerCanvasTexture(scene, 'gear_cape', 64, 68, (ctx) => {
    paintSumiGearCape(ctx);
  });

  // Combat VFX sprites
  drawPixelGrid(
    scene,
    'fx_slash_arc',
    SLASH_ARC_GRID,
    { T: '#ffffff', M: '#fef08a' },
    5
  );
  drawPixelGrid(
    scene,
    'fx_hit_spark',
    HIT_SPARK_GRID,
    { T: '#ffffff', M: '#fde047' },
    4
  );

  // Companions
  drawPixelGrid(
    scene,
    'pet_hawk',
    HAWK_GRID,
    { A: '#d97706', Y: '#fef08a', E: '#111827', W: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'pet_wolf',
    WOLF_GRID,
    { A: '#38bdf8', E: '#e0f2fe' },
    4
  );
  drawPixelGrid(
    scene,
    'rune_book',
    RUNE_BOOK_GRID,
    { B: '#7c3aed', W: '#fef3c7', G: '#38bdf8' },
    3
  );

  // Sumi-e Sect Cultist mobs (56x60, facing left, warm ivory/silver shaded for biome tinting)
  registerCanvasTexture(scene, 'mob_0', 56, 60, (ctx) => {
    paintSumiMob(ctx, 0);
  });
  registerCanvasTexture(scene, 'mob_1', 56, 60, (ctx) => {
    paintSumiMob(ctx, 1);
  });
  registerCanvasTexture(scene, 'mob_2', 56, 60, (ctx) => {
    paintSumiMob(ctx, 2);
  });

  // Sumi-e Hall Master Mini-Bosses (84x90) & Supreme Cult Leader (104x112), facing left
  registerCanvasTexture(scene, 'miniboss', 84, 90, (ctx) => {
    paintSumiMiniBoss(ctx, 0);
  });
  registerCanvasTexture(scene, 'miniboss_0', 84, 90, (ctx) => {
    paintSumiMiniBoss(ctx, 0);
  });
  registerCanvasTexture(scene, 'miniboss_1', 84, 90, (ctx) => {
    paintSumiMiniBoss(ctx, 1);
  });
  registerCanvasTexture(scene, 'miniboss_2', 84, 90, (ctx) => {
    paintSumiMiniBoss(ctx, 2);
  });
  registerCanvasTexture(scene, 'endboss', 104, 112, (ctx) => {
    paintSumiEndBoss(ctx);
  });

  // Painterly Wuxia held weapons (40x40, white/silver shaded for Phaser tinting)
  registerCanvasTexture(scene, 'wep_wuxia_sword', 40, 40, (ctx) => {
    paintSumiWeapon(ctx, 'sword');
  });
  registerCanvasTexture(scene, 'wep_wuxia_staff', 40, 40, (ctx) => {
    paintSumiWeapon(ctx, 'staff');
  });
  registerCanvasTexture(scene, 'wep_wuxia_heavy_sword', 40, 40, (ctx) => {
    paintSumiWeapon(ctx, 'heavy_sword');
  });
  registerCanvasTexture(scene, 'wep_wuxia_flute', 40, 40, (ctx) => {
    paintSumiWeapon(ctx, 'flute');
  });
  registerCanvasTexture(scene, 'wep_wuxia_needles', 40, 40, (ctx) => {
    paintSumiWeapon(ctx, 'needles');
  });

  // Projectiles & Wuxia Martial Arts (crisp drawPixelGrid sprites oriented facing RIGHT +X)
  // Shared Archetype: Palm Qi Strike (Guo Jing, Yang Guo, Tianshan, Toad Stance)
  drawPixelGrid(
    scene,
    'proj_palm_dragon',
    ARCHETYPE_PALM_GRID,
    { O: '#ea580c', G: '#f59e0b', Y: '#fde047', W: '#fef9c3', R: '#ef4444', T: '#ffffff' },
    3,
    '#7c2d12',
    'rgba(254, 240, 138, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_palm_melancholic',
    ARCHETYPE_PALM_GRID,
    { O: '#312e81', G: '#4338ca', Y: '#6366f1', W: '#a5b4fc', R: '#38bdf8', T: '#ffffff' },
    3,
    '#1e1b4b',
    'rgba(186, 230, 253, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_palm_tianshan',
    ARCHETYPE_PALM_GRID,
    { O: '#9f1239', G: '#be123c', Y: '#f43f5e', W: '#fbcfe8', R: '#e11d48', T: '#ffffff' },
    3,
    '#500724',
    'rgba(251, 207, 232, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_palm_toad',
    ARCHETYPE_PALM_GRID,
    { O: '#065f46', G: '#047857', Y: '#10b981', W: '#6ee7b7', R: '#facc15', T: '#ffffff' },
    3,
    '#022c22',
    'rgba(190, 242, 100, 0.6)'
  );

  // Shared Archetype: Flying Swords (Jade Maiden, Taiji Yin-Yang)
  drawPixelGrid(
    scene,
    'proj_sword_jade',
    ARCHETYPE_FLYING_SWORD_GRID,
    { R: '#f43f5e', K: '#334155', G: '#fbbf24', B: '#38bdf8', W: '#e0f2fe', T: '#ffffff' },
    3,
    '#4c0519',
    'rgba(224, 242, 254, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_sword_taiji',
    ARCHETYPE_FLYING_SWORD_GRID,
    { R: '#fde047', K: '#0f172a', G: '#334155', B: '#1e293b', W: '#f8fafc', T: '#67e8f9' },
    3,
    '#090d16',
    'rgba(103, 232, 249, 0.6)'
  );

  // Shared Archetype: Heavy Blades & Sabers (Xuantie Heavy Iron, Dragon-Slaying Saber)
  drawPixelGrid(
    scene,
    'proj_blade_iron',
    ARCHETYPE_HEAVY_BLADE_GRID,
    { G: '#fbbf24', K: '#334155', S: '#94a3b8', B: '#3b0764', P: '#a855f7', W: '#f5d0fe', T: '#ffffff' },
    3,
    '#2e1065',
    'rgba(245, 208, 254, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_blade_dragon_saber',
    ARCHETYPE_HEAVY_BLADE_GRID,
    { G: '#d97706', K: '#451a03', S: '#78350f', B: '#b45309', P: '#f59e0b', W: '#fef08a', T: '#ffffff' },
    3,
    '#451a03',
    'rgba(254, 240, 138, 0.65)'
  );

  // Shared Archetype: Whirling Vortex Wheels (Dog-Beating Staff, Great Shift, Shifting Stars)
  drawPixelGrid(
    scene,
    'proj_vortex_staff',
    ARCHETYPE_VORTEX_WHEEL_GRID,
    { G: '#10b981', C: '#6ee7b7', E: '#047857', W: '#fef08a' },
    3,
    '#064e3b',
    'rgba(167, 243, 208, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_vortex_qiankun',
    ARCHETYPE_VORTEX_WHEEL_GRID,
    { G: '#ea580c', C: '#facc15', E: '#991b1b', W: '#ffffff' },
    3,
    '#450a0a',
    'rgba(254, 240, 138, 0.65)'
  );
  drawPixelGrid(
    scene,
    'proj_vortex_shifting_stars',
    ARCHETYPE_VORTEX_WHEEL_GRID,
    { G: '#6366f1', C: '#a5b4fc', E: '#312e81', W: '#ffffff' },
    3,
    '#1e1b4b',
    'rgba(199, 210, 254, 0.6)'
  );

  // Shared Archetype: Meridian Lances & Needles (Six-Pulse Divine Sword, Flicking Finger)
  drawPixelGrid(
    scene,
    'proj_lance_six_pulse',
    ARCHETYPE_MERIDIAN_LANCE_GRID,
    { G: '#f59e0b', Y: '#fde047', C: '#06b6d4', W: '#cffafe', T: '#ffffff' },
    3,
    '#164e63',
    'rgba(207, 250, 254, 0.65)'
  );
  drawPixelGrid(
    scene,
    'proj_lance_finger',
    ARCHETYPE_MERIDIAN_LANCE_GRID,
    { G: '#ef4444', Y: '#f97316', C: '#f59e0b', W: '#fef08a', T: '#ffffff' },
    3,
    '#7c2d12',
    'rgba(254, 240, 138, 0.65)'
  );

  // Shared Archetype: Sonic Crescent Waves (Peach Blossom Flute)
  drawPixelGrid(
    scene,
    'proj_wave_flute',
    ARCHETYPE_SONIC_WAVE_GRID,
    { C: '#2dd4bf', W: '#99f6e4', T: '#ffffff', N: '#f472b6' },
    3,
    '#134e4a',
    'rgba(153, 246, 228, 0.6)'
  );

  // Ascended Martial Arts Halos & Celestial Aura Rings
  drawPixelGrid(
    scene,
    'fx_ascended_halo_dragon',
    ASCENDED_HALO_DRAGON_GRID,
    { O: '#ea580c', Y: '#fde047', T: '#ffffff' },
    3,
    '#7c2d12',
    'rgba(254, 240, 138, 0.7)'
  );
  drawPixelGrid(
    scene,
    'fx_ascended_halo_lotus',
    ASCENDED_HALO_LOTUS_GRID,
    { P: '#f472b6', W: '#e0f2fe', T: '#ffffff' },
    3,
    '#4c0519',
    'rgba(244, 114, 182, 0.65)'
  );
  drawPixelGrid(
    scene,
    'fx_ascended_halo_bagua',
    ASCENDED_HALO_BAGUA_GRID,
    { Y: '#fde047', C: '#38bdf8' },
    3,
    '#090d16',
    'rgba(103, 232, 249, 0.65)'
  );
  drawPixelGrid(
    scene,
    'fx_ascended_halo_venom',
    ASCENDED_HALO_VENOM_GRID,
    { G: '#047857', Y: '#4ade80' },
    3,
    '#022c22',
    'rgba(163, 230, 53, 0.65)'
  );
  drawPixelGrid(
    scene,
    'fx_ascended_halo_stellar',
    ASCENDED_HALO_STELLAR_GRID,
    { P: '#6366f1', W: '#c7d2fe' },
    3,
    '#1e1b4b',
    'rgba(199, 210, 254, 0.65)'
  );

  // Legacy texture aliases mapped to archetype grids
  drawPixelGrid(
    scene,
    'proj_palm_qi',
    ARCHETYPE_PALM_GRID,
    { O: '#ea580c', G: '#f59e0b', Y: '#fde047', W: '#fef9c3', R: '#ef4444', T: '#ffffff' },
    3,
    '#7c2d12',
    'rgba(254, 240, 138, 0.6)'
  );
  drawPixelGrid(
    scene,
    'proj_bolt',
    [
      '....CCCC..',
      '..CCWWWWC.',
      '.CCWWTTTTT',
      'CCWWTTTTTT',
      'CCWWTTTTTT',
      '.CCWWTTTTT',
      '..CCWWWWC.',
      '....CCCC..',
    ],
    { C: '#38bdf8', W: '#bae6fd', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_star',
    [
      '....P....',
      '...PWP...',
      '..PPWPP..',
      '.PPWTWPP.',
      'PWWTTTWWP',
      '.PPWTWPP.',
      '..PPWPP..',
      '...PWP...',
      '....P....',
    ],
    { P: '#c084fc', W: '#e9d5ff', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_orb_hp',
    [
      '..GGGG..',
      '.GWWWWG.',
      'GWWTTWWG',
      'GWTTTTWG',
      'GWTTTTWG',
      'GWWTTWWG',
      '.GWWWWG.',
      '..GGGG..',
    ],
    { G: '#22c55e', W: '#bbf7d0', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_lightning',
    [
      '....YYYY....',
      '..YYYYTT....',
      'YYYYTTWW....',
      '..TTWWWWYYYY',
      '....WWTTTTTT',
      '......YYYY..',
      '........YY..',
    ],
    { Y: '#eab308', W: '#fef08a', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_arrow',
    [
      '......WW..',
      '..YYYYWWT.',
      'YYYYYYWWTT',
      '..YYYYWWT.',
      '......WW..',
    ],
    { Y: '#fde047', W: '#e2e8f0', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_hawk_feather',
    [
      '.....YY..',
      '..AAAYYWT',
      'AAAAAYYWW',
      '..AAAYYWT',
      '.....YY..',
    ],
    { A: '#d97706', Y: '#fef08a', W: '#fef9c3', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_wolf_fang',
    [
      '..CC....',
      '...CCW..',
      '....CWWT',
      '.....WWT',
      '.....WWT',
      '....CWWT',
      '...CCW..',
      '..CC....',
    ],
    { C: '#38bdf8', W: '#e0f2fe', T: '#ffffff' },
    3
  );
  drawPixelGrid(
    scene,
    'proj_wave',
    [
      '.OO.......',
      '..OOY.....',
      '...OOYW...',
      '....OYWT..',
      '....OOYWT.',
      '.....OYWT.',
      '.....OYWTT',
      '.....OYWTT',
      '.....OYWTT',
      '.....OYWTT',
      '.....OYWT.',
      '....OOYWT.',
      '....OYWT..',
      '...OOYW...',
      '..OOY.....',
      '.OO.......',
    ],
    { O: '#f97316', Y: '#fde047', W: '#fef9c3', T: '#ffffff' },
    3
  );

  // Taiji / Dantian Bagua Seal
  drawPixelGrid(
    scene,
    'fx_taiji_seal',
    [
      '...YYYYYY...',
      '..YKKKKWWY..',
      '.YKKKKWWWWY.',
      'YKKKKWWCWWWY',
      'YKKKKKWWWWWY',
      'YKKKKKWWWWWY',
      'YKKKKKKWWWWY',
      'YKKDKKKWWWWY',
      'YKKKKWWWWWWY',
      '.YKKKWWWWWY.',
      '..YYKKWWYY..',
      '...YYYYYY...',
    ],
    { Y: '#fde047', K: '#0f172a', W: '#fef9c3', C: '#38bdf8', D: '#1e293b' },
    3
  );

  // 18 Dragon-Subduing Palms Pixel Qi Wave (facing RIGHT +X)
  drawPixelGrid(
    scene,
    'fx_dragon_palm',
    [
      '.....OOOO.......',
      '...OOYYYYYYO....',
      '..OYYYYYWWYYYO..',
      'OOYYYYWWRRWWYYTT',
      'GYYYYWWWWWWWT...',
      'GGYYWWWWWWW.....',
      'GYYYYWWWWWWWT...',
      'OOYYYYWWWWWWWWTT',
      '..OYYYYYYYYYOO..',
      '....OOYYYYOO....',
      '......OOOO......',
    ],
    { O: '#ea580c', G: '#f59e0b', Y: '#fde047', W: '#fef9c3', R: '#ef4444', T: '#ffffff' },
    3
  );

  // Jade Maiden Flying Sword (tassel left, sharp blade tip RIGHT +X)
  drawPixelGrid(
    scene,
    'fx_jade_sword',
    [
      '.....G..........',
      '....GGG.........',
      'RR..GGBBBBBBBBT.',
      'RKKGGWWWWWWWWWTT',
      'RR..GGBBBBBBBBT.',
      '....GGG.........',
      '.....G..........',
    ],
    { R: '#f43f5e', K: '#334155', G: '#fbbf24', B: '#38bdf8', W: '#e0f2fe', T: '#ffffff' },
    3
  );

  // Beggar Sect Whirling Emerald Staff Wheel
  drawPixelGrid(
    scene,
    'fx_staff_wheel',
    [
      '...CCCCCCCC...',
      '..CC......CC..',
      '.CC...WW....C.',
      'CC..........WC',
      '.C..........W.',
      'GGGGGGGGGGGGGG',
      'EWWEGGGGGGWWWE',
      'GGGGGGGGGGGGGG',
      '.W..........C.',
      'CW..........CC',
      '.C....WW...CC.',
      '..CC......CC..',
      '...CCCCCCCC...',
      '..............',
    ],
    { G: '#10b981', C: '#6ee7b7', E: '#047857', W: '#fef08a' },
    3
  );

  // Xuantie Heavy Iron Greatsword (pommel left, broad obsidian blade RIGHT +X)
  drawPixelGrid(
    scene,
    'fx_iron_cleave',
    [
      '...SS...........',
      '...SS...........',
      '...SSBBBBBBBBBB.',
      'GKKSSPPPPPPPPBBT',
      'GKKSSWWWWWWWWTTT',
      'GKKSSPPPPPPPPBBT',
      '...SSBBBBBBBBBB.',
      '...SS...........',
      '...SS...........',
    ],
    { G: '#fbbf24', K: '#334155', S: '#94a3b8', B: '#3b0764', P: '#a855f7', W: '#f5d0fe', T: '#ffffff' },
    3
  );

  // Peach Blossom Jade Flute Sonic Crescent Wave (facing RIGHT +X)
  drawPixelGrid(
    scene,
    'fx_flute_wave',
    [
      '......CCCC..',
      '........CCW.',
      '..NNN....WCT',
      '..N.N....WCT',
      'NNN......WWT',
      'NNN......WWT',
      '..N......WCT',
      '........CCW.',
      '......CCCC..',
      '............',
    ],
    { C: '#2dd4bf', W: '#99f6e4', T: '#ffffff', N: '#f472b6' },
    3
  );

  // Melancholic Soul-Severing Palm — Base: Surging Indigo Sea-Tide Palm Wave (facing RIGHT +X)
  drawPixelGrid(
    scene,
    'fx_ice_needle',
    [
      '....BBBBBB......',
      '..BBCCCCCCBB....',
      '.BCCWWWWWWCCBT..',
      'BCWWYYYYYYWWCTTT',
      'BCWWYYYYYYWWCTTT',
      '.BCCWWWWWWCCBT..',
      '..BBCCCCCCBB....',
      '....BBBBBB......',
    ],
    { B: '#4f46e5', C: '#818cf8', Y: '#38bdf8', W: '#e0e7ff', T: '#ffffff' },
    3
  );

  // ==================== EVOLVED ULTIMATE & GRANDMASTER MARTIAL ARTS TEXTURES ====================

  // 18 Dragon Palms — Grandmaster / Sovereign Form (24x14 Imperial Coiled Golden Dragon)
  drawPixelGrid(
    scene,
    'fx_dragon_sovereign',
    [
      '.......RRR....OOO.......',
      '.....RRRRYY..OOOOYYO....',
      '...OOYYYYYYYYYYYYWWYYO..',
      '.CCYYYYWWWYYYYWWWRWWYYTT',
      'CCCGGGYYYYWWWWWWWWTTT...',
      '..OOOOGGGYYYYWWWWWT.....',
      'YYYYGGGGYYYYYYWWWWWW....',
      '..OOOOGGGYYYYWWWWWT.....',
      'CCCGGGYYYYWWWWWWWWTTT...',
      '.CCYYYYWWWYYYYWWWWWWYYTT',
      '...OOYYYYYYYYYYYYWWYYO..',
      '.....OOYYYYYYYYYYYOO....',
      '.......OOOOYYYYOO.......',
      '...........OOOO.........',
    ],
    {
      R: '#dc2626',
      O: '#ea580c',
      G: '#f59e0b',
      Y: '#facc15',
      W: '#fef9c3',
      T: '#ffffff',
      C: '#38bdf8',
    },
    3
  );

  // Jade Maiden Swordplay — Ultimate: Crossed Twin Jade-Moon Lotus Blades
  drawPixelGrid(
    scene,
    'fx_jade_twin_lotus',
    [
      '....PPP.....B.....',
      '.RR..PPGGGGGBBBT..',
      '..RKK.GGWWWWWWBBTT',
      '...PPGGGWWWWWWWWTT',
      '..RRRGGGGGGGWWWWTT',
      '...PPGGGWWWWWWWWTT',
      '..RKK.GGWWWWWWBBTT',
      '.RR..PPGGGGGBBBT..',
      '....PPP.....B.....',
    ],
    {
      R: '#e11d48',
      P: '#f472b6',
      K: '#334155',
      G: '#fbbf24',
      B: '#38bdf8',
      W: '#e0f2fe',
      T: '#ffffff',
    },
    3
  );

  // Jade Maiden Swordplay — Grandmaster: Celestial Condor-Wing Sword Array (5 fanned divine blades)
  drawPixelGrid(
    scene,
    'fx_jade_condor_array',
    [
      '...PPPP.......BBBBT...',
      '..RR.GGG..BBBBWWWWTT..',
      '.....GGGGBBBBWWWWWWTT.',
      '.PP..GGGGYYWWTTTTTTTTT',
      'RRRGGYYYYWWWWWWWWWWTTT',
      '.PP..GGGGYYWWTTTTTTTTT',
      '.....GGGGBBBBWWWWWWTT.',
      '..RR.GGG..BBBBWWWWTT..',
      '...PPPP.......BBBBT...',
    ],
    {
      R: '#f43f5e',
      P: '#fbcfe8',
      G: '#f59e0b',
      Y: '#fde047',
      B: '#06b6d4',
      W: '#e0f2fe',
      T: '#ffffff',
    },
    3
  );

  // Dog-Beating Staff — Ultimate: Dragon-Coiled Cyclone Vortex
  drawPixelGrid(
    scene,
    'fx_staff_dragon_vortex',
    [
      '....YYYYYYYY....',
      '..YYCCCCCCCCYY..',
      '.YCWWWWWWWWWWCY.',
      'YCWW..GGGG..WWCY',
      'YCW..GYYYYG..WCY',
      'GGGGGGGGGGGGGGGG',
      'YEEYYWWWWWWYYEEY',
      'GGGGGGGGGGGGGGGG',
      'YCW..GYYYYG..WCY',
      'YCWW..GGGG..WWCY',
      '.YCWWWWWWWWWWCY.',
      '..YYCCCCCCCCYY..',
      '....YYYYYYYY....',
    ],
    { G: '#10b981', E: '#047857', C: '#6ee7b7', Y: '#facc15', W: '#fef9c3' },
    3
  );

  // Dog-Beating Staff — Grandmaster: Eight-Trigram Bagua Emerald Array
  drawPixelGrid(
    scene,
    'fx_staff_bagua_domain',
    [
      '.....YYYYYYYY.....',
      '...YYGGGGGGGGYY...',
      '..YGGCCCCCCCCGGY..',
      '.YGCCCWWWWWWCCCGY.',
      '.YGCWWYYYYYYWWCGY.',
      'GGGGGGGGTTGGGGGGGG',
      'YEEYYWWTTTTWWYYEEY',
      'GGGGGGGGTTGGGGGGGG',
      '.YGCWWYYYYYYWWCGY.',
      '.YGCCCWWWWWWCCCGY.',
      '..YGGCCCCCCCCGGY..',
      '...YYGGGGGGGGYY...',
      '.....YYYYYYYY.....',
    ],
    { G: '#10b981', E: '#065f46', C: '#34d399', Y: '#fde047', W: '#fef9c3', T: '#ffffff' },
    3
  );

  // Xuantie Heavy Iron — Ultimate: Colossus Tectonic Greatsword
  drawPixelGrid(
    scene,
    'fx_iron_colossus_blade',
    [
      '....GG................',
      '....GGPPPPPPPPPPBB....',
      '.GG.GGWWWWWWWWWWPPBB..',
      'GKKGGGPPPRRRRPPPWWBBTT',
      'GKKGGGTTTTTTTTTTWWWWTT',
      'GKKGGGPPPRRRRPPPWWBBTT',
      '.GG.GGWWWWWWWWWWPPBB..',
      '....GGPPPPPPPPPPBB....',
      '....GG................',
    ],
    {
      G: '#f59e0b',
      K: '#1e293b',
      B: '#3b0764',
      P: '#9333ea',
      R: '#f43f5e',
      W: '#f5d0fe',
      T: '#ffffff',
    },
    3
  );

  // Xuantie Heavy Iron — Grandmaster: Sword-Tomb Cataclysm Monolith
  drawPixelGrid(
    scene,
    'fx_iron_sword_tomb',
    [
      '.....RRR..............',
      '...GGGGPPPPPPPPBBBB...',
      '..GKKGGWWWWWWWWPPBBT..',
      '.GKKGGGPRRRRRRPWWBBTT.',
      'YGKKGGGTTTTTTTTTTTTTTT',
      '.GKKGGGPRRRRRRPWWBBTT.',
      '..GKKGGWWWWWWWWPPBBT..',
      '...GGGGPPPPPPPPBBBB...',
      '.....RRR..............',
    ],
    {
      Y: '#fde047',
      G: '#fbbf24',
      K: '#0f172a',
      B: '#581c87',
      P: '#c084fc',
      R: '#ef4444',
      W: '#fae8ff',
      T: '#ffffff',
    },
    3
  );

  // Peach Blossom Flute — Ultimate: Soaring Phoenix Sonic Crest
  drawPixelGrid(
    scene,
    'fx_flute_phoenix_chord',
    [
      '.....PPPPP......',
      '.......YYCCC....',
      '..PPP....YYWCCT.',
      '.PPPPP....YWCTWT',
      'PPYYY......WWTTT',
      '.PPPPP....YWCTWT',
      '..PPP....YYWCCT.',
      '.......YYCCC....',
      '.....PPPPP......',
    ],
    { P: '#ec4899', Y: '#facc15', C: '#2dd4bf', W: '#ccfbf1', T: '#ffffff' },
    3
  );

  // Peach Blossom Flute — Grandmaster: Azure-Sea Tidal Dragon Soundwave
  drawPixelGrid(
    scene,
    'fx_flute_tidal_dragon',
    [
      '....PPPP..CCCCCC....',
      '..PPYYYYCCCCWWWWCT..',
      '.PPYY..CCCWWWWWWTTT.',
      'PPYY....CCWWTTTTWWTT',
      'PPYYY...CCWWTTTTTTTT',
      'PPYY....CCWWTTTTWWTT',
      '.PPYY..CCCWWWWWWTTT.',
      '..PPYYYYCCCCWWWWCT..',
      '....PPPP..CCCCCC....',
    ],
    { P: '#f472b6', Y: '#fde047', C: '#14b8a6', W: '#99f6e4', T: '#ffffff' },
    3
  );

  // Melancholic Soul-Severing Palm — Ultimate: Heartbreak Crashing Sea-Tide Palm Crest
  drawPixelGrid(
    scene,
    'fx_ice_crystal_spear',
    [
      '.....BBBBBBBB.....',
      '...BBCCCCCCCCBB...',
      '..BCCYYYYYYYYCCBT.',
      '.BCYYWWWWWWWWYYCTT',
      'BCYWWTTTTTTTTWWCTT',
      'BCYWWTTTTTTTTWWCTT',
      '.BCYYWWWWWWWWYYCTT',
      '..BCCYYYYYYYYCCBT.',
      '...BBCCCCCCCCBB...',
      '.....BBBBBBBB.....',
    ],
    { B: '#4338ca', C: '#6366f1', Y: '#38bdf8', W: '#bae6fd', T: '#ffffff' },
    3
  );

  // Melancholic Soul-Severing Palm — Grandmaster: Sovereign Abyssal Condor Sea-Tide Palm
  drawPixelGrid(
    scene,
    'fx_ice_blizzard_lotus',
    [
      '.....PPPP....BBBBBB...',
      '...PPBBBBBBBBCCCCCCBT.',
      '..PBBCCCCCCCCYYYYYYCTT',
      '.PBCYYYYYYYYWWWWWWWWTT',
      'PBCYWWWWWWWWTTTTTTTTTT',
      'PBCYWWWWWWWWTTTTTTTTTT',
      '.PBCYYYYYYYYWWWWWWWWTT',
      '..PBBCCCCCCCCYYYYYYCTT',
      '...PPBBBBBBBBCCCCCCBT.',
      '.....PPPP....BBBBBB...',
    ],
    { P: '#a855f7', B: '#4f46e5', C: '#38bdf8', Y: '#7dd3fc', W: '#e0f2fe', T: '#ffffff' },
    3
  );

  // Six-Pulse Divine Sword — Ultimate: Royal Golden-Cyan Meridian Lance
  drawPixelGrid(
    scene,
    'fx_six_pulse_lance',
    [
      '....YYCCCCCCC.....',
      '..YYCCWWWWWWWCC...',
      'GGYYWWTTTTTTTTTTTT',
      'YYYYTTTTTTTTTTTTTT',
      'GGYYWWTTTTTTTTTTTT',
      '..YYCCWWWWWWWCC...',
      '....YYCCCCCCC.....',
    ],
    { G: '#f59e0b', Y: '#fde047', C: '#06b6d4', W: '#cffafe', T: '#ffffff' },
    3
  );

  // Six-Pulse Divine Sword — Grandmaster: Heaven-Piercing Sovereign Meridian Beam
  drawPixelGrid(
    scene,
    'fx_six_pulse_sovereign',
    [
      '..YYYYCCCCCCCCC.......',
      'GGYYYYWWWWWWWWWCCCC...',
      'YYYYWWWWTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTT',
      'YYYYWWWWTTTTTTTTTTTTTT',
      'GGYYYYWWWWWWWWWCCCC...',
      '..YYYYCCCCCCCCC.......',
    ],
    { G: '#f59e0b', Y: '#facc15', C: '#22d3ee', W: '#ecfeff', T: '#ffffff' },
    3
  );

  // Flicking Finger Divine Thrum — Ultimate: Blazing Solar Meteor Orb
  drawPixelGrid(
    scene,
    'fx_finger_solar_orb',
    [
      '...RRRRRR...',
      '.RROOOOOORR.',
      'ROYYYYYYYYOR',
      'ROYYWWWWYYOR',
      'ROYWTTTTWYOR',
      'ROYYWWWWYYOR',
      'ROYYYYYYYYOR',
      '.RROOOOOORR.',
      '...RRRRRR...',
    ],
    { R: '#ef4444', O: '#f97316', Y: '#facc15', W: '#fef9c3', T: '#ffffff' },
    3
  );

  // Flicking Finger Divine Thrum — Grandmaster: Ten-Dragon Starburst Supernova
  drawPixelGrid(
    scene,
    'fx_finger_supernova',
    [
      '....TT....TT....',
      '..RROOYYYYOORR..',
      '.ROYYWWWWWWYYOR.',
      'TROWTTTTTTTTWORT',
      'TROWTTTTTTTTWORT',
      '.ROYYWWWWWWYYOR.',
      '..RROOYYYYOORR..',
      '....TT....TT....',
    ],
    { R: '#dc2626', O: '#fb923c', Y: '#fde047', W: '#fef9c3', T: '#ffffff' },
    3
  );

  // Loot & hazards
  drawPixelGrid(scene, 'loot_coin', COIN_GRID, { Y: '#facc15', W: '#fef9c3' }, 3);
  drawPixelGrid(scene, 'loot_chest', CHEST_GRID, { B: '#78350f', Y: '#fbbf24', W: '#fef08a' }, 4);
  drawPixelGrid(scene, 'bomb_hazard', BOMB_GRID, { R: '#ef4444', K: '#1e293b' }, 4);
};
