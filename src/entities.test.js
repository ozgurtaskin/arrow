import { describe, expect, it } from 'vitest';
import { createArrow, createBalloon, createBoxPiece, createGround, createHingedPlank } from './entities.js';

describe('entity factories', () => {
  it('creates arrows with metadata and mass', () => {
    const arrow = createArrow({ x: 10, y: 20, angle: 0.5, mass: 2 });
    expect(arrow.label).toBe('arrow');
    expect(arrow.plugin.entity.type).toBe('arrow');
    expect(arrow.mass).toBeCloseTo(2);
  });

  it('creates material pieces with readable metadata', () => {
    const piece = createBoxPiece({ x: 0, y: 0, width: 80, height: 30, material: 'wood', isStatic: false, settings: { woodMass: 1 } });
    expect(piece.plugin.entity.material).toBe('wood');
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
