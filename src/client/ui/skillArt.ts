// Hand-crafted Wuxia woodblock & mineral-pigment SVG emblems for every Active Art,
// Inner Qi Manual, Awakened Secret Synergy, Enlightenment Scroll, and Equipment Relic.
// Gives instant visual recognition to eliminate reading fatigue during runs & Camp browsing.

import type { GearItem, GearSlot } from '../../shared/types.ts';
import { getWuxiaSynergyById } from '../../shared/catalogs/wuxia.ts';

type EmblemSpec = {
  bgTop: string;
  bgBot: string;
  border: string;
  fg: string;
  accent: string;
  svg: string;
};

const ACTIVE_ART_SPECS: Record<string, EmblemSpec> = {
  // 18 Dragon-Subduing Palms — Golden blazing palm thrust
  art_dragon_palm: {
    bgTop: '#3a2210',
    bgBot: '#190f08',
    border: '#d6a44b',
    fg: '#f2d07a',
    accent: '#c94932',
    svg:
      '<path d="M10 26v-9a1.5 1.5 0 0 1 3 0v4M13 15v-5a1.5 1.5 0 0 1 3 0v7M16 14v-4.5a1.5 1.5 0 0 1 3 0V17M19 16v-3a1.5 1.5 0 0 1 3 0v8c0 4.5-3 7.5-7 7.5h-1.5c-3 0-5.5-2-6.5-5l-1.5-4a1.5 1.5 0 0 1 2.7-1.3L10 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M24 9c2.5 2 3.5 5 2.5 8.5M26.5 11.5c1.5 1.8 2 4 1.2 6.5" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>',
  },
  // Jade Maiden Swordplay — Crossed twin moon-jade jian swords
  art_jade_sword: {
    bgTop: '#162936',
    bgBot: '#0c161d',
    border: '#6a9ec4',
    fg: '#bfe0f5',
    accent: '#dfc073',
    svg:
      '<path d="M9 27L25 9M22 9h3v3M27 27L11 9M14 9h-3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M8 23l5 5M28 23l-5 5" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="18" cy="18" r="2.2" fill="var(--emblem-accent)"/>',
  },
  // Beggar Dog-Beating Staff — Whirling emerald bamboo rod
  art_dog_staff: {
    bgTop: '#132b20',
    bgBot: '#0a1711',
    border: '#5fa380',
    fg: '#a8dfc0',
    accent: '#dfc073',
    svg:
      '<path d="M8 28L28 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M13 23l2 2M18 18l2 2M23 13l2 2" stroke="#10241a" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M10 13a10 10 0 0 1 13-3M26 23a10 10 0 0 1-13 3" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
  },
  // Black-Iron Heavy Sword Cleave — Broad unedged obsidian greatsword
  art_heavy_iron: {
    bgTop: '#261a2e',
    bgBot: '#130d18',
    border: '#9e75ab',
    fg: '#d8c2e0',
    accent: '#dfc073',
    svg:
      '<path d="M13 24L25 8l3 2-11 16-4-2z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M9 22l7 5M11 26l-3 3" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M21 26l4-2 3 3" stroke="var(--emblem-accent)" stroke-width="1.3" stroke-linecap="round"/>',
  },
  // Peach Blossom Jade Flute — Diagonal jade flute + resonant sonic arcs
  art_jade_flute: {
    bgTop: '#142c2a',
    bgBot: '#0b1817',
    border: '#5ca89f',
    fg: '#a8e3dc',
    accent: '#d97a8b',
    svg:
      '<path d="M7 26L25 10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="13" cy="21" r="1" fill="#0d1b1a"/><circle cx="16.5" cy="18" r="1" fill="#0d1b1a"/><circle cx="20" cy="15" r="1" fill="#0d1b1a"/>' +
      '<path d="M23 18a6 6 0 0 1 3 5M26 14a9 9 0 0 1 4 8M11 12a5 5 0 0 1 5-4" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
  },
  // Melancholic Soul-Severing Palm — Indigo crashing tidal wave
  art_ice_needle: {
    bgTop: '#1a1f38',
    bgBot: '#0d101f',
    border: '#7282c4',
    fg: '#b8c4f0',
    accent: '#7ab4d4',
    svg:
      '<path d="M6 23c3-6 7-11 14-11 4 0 6 2 6 4.5S24 21 21 20c2-1 2.5-3 1-4-2.5-1.5-6 1-8 5 4 0 9 1 15 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M7 27c5-2 11-2 22 0" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
  },
  // Six-Pulse Divine Sword — Six radiating meridian sword lances
  art_six_pulse: {
    bgTop: '#122838',
    bgBot: '#09141d',
    border: '#5aa0c9',
    fg: '#b3e0f7',
    accent: '#dfc073',
    svg:
      '<path d="M7 18h22M9 12l19 3M9 24l19-3M12 8l15 5M12 28l15-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="9" cy="18" r="2.8" fill="var(--emblem-accent)"/>',
  },
  // Flicking Finger Divine Thrum — Compressed crimson spirit burst pellet
  art_tantan_finger: {
    bgTop: '#36181c',
    bgBot: '#1a0c0e',
    border: '#c95c63',
    fg: '#f2b8bc',
    accent: '#dfc073',
    svg:
      '<circle cx="18" cy="18" r="4.5" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.8"/>' +
      '<circle cx="18" cy="18" r="1.8" fill="var(--emblem-accent)"/>' +
      '<path d="M18 7v4M18 25v4M7 18h4M25 18h4M10.5 10.5l2.8 2.8M22.7 22.7l2.8 2.8M25.5 10.5l-2.8 2.8M13.3 22.7l-2.8 2.8" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
  },
  // Taiji Yin-Yang Swordplay — Circular Taiji aura with straight jian
  art_taiji_sword: {
    bgTop: '#162830',
    bgBot: '#0b1418',
    border: '#72b0c2',
    fg: '#cceaf2',
    accent: '#dfc073',
    svg:
      '<circle cx="18" cy="18" r="9.5" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M18 8.5a4.75 4.75 0 0 1 0 9.5 4.75 4.75 0 0 0 0 9.5" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8 28L28 8" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>',
  },
  // Dragon-Slaying Saber Cleave — Curved broad Dadao saber
  art_dragon_saber: {
    bgTop: '#382510',
    bgBot: '#1a1108',
    border: '#d69e42',
    fg: '#f5d996',
    accent: '#c23b2f',
    svg:
      '<path d="M9 26c4-2 9-6 14-14 2-3 4-4 5-4-1 5-4 11-11 16l-5 3-3-1z" fill="currentColor" fill-opacity="0.24" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M7 24l5 4M8 28l-2 2" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>',
  },
  // Shifting Stars Celestial Deflection — Constellation star & deflecting arc
  art_shifting_stars: {
    bgTop: '#1c1d36',
    bgBot: '#0e0e1c',
    border: '#8484c9',
    fg: '#d0d0f5',
    accent: '#dfc073',
    svg:
      '<path d="M18 7l2.2 6.8L27 16l-6.8 2.2L18 25l-2.2-6.8L9 16l6.8-2.2L18 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M7 25c4 3 16 4 22-4" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="27" cy="9" r="1.4" fill="var(--emblem-accent)"/>',
  },
  // Tianshan Six-Yang Plum Hand — Five-petal frost plum blossom
  art_tianshan_six_yang: {
    bgTop: '#331622',
    bgBot: '#180a10',
    border: '#c95c78',
    fg: '#f5bccb',
    accent: '#8ec7e6',
    svg:
      '<circle cx="18" cy="11.5" r="3.4" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="24" cy="16" r="3.4" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="21.8" cy="23" r="3.4" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="14.2" cy="23" r="3.4" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="12" cy="16" r="3.4" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="18" cy="18" r="2.2" fill="var(--emblem-accent)"/>',
  },
  // Great Shift of Heaven and Earth — Dual Qiankun swirling vortex
  art_great_shift: {
    bgTop: '#362112',
    bgBot: '#180f08',
    border: '#d69942',
    fg: '#f5d293',
    accent: '#c23b2f',
    svg:
      '<path d="M18 8a10 10 0 0 1 9 14M26 22l2-4-4 1M18 28a10 10 0 0 1-9-14M10 14l-2 4 4-1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="18" cy="18" r="3.5" stroke="var(--emblem-accent)" stroke-width="1.6"/>',
  },
  // Western Toad Divine Stance — Concentric viridian shockwave crest
  art_toad_stance: {
    bgTop: '#162b19',
    bgBot: '#0b160c',
    border: '#60a66c',
    fg: '#b0e3b8',
    accent: '#dfc073',
    svg:
      '<path d="M8 22c3-6 17-6 20 0M11 26c2-3.5 12-3.5 14 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="14" cy="14" r="2.4" stroke="var(--emblem-accent)" stroke-width="1.5"/>' +
      '<circle cx="22" cy="14" r="2.4" stroke="var(--emblem-accent)" stroke-width="1.5"/>',
  },
};

