import type * as Phaser from 'phaser';
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
  normal: { hex: 0xcbd5e1, css: '#cbd5e1' },
  rare: { hex: 0x38bdf8, css: '#38bdf8' },
  legendary: { hex: 0xfbbf24, css: '#fbbf24' },
};

const CURSED_COLOR = { hex: 0xc084fc, css: '#c084fc' };

const ELEMENT_COLORS: Record<ElementId, { hex: number; css: string }> = {
  fire: { hex: 0xf97316, css: '#f97316' },
  ice: { hex: 0x67e8f9, css: '#67e8f9' },
  lightning: { hex: 0xfde047, css: '#fde047' },
  dark: { hex: 0xa855f7, css: '#a855f7' },
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
    hasWeapon: equipped.weapon !== null,
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
  tintCss: string | null = null
): void => {
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = tintCss ? multiplyHex(color, tintCss) : color;
      ctx.fillRect(offsetX + c * pixelSize, offsetY + r * pixelSize, pixelSize, pixelSize);
    }
  }
};

const drawPixelGrid = (
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  palette: Palette,
  pixelSize: number
): void => {
  if (scene.textures.exists(key)) return;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  const tex = scene.textures.createCanvas(key, cols * pixelSize, rows * pixelSize);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, cols * pixelSize, rows * pixelSize);
  drawGridToContext(ctx, grid, palette, pixelSize);
  tex.refresh();
};

