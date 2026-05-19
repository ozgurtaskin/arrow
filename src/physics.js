import Matter from 'matter-js';
import { classifyArrowCollision, collisionNormalFromPair, getArrowPair, reflectVelocity } from './collisions.js';
import {
  createArrow,
  createBalloon,
  createBoxPiece,
  createCirclePiece,
  createGround,
  createHingedPlank,
  createRuleWoodBox,
  createRuleWoodCircle
} from './entities.js';
import { getStuckArrowPose, worldToLocal } from './geometry.js';
import { createGenerator, nextCluster } from './generator.js';
import { getMaterialConfig } from './materials.js';

const ARROW_SPEED = 42;
const SETTLE_SPEED = 0.42;
const SETTLE_AGE_MS = 800;

function entityOf(body) {
  return body?.plugin?.entity;
}

function impactPoint(pair, arrow) {
  const support = pair.collision?.supports?.[0];
  return support ? { x: support.x, y: support.y } : { x: arrow.position.x, y: arrow.position.y };
}

function recordImpact(world, point, body) {
  world.impactSerial += 1;
  world.lastImpact = {
    serial: world.impactSerial,
    x: point.x,
    y: point.y,
    body
  };
}

function addBurst(world, point, color) {
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 90 + Math.random() * 90;
    world.particles.push({
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35,
      color
    });
  }
}

function stickArrow(world, arrow, target, point) {
  const arrowEntity = entityOf(arrow);
  if (!arrowEntity || arrowEntity.state !== 'flying') return;

  arrowEntity.state = 'stuck';
  arrowEntity.stuckTo = target.id;
  Matter.Body.setVelocity(arrow, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(arrow, 0);
  arrow.collisionFilter.mask = 0;

  if (target.isStatic) {
    Matter.Body.setStatic(arrow, true);
  } else {
    arrowEntity.stuckToBody = target;
    arrowEntity.stuckLocalPosition = worldToLocal(target, arrow.position);
    arrowEntity.stuckRelativeAngle = arrow.angle - target.angle;
    Matter.Body.setStatic(arrow, true);
  }
  recordImpact(world, point, arrow);
}

function bounceArrow(world, arrow, target, pair, settings) {
  const arrowEntity = entityOf(arrow);
  if (!arrowEntity || arrowEntity.state !== 'flying') return;
  const point = impactPoint(pair, arrow);
  const normal = collisionNormalFromPair(pair, arrow, target);
  const velocity = reflectVelocity(arrow.velocity, normal, settings.rubberEnergy);
  Matter.Body.setVelocity(arrow, velocity);
  Matter.Body.setAngularVelocity(arrow, 0);
  const targetEntity = entityOf(target);
  if (targetEntity) targetEntity.wobble = 1;
  recordImpact(world, point, arrow);
}

function popBalloon(world, arrow, balloon, point) {
  const balloonEntity = entityOf(balloon);
  addBurst(world, point, balloonEntity?.color || '#f25565');
  removeBody(world, balloon);
  recordImpact(world, point, arrow);
}

function handleArrowCollision(world, pair) {
  const arrowPair = getArrowPair(pair.bodyA, pair.bodyB);
  if (!arrowPair) return;
  const { arrow, target } = arrowPair;
  const arrowEntity = entityOf(arrow);
  if (!arrowEntity || arrowEntity.state !== 'flying') return;

  const point = impactPoint(pair, arrow);
  const action = classifyArrowCollision(arrow, target, { point });
  if (action === 'pop') popBalloon(world, arrow, target, point);
  if (action === 'stick') stickArrow(world, arrow, target, point);
  if (action === 'bounce') bounceArrow(world, arrow, target, pair, world.settings);
  if (action === 'deflect') recordImpact(world, point, arrow);
}

export function createPhysicsWorld(settingsStore) {
  const settings = settingsStore.get();
  const engine = Matter.Engine.create();
  engine.gravity.y = settings.gravity;
  const world = {
    engine,
    settings,
    arrows: [],
    materialBodies: [],
    particles: [],
    stuckArrowConstraints: [],
    lastImpact: null,
    impactSerial: 0,
    generator: null,
    arrowCap: 80
  };

  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => handleArrowCollision(world, pair));
  });

  addBody(world, createGround());
  return world;
}

export function addBody(world, body) {
  Matter.World.add(world.engine.world, body);
  const entity = entityOf(body);
  if (entity?.material) world.materialBodies.push(body);
  if (entity?.type === 'arrow') world.arrows.push(body);
}

