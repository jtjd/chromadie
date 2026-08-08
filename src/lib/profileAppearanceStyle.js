import { normalizeProfileConfig } from './profileConfig.js';

/**
 * Return the validated CSS custom properties used by the identity card.
 * Keeping this projection shared prevents a fitting-room preview from
 * drifting away from the public profile renderer.
 */
export function getProfileAppearanceStyle(config) {
  const normalized = normalizeProfileConfig(config);
  const { appearance } = normalized;
  const signatureColor = appearance.colors.accent;
  const profileBackground = appearance.gradient.enabled
    ? `linear-gradient(${appearance.gradient.angle}deg, ${appearance.gradient.primary}, ${appearance.gradient.secondary})`
    : appearance.colors.background;

  return [
    `--profile-accent:${signatureColor}`,
    `--profile-surface-accent:${signatureColor}`,
    `--profile-control-accent:${signatureColor}`,
    `--profile-text:${appearance.colors.text}`,
    `--profile-secondary-text:${appearance.colors.secondaryText}`,
    `--profile-username:${appearance.colors.username}`,
    `--profile-description:${appearance.colors.description}`,
    `--profile-background:${appearance.colors.background}`,
    `--profile-background-paint:${profileBackground}`,
    `--profile-surface:${appearance.colors.surface}`,
    `--profile-highlight:${appearance.colors.highlight}`,
    `--profile-surface-opacity:${appearance.surface.opacity / 100}`,
    `--profile-surface-blur:${appearance.surface.blur}px`,
    `--profile-border-color:${appearance.border.color}`,
    `--profile-border-width:${appearance.border.enabled ? appearance.border.width : 0}px`,
    `--profile-border-radius:${appearance.border.radius}px`,
    `--profile-border-opacity:${appearance.border.opacity / 100}`,
    `--color-ink-strong:${appearance.colors.highlight}`,
    `--color-ink:${appearance.colors.text}`,
    `--color-ink-muted:${appearance.colors.secondaryText}`,
    `--color-ink-faint:${appearance.colors.description}`,
    `--color-accent:${signatureColor}`,
    `--color-accent-bright:${appearance.colors.highlight}`,
    `--surface-panel:${appearance.colors.surface}`,
    `--surface-inset:${appearance.colors.background}`,
    `--color-canvas-deep:${appearance.colors.background}`
  ].join(';');
}
