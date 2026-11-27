// Hand-crafted Sumi-e & Shan Shui Woodblock Wuxia Vista painter for Splash and Camp Home.
// Zero Phaser dependency so splash.html remains instant inside Reddit feeds.

export type VistaController = {
  destroy: () => void;
};

type Petal = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  alpha: number;
  warm: boolean;
};

type MistWisp = {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  speed: number;
  alpha: number;
};

// Craggy Shan Shui karst silhouette (asymmetrical, jagged peaks rather than smooth hills)
const drawCraggyKarstRange = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: readonly (readonly [number, number])[],
  topColor: string,
  botColor: string,
  rimColor?: string
): void => {
  if (points.length < 2) return;
  let minY = h;
  for (const [, py] of points) {
    if (py * h < minY) minY = py * h;
  }

  const grad = ctx.createLinearGradient(0, minY, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.55, botColor);
  grad.addColorStop(1, '#0b0908');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, h);
  const first = points[0]!;
  ctx.lineTo(first[0] * w, first[1] * h);
  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;
    ctx.lineTo(pt[0] * w, pt[1] * h);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  if (rimColor) {
    ctx.save();
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(first[0] * w, first[1] * h);
    for (let i = 1; i < points.length; i++) {
      const pt = points[i]!;
      ctx.lineTo(pt[0] * w, pt[1] * h);
    }
    ctx.stroke();
    ctx.restore();
  }
};

