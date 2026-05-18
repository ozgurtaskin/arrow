import { describe, expect, it } from 'vitest';
import { getMaterialConfig } from './materials.js';

describe('getMaterialConfig', () => {
  it('applies material mass multipliers', () => {
    expect(getMaterialConfig('wood', { woodMass: 2 }).density).toBeCloseTo(0.002);
    expect(getMaterialConfig('rubber', { rubberMass: 3 }).restitution).toBeGreaterThan(1);
    expect(getMaterialConfig('stone', { stoneMass: 4 }).density).toBeGreaterThan(getMaterialConfig('wood', { woodMass: 1 }).density);
  });

  it('defines arrow stick behavior by material', () => {
    expect(getMaterialConfig('wood', {}).arrowBehavior).toBe('stick');
    expect(getMaterialConfig('rubber', {}).arrowBehavior).toBe('bounce');
    expect(getMaterialConfig('stone', {}).arrowBehavior).toBe('deflect');
  });
});
