// Hand-crafted minimalist Wuxia inline SVG iconography.
// Crisp 1.5px stroke icons in warm woodblock style — zero emojis, zero external assets.

import type { GearSlot } from '../../shared/types.ts';

export type WuxiaIconId =
  | 'weapon'
  | 'headgear'
  | 'top'
  | 'cape'
  | 'gourd'
  | 'dash'
  | 'ultimate'
  | 'strike'
  | 'gold'
  | 'shard'
  | 'core'
  | 'atk'
  | 'hp'
  | 'arm'
  | 'crit'
  | 'critDmg'
  | 'dodge'
  | 'haste'
  | 'fortune'
  | 'scroll'
  | 'lock';

const ICON_PATHS: Record<WuxiaIconId, string> = {
  // Classical Chinese Jian straight sword
  weapon:
    '<path d="M19 5L9 15M15 5h4v4M7 13l4 4M5 19l3-3M4 20l1-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  // Taoist / Martial Jade Guan crown hairpin
  headgear:
    '<path d="M5 16h14M6 16l1-7 5 3 5-3 1 7M3 10h18M12 5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  // Crossed-collar Hanfu martial robe
  top: '<path d="M8 4l4 3 4-3 4 3-2 4-2-1v9H8v-9l-2 1-2-4 4-3zM9 7l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // Flowing silk martial mantle / cloak
  cape: '<path d="M7 5c2 1 8 1 10 0l2 14c-3-1-5-1-7 0-2-1-4-1-7 0L7 5zM9 5l3 4 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // Wine / Elixir gourd (Hulu) for Potion [W]
  gourd:
    '<path d="M10 3h4M12 3v2c-2 0-3 1.4-3 3 0 1.2.8 2.1 1.6 2.6C8.5 11.6 7 13.5 7 16c0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.5-1.5-4.4-3.6-5.4.8-.5 1.6-1.4 1.6-2.6 0-1.6-1-3-3-3z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  // Qinggong wind-step gust for Dash [Space/E]
  dash: '<path d="M4 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M6 17h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  // Blazing Bagua / Qi burst for Ultimate [R]
  ultimate:
    '<path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4L12 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.2" fill="currentColor"/>',
  // Martial Palm / Sword Slash for Active [Q]
  strike:
    '<path d="M4 18C7 10 12 6 20 5c-4 4-6 8-7 13M8 14l6-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  // Antique square-hole bronze coin (Tongbao)
  gold: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="9.5" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>',
  // Faceted Jade Shard
  shard:
    '<path d="M12 3l6 6-6 12-6-12 6-6zM6 9h12" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  // Boss Core spirit orb
  core: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 5.5a3.25 3.25 0 0 1 0 6.5 3.25 3.25 0 0 0 0 6.5" stroke="currentColor" stroke-width="1.4"/>',
  // Meridian stat icons
  atk: '<path d="M18 5L7 16M14 5h4v4M6 14l4 4M5 19l2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  hp: '<path d="M12 19s-7-4.5-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 2.5C19 14.5 12 19 12 19z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  arm: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  crit: '<circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  critDmg:
    '<path d="M13 3L5 13h6l-1 8 9-11h-6l0-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  dodge:
    '<path d="M4 10h11a2 2 0 1 0-2-2M3 14h14a2 2 0 1 1-2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  haste:
    '<path d="M12 4a8 8 0 1 1-6.3 3.1M12 8v4l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  fortune:
    '<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.5"/><rect x="9.5" y="9.5" width="5" height="5" stroke="currentColor" stroke-width="1.5"/>',
  scroll:
    '<path d="M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9 9h6M9 13h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};

export const createWuxiaIcon = (
  id: WuxiaIconId,
  size: number = 16,
  className: string = 'wuxia-icon'
): SVGSVGElement => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  svg.innerHTML = ICON_PATHS[id];
  return svg;
};

export const slotToIconId = (slot: GearSlot): WuxiaIconId => slot;