const INNER_QI_SPECS: Record<string, EmblemSpec> = {
  // Nine-Yang Divine Sutra — Radiant sun disc
  qi_nine_yang: {
    bgTop: '#362110',
    bgBot: '#180f07',
    border: '#d69642',
    fg: '#f5cf82',
    accent: '#c94932',
    svg:
      '<circle cx="18" cy="18" r="5" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M18 7v3.5M18 25.5V29M7 18h3.5M25.5 18H29M10.2 10.2l2.5 2.5M23.3 23.3l2.5 2.5M25.8 10.2l-2.5 2.5M12.7 23.3l-2.5 2.5" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>',
  },
  // Jade Maiden Heart Sutra — Blooming lotus
  qi_jade_maiden: {
    bgTop: '#172936',
    bgBot: '#0c151c',
    border: '#6ea4c9',
    fg: '#c4e3f7',
    accent: '#d9849b',
    svg:
      '<path d="M18 9c3 4 4 8 0 14-4-6-3-10 0-14zM18 23c-5-1-9-4-9-9 4 0 7 2 9 9zM18 23c5-1 9-4 9-9-4 0-7 2-9 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M11 26h14" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>',
  },
  // Cloud-Stepping Qinggong — Weightless drifting cloud
  qi_heaven_earth: {
    bgTop: '#142922',
    bgBot: '#0a1612',
    border: '#62a68a',
    fg: '#b3e3cf',
    accent: '#dfc073',
    svg:
      '<path d="M8 22h18a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7-1.2A4.2 4.2 0 0 0 8 22z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M7 26h12M22 26h6" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
  },
  // Solitary Nine-Sword Sutra — Fanned sword tips
  qi_solitary_sword: {
    bgTop: '#261b30',
    bgBot: '#130d19',
    border: '#9f78b3',
    fg: '#dec4eb',
    accent: '#dfc073',
    svg:
      '<path d="M18 8v19M11 11l7 16M25 11l-7 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M13 24h10" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>',
  },
  // Eight-Trigram Harmony Sutra — Octagonal Bagua seal
  qi_bagua_harmony: {
    bgTop: '#142a2a',
    bgBot: '#0a1616',
    border: '#5fa8a6',
    fg: '#b3e3e2',
    accent: '#dfc073',
    svg:
      '<polygon points="14,8 22,8 28,14 28,22 22,28 14,28 8,22 8,14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="18" cy="18" r="4" stroke="var(--emblem-accent)" stroke-width="1.5"/>',
  },
  // Nine-Yin True Sutra — Crescent moon & dark ink tide
  qi_nine_yin: {
    bgTop: '#191e36',
    bgBot: '#0c0f1c',
    border: '#7280c4',
    fg: '#c2caf2',
    accent: '#a67aa8',
    svg:
      '<path d="M22 10a8.5 8.5 0 1 0 3 15.8A7 7 0 1 1 22 10z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="13" r="1.5" fill="var(--emblem-accent)"/>',
  },
  // Northern Abyss Star-Absorbing Sutra — Deep vortex spiral
  qi_star_absorb: {
    bgTop: '#152236',
    bgBot: '#0a111c',
    border: '#6392c7',
    fg: '#b8d6f5',
    accent: '#dfc073',
    svg:
      '<path d="M18 18c0-2 2-3.5 4-2.5 2.5 1.3 2.5 5 0 6.8-3.5 2.5-8.5 1-10-3-1.8-4.8 1-10.3 6.2-11.3 5-1 9.5 2.2 10.3 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="18" cy="18" r="2" fill="var(--emblem-accent)"/>',
  },
  // Ten-Dragon Sovereign Sutra — Imperial horned dragon crown
  qi_dragon_elephant: {
    bgTop: '#361b18',
    bgBot: '#1a0d0b',
    border: '#c95c4e',
    fg: '#f5bfb8',
    accent: '#dfc073',
    svg:
      '<path d="M8 24l2-11 4.5 4.5L18 10l3.5 7.5L26 13l2 11H8z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M10 27h16" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>',
  },
  // Pure-Yang Wuji Sutra — Radiant Daoist flame-circle
  qi_pure_yang: {
    bgTop: '#222b30',
    bgBot: '#101518',
    border: '#8ab4c4',
    fg: '#d8edf5',
    accent: '#dfc073',
    svg:
      '<circle cx="18" cy="18" r="8.5" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M18 12c2.5 2.5 3.5 4.5 3.5 6.5a3.5 3.5 0 0 1-7 0c0-2 1-4 3.5-6.5z" fill="var(--emblem-accent)" fill-opacity="0.35" stroke="var(--emblem-accent)" stroke-width="1.4"/>',
  },
  // Qiankun Great Shift Sutra — Interlocking heaven/earth rings
  qi_great_shift: {
    bgTop: '#332214',
    bgBot: '#181009',
    border: '#cc9547',
    fg: '#f2d49e',
    accent: '#c23b2f',
    svg:
      '<circle cx="15" cy="16" r="6" stroke="currentColor" stroke-width="1.6"/>' +
      '<circle cx="21" cy="20" r="6" stroke="var(--emblem-accent)" stroke-width="1.6"/>',
  },
  // Lingbo Micro-Steps Sutra — Rippling water footsteps
  qi_lingbo_steps: {
    bgTop: '#162733',
    bgBot: '#0b141a',
    border: '#6ea2c4',
    fg: '#c2e2f7',
    accent: '#dfc073',
    svg:
      '<path d="M7 22c3-2 6 2 9 0s6 2 9 0 4 0 4 0M9 26c3-1.5 6 1.5 9 0s6 1.5 9 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M13 15c2-4 7-5 11-3" stroke="var(--emblem-accent)" stroke-width="1.7" stroke-linecap="round"/>',
  },
  // Minor Formless Sutra — Mirror diamond reflection
  qi_xiao_wuxiang: {
    bgTop: '#241c30',
    bgBot: '#110d17',
    border: '#9c7eb3',
    fg: '#decbf0',
    accent: '#7ab4c7',
    svg:
      '<polygon points="18,7 27,18 18,29 9,18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<polygon points="18,12 22.5,18 18,24 13.5,18" stroke="var(--emblem-accent)" stroke-width="1.4" stroke-linejoin="round"/>',
  },
  // Yi Jin Jing Tendon-Changing Sutra — Golden monastic sutra scroll
  qi_yi_jin_jing: {
    bgTop: '#332714',
    bgBot: '#181209',
    border: '#d6b05c',
    fg: '#f5e2ad',
    accent: '#66a887',
    svg:
      '<rect x="10" y="9" width="16" height="18" rx="1.5" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M14 14h8M14 18h8M14 22h5" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>',
  },
};