export function removeBody(world, body) {
  Matter.World.remove(world.engine.world, body);
  world.arrows = world.arrows.filter((arrow) => arrow !== body);
  world.materialBodies = world.materialBodies.filter((item) => item !== body);
  const constraints = world.stuckArrowConstraints.filter((constraint) => constraint.bodyA === body || constraint.bodyB === body);
  constraints.forEach((constraint) => Matter.World.remove(world.engine.world, constraint));
  world.stuckArrowConstraints = world.stuckArrowConstraints.filter((constraint) => !constraints.includes(constraint));
}

export function stepPhysics(world, deltaMs) {
  Matter.Engine.update(world.engine, deltaMs);

  world.particles = world.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * (deltaMs / 1000),
      y: particle.y + particle.vy * (deltaMs / 1000),
      vy: particle.vy + 280 * (deltaMs / 1000),
      life: particle.life - deltaMs / 1000
    }))
    .filter((particle) => particle.life > 0);

  for (const body of Matter.Composite.allBodies(world.engine.world)) {
    const entity = entityOf(body);
    if (!entity) continue;
    if (entity.wobble) entity.wobble = Math.max(0, entity.wobble - deltaMs / 260);
    if (entity.type === 'arrow' && entity.state === 'stuck' && entity.stuckToBody) {
      const pose = getStuckArrowPose(entity.stuckToBody, entity);
      Matter.Body.setPosition(body, pose.position);
      Matter.Body.setAngle(body, pose.angle);
    }
    if (entity.type !== 'arrow' || entity.state !== 'flying') continue;

    entity.ageMs = (entity.ageMs || 0) + deltaMs;
    const speed = Matter.Vector.magnitude(body.velocity);
    if (speed > 0.35) Matter.Body.setAngle(body, Math.atan2(body.velocity.y, body.velocity.x));
    if (entity.ageMs > SETTLE_AGE_MS && speed < SETTLE_SPEED) {
      entity.state = 'settled';
      recordImpact(world, { x: body.position.x, y: body.position.y }, body);
    }
  }
}

export function fireArrow(world, { x, y, angle, force }) {
  const arrow = createArrow({ x, y, angle, mass: world.settings.arrowMass });
  const entity = entityOf(arrow);
  entity.state = 'flying';
  entity.ageMs = 0;
  const speed = Math.max(0.08, force) * ARROW_SPEED;
  Matter.Body.setVelocity(arrow, {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  });
  addBody(world, arrow);
  return arrow;
}

export function applyLiveSettings(world, settings, changedKey) {
  world.settings = settings;
  if (changedKey === 'gravity') {
    world.engine.gravity.y = settings.gravity;
  }
  if (changedKey === 'arrowMass') {
    world.arrows.forEach((arrow) => Matter.Body.setMass(arrow, settings.arrowMass));
  }
  if (['woodMass', 'rubberMass', 'stoneMass'].includes(changedKey)) {
    world.materialBodies.forEach((body) => {
      const material = entityOf(body)?.material;
      const config = getMaterialConfig(material, settings);
      Matter.Body.setDensity(body, config.density);
    });
  }
}

function spawnCluster(world, cluster, settings) {
  for (const item of cluster.items) {
    if (item.kind === 'balloon') {
      addBody(world, createBalloon({ x: item.x, y: item.y, radius: 28, color: item.color }));
    }
    if (item.kind === 'ruleWood' && item.shape === 'box') {
      addBody(world, createRuleWoodBox({ ...item, settings }));
    }
    if (item.kind === 'ruleWood' && item.shape === 'circle') {
      addBody(world, createRuleWoodCircle({ ...item, settings }));
    }
    if (item.kind === 'piece' && item.shape === 'box') {
      addBody(world, createBoxPiece({ ...item, settings }));
    }
    if (item.kind === 'piece' && item.shape === 'circle') {
      addBody(world, createCirclePiece({ ...item, settings }));
    }
    if (item.kind === 'hinged-plank') {
      const hinged = createHingedPlank({ ...item, settings });
      addBody(world, hinged.body);
      Matter.World.add(world.engine.world, hinged.constraint);
    }
  }
}

export function ensureGeneratedAhead(world, cameraY, settings) {
  if (!world.generator) world.generator = createGenerator({ seed: 7, startY: cameraY + 380 });
  while (world.generator.nextY > cameraY - 1800) {
    spawnCluster(world, nextCluster(world.generator), settings);
  }
}

export function cleanupFarBelow(world, cameraY) {
  for (const body of Matter.Composite.allBodies(world.engine.world)) {
    const entity = entityOf(body);
    if (!entity || entity.state === 'stuck') continue;
    if (entity.type === 'ground') continue;
    if (body.position.y > cameraY + 1800) removeBody(world, body);
  }
  while (world.arrows.length > world.arrowCap) {
    removeBody(world, world.arrows[0]);
  }
}

export function getWorldBodies(world) {
  return Matter.Composite.allBodies(world.engine.world);
}
