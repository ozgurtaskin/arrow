import { describe, expect, it } from 'vitest';
import { classifyArrowCollision, reflectVelocity } from './collisions.js';

const arrow = { plugin: { entity: { type: 'arrow', color: 'green' } } };

function ruleWoodTarget() {
  return {
    position: { x: 0, y: 0 },
    angle: 0,
    plugin: {
      entity: {
        type: 'ruleWood',
        material: 'wood',
        shape: 'circle',
        radius: 50,
        bands: {
          layers: [
            {
              kind: 'segmented',
              name: 'outer',
              thickness: 12,
              segments: [
                { color: 'green', start: 0, end: 0.5, size: 0.5 },
                { color: 'blue', start: 0.5, end: 1, size: 0.5 }
              ]
            },
            { kind: 'rainbow', name: 'rainbow', thickness: 10, segments: [{ color: 'rainbow', start: 0, end: 1, size: 1 }] }
          ]
        }
      }
    }
  };
}

describe('classifyArrowCollision', () => {
  it('routes arrow impacts by target material or type', () => {
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'wood' } } })).toBe('stick');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'rubber' } } })).toBe('bounce');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'stone' } } })).toBe('deflect');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'balloon' } } })).toBe('pop');
  });
});

describe('rule wood collision classification', () => {
  it('sticks when arrow color matches the hit band', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 49, y: 0 } })).toBe('stick');
  });

  it('bounces when arrow color does not match the hit band', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: -49, y: 0 } })).toBe('bounce');
  });

  it('sticks any arrow color into rainbow and core zones', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 30, y: 0 } })).toBe('stick');
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 0, y: 0 } })).toBe('stick');
  });
});

describe('reflectVelocity', () => {
  it('reflects a velocity along a collision normal with energy', () => {
    const reflected = reflectVelocity({ x: 10, y: 0 }, { x: -1, y: 0 }, 1.5);
    expect(reflected.x).toBeLessThan(0);
    expect(Math.abs(reflected.x)).toBeGreaterThan(10);
  });
});