const DEFAULT_SCROLL_SPEC: EmblemSpec = {
  bgTop: '#2b2218',
  bgBot: '#14100b',
  border: '#c49f54',
  fg: '#ebd296',
  accent: '#c23b2f',
  svg:
    '<path d="M11 8h14v20H11z" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M9 10h18M9 26h18M15 15h6M15 19h6" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
};

const renderSpecToSvg = (
  spec: EmblemSpec,
  size: number,
  options: { isSynergy?: boolean; isLocked?: boolean } = {}
): HTMLDivElement => {
  const wrap = document.createElement('div');
  wrap.className = `skill-emblem${options.isSynergy ? ' skill-emblem--synergy' : ''}${options.isLocked ? ' skill-emblem--locked' : ''}`;
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.style.setProperty('--emblem-bg-top', options.isLocked ? '#1c1715' : spec.bgTop);
  wrap.style.setProperty('--emblem-bg-bot', options.isLocked ? '#100d0b' : spec.bgBot);
  wrap.style.setProperty('--emblem-border', options.isLocked ? 'rgba(166, 122, 168, 0.45)' : spec.border);
  wrap.style.setProperty('--emblem-fg', options.isLocked ? '#8c7e70' : spec.fg);
  wrap.style.setProperty('--emblem-accent', options.isLocked ? '#a67aa8' : spec.accent);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  // Optional gilded octagonal peerless halo behind awakened synergies
  const haloMarkup = options.isSynergy
    ? '<polygon points="12,3 24,3 33,12 33,24 24,33 12,33 3,24 3,12" stroke="#ecd492" stroke-opacity="0.55" stroke-width="1.1"/>'
    : '';

  svg.innerHTML = `${haloMarkup}${spec.svg}`;
  wrap.appendChild(svg);
  return wrap;
};

