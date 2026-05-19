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
const STICK_WOBBLE_MS = 160;
const BALLOON_DRAG_MAX_OFFSET = 22;
const BALLOON_DRAG_SPRING = 42;
const BALLOON_DRAG_DAMPING = 10;

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

function recordAnchorableImpact(world, point, body) {
  if (entityOf(body)?.canAnchor === false) return;
  recordImpact(world, point, body);
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

function addComicPop(world, point, color) {
  world.comicPops.push({
    x: point.x,
    y: point.y,
    color,
    life: 0.28,
    maxLife: 0.28
  });
}

function addFloatingText(world, point, text, color) {
  world.floaters.push({
    x: point.x,
    y: point.y - 18,
    vy: -58,
    text,
    color,
    life: 0.82,
    maxLife: 0.82
  });
}

function stickArrow(world, arrow, target, point) {
  const arrowEntity = entityOf(arrow);
  if (!arrowEntity || arrowEntity.state !== 'flying') return;

  arrowEntity.state = 'stuck';
  arrowEntity.stickWobble = STICK_WOBBLE_MS;
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
  recordAnchorableImpact(world, point, arrow);
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
  if (targetEntity?.type === 'ruleWood') arrowEntity.canAnchor = false;
  if (targetEntity) targetEntity.wobble = 1;
  recordAnchorableImpact(world, point, arrow);
}

function shatterArrow(world, arrow, point) {
  const arrowEntity = entityOf(arrow);
  addBurst(world, point, arrowEntity?.color || '#f25565');
  removeBody(world, arrow);
}

function breakShield(world, arrow, target, point) {
  const targetEntity = entityOf(target);
  if (targetEntity) {
    targetEntity.shieldIntact = false;
    targetEntity.wobble = 1;
  }
  addBurst(world, point, '#20242c');
  removeBody(world, arrow);
}

function popBalloon(world, arrow, balloon, point) {
  const balloonEntity = entityOf(balloon);
  const reward = balloonEntity?.rewardArrows || 3;
  const color = balloonEntity?.color || '#f25565';
  addBurst(world, point, color);
  addComicPop(world, point, color);
  addFloatingText(world, point, `+${reward}`, color);
  world.events.onBalloonPop?.({ point, reward, color });
  removeBody(world, balloon);
  recordAnchorableImpact(world, point, arrow);
}

function normalizeVector(vector) {
  const magnitude = Matter.Vector.magnitude(vector);
  if (magnitude <= 0.0001) return null;
  return { x: vector.x / magnitude, y: vector.y / magnitude, magnitude };
}

function getBalloonRoundPiecePair(bodyA, bodyB) {
  const entityA = entityOf(bodyA);
  const entityB = entityOf(bodyB);
  if (entityA?.type === 'balloon' && entityB?.type === 'piece' && entityB.shape === 'circle' && !bodyB.isStatic) {
    return { balloon: bodyA, roundPiece: bodyB };
  }
  if (entityB?.type === 'balloon' && entityA?.type === 'piece' && entityA.shape === 'circle' && !bodyA.isStatic) {
    return { balloon: bodyB, roundPiece: bodyA };
  }
  return null;
}

function nudgeBalloonFromRoundPiece(pair) {
  const balloonPair = getBalloonRoundPiecePair(pair.bodyA, pair.bodyB);
  if (!balloonPair) return;
  const { balloon, roundPiece } = balloonPair;
  const balloonEntity = entityOf(balloon);
  const velocityDirection = normalizeVector(roundPiece.velocity);
  const fallbackDirection = normalizeVector(Matter.Vector.sub(balloon.position, roundPiece.position));
  const direction = velocityDirection || fallbackDirection;
  if (!direction) return;

  const speed = velocityDirection?.magnitude || 0;
  const impulse = Math.min(220, 80 + speed * 14);
  balloonEntity.dragOffset = balloonEntity.dragOffset || { x: 0, y: 0 };
  balloonEntity.dragVelocity = balloonEntity.dragVelocity || { x: 0, y: 0 };
  balloonEntity.dragVelocity.x += direction.x * impulse;
  balloonEntity.dragVelocity.y += direction.y * impulse;
}

function handleArrowCollision(world, pair) {
  const arrowPair = getArrowPair(pair.bodyA, pair.bodyB);
  if (!arrowPair) return;
  const { arrow, target } = arrowPair;
  const arrowEntity = entityOf(arrow);
  if (!arrowEntity || arrowEntity.state !== 'flying') return;

  const point = impactPoint(pair, arrow);
  const targetEntity = entityOf(target);
  const action = classifyArrowCollision(arrow, target, {
    point,
    direction: arrow.velocity,
    useSurfacePoint: targetEntity?.type === 'ruleWood'
  });
  if (action === 'pop') popBalloon(world, arrow, target, point);
  if (action === 'stick') stickArrow(world, arrow, target, point);
  if (action === 'bounce') bounceArrow(world, arrow, target, pair, world.settings);
  if (action === 'shatter') shatterArrow(world, arrow, point);
  if (action === 'breakShield') breakShield(world, arrow, target, point);
  if (action === 'deflect') recordAnchorableImpact(world, point, arrow);
}

function updateBalloonDrag(entity, dt) {
  if (!entity.dragOffset && !entity.dragVelocity) return;
  const offset = entity.dragOffset || { x: 0, y: 0 };
  const velocity = entity.dragVelocity || { x: 0, y: 0 };
  velocity.x += -offset.x * BALLOON_DRAG_SPRING * dt;
  velocity.y += -offset.y * BALLOON_DRAG_SPRING * dt;
  const damping = Math.max(0, 1 - BALLOON_DRAG_DAMPING * dt);
  velocity.x *= damping;
  velocity.y *= damping;
  offset.x += velocity.x * dt;
  offset.y += velocity.y * dt;

  const magnitude = Math.hypot(offset.x, offset.y);
  if (magnitude > BALLOON_DRAG_MAX_OFFSET) {
    const scale = BALLOON_DRAG_MAX_OFFSET / magnitude;
    offset.x *= scale;
    offset.y *= scale;
  }
  if (Math.hypot(offset.x, offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 2) {
    entity.dragOffset = { x: 0, y: 0 };
    entity.dragVelocity = { x: 0, y: 0 };
    return;
  }
  entity.dragOffset = offset;
  entity.dragVelocity = velocity;
}

export function createPhysicsWorld(settingsStore, events = {}) {
  const settings = settingsStore.get();
  const engine = Matter.Engine.create();
  engine.gravity.y = settings.gravity;
  const world = {
    engine,
    settings,
    events,
    arrows: [],
    materialBodies: [],
    particles: [],
    floaters: [],
    comicPops: [],
    stuckArrowConstraints: [],
    lastImpact: null,
    impactSerial: 0,
    generator: null,
    arrowCap: 80
  };

  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      handleArrowCollision(world, pair);
      nudgeBalloonFromRoundPiece(pair);
    });
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
  const dt = deltaMs / 1000;

  world.particles = world.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vy: particle.vy + 280 * dt,
      life: particle.life - dt
    }))
    .filter((particle) => particle.life > 0);

  world.floaters = world.floaters
    .map((floater) => ({
      ...floater,
      y: floater.y + floater.vy * dt,
      life: floater.life - dt
    }))
    .filter((floater) => floater.life > 0);

  world.comicPops = world.comicPops
    .map((pop) => ({
      ...pop,
      life: pop.life - dt
    }))
    .filter((pop) => pop.life > 0);

  for (const body of Matter.Composite.allBodies(world.engine.world)) {
    const entity = entityOf(body);
    if (!entity) continue;
    if (entity.wobble) entity.wobble = Math.max(0, entity.wobble - deltaMs / 260);
    if (entity.type === 'balloon') updateBalloonDrag(entity, dt);
    if (entity.stickWobble) entity.stickWobble = Math.max(0, entity.stickWobble - deltaMs);
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
      recordAnchorableImpact(world, { x: body.position.x, y: body.position.y }, body);
    }
  }
}

export function fireArrow(world, { x, y, angle, force, color = 'green' }) {
  const arrow = createArrow({ x, y, angle, mass: world.settings.arrowMass, color });
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
      addBody(world, createBalloon({
        x: item.x,
        y: item.y,
        radius: item.radius || 28,
        color: item.color,
        isStatic: item.isStatic,
        rewardArrows: item.rewardArrows
      }));
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
