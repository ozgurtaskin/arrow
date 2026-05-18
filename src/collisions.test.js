import { describe, expect, it } from 'vitest';
import { classifyArrowCollision, reflectVelocity } from './collisions.js';

const arrow = { plugin: { entity: { type: 'arrow' } } };

describe('classifyArrowCollision', () => {
  it('routes arrow impacts by target material or type', () => {
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'wood' } } })).toBe('stick');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'rubber' } } })).toBe('bounce');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'stone' } } })).toBe('deflect');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'balloon' } } })).toBe('pop');
  });
});

describe('reflectVelocity', () => {
  it('reflects a velocity along a collision normal with energy', () => {
    const reflected = reflectVelocity({ x: 10, y: 0 }, { x: -1, y: 0 }, 1.5);
    expect(reflected.x).toBeLessThan(0);
    expect(Math.abs(reflected.x)).toBeGreaterThan(10);
  });
});
