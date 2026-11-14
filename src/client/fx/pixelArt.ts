import type * as Phaser from 'phaser';

type PixelGrid = readonly string[];
type Palette = Record<string, string>;

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

  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
    }
  }
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

// Chibi 14x14 sprites (MapleStory-inspired big head, expressive eyes, compact body + weapon)
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

export const registerPixelTextures = (scene: Phaser.Scene): void => {
  // Heroes (pixelSize 4 -> 56x56)
  drawPixelGrid(
    scene,
    'hero_warrior',
    WARRIOR_GRID,
    {
      H: '#b91c1c',
      S: '#fed7aa',
      E: '#111827',
      A: '#94a3b8',
      W: '#facc15',
      B: '#475569',
      K: '#1e293b',
    },
    4
  );

  drawPixelGrid(
    scene,
    'hero_mage',
    MAGE_GRID,
    {
      H: '#1e3a8a',
      S: '#fed7aa',
      E: '#111827',
      R: '#2563eb',
      W: '#fbbf24',
      K: '#312e81',
    },
    4
  );

  drawPixelGrid(
    scene,
    'hero_thief',
    THIEF_GRID,
    {
      H: '#4c1d95',
      S: '#fed7aa',
      E: '#f43f5e',
      M: '#1e1b4b',
      D: '#312e81',
      A: '#c084fc',
      K: '#09090b',
    },
    4
  );

  drawPixelGrid(
    scene,
    'hero_bowman',
    BOWMAN_GRID,
    {
      G: '#15803d',
      S: '#fed7aa',
      E: '#111827',
      W: '#fde047',
      B: '#78350f',
      K: '#451a03',
    },
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

  // Arrow & Wave rectangles
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
