import { type ReactNode, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { Banner, type BannerStatus } from '@astryxdesign/core/Banner';
import { Button, type ButtonVariant } from '@astryxdesign/core/Button';
import { Card, type CardVariant } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Theme, type ThemeMode } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { gothicTheme } from '@astryxdesign/theme-gothic/built';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export type AstryxThemeChoice = 'gothic' | 'neutral';

type ThemeSnapshot = {
  choice: AstryxThemeChoice;
  mode: ThemeMode;
};

const THEME_CHOICE_KEY = 'wuxiaspire_astryx_theme_v1';
const THEME_MODE_KEY = 'wuxiaspire_astryx_mode_v1';

function readStoredThemeChoice(): AstryxThemeChoice {
  try {
    const raw = window.localStorage.getItem(THEME_CHOICE_KEY);
    if (raw === 'neutral' || raw === 'gothic') {
      return raw;
    }
  } catch {
    // Ignore storage unavailability inside restricted iframes.
  }
  return 'gothic';
}

function readStoredThemeMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_MODE_KEY);
    if (raw === 'light' || raw === 'dark') {
      return raw;
    }
  } catch {
    // Ignore storage unavailability inside restricted iframes.
  }
  return 'dark';
}

const currentThemeSnapshot: ThemeSnapshot = {
  choice: typeof window !== 'undefined' ? readStoredThemeChoice() : 'gothic',
  mode: typeof window !== 'undefined' ? readStoredThemeMode() : 'dark',
};

const themeListeners = new Set<() => void>();

function syncDocumentThemeAttributes(snapshot: ThemeSnapshot): void {
  if (typeof document === 'undefined') return;
  const resolvedMode = snapshot.choice === 'gothic' ? 'dark' : snapshot.mode;
  document.documentElement.setAttribute('data-astryx-theme', snapshot.choice);
  document.documentElement.setAttribute(
    'data-theme',
    resolvedMode === 'light' ? 'light' : 'dark'
  );
}

export function initAstryxRootAttributes(): void {
  syncDocumentThemeAttributes(currentThemeSnapshot);
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function getThemeSnapshot(): ThemeSnapshot {
  return currentThemeSnapshot;
}

export function AstryxThemeScope({ children }: { children: ReactNode }): ReactNode {
  const snapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot);
  const activeTheme = snapshot.choice === 'gothic' ? gothicTheme : neutralTheme;
  const activeMode: ThemeMode = snapshot.choice === 'gothic' ? 'dark' : snapshot.mode;
  return (
    <Theme theme={activeTheme} mode={activeMode}>
      {children}
    </Theme>
  );
}

const mountedRoots = new Map<HTMLElement, Root>();

export function unmountAstryxRootsInside(container: HTMLElement): void {
  for (const [host, root] of mountedRoots.entries()) {
    if (host === container || container.contains(host)) {
      mountedRoots.delete(host);
      // Defer unmount cleanly so click handlers inside an island can re-render without synchronous unmount warnings.
      queueMicrotask(() => {
        root.unmount();
      });
    }
  }
}

export function mountAstryxNode(container: HTMLElement, element: ReactNode): void {
  let root = mountedRoots.get(container);
  if (!root) {
    container.innerHTML = '';
    root = createRoot(container);
    mountedRoots.set(container, root);
  }
  root.render(<AstryxThemeScope>{element}</AstryxThemeScope>);
}

export type AstryxCampTopBarProps = {
  gold: number;
  shards: number;
  bossCores: number;
  accountLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
  quickLaunchLabel?: string;
  onQuickLaunch?: () => void;
};

export function AstryxCampTopBar(props: AstryxCampTopBarProps): ReactNode {
  return (
    <HStack justify="between" align="center" gap={2} wrap="wrap" style={{ width: '100%' }}>
      <HStack align="center" gap={1.5} wrap="wrap">
        <Text type="large" weight="bold" style={{ letterSpacing: '0.04em' }}>
          WUXIA SPIRE
        </Text>
        <Badge variant="cyan" label={`Realm Lv.${props.accountLevel}`} />
      </HStack>

      <HStack align="center" gap={1.5} wrap="wrap">
        <Badge variant="yellow" label={`Gold: ${props.gold}`} />
        <Badge variant="blue" label={`Shards: ${props.shards}`} />
        <Badge variant="purple" label={`Cores: ${props.bossCores}`} />
        <Button
          label={props.isMuted ? 'Muted' : 'Audio'}
          variant="ghost"
          size="sm"
          onClick={props.onToggleMute}
        />
        {props.quickLaunchLabel && props.onQuickLaunch ? (
          <Button
            label={props.quickLaunchLabel}
            variant="primary"
            size="sm"
            onClick={props.onQuickLaunch}
          />
        ) : null}
      </HStack>
    </HStack>
  );
}

export type AstryxTabItem = {
  id: string;
  label: string;
  badge?: string;
};