const drawCircleTexture = (
  scene: Phaser.Scene,
  key: string,
  size: number,
  outerColor: string,
  innerColor: string
): void => {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const half = size / 2;
  ctx.fillStyle = outerColor;
  ctx.beginPath();
  ctx.arc(half, half, half - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = innerColor;
  ctx.beginPath();
  ctx.arc(half, half, Math.max(2, half - 4), 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
};

// Chibi 14x14 sprites (MapleStory-inspired big head, expressive eyes, compact body)
const WARRIOR_GRID: PixelGrid = [
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '..HSSSSSSSSSH.',
  '...SSSSSSSS...',
  '..AAAAAAAAAA..',
  '.AAAWAAAAAWAA.',
  '.AAAWAAAAAWAA.',
  '..AAWWWWWWAA..',
  '...BBBBBBBB...',
  '...BB....BB...',
  '..KKK....KKK..',
  '..............',
];

const MAGE_GRID: PixelGrid = [
  '.....HHHH.....',
  '....HHHHHH....',
  '..HHHHHHHHHH..',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '...SSSSSSSS...',
  '..RRRRRRRRRR..',
  '.RRRRWRRWRRRR.',
  '.RRRRWWWWWRRR.',
  '..RRRRRRRRRR..',
  '...RRRRRRRR...',
  '...RR....RR...',
  '..KKK....KKK..',
  '..............',
];

const THIEF_GRID: PixelGrid = [
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHHHHHHHHH..',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '..HHMMMMMMHH..',
  '..DDDDDDDDDD..',
  '.DDDADDDDADDD.',
  '..DDDDDDDDDD..',
  '..SSDDDDDDSS..',
  '...DD....DD...',
  '...DD....DD...',
  '..KKK....KKK..',
  '..............',
];

const BOWMAN_GRID: PixelGrid = [
  '....GGGGGG....',
  '...GGGGGGGG...',
  '..GGSSSSSSGG..',
  '..GSSESSSESG..',
  '...SSSSSSSS...',
  '..GGGGGGGGGG..',
  '.GGGWGGGGWGGG.',
  '..GGWWWWWWGG..',
  '...GGGGGGGG...',
  '...BB....BB...',
  '...BB....BB...',
  '..KKK....KKK..',
  '..............',
  '..............',
];

const HERO_GRIDS: Record<ClassId, { grid: PixelGrid; palette: Palette }> = {
  warrior: {
    grid: WARRIOR_GRID,
    palette: {
      H: '#b91c1c',
      S: '#fed7aa',
      E: '#111827',
      A: '#94a3b8',
      W: '#facc15',
      B: '#475569',
      K: '#1e293b',
    },
  },
  mage: {
    grid: MAGE_GRID,
    palette: {
      H: '#1e3a8a',
      S: '#fed7aa',
      E: '#111827',
      R: '#2563eb',
      W: '#fbbf24',
      K: '#312e81',
    },
  },
  thief: {
    grid: THIEF_GRID,
    palette: {
      H: '#4c1d95',
      S: '#fed7aa',
      E: '#f43f5e',
      M: '#1e1b4b',
      D: '#312e81',
      A: '#c084fc',
      K: '#09090b',
    },
  },
  bowman: {
    grid: BOWMAN_GRID,
    palette: {
      G: '#15803d',
      S: '#fed7aa',
      E: '#111827',
      W: '#fde047',
      B: '#78350f',
      K: '#451a03',
    },
  },
};

// Layered Gear Paperdoll Grids (white/silver shaded so tinting works in both Phaser and <canvas>)
const GEAR_CAPE_GRID: PixelGrid = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '.TTT..........',
  'TTTMM.........',
  'TTMMM.........',
  'TTMMMS........',
  'TTMMMS........',
  '.TMSSS........',
  '.TSSS.........',
  '..............',
  '..............',
];

const GEAR_HEAD_GRIDS: Record<ClassId, PixelGrid> = {
  warrior: [
    '..TT......TT..',
    '..TTMMMMMMTT..',
    '..MMMMMMMMMM..',
    '.MMTT....TTMM.',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
  mage: [
    '......MM......',
    '.....MMMM.....',
    '....MMTTMM....',
    '..MMMMMMMMMM..',
    '.TTTTTTTTTTTT.',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
  thief: [
    '...MMMMMMMM...',
    '..MMMMMMMMMM..',
    '..MM......MM..',
    '..............',
    '..TTTTTTTTTT..',
    '...SSSSSSSS...',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
  bowman: [
    '..........TT..',
    '...MMMMMMMMT..',
    '..MMMMMMMMMM..',
    '.TTTTTTTTTTTT.',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
};

const GEAR_TOP_GRIDS: Record<ClassId, PixelGrid> = {
  warrior: [
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '.TTMMMMMMMMTT.',
    '.MMTMTTTTMTMM.',
    '..MMMMMMMMMM..',
    '..SSSTTTTSSS..',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
  mage: [
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..TTMMMMMMTT..',
    '.MMMTTTTTTMMM.',
    '.MMSSSSSSSSMM.',
    '..TTTTTTTTTT..',
    '..SSSSSSSSSS..',
    '..............',
    '..............',
    '..............',
  ],
  thief: [
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..MMMMMMMMMM..',
    '.MMTMMMMMMTMM.',
    '..MMTTTTTTMM..',
    '...SSSSSSSS...',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
  bowman: [
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
    '..TTMMMMMMTT..',
    '.MMTTTTTTTTMM.',
    '..MMMMMMMMMM..',
    '..SSSSSSSSSS..',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............',
  ],
};

// Held Weapon Grids (rendered as standalone textures for swinging / recoil animations)
const GEAR_WEAPON_GRIDS: Record<ClassId, PixelGrid> = {
  warrior: [
    '..........TT',
    '.........TTM',
    '........TTMM',
    '.......TTMM.',
    '......TTMM..',
    '.....TTMM...',
    '....TTMM....',
    '..SSTTM.....',
    '...KKSS.....',
    '..KKK.......',
    '.KK.........',
    '............',
  ],
  mage: [
    '......TTTT',
    '.....TTWWT',
    '......TTTT',
    '.......MM.',
    '......MM..',
    '.....KK...',
    '....KK....',
    '...KK.....',
    '..KK......',
    '.KK.......',
    '.K........',
    '..........',
  ],
  thief: [
    '........TT',
    '.......TTM',
    '......TTMM',
    '.....SSKM.',
    '....KK....',
    '........TT',
    '.......TTM',
    '......SSMM',
    '.....KK...',
    '..........',
  ],
  bowman: [
    '..TT....',
    '...MMW..',
    '....MMW.',
    '....MMW.',
    '...KKMW.',
    '...KKMW.',
    '...KKMW.',
    '....MMW.',
    '....MMW.',
    '...MMW..',
    '..TT....',
    '........',
  ],
};

const GEAR_SHADE_PALETTE: Palette = {
  T: '#ffffff',
  M: '#e2e8f0',
  S: '#94a3b8',
  W: '#fef08a',
  K: '#475569',
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

// Slime/Mushroom style normal mobs
const MOB_SLIME_GRID: PixelGrid = [
  '....MMMM....',
  '..MMMMMMMM..',
  '.MMMMMMMMMM.',
  'MMMEEMMMMEEM',
  'MMMMMMMMMMMM',
  'MMDDDDDDDDMM',
  '.MMMMMMMMMM.',
];

const MOB_MUSH_GRID: PixelGrid = [
  '..CCCCCCCC..',
  '.CCWCCCCWCC.',
  'CCCCCCCCCCCC',
  '..SSSSSSSS..',
  '..SSEESSEE..',
  '..SSSSSSSS..',
  '...SS..SS...',
];

const MOB_HORNED_GRID: PixelGrid = [
  '.K........K.',
  '..MM....MM..',
  '.MMMMMMMMMM.',
  'MMMEEMMMMEEM',
  'MMDDDDDDDDMM',
  '.MMMMMMMMMM.',
  '..MM....MM..',
];

// Large Boss sprites
const MINIBOSS_GRID: PixelGrid = [
  '...YYYYYY...',
  '..MMMMMMMM..',
  '.MMMMMMMMMM.',
  'MMMEEMMMMEEM',
  'MMMMMMMMMMMM',
  'MMWWWWWWWWMM',
  'MMDDDDDDDDMM',
  '.MMMMMMMMMM.',
  '..MM....MM..',
];

const ENDBOSS_GRID: PixelGrid = [
  '.Y..YYYY..Y.',
  '.YYYYYYYYYY.',
  'MMMMMMMMMMMM',
  'MMEEEMMEEEMM',
  'MMRRRRRRRRMM',
  'MMWWWWWWWWMM',
  'MMDDDDDDDDMM',
  'MMMMMMMMMMMM',
  '.MMM....MMM.',
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
  ctx.imageSmoothingEnabled = false;

  const style = getGearVisualStyle(classId, equipped);
  const pixelSize = Math.max(2, Math.floor(Math.min(w, h) / 18));
  const heroOffsetX = Math.round((w - 14 * pixelSize) / 2) - Math.round(pixelSize * 1.2);
  const heroOffsetY = Math.round((h - 14 * pixelSize) / 2);

  // Subtle weapon elemental aura behind character
  if (style.weaponGlowCss) {
    const cx = heroOffsetX + 12 * pixelSize;
    const cy = heroOffsetY + 7 * pixelSize;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, pixelSize * 5);
    grad.addColorStop(0, `${style.weaponGlowCss}66`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 1. Cape layer behind body
  if (style.hasCape) {
    drawGridToContext(ctx, GEAR_CAPE_GRID, GEAR_SHADE_PALETTE, pixelSize, heroOffsetX, heroOffsetY, style.capeCss);
  }

  // 2. Base character sprite
  const heroCfg = HERO_GRIDS[classId];
  drawGridToContext(ctx, heroCfg.grid, heroCfg.palette, pixelSize, heroOffsetX, heroOffsetY, null);

  // 3. Equipped Armor Top
  if (style.hasTop) {
    drawGridToContext(
      ctx,
      GEAR_TOP_GRIDS[classId],
      GEAR_SHADE_PALETTE,
      pixelSize,
      heroOffsetX,
      heroOffsetY,
      style.topCss
    );
  }

  // 4. Equipped Headgear
  if (style.hasHead) {
    drawGridToContext(
      ctx,
      GEAR_HEAD_GRIDS[classId],
      GEAR_SHADE_PALETTE,
      pixelSize,
      heroOffsetX,
      heroOffsetY,
      style.headCss
    );
  }

  // 5. Held Weapon in right hand
  if (style.hasWeapon) {
    const wepGrid = GEAR_WEAPON_GRIDS[classId];
    const wepPixel = Math.max(2, Math.round(pixelSize * 0.78));
    const wepX = heroOffsetX + 10 * pixelSize;
    const wepY = heroOffsetY + 2 * pixelSize;
    drawGridToContext(ctx, wepGrid, GEAR_SHADE_PALETTE, wepPixel, wepX, wepY, style.weaponCss);
  }
};

export const registerPixelTextures = (scene: Phaser.Scene): void => {
  // Base heroes (pixelSize 4 -> 56x56)
  for (const classId of ['warrior', 'mage', 'thief', 'bowman'] as const) {
    const cfg = HERO_GRIDS[classId];
    drawPixelGrid(scene, `hero_${classId}`, cfg.grid, cfg.palette, 4);
    drawPixelGrid(scene, `gear_head_${classId}`, GEAR_HEAD_GRIDS[classId], GEAR_SHADE_PALETTE, 4);
    drawPixelGrid(scene, `gear_top_${classId}`, GEAR_TOP_GRIDS[classId], GEAR_SHADE_PALETTE, 4);
    drawPixelGrid(scene, `gear_wep_${classId}`, GEAR_WEAPON_GRIDS[classId], GEAR_SHADE_PALETTE, 3);
  }
  drawPixelGrid(scene, 'gear_cape', GEAR_CAPE_GRID, GEAR_SHADE_PALETTE, 4);

  // Combat VFX sprites
  drawPixelGrid(
    scene,
    'fx_slash_arc',
    SLASH_ARC_GRID,
    { T: '#ffffff', M: '#fef08a' },
    4
  );
  drawPixelGrid(
    scene,
    'fx_hit_spark',
    HIT_SPARK_GRID,
    { T: '#ffffff', M: '#fde047' },
    3
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

  // Biome mobs (white-tinted base so tinting per biome looks vivid!)
  drawPixelGrid(
    scene,
    'mob_0',
    MOB_SLIME_GRID,
    { M: '#ffffff', D: '#cbd5e1', E: '#0f172a' },
    4
  );
  drawPixelGrid(
    scene,
    'mob_1',
    MOB_MUSH_GRID,
    { C: '#ffffff', W: '#fef9c3', S: '#fde68a', E: '#111827' },
    4
  );
  drawPixelGrid(
    scene,
    'mob_2',
    MOB_HORNED_GRID,
    { K: '#1e293b', M: '#ffffff', D: '#cbd5e1', E: '#ef4444' },
    4
  );

  // Bosses
  drawPixelGrid(
    scene,
    'miniboss',
    MINIBOSS_GRID,
    { Y: '#facc15', M: '#ffffff', W: '#f1f5f9', D: '#94a3b8', E: '#ef4444' },
    7
  );
  drawPixelGrid(
    scene,
    'endboss',
    ENDBOSS_GRID,
    { Y: '#fde047', M: '#ffffff', R: '#ef4444', W: '#f8fafc', D: '#64748b', E: '#111827' },
    9
  );

  // Projectiles & FX
  drawCircleTexture(scene, 'proj_bolt', 16, '#38bdf8', '#e0f2fe');
  drawCircleTexture(scene, 'proj_star', 14, '#c084fc', '#fae8ff');
  drawCircleTexture(scene, 'proj_orb_hp', 14, '#22c55e', '#bbf7d0');
  drawCircleTexture(scene, 'proj_lightning', 18, '#eab308', '#fef9c3');

  // Arrow, Feather, Fang & Wave canvases
  if (!scene.textures.exists('proj_arrow')) {
    const tex = scene.textures.createCanvas('proj_arrow', 22, 6);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 2, 16, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(15, 0, 7, 6);
      tex.refresh();
    }
  }

  if (!scene.textures.exists('proj_hawk_feather')) {
    const tex = scene.textures.createCanvas('proj_hawk_feather', 18, 6);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 2, 12, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(10, 0, 8, 6);
      tex.refresh();
    }
  }

  if (!scene.textures.exists('proj_wolf_fang')) {
    const tex = scene.textures.createCanvas('proj_wolf_fang', 20, 18);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(8, 9, 8, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#e0f2fe';
      ctx.stroke();
      tex.refresh();
    }
  }

  if (!scene.textures.exists('proj_wave')) {
    const tex = scene.textures.createCanvas('proj_wave', 26, 68);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, 4, 18, 60);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(10, 0, 14, 68);
      tex.refresh();
    }
  }

  // Loot & hazards
  drawPixelGrid(scene, 'loot_coin', COIN_GRID, { Y: '#facc15', W: '#fef9c3' }, 3);
  drawPixelGrid(scene, 'loot_chest', CHEST_GRID, { B: '#78350f', Y: '#fbbf24', W: '#fef08a' }, 4);
  drawPixelGrid(scene, 'bomb_hazard', BOMB_GRID, { R: '#ef4444', K: '#1e293b' }, 4);
};