export const createSkillEmblem = (
  id: string,
  size: number = 38,
  options: { isLocked?: boolean } = {}
): HTMLDivElement => {
  const isLocked = options.isLocked ?? false;
  const activeSpec = ACTIVE_ART_SPECS[id];
  if (activeSpec) {
    return renderSpecToSvg(activeSpec, size, { isLocked });
  }
  const qiSpec = INNER_QI_SPECS[id];
  if (qiSpec) {
    return renderSpecToSvg(qiSpec, size, { isLocked });
  }

  // Synergies inherit their parent Active Art's iconic silhouette inside a Peerless gilded octagonal crest
  const syn = getWuxiaSynergyById(id);
  if (syn) {
    const baseSpec = ACTIVE_ART_SPECS[syn.activeId] ?? DEFAULT_SCROLL_SPEC;
    const synergySpec: EmblemSpec = {
      ...baseSpec,
      border: '#ecd492',
      accent: '#d9534f',
    };
    return renderSpecToSvg(synergySpec, size, {
      isSynergy: !isLocked,
      isLocked,
    });
  }

  // Enlightenment scrolls & fallback
  const scrollSpec: EmblemSpec = {
    ...DEFAULT_SCROLL_SPEC,
    border: id.includes('peerless') || id.includes('tribulation') ? '#dfc073' : '#66a887',
    accent: id.includes('blood') ? '#c23b2f' : '#dfc073',
  };
  return renderSpecToSvg(scrollSpec, size, { isLocked });
};