export type AstryxTabStripProps = {
  items: readonly AstryxTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function AstryxTabStrip({ items, activeId, onSelect }: AstryxTabStripProps): ReactNode {
  return (
    <HStack align="center" gap={1.5} wrap="wrap">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Button
            key={item.id}
            label={item.label}
            variant={isActive ? 'primary' : 'secondary'}
            size="sm"
            endContent={
              item.badge ? (
                <Badge variant={isActive ? 'info' : 'neutral'} label={item.badge} />
              ) : undefined
            }
            onClick={() => onSelect(item.id)}
          />
        );
      })}
    </HStack>
  );
}

export type AstryxActionButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  tooltip?: string;
  onClick: () => void;
};

export function AstryxActionButton({
  label,
  variant = 'secondary',
  size = 'sm',
  isDisabled = false,
  tooltip,
  onClick,
}: AstryxActionButtonProps): ReactNode {
  return (
    <Button
      label={label}
      variant={variant}
      size={size}
      isDisabled={isDisabled}
      {...(tooltip !== undefined ? { tooltip } : {})}
      onClick={onClick}
    />
  );
}

export function AstryxActionRow({
  actions,
}: {
  actions: readonly AstryxActionButtonProps[];
}): ReactNode {
  return (
    <HStack align="center" gap={2} wrap="wrap" justify="center">
      {actions.map((action, index) => (
        <Button
          key={`${action.label}-${index}`}
          label={action.label}
          variant={action.variant ?? 'secondary'}
          size={action.size ?? 'sm'}
          isDisabled={action.isDisabled ?? false}
          {...(action.tooltip !== undefined ? { tooltip: action.tooltip } : {})}
          onClick={action.onClick}
        />
      ))}
    </HStack>
  );
}

export function badgeVariantForTier(tier: string): BadgeVariant {
  switch (tier.toLowerCase()) {
    case 'bronze':
      return 'orange';
    case 'silver':
    case 'rare':
      return 'blue';
    case 'gold':
    case 'legendary':
      return 'yellow';
    case 'cursed':
      return 'purple';
    case 'prismatic':
      return 'cyan';
    case 'bounty':
    case 'pristine':
    case 'success':
      return 'green';
    case 'boss':
    case 'error':
      return 'red';
    case 'selected':
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}

export type AstryxStatusBadgeProps = {
  label: string;
  tier?: string;
  variant?: BadgeVariant;
};

export function AstryxStatusBadge({ label, tier, variant }: AstryxStatusBadgeProps): ReactNode {
  const resolvedVariant = variant ?? (tier ? badgeVariantForTier(tier) : 'neutral');
  return <Badge variant={resolvedVariant} label={label} />;
}

export type AstryxModalBannerProps = {
  status: BannerStatus;
  title: string;
  description?: string;
  cardVariant?: CardVariant;
  badgeText?: string;
  badgeTier?: string;
};

export function AstryxModalBanner({
  status,
  title,
  description,
  cardVariant = 'transparent',
  badgeText,
  badgeTier,
}: AstryxModalBannerProps): ReactNode {
  return (
    <Card variant={cardVariant} padding={0}>
      <Banner
        status={status}
        container="card"
        title={title}
        description={description}
        endContent={
          badgeText ? (
            <AstryxStatusBadge label={badgeText} tier={badgeTier ?? status} />
          ) : undefined
        }
      />
    </Card>
  );
}

export type AstryxEmptyPanelProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AstryxEmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: AstryxEmptyPanelProps): ReactNode {
  return (
    <VStack padding={2}>
      <EmptyState
        title={title}
        description={description}
        actions={
          actionLabel && onAction ? (
            <Button label={actionLabel} variant="primary" size="sm" onClick={onAction} />
          ) : undefined
        }
      />
    </VStack>
  );
}

export function mountAstryxCampTopBar(
  container: HTMLElement,
  props: AstryxCampTopBarProps
): void {
  mountAstryxNode(container, <AstryxCampTopBar {...props} />);
}

export function mountAstryxTabStrip(container: HTMLElement, props: AstryxTabStripProps): void {
  mountAstryxNode(container, <AstryxTabStrip {...props} />);
}

export function mountAstryxActionRow(
  container: HTMLElement,
  actions: readonly AstryxActionButtonProps[]
): void {
  mountAstryxNode(container, <AstryxActionRow actions={actions} />);
}

export function mountAstryxStatusBadge(
  container: HTMLElement,
  props: AstryxStatusBadgeProps
): void {
  mountAstryxNode(container, <AstryxStatusBadge {...props} />);
}

export function mountAstryxModalBanner(
  container: HTMLElement,
  props: AstryxModalBannerProps
): void {
  mountAstryxNode(container, <AstryxModalBanner {...props} />);
}

export function mountAstryxEmptyPanel(
  container: HTMLElement,
  props: AstryxEmptyPanelProps
): void {
  mountAstryxNode(container, <AstryxEmptyPanel {...props} />);
}
