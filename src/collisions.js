import { findRuleWoodHit } from './bands.js';
import { worldToLocal } from './geometry.js';

export function getEntity(body) {
  return body?.plugin?.entity || {};
}

export function isArrowBody(body) {
  return getEntity(body).type === 'arrow';
}

export function classifyArrowCollision(arrowBody, targetBody, { point } = {}) {
  const arrow = getEntity(arrowBody);
  const target = getEntity(targetBody);
  if (arrow.type !== 'arrow') return 'ignore';
  if (target.type === 'balloon') return 'pop';
  if (target.type === 'ruleWood') {
    const localPoint = point ? worldToLocal(targetBody, point) : { x: 0, y: 0 };
    const hit = findRuleWoodHit(target, localPoint);
    if (hit.color === 'rainbow' || hit.color === 'wood' || hit.color === arrow.color) return 'stick';
    return 'bounce';
  }
  if (target.material === 'wood') return 'stick';
  if (target.material === 'rubber') return 'bounce';
  if (target.material === 'stone') return 'deflect';
  return 'ignore';
}

export function getArrowPair(bodyA, bodyB) {
  if (isArrowBody(bodyA)) return { arrow: bodyA, target: bodyB };
  if (isArrowBody(bodyB)) return { arrow: bodyB, target: bodyA };
  return null;
}

export function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { x: 0, y: -1 };
  return { x: vector.x / length, y: vector.y / length };
}

export function reflectVelocity(velocity, normal, energy) {
  const unit = normalizeVector(normal);
  const dot = velocity.x * unit.x + velocity.y * unit.y;
  return {
    x: (velocity.x - 2 * dot * unit.x) * energy,
    y: (velocity.y - 2 * dot * unit.y) * energy
  };
}

export function collisionNormalFromPair(pair, arrow, target) {
  const normal = pair.collision?.normal || { x: target.position.x - arrow.position.x, y: target.position.y - arrow.position.y };
  const towardArrow = {
    x: arrow.position.x - target.position.x,
    y: arrow.position.y - target.position.y
  };
  const dot = normal.x * towardArrow.x + normal.y * towardArrow.y;
  return dot < 0 ? { x: -normal.x, y: -normal.y } : normal;
}