// Bespoke Equipment / Relic visual emblem tinted by rarity tier & cursed state
const RELIC_SLOT_PATHS: Record<GearSlot, string> = {
  weapon:
    '<path d="M9 27L25 9M21 9h4v4M11 21l4 4M8 28l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M19 15l5-5" stroke="var(--emblem-accent)" stroke-width="1.4" stroke-linecap="round"/>',
  headgear:
    '<path d="M8 24h20M9 24l2-10 7 4 7-4 2 10M6 15h24M18 8v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="18" cy="18" r="2" fill="var(--emblem-accent)"/>',
  top:
    '<path d="M12 8l6 4 6-4 5 4-3 6-3-1.5V28H13V16.5L10 18l-3-6 5-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M13 12l10 9" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>',
  cape:
    '<path d="M11 9c3 1.5 11 1.5 14 0l3 18c-4-1.5-7-1.5-10 0-3-1.5-6-1.5-10 0l3-18z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M13 9l5 6 5-6" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>',
};

const getWeaponVariantPath = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('saber') || lower.includes('blade') || lower.includes('cleaver')) {
    return (
      '<path d="M9 26c4-2 9-6 14-14 2-3 4-4 5-4-1 5-4 11-11 16l-5 3-3-1z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M7 24l5 4" stroke="var(--emblem-accent)" stroke-width="1.8" stroke-linecap="round"/>'
    );
  }
  if (lower.includes('staff') || lower.includes('rod') || lower.includes('bamboo')) {
    return (
      '<path d="M8 28L28 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M14 22l2 2M20 16l2 2" stroke="var(--emblem-accent)" stroke-width="1.6" stroke-linecap="round"/>'
    );
  }
  if (lower.includes('flute')) {
    return (
      '<path d="M8 26L26 10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M23 18a6 6 0 0 1 3 5M26 14a8 8 0 0 1 3 7" stroke="var(--emblem-accent)" stroke-width="1.5" stroke-linecap="round"/>'
    );
  }
  if (lower.includes('fist') || lower.includes('glove') || lower.includes('palm')) {
    return (
      '<path d="M12 24v-7a1.5 1.5 0 0 1 3 0v3M15 16v-3a1.5 1.5 0 0 1 3 0v5M18 16v-3a1.5 1.5 0 0 1 3 0v5M21 17v-2a1.5 1.5 0 0 1 3 0v7c0 3.5-2.5 6-6 6h-2c-2.5 0-4-1.5-4-4z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
    );
  }
  return RELIC_SLOT_PATHS.weapon;
};

export const createRelicEmblem = (
  slot: GearSlot,
  tier: GearItem['tier'],
  isCursed: boolean,
  name: string = '',
  size: number = 32
): HTMLDivElement => {
  const palette = isCursed
    ? { bgTop: '#2c1830', bgBot: '#140b17', border: '#a67aa8', fg: '#e2c9e6', accent: '#c23b2f' }
    : tier === 'legendary'
      ? { bgTop: '#382710', bgBot: '#181007', border: '#dfc073', fg: '#f5dfa0', accent: '#c94932' }
      : tier === 'rare'
        ? { bgTop: '#162736', bgBot: '#0b141c', border: '#6a96bd', fg: '#c2def5', accent: '#dfc073' }
        : { bgTop: '#241e19', bgBot: '#13100d', border: '#7a6c5a', fg: '#d6cbb8', accent: '#b8944c' };

  const svg = slot === 'weapon' ? getWeaponVariantPath(name) : RELIC_SLOT_PATHS[slot];
  return renderSpecToSvg({ ...palette, svg }, size, {
    isSynergy: tier === 'legendary' && !isCursed,
  });
};