// Soft feathered valley fog veil (never clipped at top/bottom edges)
const drawValleyFog = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  yCenterFrac: number,
  bandHeightFrac: number,
  peakAlpha: number
): void => {
  const yTop = (yCenterFrac - bandHeightFrac * 0.5) * h;
  const yBot = (yCenterFrac + bandHeightFrac * 0.5) * h;
  const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
  grad.addColorStop(0, 'rgba(214, 196, 166, 0)');
  grad.addColorStop(0.42, `rgba(214, 196, 166, ${(peakAlpha * 0.72).toFixed(3)})`);
  grad.addColorStop(0.58, `rgba(214, 196, 166, ${peakAlpha.toFixed(3)})`);
  grad.addColorStop(1, 'rgba(214, 196, 166, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, yTop, w, yBot - yTop);
};

// Organic ink-wash drifting mist cloud using scaled radial ellipse (never hard-clipped)
const drawSoftMistWisp = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number
): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / Math.max(1, rx));
  const g = ctx.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx);
  g.addColorStop(0, `rgba(220, 202, 172, ${alpha.toFixed(3)})`);
  g.addColorStop(0.5, `rgba(220, 202, 172, ${(alpha * 0.45).toFixed(3)})`);
  g.addColorStop(1, 'rgba(220, 202, 172, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// Classical sumi-e pine branch framing the upper-left corner
const drawCornerPineBranch = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  ctx.save();
  const s = Math.min(w, h) / 480;
  ctx.scale(s, s);

  // Gnarled trunk & bough reaching from top-left
  ctx.strokeStyle = 'rgba(13, 10, 9, 0.92)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-12, 46);
  ctx.quadraticCurveTo(38, 52, 74, 34);
  ctx.quadraticCurveTo(108, 22, 142, 40);
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(56, 42);
  ctx.quadraticCurveTo(72, 62, 106, 68);
  ctx.moveTo(96, 30);
  ctx.quadraticCurveTo(118, 12, 152, 16);
  ctx.stroke();

  // Layered sumi-e pine needle fans
  const clusters: readonly [number, number, number][] = [
    [32, 34, 24],
    [68, 24, 28],
    [104, 18, 22],
    [142, 34, 24],
    [98, 62, 22],
    [152, 16, 18],
  ];
  for (const [cx, cy, r] of clusters) {
    ctx.fillStyle = 'rgba(16, 13, 11, 0.88)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.42, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Fine radiating needle ticks along top arc
    ctx.strokeStyle = 'rgba(26, 21, 18, 0.72)';
    ctx.lineWidth = 1;
    for (let a = -2.6; a <= -0.5; a += 0.28) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.25);
      ctx.lineTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.62);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const drawPagodaSpire = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale: number,
  t: number
): void => {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(scale, scale);

  // Warm ambient lantern aura behind pagoda
  const halo = ctx.createRadialGradient(0, -52, 6, 0, -52, 82);
  halo.addColorStop(0, 'rgba(218, 168, 86, 0.22)');
  halo.addColorStop(0.55, 'rgba(184, 120, 58, 0.08)');
  halo.addColorStop(1, 'rgba(184, 120, 58, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -52, 82, 0, Math.PI * 2);
  ctx.fill();

  // Stone foundation plinth
  ctx.fillStyle = '#14100e';
  ctx.fillRect(-24, -4, 48, 8);

  const tiers = 5;
  let y = -4;
  for (let i = 0; i < tiers; i++) {
    const tierW = 42 - i * 5.6;
    const tierH = 13 - i * 0.7;
    const roofW = tierW + 20 - i * 1.5;

    // Tier lacquer wall
    ctx.fillStyle = '#120e0c';
    ctx.fillRect(-tierW * 0.4, y - tierH, tierW * 0.8, tierH);

    // Subtle side balustrade pillars
    ctx.fillStyle = '#1c1612';
    ctx.fillRect(-tierW * 0.46, y - 3, tierW * 0.92, 2);

    // Warm paper lantern alcove glow
    const flicker = 0.68 + 0.14 * Math.sin(t * 2.1 + i * 1.4);
    ctx.fillStyle = `rgba(232, 184, 98, ${flicker.toFixed(2)})`;
    ctx.fillRect(-2.5, y - tierH * 0.74, 5, tierH * 0.5);

    // Sweeping upturned Chinese eaves
    ctx.fillStyle = '#191310';
    ctx.beginPath();
    ctx.moveTo(-roofW * 0.56, y - tierH - 1);
    ctx.quadraticCurveTo(-roofW * 0.28, y - tierH + 1, 0, y - tierH - 6);
    ctx.quadraticCurveTo(roofW * 0.28, y - tierH + 1, roofW * 0.56, y - tierH - 1);
    ctx.quadraticCurveTo(roofW * 0.34, y - tierH + 5, 0, y - tierH + 2);
    ctx.quadraticCurveTo(-roofW * 0.34, y - tierH + 5, -roofW * 0.56, y - tierH - 1);
    ctx.closePath();
    ctx.fill();

    // Antique brass ridge highlight
    ctx.strokeStyle = 'rgba(208, 172, 96, 0.34)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-roofW * 0.5, y - tierH);
    ctx.quadraticCurveTo(0, y - tierH - 5.5, roofW * 0.5, y - tierH);
    ctx.stroke();

    y -= tierH + 3.5;
  }

  // Spire needle finial
  ctx.strokeStyle = '#c8a254';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, y + 1);
  ctx.lineTo(0, y - 20);
  ctx.stroke();

  ctx.fillStyle = '#e5c882';
  ctx.beginPath();
  ctx.arc(0, y - 13, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCliffWanderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number,
  t: number
): void => {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(groundY));
  ctx.scale(scale, scale);

  // Craggy rocky cliff promontory jutting from left
  ctx.fillStyle = '#0c0908';
  ctx.beginPath();
  ctx.moveTo(-90, 64);
  ctx.lineTo(-90, 10);
  ctx.lineTo(-32, 4);
  ctx.lineTo(14, 0);
  ctx.lineTo(36, 12);
  ctx.lineTo(22, 34);
  ctx.lineTo(44, 64);
  ctx.closePath();
  ctx.fill();

  // Warm moonlight rim along cliff crest
  ctx.strokeStyle = 'rgba(218, 190, 134, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-32, 4);
  ctx.lineTo(14, 0);
  ctx.lineTo(36, 12);
  ctx.stroke();

  const sway = Math.sin(t * 2.2) * 1.2;
  const scarfWave = Math.sin(t * 3.8) * 3.2;

  // Flowing cinnabar silk scarf trailing into mountain wind
  ctx.fillStyle = '#9e2a22';
  ctx.beginPath();
  ctx.moveTo(-1, -24);
  ctx.quadraticCurveTo(-15, -28 + scarfWave * 0.45, -31, -20 + scarfWave);
  ctx.quadraticCurveTo(-17, -17 + scarfWave * 0.6, -2, -20);
  ctx.closePath();
  ctx.fill();

  // Flowing martial robe silhouette
  ctx.fillStyle = '#110d0b';
  ctx.beginPath();
  ctx.moveTo(-8, 1);
  ctx.lineTo(-5, -23);
  ctx.lineTo(5, -23);
  ctx.lineTo(10 + sway * 0.35, 1);
  ctx.closePath();
  ctx.fill();

  // Moonlight rim highlight on robe edge
  ctx.strokeStyle = 'rgba(232, 206, 148, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, -23);
  ctx.lineTo(9 + sway * 0.3, -3);
  ctx.stroke();

  // Jian scabbard angled across back
  ctx.strokeStyle = '#c8a254';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-11, -31);
  ctx.lineTo(10, -10);
  ctx.stroke();

  // Head & iconic bamboo conical hat (douli)
  ctx.fillStyle = '#14100e';
  ctx.beginPath();
  ctx.arc(0, -27, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b1512';
  ctx.beginPath();
  ctx.moveTo(-14, -29);
  ctx.lineTo(0, -37);
  ctx.lineTo(14, -29);
  ctx.quadraticCurveTo(0, -27, -14, -29);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(235, 208, 152, 0.52)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -37);
  ctx.lineTo(13, -29);
  ctx.stroke();

  ctx.restore();
};

const createPaperGrainPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const tile = document.createElement('canvas');
  tile.width = 96;
  tile.height = 96;
  const gctx = tile.getContext('2d');
  if (!gctx) return null;
  let seed = 1337;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(rand() * 96);
    const y = Math.floor(rand() * 96);
    const bright = rand() > 0.5;
    gctx.fillStyle = bright ? 'rgba(238, 224, 196, 0.025)' : 'rgba(6, 4, 3, 0.035)';
    gctx.fillRect(x, y, rand() > 0.7 ? 2 : 1, 1);
  }
  return ctx.createPattern(tile, 'repeat');
};

export const mountWuxiaVista = (
  canvas: HTMLCanvasElement,
  options: { showWanderer?: boolean; pagodaSide?: 'right' | 'center' } = {}
): VistaController => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { destroy: () => undefined };
  }

  const showWanderer = options.showWanderer ?? true;
  const pagodaSide = options.pagodaSide ?? 'right';
  const grainPattern = createPaperGrainPattern(ctx);

  let width = 1;
  let height = 1;
  let rafId = 0;
  let lastFrameMs = 0;
  let elapsed = 0;
  let destroyed = false;

  const petals: Petal[] = [];
  const wisps: MistWisp[] = [
    { xFrac: 0.22, yFrac: 0.62, wFrac: 0.34, hFrac: 0.075, speed: 0.006, alpha: 0.08 },
    { xFrac: 0.72, yFrac: 0.7, wFrac: 0.42, hFrac: 0.09, speed: 0.0045, alpha: 0.09 },
    { xFrac: 0.45, yFrac: 0.8, wFrac: 0.48, hFrac: 0.1, speed: 0.0032, alpha: 0.07 },
  ];

  // Craggy Guilin karst silhouettes (normalized [x, y])
  const farKarst: readonly (readonly [number, number])[] = [
    [0.0, 0.64],
    [0.06, 0.54],
    [0.11, 0.59],
    [0.18, 0.45],
    [0.24, 0.51],
    [0.29, 0.42],
    [0.36, 0.56],
    [0.44, 0.52],
    [0.52, 0.46],
    [0.59, 0.58],
    [0.67, 0.48],
    [0.74, 0.39],
    [0.82, 0.49],
    [0.89, 0.43],
    [0.95, 0.53],
    [1.0, 0.58],
  ];

  const midKarst: readonly (readonly [number, number])[] = [
    [0.0, 0.76],
    [0.09, 0.66],
    [0.17, 0.73],
    [0.26, 0.63],
    [0.35, 0.72],
    [0.46, 0.68],
    [0.56, 0.75],
    [0.66, 0.66],
    [0.76, 0.61],
    [0.86, 0.65],
    [0.94, 0.69],
    [1.0, 0.74],
  ];

  const seedPetals = (): void => {
    petals.length = 0;
    const count = 16;
    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -9 - Math.random() * 12,
        vy: 5 + Math.random() * 9,
        size: 1.8 + Math.random() * 2.0,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 2.0,
        alpha: 0.32 + Math.random() * 0.42,
        warm: i % 3 !== 0,
      });
    }
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width || window.innerWidth));
    height = Math.max(1, Math.round(rect.height || window.innerHeight));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (petals.length === 0) seedPetals();
  };

  const render = (t: number, dt: number): void => {
    // 1. Warm sumi twilight wash sky
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0c0a09');
    sky.addColorStop(0.35, '#171310');
    sky.addColorStop(0.68, '#2b2119');
    sky.addColorStop(0.9, '#3d2d21');
    sky.addColorStop(1, '#100d0b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // 2. Harvest moon positioned cleanly in upper-right negative space (clear of title/ribbon)
    const moonX = pagodaSide === 'center' ? width * 0.5 : width * (showWanderer ? 0.78 : 0.85);
    const moonY = height * (showWanderer ? 0.24 : 0.32);
    const moonR = Math.min(width, height) * (showWanderer ? 0.072 : 0.062);

    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 4.8);
    moonGlow.addColorStop(0, 'rgba(235, 206, 148, 0.28)');
    moonGlow.addColorStop(0.4, 'rgba(184, 134, 72, 0.11)');
    moonGlow.addColorStop(1, 'rgba(184, 134, 72, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, width, height);

    const moonDisc = ctx.createRadialGradient(
      moonX - moonR * 0.22,
      moonY - moonR * 0.22,
      moonR * 0.1,
      moonX,
      moonY,
      moonR
    );
    moonDisc.addColorStop(0, '#f7eed8');
    moonDisc.addColorStop(0.75, '#e8d8b4');
    moonDisc.addColorStop(1, '#cbb68e');
    ctx.fillStyle = moonDisc;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Soft feathered nocturnal cloud drifting gently across lower moon rim
    drawSoftMistWisp(
      ctx,
      moonX + Math.sin(t * 0.14) * 10 - moonR * 0.4,
      moonY + moonR * 0.65,
      moonR * 2.1,
      moonR * 0.42,
      0.16
    );

    // 3. Far craggy Shan Shui karst range
    drawCraggyKarstRange(
      ctx,
      width,
      height,
      farKarst,
      'rgba(48, 37, 29, 0.68)',
      'rgba(22, 17, 14, 0.9)'
    );

    // 4. Soft unclipped valley fog veil + organic drifting mist wisps
    drawValleyFog(ctx, width, height, 0.64, 0.24, 0.11);
    for (const wisp of wisps) {
      wisp.xFrac -= wisp.speed * dt;
      if (wisp.xFrac < -wisp.wFrac) wisp.xFrac = 1 + wisp.wFrac;
      drawSoftMistWisp(
        ctx,
        wisp.xFrac * width,
        wisp.yFrac * height,
        wisp.wFrac * width * 0.5,
        wisp.hFrac * height,
        wisp.alpha
      );
    }

    // 5. Midground karst ridge + curved-eave pagoda spire
    drawCraggyKarstRange(
      ctx,
      width,
      height,
      midKarst,
      'rgba(26, 20, 16, 0.94)',
      'rgba(13, 10, 9, 0.99)',
      'rgba(216, 186, 130, 0.14)'
    );

    const pagodaX = pagodaSide === 'center' ? width * 0.5 : width * (showWanderer ? 0.8 : 0.84);
    const pagodaBaseY = height * (pagodaSide === 'center' ? 0.6 : 0.62);
    const pagodaScale = Math.max(0.68, Math.min(1.12, Math.min(width, height) / 500));
    drawPagodaSpire(ctx, pagodaX, pagodaBaseY, pagodaScale, t);

    // 6. Foreground dark mountain slope
    ctx.fillStyle = '#0c0908';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.84);
    ctx.lineTo(width * 0.22, height * 0.81);
    ctx.lineTo(width * 0.48, height * 0.88);
    ctx.lineTo(width * 0.78, height * 0.85);
    ctx.lineTo(width, height * 0.82);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 7. Classical sumi-e pine branch framing upper-left corner
    drawCornerPineBranch(ctx, width, height);

    // 8. Cliffside Wuxia wanderer in clear left negative space on Splash
    if (showWanderer) {
      const wx = width * 0.12;
      const wy = height * 0.67;
      const ws = Math.max(0.82, Math.min(1.18, Math.min(width, height) / 450));
      drawCliffWanderer(ctx, wx, wy, ws, t);
    }

    // 9. Falling plum blossom petals & subtle lantern embers
    for (const p of petals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.x < -12 || p.y > height + 12) {
        p.x = width * (0.2 + Math.random() * 0.95);
        p.y = -8 - Math.random() * 24;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.warm
        ? `rgba(196, 82, 68, ${p.alpha.toFixed(2)})`
        : `rgba(228, 198, 138, ${(p.alpha * 0.72).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. Subtle Xuan rice-paper grain & soft sumi edge vignette
    if (grainPattern) {
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, width, height);
    }

    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      Math.min(width, height) * 0.28,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.76
    );
    vig.addColorStop(0, 'rgba(10, 8, 7, 0)');
    vig.addColorStop(1, 'rgba(8, 6, 5, 0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  };

  const loop = (now: number): void => {
    if (destroyed) return;
    rafId = window.requestAnimationFrame(loop);
    if (now - lastFrameMs < 33) return;
    const dt = Math.min(0.08, (now - (lastFrameMs || now)) / 1000);
    lastFrameMs = now;
    elapsed += dt;
    render(elapsed, dt);
  };

  resize();
  render(0, 0.016);
  window.addEventListener('resize', resize);
  rafId = window.requestAnimationFrame(loop);

  return {
    destroy: (): void => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    },
  };
};
