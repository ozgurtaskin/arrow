import { describe, expect, it } from 'vitest';
import {
  createArrow,
  createBalloon,
  createBoxPiece,
  createGround,
  createHingedPlank,
  createRuleWoodBox,
  createRuleWoodCircle
} from './entities.js';

describe('entity factories', () => {
  it('creates arrows with metadata and mass', () => {
    const arrow = createArrow({ x: 10, y: 20, angle: 0.5, mass: 2 });
    expect(arrow.label).toBe('arrow');
    expect(arrow.plugin.entity.type).toBe('arrow');
    expect(arrow.mass).toBeCloseTo(2);
  });

  it('stores arrow color metadata', () => {
    const arrow = createArrow({ x: 0, y: 0, angle: 0, mass: 1, color: 'blue' });
    expect(arrow.plugin.entity.color).toBe('blue');
  });

  it('creates material pieces with readable metadata', () => {
    const piece = createBoxPiece({ x: 0, y: 0, width: 80, height: 30, material: 'wood', isStatic: false, settings: { woodMass: 1 } });
    expect(piece.plugin.entity.material).toBe('wood');
  });

  it('creates static rule wood boxes with deterministic band metadata', () => {
    const body = createRuleWoodBox({
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      seed: 8,
      colorCount: 1,
      segmentCount: 3,
      settings: { woodMass: 1 }
    });
    expect(body.isStatic).toBe(true);
    expect(body.plugin.entity.type).toBe('ruleWood');
    expect(body.plugin.entity.material).toBe('wood');
    expect(body.plugin.entity.bands.layers[0].segments.length).toBeGreaterThan(0);
    expect(new Set(body.plugin.entity.bands.layers[0].segments.map((segment) => segment.color)).size).toBe(1);
  });

  it('creates static rule wood circles with deterministic band metadata', () => {
    const body = createRuleWoodCircle({ x: 10, y: 20, radius: 55, seed: 9, settings: { woodMass: 1 } });
    expect(body.isStatic).toBe(true);
    expect(body.plugin.entity.type).toBe('ruleWood');
    expect(body.plugin.entity.shape).toBe('circle');
    expect(body.plugin.entity.radius).toBe(55);
  });

  it('creates hinged plank with body and pivot constraint', () => {
    const hinged = createHingedPlank({ x: 0, y: 0, length: 160, angle: 0, settings: { woodMass: 1 } });
    expect(hinged.body.plugin.entity.type).toBe('hinged-plank');
    expect(hinged.constraint.pointA).toBeTruthy();
  });

  it('creates balloons as sensors', () => {
    const balloon = createBalloon({ x: 0, y: 0, radius: 24, color: '#f25565' });
    expect(balloon.isSensor).toBe(true);
    expect(balloon.plugin.entity.type).toBe('balloon');
  });

  it('creates a static ground platform', () => {
    const ground = createGround({ x: 0, y: 400, width: 900, height: 90 });
    expect(ground.isStatic).toBe(true);
    expect(ground.plugin.entity.type).toBe('ground');
    expect(ground.plugin.entity.width).toBe(900);
  });
});
