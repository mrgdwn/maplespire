// HD-2D JRPG window kit (Octopath / Final Fantasy style).
// Plain DOM builders used by OverlayManager for every out-of-combat screen and modal,
// so menus share one visual language: navy windows, gold bevels, ▶ cursor lists.

export type HdActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type HdAction = {
  label: string;
  variant?: HdActionVariant;
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  tooltip?: string;
  onClick: () => void;
};

export type HdBannerStatus = 'info' | 'success' | 'warning' | 'error';

export type HdBannerProps = {
  status: HdBannerStatus;
  title: string;
  description?: string;
  badgeText?: string;
  badgeTier?: string;
};

export type HdBadgeProps = {
  label: string;
  tier?: string;
};

export type HdEmptyProps = {
  title: string;
  description: string;
};

const make = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string = ''
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

export const hdTierClass = (tier: string): string => {
  switch (tier.toLowerCase()) {
    case 'legendary':
    case 'gold':
    case 'pristine':
      return 'hd-tag--gold';
    case 'rare':
    case 'silver':
    case 'info':
    case 'selected':
      return 'hd-tag--blue';
    case 'cursed':
      return 'hd-tag--purple';
    case 'prismatic':
      return 'hd-tag--jade';
    case 'boss':
    case 'error':
    case 'warning':
      return 'hd-tag--red';
    case 'success':
    case 'bounty':
      return 'hd-tag--jade';
    default:
      return '';
  }
};

export const createHdButton = (action: HdAction): HTMLButtonElement => {
  const variant = action.variant ?? 'secondary';
  const size = action.size ?? 'sm';
  const btn = make('button', `hd-btn hd-btn--${variant} hd-btn--${size}`, action.label);
  btn.type = 'button';
  btn.disabled = action.isDisabled ?? false;
  if (action.tooltip) btn.title = action.tooltip;
  btn.addEventListener('click', () => {
    if (!btn.disabled) action.onClick();
  });
  return btn;
};

export const mountHdActionRow = (container: HTMLElement, actions: readonly HdAction[]): void => {
  container.innerHTML = '';
  container.classList.add('hd-actions');
  for (const action of actions) {
    container.appendChild(createHdButton(action));
  }
};

export const mountHdBadge = (container: HTMLElement, props: HdBadgeProps): void => {
  container.innerHTML = '';
  container.appendChild(make('span', `hd-tag ${hdTierClass(props.tier ?? '')}`, props.label));
};

export const mountHdBanner = (container: HTMLElement, props: HdBannerProps): void => {
  container.innerHTML = '';
  const banner = make('div', `hd-banner hd-banner--${props.status}`);
  const head = make('div', 'hd-banner__head');
  head.appendChild(make('div', 'hd-banner__title', props.title));
  if (props.badgeText) {
    head.appendChild(
      make('span', `hd-tag ${hdTierClass(props.badgeTier ?? props.status)}`, props.badgeText)
    );
  }
  banner.appendChild(head);
  if (props.description) {
    banner.appendChild(make('div', 'hd-banner__desc', props.description));
  }
  container.appendChild(banner);
};

export const mountHdEmpty = (container: HTMLElement, props: HdEmptyProps): void => {
  container.innerHTML = '';
  const box = make('div', 'hd-empty');
  box.appendChild(make('div', 'hd-empty__title', props.title));
  box.appendChild(make('div', 'hd-empty__desc', props.description));
  container.appendChild(box);
};

export type HdMenuItem = {
  label: string;
  hint?: string;
  isDisabled?: boolean;
  onSelect: () => void;
};

// Vertical ▶-cursor command list with hover + keyboard (↑/↓/Enter) navigation.
// Returns a cleanup function that removes the keyboard listener.
export const mountHdCommandMenu = (
  container: HTMLElement,
  items: readonly HdMenuItem[]
): (() => void) => {
  container.innerHTML = '';
  const list = make('div', 'hd-menu');
  let cursor = Math.max(
    0,
    items.findIndex((item) => !item.isDisabled)
  );
  const rows: HTMLButtonElement[] = [];

  const paint = (): void => {
    rows.forEach((row, idx) => row.classList.toggle('is-active', idx === cursor));
  };

  items.forEach((item, idx) => {
    const row = make('button', 'hd-menu__item');
    row.type = 'button';
    row.disabled = item.isDisabled ?? false;
    row.appendChild(make('span', 'hd-menu__cursor', '▶'));
    row.appendChild(make('span', 'hd-menu__label', item.label));
    if (item.hint) row.appendChild(make('span', 'hd-menu__hint', item.hint));
    row.addEventListener('mouseenter', () => {
      if (row.disabled) return;
      cursor = idx;
      paint();
    });
    row.addEventListener('click', () => {
      if (!row.disabled) item.onSelect();
    });
    rows.push(row);
    list.appendChild(row);
  });
  container.appendChild(list);
  paint();

  const onKey = (event: KeyboardEvent): void => {
    if (!list.isConnected) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const dir = event.key === 'ArrowDown' ? 1 : -1;
      for (let step = 0; step < items.length; step++) {
        cursor = (cursor + dir + items.length) % items.length;
        if (!items[cursor]?.isDisabled) break;
      }
      paint();
    } else if (event.key === 'Enter') {
      const item = items[cursor];
      if (item && !item.isDisabled) {
        event.preventDefault();
        item.onSelect();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
};
