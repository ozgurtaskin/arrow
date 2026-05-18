export const FORCE_PRESETS = ['linear', 'soft', 'punchy'];

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizePull(pullDistance, maxPull) {
  if (maxPull <= 0) return 0;
  return clamp01(pullDistance / maxPull);
}

export function computePresetValue(normalizedPull, preset) {
  const t = clamp01(normalizedPull);
  if (preset === 'soft') {
    return t * t * (3 - 2 * t);
  }
  if (preset === 'punchy') {
    return clamp01(t * (0.72 + t * 0.38));
  }
  return t;
}

export function computeLaunchForce({ pullDistance, maxPull, preset, intensity, launchSpeed }) {
  const normalized = normalizePull(pullDistance, maxPull);
  const shaped = computePresetValue(normalized, preset);
  return clamp01(shaped * Math.max(0, intensity) * Math.max(0, launchSpeed));
}
