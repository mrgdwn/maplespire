import { type ReactNode, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { Banner, type BannerStatus } from '@astryxdesign/core/Banner';
import { Button, type ButtonVariant } from '@astryxdesign/core/Button';
import { Card, type CardVariant } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Switch } from '@astryxdesign/core/Switch';
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

const THEME_CHOICE_KEY = 'maplespire_astryx_theme_v1';
const THEME_MODE_KEY = 'maplespire_astryx_mode_v1';

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

let currentThemeSnapshot: ThemeSnapshot = {
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

export function setAstryxThemeChoice(choice: AstryxThemeChoice): void {
  const nextMode: ThemeMode = choice === 'gothic' ? 'dark' : currentThemeSnapshot.mode;
  currentThemeSnapshot = { choice, mode: nextMode };
  try {
    window.localStorage.setItem(THEME_CHOICE_KEY, choice);
    window.localStorage.setItem(THEME_MODE_KEY, nextMode);
  } catch {
    // Ignore storage failures.
  }
  syncDocumentThemeAttributes(currentThemeSnapshot);
  for (const listener of themeListeners) {
    listener();
  }
}

export function setAstryxThemeMode(mode: ThemeMode): void {
  const nextChoice: AstryxThemeChoice =
    mode === 'light' ? 'neutral' : currentThemeSnapshot.choice;
  currentThemeSnapshot = { choice: nextChoice, mode };
  try {
    window.localStorage.setItem(THEME_CHOICE_KEY, nextChoice);
    window.localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Ignore storage failures.
  }
  syncDocumentThemeAttributes(currentThemeSnapshot);
  for (const listener of themeListeners) {
    listener();
  }
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
    if (host === container || container.contains(host) || !host.isConnected) {
      root.unmount();
      mountedRoots.delete(host);
    }
  }
}

export function mountAstryxNode(container: HTMLElement, element: ReactNode): void {
  for (const [host, root] of mountedRoots.entries()) {
    if (!host.isConnected && host !== container) {
      root.unmount();
      mountedRoots.delete(host);
    }
  }

  let root = mountedRoots.get(container);
  if (!root) {
    container.innerHTML = '';
    root = createRoot(container);
    mountedRoots.set(container, root);
  }
  root.render(<AstryxThemeScope>{element}</AstryxThemeScope>);
}

export type AstryxCampTopBarProps = {
  username: string;
  streakDays: number;
  restedStacks: number;
  gold: number;
  shards: number;
  bossCores: number;
  goldenTickets: number;
  accountLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
  quickLaunchLabel?: string;
  onQuickLaunch?: () => void;
};

export function AstryxCampTopBar(props: AstryxCampTopBarProps): ReactNode {
  const snapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot);
  const isLightMode = snapshot.choice === 'neutral' && snapshot.mode === 'light';

  return (
    <HStack justify="between" align="center" gap={2} wrap="wrap" style={{ width: '100%' }}>
      <HStack align="center" gap={1.5} wrap="wrap">
        <Text type="large" weight="bold" style={{ letterSpacing: '0.04em' }}>
          MAPLESPIRE
        </Text>
        <Badge variant="neutral" label={`u/${props.username}`} />
        <Badge variant="cyan" label={`Total Lv.${props.accountLevel}`} />
        <Badge
          variant={props.restedStacks > 0 ? 'green' : 'orange'}
          label={`🔥 ${props.streakDays}d${props.restedStacks > 0 ? ` • ${props.restedStacks}x Rested` : ''}`}
        />
      </HStack>

      <HStack align="center" gap={1.5} wrap="wrap">
        <Badge variant="yellow" label={`🪙 ${props.gold}g`} />
        <Badge variant="blue" label={`💎 ${props.shards} Shards`} />
        <Badge variant="purple" label={`🔮 ${props.bossCores} Cores`} />
        <Badge variant="neutral" label={`🎫 ${props.goldenTickets}`} />
        <Button
          label={snapshot.choice === 'gothic' ? 'Astryx: Gothic' : 'Astryx: Neutral'}
          variant="secondary"
          size="sm"
          tooltip="Toggle between Meta Astryx Gothic and Neutral design themes"
          onClick={() =>
            setAstryxThemeChoice(snapshot.choice === 'gothic' ? 'neutral' : 'gothic')
          }
        />
        <Switch
          label="Light"
          size="sm"
          value={isLightMode}
          onChange={(checked) => setAstryxThemeMode(checked ? 'light' : 'dark')}
        />
        <Button
          label={props.isMuted ? '🔇 Muted' : '🔊 SFX'}
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

export type AstryxRunHudHeaderProps = {
  biomeName: string;
  runModeLabel: string;
  buffCount: number;
  isBossActive: boolean;
};

export function AstryxRunHudHeader({
  biomeName,
  runModeLabel,
  buffCount,
  isBossActive,
}: AstryxRunHudHeaderProps): ReactNode {
  return (
    <HStack align="center" gap={1.5} wrap="wrap">
      <Badge variant="info" label={runModeLabel} />
      <Badge variant="neutral" label={biomeName} />
      <Badge variant="purple" label={`${buffCount} Buffs`} />
      {isBossActive ? <Badge variant="red" label="BOSS ACTIVE" /> : null}
      <HStack align="center" gap={1}>
        <Kbd keys="q" />
        <Text type="supporting" size="2xs">
          Skill
        </Text>
        <Kbd keys="space" />
        <Text type="supporting" size="2xs">
          Dash
        </Text>
        <Kbd keys="w" />
        <Text type="supporting" size="2xs">
          Potion
        </Text>
      </HStack>
    </HStack>
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

export function mountAstryxRunHudHeader(
  container: HTMLElement,
  props: AstryxRunHudHeaderProps
): void {
  mountAstryxNode(container, <AstryxRunHudHeader {...props} />);
}

export function mountAstryxEmptyPanel(
  container: HTMLElement,
  props: AstryxEmptyPanelProps
): void {
  mountAstryxNode(container, <AstryxEmptyPanel {...props} />);
}
