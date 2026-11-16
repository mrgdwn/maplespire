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

  // HD-2D silhouette outer border pass
  if (hd2dStyle && pixelSize >= 3) {
    ctx.fillStyle = borderCss ?? '#070a12';
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

  // HD-2D top-left sunlit rim light & bottom contact bevel shading
  if (hd2dStyle && pixelSize >= 3) {
    const rimTop = rimCss ?? 'rgba(255, 250, 215, 0.34)';
    const rimLeft = rimCss ?? 'rgba(255, 250, 215, 0.22)';
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
          ctx.fillStyle = 'rgba(6, 10, 22, 0.34)';
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

// Chibi 14x14 Wuxia martial artist sprites (topknot, crossed hanfu robe, sash, martial boots)
const WARRIOR_GRID: PixelGrid = [
  '.....PPPP.....',
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '...SSSSSSSS...',
  '..AAAWAWAAAA..',
  '.AAAAWAAWAAAA.',
  '..AAWWWWWWAA..',
  '..AAAAAAAAAA..',
  '...BBB..BBB...',
  '...KK....KK...',
  '..KKK....KKK..',
  '..............',
];

const MAGE_GRID: PixelGrid = [
  '....PPPPPP....',
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '...SSSSSSSS...',
  '..RRRRWRWRRR..',
  '.RRRRRWRWRRRR.',
  '..RRWWWWWWWR..',
  '..RRRRRRRRRR..',
  '...RRRRRRRR...',
  '...KK....KK...',
  '..KKK....KKK..',
  '..............',
];

const THIEF_GRID: PixelGrid = [
  '.....PPPP.....',
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHSSSSSSHH..',
  '..HSSESSSESH..',
  '..HHMMMMMMHH..',
  '..DDDAWADDDD..',
  '.DDDDWAAWDDDD.',
  '..DDWWWWWWDD..',
  '..DDDDDDDDDD..',
  '...DD....DD...',
  '...KK....KK...',
  '..KKK....KKK..',
  '..............',
];

const BOWMAN_GRID: PixelGrid = [
  '.....PPPP.....',
  '....GGGGGG....',
  '...GGGGGGGG...',
  '..GGSSSSSSGG..',
  '..GSSESSSESG..',
  '...SSSSSSSS...',
  '..GGGWGWGGGG..',
  '.GGGGWGWGGGGG.',
  '..GGWWWWWWGG..',
  '..GGGGGGGGGG..',
  '...BB....BB...',
  '...KK....KK...',
  '..KKK....KKK..',
  '..............',
];

const HERO_GRIDS: Record<ClassId, { grid: PixelGrid; palette: Palette }> = {
  warrior: {
    grid: WARRIOR_GRID,
    palette: {
      P: '#fbbf24',
      H: '#1e293b',
      S: '#fed7aa',
      E: '#111827',
      A: '#991b1b',
      W: '#fde047',
      B: '#475569',
      K: '#0f172a',
    },
  },
  mage: {
    grid: MAGE_GRID,
    palette: {
      P: '#38bdf8',
      H: '#0f172a',
      S: '#fed7aa',
      E: '#111827',
      R: '#1d4ed8',
      W: '#fef08a',
      K: '#1e1b4b',
    },
  },
  thief: {
    grid: THIEF_GRID,
    palette: {
      P: '#c084fc',
      H: '#09090b',
      S: '#fed7aa',
      E: '#f43f5e',
      M: '#1e1b4b',
      D: '#312e81',
      A: '#6366f1',
      W: '#e9d5ff',
      K: '#09090b',
    },
  },
  bowman: {
    grid: BOWMAN_GRID,
    palette: {
      P: '#6ee7b7',
      G: '#111827',
      S: '#fed7aa',
      E: '#111827',
      W: '#fde047',
      B: '#065f46',
      K: '#1e293b',
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

// Held Wuxia Weapon Grids (12x12 white/silver shaded so tinting works in Phaser & <canvas>)
const WEP_WUXIA_SWORD_GRID: PixelGrid = [
  '..........TT',
  '.........TTM',
  '........TTMM',
  '.......TTMM.',
  '......TTMM..',
  '.....TTMM...',
  '....TTMM....',
  '..SWTTM.....',
  '...WWKS.....',
  '..KKW.......',
  '.WK.........',
  '.W..........',
];

const WEP_WUXIA_STAFF_GRID: PixelGrid = [
  '..........TT',
  '.........TMT',
  '........TMW.',
  '.......TMT..',
  '......TMW...',
  '.....TMT....',
  '....TMW.....',
  '...TMT......',
  '..TMW.......',
  '.TMT........',
  'TMT.........',
  'TT..........',
];

const WEP_WUXIA_HEAVY_SWORD_GRID: PixelGrid = [
  '.........TTT',
  '........TTMM',
  '.......TTTMM',
  '......TTTMM.',
  '.....TTTMM..',
  '....TTTMM...',
  '...TTTMM....',
  '..SWWTM.....',
  '...WWKS.....',
  '..KKW.......',
  '.KK.........',
  '............',
];

const WEP_WUXIA_FLUTE_GRID: PixelGrid = [
  '............',
  '............',
  '........TTTT',
  '......TTTMMT',
  '....TTTMMW..',
  '..TTTMMW....',
  '.TTMMW......',
  '..KWW.......',
  '...W........',
  '...W........',
  '............',
  '............',
];

const WEP_WUXIA_NEEDLES_GRID: PixelGrid = [
  '........TTT.',
  '.......TM...',
  '......TM..TT',
  '.....KS..TM.',
  '......K.TM..',
  '.....K.KS..T',
  '......KK.TM.',
  '........TM..',
  '.......KS...',
  '............',
  '............',
  '............',
];

const GEAR_WEAPON_GRIDS: Record<ClassId, PixelGrid> = {
  warrior: WEP_WUXIA_HEAVY_SWORD_GRID,
  mage: WEP_WUXIA_FLUTE_GRID,
  thief: WEP_WUXIA_NEEDLES_GRID,
  bowman: WEP_WUXIA_SWORD_GRID,
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

// Wuxia Cultist Mobs & Sect Bosses (humanoid, facing left toward hero)
const MOB_SLIME_GRID: PixelGrid = [
  'W...MMMM....',
  'W..MMMMMM...',
  'W.MMKKKKMM..',
  'W.MKEKKEKM..',
  'W..MMMMMM...',
  'WWMMMMMMMM..',
  '.MMDDDDDDMM.',
  '.MMMWWWWMMM.',
  '..MMMMMMMM..',
  '..MMDDDDMM..',
  '..KK....KK..',
  '.KKK....KKK.',
];

const MOB_MUSH_GRID: PixelGrid = [
  '....CCCC....',
  '..CCCCCCCC..',
  '.CCWCCCCWCC.',
  'CCCCCCCCCCCC',
  '..KKKKKKKK..',
  '..KEKKEKK...',
  '.WMMMMMMMM..',
  'W.MDDDDDDMM.',
  '..MMMMMMMMW.',
  '..MMDDDDMM..',
  '..KK....KK..',
  '.KKK....KKK.',
];

const MOB_HORNED_GRID: PixelGrid = [
  'W...KKKKK...',
  'WW.KWWWWWK..',
  'WW.KKEKKEK..',
  'W.MMMMMMMMM.',
  'K.MMDDDDDMM.',
  'KMDDDDDDDDMM',
  'K..MMWWWMM..',
  'K..MMMMMMM..',
  'K..MMDDDMM..',
  'K...KK.KK...',
  'K...KK.KK...',
  '...KKK.KKK..',
];

// Cult Hall Master Mini-Boss variants (humanoid, facing left)
const MINIBOSS_GRID: PixelGrid = [
  '..Y........Y..',
  '..YY.YYYY.YY..',
  '.W..KKKKKK....',
  '.W..KEKKEK....',
  '.W.MMMMMMMM...',
  '.WWMMDDDDMMM..',
  'WW.MWWWWWWM.MM',
  '.K.MMMMMMMMMMM',
  '....MMDDDDMMMM',
  '....MMMMMMM.MM',
  '....MMWWWM..MM',
  '....KK..KK...M',
  '...KKK..KKK...',
  '...KKK..KKK...',
];

// Variant 1: Twin-Claw / Soul-Hook Masked Elder
const MINIBOSS_CLAW_GRID: PixelGrid = [
  '.....KKKK.....',
  '....KYYYYK....',
  '...KKKKKKKK...',
  '...KKEKKEKK...',
  '..MMMMMMMMMM..',
  'WWWWMMDDDDMMWW',
  'K..MMMMMMMM..K',
  '...MMMMMMMM...',
  '...MMWWWWMM...',
  '..MMMDDDDMMM..',
  '..MM..WW..MM..',
  '.....KK.KK....',
  '....KK...KK...',
  '...KKK...KKK..',
];

// Variant 2: Golden-Wheel / Whip Sect Grandmaster
const MINIBOSS_WHEEL_GRID: PixelGrid = [
  '....YYYYYY....',
  '...YYKKKKYY...',
  '..YYKKKKKKYY..',
  '..Y.KEKKEK.Y..',
  '..MMMMMMMMMM..',
  '.MMDDDDDDDDMM.',
  'WMMMMMMMMMMMMW',
  'WW..MMWWMM..WW',
  '....MMMMMM....',
  '...MMMMMMMM...',
  '...MMYYYYMM...',
  '....KK..KK....',
  '...KKK..KKK...',
  '..KKKK..KKKK..',
];

const ENDBOSS_GRID: PixelGrid = [
  '....Y..YY..Y....',
  '....YYYYYYYY....',
  '...YMMMMMMMMY...',
  '.Y..KKKKKKKK....',
  '.Y..KKEKKKEK....',
  'WY.MMMMMMMMMM...',
  'WY.MMRRRRRRMM.M.',
  'WWMMMWWWWWWWMMMM',
  '.KMMDDDDDDDDMMMM',
  '..MMMMMMMMMM.MMM',
  '..MMRRRRRRMM.MMM',
  '..MMMWWWWMMM..MM',
  '...MMMMMMMM...MM',
  '...KKK..KKK....M',
  '..KKKK..KKKK....',
  '..KKKK..KKKK....',
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

  // Subtle HD-2D ground contact shadow + atmospheric backlight
  const shadowCx = heroOffsetX + 7 * pixelSize;
  const shadowCy = heroOffsetY + 13 * pixelSize;
  const shGrad = ctx.createRadialGradient(shadowCx, shadowCy, 2, shadowCx, shadowCy, pixelSize * 5.2);
  shGrad.addColorStop(0, 'rgba(3, 6, 14, 0.65)');
  shGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shGrad;
  ctx.fillRect(0, 0, w, h);

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

  // Sect Cultist mobs (white-tinted base so per-sect tint colors robes vividly)
  drawPixelGrid(
    scene,
    'mob_0',
    MOB_SLIME_GRID,
    { K: '#0f172a', M: '#ffffff', D: '#cbd5e1', W: '#f8fafc', E: '#fef08a' },
    4
  );
  drawPixelGrid(
    scene,
    'mob_1',
    MOB_MUSH_GRID,
    { K: '#0f172a', C: '#fef3c7', W: '#fde68a', M: '#ffffff', D: '#cbd5e1', E: '#fef08a' },
    4
  );
  drawPixelGrid(
    scene,
    'mob_2',
    MOB_HORNED_GRID,
    { K: '#0f172a', M: '#ffffff', D: '#cbd5e1', W: '#f8fafc', E: '#ef4444' },
    4
  );

  // Sect Hall Master Mini-Boss variants & Supreme Cult Leader
  const miniPalette = {
    K: '#0f172a',
    Y: '#facc15',
    M: '#ffffff',
    W: '#f1f5f9',
    D: '#94a3b8',
    E: '#ef4444',
  };
  drawPixelGrid(scene, 'miniboss', MINIBOSS_GRID, miniPalette, 6);
  drawPixelGrid(scene, 'miniboss_0', MINIBOSS_GRID, miniPalette, 6);
  drawPixelGrid(scene, 'miniboss_1', MINIBOSS_CLAW_GRID, miniPalette, 6);
  drawPixelGrid(scene, 'miniboss_2', MINIBOSS_WHEEL_GRID, miniPalette, 6);
  drawPixelGrid(
    scene,
    'endboss',
    ENDBOSS_GRID,
    { K: '#0f172a', Y: '#fde047', M: '#ffffff', R: '#ef4444', W: '#f8fafc', D: '#64748b', E: '#fef08a' },
    7
  );

  // Wuxia held weapons (pixelSize 3 -> 36x36, aligned with gear_wep_*)
  drawPixelGrid(scene, 'wep_wuxia_sword', WEP_WUXIA_SWORD_GRID, GEAR_SHADE_PALETTE, 3);
  drawPixelGrid(scene, 'wep_wuxia_staff', WEP_WUXIA_STAFF_GRID, GEAR_SHADE_PALETTE, 3);
  drawPixelGrid(scene, 'wep_wuxia_heavy_sword', WEP_WUXIA_HEAVY_SWORD_GRID, GEAR_SHADE_PALETTE, 3);
  drawPixelGrid(scene, 'wep_wuxia_flute', WEP_WUXIA_FLUTE_GRID, GEAR_SHADE_PALETTE, 3);
  drawPixelGrid(scene, 'wep_wuxia_needles', WEP_WUXIA_NEEDLES_GRID, GEAR_SHADE_PALETTE, 3);

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
