import { describe, expect, it } from 'vitest';
import { computeLaunchForce, normalizePull } from './forceCurve.js';

describe('normalizePull', () => {
  it('clamps pull distance to 0..1', () => {
    expect(normalizePull(-10, 200)).toBe(0);
    expect(normalizePull(0, 200)).toBe(0);
    expect(normalizePull(100, 200)).toBe(0.5);
    expect(normalizePull(240, 200)).toBe(1);
  });
});

describe('computeLaunchForce', () => {
  it('keeps every preset clamped and monotonic', () => {
    for (const preset of ['linear', 'soft', 'punchy']) {
      const low = computeLaunchForce({ pullDistance: 40, maxPull: 200, preset, intensity: 1, launchSpeed: 1 });
      const high = computeLaunchForce({ pullDistance: 180, maxPull: 200, preset, intensity: 1, launchSpeed: 1 });
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeGreaterThan(low);
      expect(high).toBeLessThanOrEqual(1);
    }
  });

  it('uses intensity and launch speed as readable multipliers', () => {
    const base = computeLaunchForce({ pullDistance: 100, maxPull: 200, preset: 'linear', intensity: 1, launchSpeed: 1 });
    const boosted = computeLaunchForce({ pullDistance: 100, maxPull: 200, preset: 'linear', intensity: 1.5, launchSpeed: 1.2 });
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(1);
  });
});
