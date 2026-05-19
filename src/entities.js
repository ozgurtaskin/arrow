import Matter from 'matter-js';
import { createRuleWoodBands } from './bands.js';
import { getMaterialConfig } from './materials.js';

function attachEntity(body, entity) {
  body.plugin = body.plugin || {};
  body.plugin.entity = entity;
  return body;
}

export function createArrow({ x, y, angle, mass, color = 'green' }) {
  const body = Matter.Bodies.rectangle(x, y, 92, 8, {
    label: 'arrow',
    angle,
    frictionAir: 0.002,
    chamfer: { radius: 3 }
  });
  Matter.Body.setMass(body, mass);
  return attachEntity(body, { type: 'arrow', state: 'ready', length: 92, wobble: 0, color });
}

export function createBalloon({ x, y, radius, color }) {
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: 'balloon',
    isSensor: true,
    frictionAir: 0.01
  }), { type: 'balloon', color, radius });
}

export function createBoxPiece({ x, y, width, height, material, isStatic = false, angle = 0, settings = {} }) {
  const config = getMaterialConfig(material, settings);
  return attachEntity(Matter.Bodies.rectangle(x, y, width, height, {
    label: `${material}-box`,
    isStatic,
    angle,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction,
    chamfer: { radius: material === 'rubber' ? 18 : 6 }
  }), { type: 'piece', material, shape: 'box', width, height, wobble: 0 });
}

export function createCirclePiece({ x, y, radius, material, isStatic = false, settings = {} }) {
  const config = getMaterialConfig(material, settings);
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: `${material}-circle`,
    isStatic,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction
  }), { type: 'piece', material, shape: 'circle', radius, wobble: 0 });
}

export function createRuleWoodBox({ x, y, width, height, angle = 0, seed = 1, settings = {} }) {
  const config = getMaterialConfig('wood', settings);
  return attachEntity(Matter.Bodies.rectangle(x, y, width, height, {
    label: 'rule-wood-box',
    isStatic: true,
    angle,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction,
    chamfer: { radius: 8 }
  }), {
    type: 'ruleWood',
    material: 'wood',
    shape: 'box',
    width,
    height,
    wobble: 0,
    bands: createRuleWoodBands({ seed })
  });
}

export function createRuleWoodCircle({ x, y, radius, seed = 1, settings = {} }) {
  const config = getMaterialConfig('wood', settings);
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: 'rule-wood-circle',
    isStatic: true,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction
  }), {
    type: 'ruleWood',
    material: 'wood',
    shape: 'circle',
    radius,
    wobble: 0,
    bands: createRuleWoodBands({ seed })
  });
}

export function createGround({ x = 0, y = 430, width = 2200, height = 110 } = {}) {
  return attachEntity(Matter.Bodies.rectangle(x, y, width, height, {
    label: 'ground',
    isStatic: true,
    friction: 0.9,
    restitution: 0.05,
    chamfer: { radius: 10 }
  }), { type: 'ground', material: 'wood', shape: 'ground', width, height, wobble: 0 });
}

export function createHingedPlank({ x, y, length, angle = 0, settings = {} }) {
  const body = createBoxPiece({ x, y, width: length, height: 26, material: 'wood', isStatic: false, angle, settings });
  body.label = 'hinged-plank';
  body.plugin.entity.type = 'hinged-plank';
  const constraint = Matter.Constraint.create({
    pointA: { x: x - Math.cos(angle) * length * 0.42, y: y - Math.sin(angle) * length * 0.42 },
    bodyB: body,
    pointB: { x: -length * 0.42, y: 0 },
    stiffness: 0.92,
    damping: 0.04,
    length: 0
  });
  return { body, constraint };
}
