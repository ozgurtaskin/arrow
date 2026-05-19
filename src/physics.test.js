import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { addBody, createPhysicsWorld, fireArrow, stepPhysics } from './physics.js';
import { createRuleWoodCircle } from './entities.js';
import { createSettingsStore } from './settings.js';

function blueRuleWoodCircle() {
  const body = createRuleWoodCircle({ x: 0, y: 0, radius: 42, settings: { woodMass: 1 } });
  body.plugin.entity.bands = {
    layers: [
      {
        kind: 'segmented',
        name: 'outer',
        thickness: 12,
        segments: [{ color: 'blue', start: 0, end: 1, size: 1 }]
      },
      { kind: 'rainbow', name: 'rainbow', thickness: 12, segments: [{ color: 'rainbow', start: 0, end: 1, size: 1 }] }
    ]
  };
  return body;
}

describe('rule wood physics collisions', () => {
  it('rejects nonmatching bounces as future shot anchors', () => {
    const world = createPhysicsWorld(createSettingsStore({ gravity: 0 }));
    addBody(world, blueRuleWoodCircle());

    const arrow = fireArrow(world, { x: -150, y: 0, angle: 0, force: 1, color: 'green' });
    const serialBeforeCollision = world.lastImpact?.serial || 0;
    const impactSerialBeforeCollision = world.impactSerial;

    for (let index = 0; index < 80 && arrow.plugin.entity.state === 'flying' && arrow.plugin.entity.canAnchor !== false; index += 1) {
      stepPhysics(world, 1000 / 60);
    }

    expect(arrow.plugin.entity.state).not.toBe('stuck');
    expect(arrow.plugin.entity.canAnchor).toBe(false);
    expect(world.lastImpact?.serial || 0).toBe(serialBeforeCollision);
    expect(world.impactSerial).toBe(impactSerialBeforeCollision);

    const serialAfterBounce = world.lastImpact?.serial || 0;
    Matter.Body.setVelocity(arrow, { x: 0, y: 0 });
    arrow.plugin.entity.ageMs = 900;
    stepPhysics(world, 1000 / 60);

    expect(arrow.plugin.entity.state).toBe('settled');
    expect(world.lastImpact?.serial || 0).toBe(serialAfterBounce);
  });
});
