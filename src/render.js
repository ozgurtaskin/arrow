import { getWorldBodies } from './physics.js';
import { getBowPreviewGeometry } from './geometry.js';

const ARROW_COLOR_STYLES = {
  green: '#39e85f',
  yellow: '#ffd91f',
  blue: '#2458ff'
};

const BAND_STYLES = {
  green: '#2cff4c',
  yellow: '#ffdf24',
  blue: '#244bff'
};

const MAX_PULL_FOR_STRING = 190;
const STICK_WOBBLE_MS = 160;

export function resizeCanvas(canvas, ctx) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function screenToWorld(point, camera) {
  return {
    x: (point.x - camera.width / 2) / camera.zoom + camera.x,
    y: (point.y - camera.height / 2) / camera.zoom + camera.y
  };
}

export function worldToScreen(point, camera) {
  return {
    x: (point.x - camera.x) * camera.zoom + camera.width / 2,
    y: (point.y - camera.y) * camera.zoom + camera.height / 2
  };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function colorForArrow(color) {
  return ARROW_COLOR_STYLES[color] || '#e94f28';
}

function drawSky(ctx, canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#b9edff');
  gradient.addColorStop(1, '#eefbdc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 170 + 60) % width) - 80;
    const y = 80 + i * 130;
    ctx.beginPath();
    ctx.ellipse(x, y, 75, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 55, y + 8, 85, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(85, 181, 132, 0.18)';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 80) {
    ctx.lineTo(x, height - 95 - Math.sin(x * 0.018) * 28);
  }
  ctx.lineTo(width, height);
  ctx.fill();
}

function drawWood(ctx, entity) {
  roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, entity.height, 7);
  ctx.fillStyle = '#c9955e';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8d6037';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(113, 72, 35, 0.28)';
  for (let y = -entity.height / 4; y <= entity.height / 4; y += 11) {
    ctx.beginPath();
    ctx.moveTo(-entity.width / 2 + 10, y);
    ctx.quadraticCurveTo(0, y + 4, entity.width / 2 - 10, y - 3);
    ctx.stroke();
  }
}

function drawGround(ctx, entity) {
  const topHeight = Math.min(22, entity.height * 0.32);
  roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, entity.height, 10);
  ctx.fillStyle = '#b98055';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7c5538';
  ctx.stroke();

  ctx.fillStyle = '#74bd4a';
  roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, topHeight, 10);
  ctx.fill();
  ctx.strokeStyle = '#4f9737';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-entity.width / 2, -entity.height / 2 + topHeight);
  for (let x = -entity.width / 2; x <= entity.width / 2; x += 34) {
    ctx.quadraticCurveTo(x + 17, -entity.height / 2 + topHeight + 12, x + 34, -entity.height / 2 + topHeight);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(111, 75, 47, 0.22)';
  for (let i = 0; i < 18; i += 1) {
    const x = -entity.width / 2 + 90 + i * 115;
    const y = -entity.height / 2 + topHeight + 22 + (i % 4) * 12;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRubber(ctx, entity) {
  const wobble = entity.wobble || 0;
  ctx.save();
  ctx.lineWidth = 7 + wobble * 5;
  ctx.strokeStyle = '#e64d91';
  ctx.fillStyle = '#ff78b8';
  if (entity.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
  } else {
    roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, entity.height, 18 + wobble * 8);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-18, -10, 16, 7, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStone(ctx, entity) {
  ctx.fillStyle = '#686f78';
  ctx.strokeStyle = '#424850';
  ctx.lineWidth = 4;
  if (entity.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
  } else {
    roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, entity.height, 8);
  }
  ctx.fill();
  ctx.stroke();
}

function drawBalloon(ctx, entity) {
  ctx.fillStyle = entity.color;
  ctx.strokeStyle = 'rgba(31, 55, 73, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, entity.radius * 0.82, entity.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-8, -10, 7, 12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = entity.color;
  ctx.beginPath();
  ctx.moveTo(-5, entity.radius - 2);
  ctx.lineTo(5, entity.radius - 2);
  ctx.lineTo(0, entity.radius + 9);
  ctx.closePath();
  ctx.fill();
}

function drawArrow(ctx, entity) {
  const length = entity.length || 92;
  const arrowColor = colorForArrow(entity.color);
  const wobbleTime = entity.stickWobble || 0;
  const wobbleRatio = Math.max(0, Math.min(1, wobbleTime / STICK_WOBBLE_MS));
  const bend = Math.sin(wobbleRatio * Math.PI * 5) * wobbleRatio * 5;

  if (entity.state === 'flying') {
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 0; index < 3; index += 1) {
      ctx.globalAlpha = 0.18 - index * 0.045;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2 - index * 0.35;
      ctx.beginPath();
      ctx.moveTo(-length / 2 - 10 - index * 10, 0);
      ctx.lineTo(-length / 2 - 2 - index * 8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = arrowColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(length / 2, 0);
  ctx.quadraticCurveTo(6, bend * 0.35, -length / 2, bend);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(39, 55, 70, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(length / 2 - 8, 0);
  ctx.lineTo(length / 2, 0);
  ctx.stroke();
  ctx.restore();
}

function traceRuleWoodShape(ctx, entity) {
  if (entity.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
    return;
  }
  roundedRect(ctx, -entity.width / 2, -entity.height / 2, entity.width, entity.height, 8);
}

function drawRuleWoodGrain(ctx, entity) {
  const width = entity.shape === 'circle' ? entity.radius * 2 : entity.width;
  const height = entity.shape === 'circle' ? entity.radius * 2 : entity.height;
  ctx.strokeStyle = 'rgba(113, 72, 35, 0.25)';
  ctx.lineWidth = 2;
  for (let y = -height * 0.28; y <= height * 0.28; y += 13) {
    const span = entity.shape === 'circle'
      ? Math.sqrt(Math.max(0, entity.radius * entity.radius - y * y)) * 0.72
      : width / 2 - 16;
    ctx.beginPath();
    ctx.moveTo(-span, y);
    ctx.quadraticCurveTo(0, y + 4, span, y - 3);
    ctx.stroke();
  }
}

function drawRuleWoodCore(ctx, entity) {
  ctx.save();
  traceRuleWoodShape(ctx, entity);
  ctx.fillStyle = '#c9955e';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8d6037';
  ctx.stroke();

  traceRuleWoodShape(ctx, entity);
  ctx.clip();
  drawRuleWoodGrain(ctx, entity);
  ctx.restore();
}

function drawCircularRuleWood(ctx, entity) {
  const outer = entity.bands.layers[0];
  const outerRadius = Math.max(0.1, entity.radius - outer.thickness / 2);

  drawRuleWoodCore(ctx, entity);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineWidth = outer.thickness;
  for (const segment of outer.segments) {
    ctx.beginPath();
    ctx.strokeStyle = BAND_STYLES[segment.color];
    ctx.arc(0, 0, outerRadius, segment.start * Math.PI * 2, segment.end * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRectRuleWood(ctx, entity) {
  const outer = entity.bands.layers[0];
  const outerInset = outer.thickness / 2;
  const loopWidth = Math.max(1, entity.width);
  const loopHeight = Math.max(1, entity.height);
  const halfWidth = loopWidth / 2;
  const halfHeight = loopHeight / 2;
  const perimeter = 2 * (loopWidth + loopHeight);

  function clampToInset(value, min, max, inset) {
    const lower = min + inset;
    const upper = max - inset;
    if (lower > upper) return (min + max) / 2;
    return Math.max(lower, Math.min(upper, value));
  }

  function pointAtOriginalLoop(t, inset) {
    const safeInset = Math.max(0, Math.min(inset, halfWidth, halfHeight));
    let distance = (((t % 1) + 1) % 1) * perimeter;
    if (distance <= loopWidth) {
      return {
        x: clampToInset(-halfWidth + distance, -halfWidth, halfWidth, safeInset),
        y: -halfHeight + safeInset
      };
    }
    distance -= loopWidth;
    if (distance <= loopHeight) {
      return {
        x: halfWidth - safeInset,
        y: clampToInset(-halfHeight + distance, -halfHeight, halfHeight, safeInset)
      };
    }
    distance -= loopHeight;
    if (distance <= loopWidth) {
      return {
        x: clampToInset(halfWidth - distance, -halfWidth, halfWidth, safeInset),
        y: halfHeight - safeInset
      };
    }
    distance -= loopWidth;
    return {
      x: -halfWidth + safeInset,
      y: clampToInset(halfHeight - distance, -halfHeight, halfHeight, safeInset)
    };
  }

  function strokeSegment(startT, endT, inset) {
    const samples = Math.max(2, Math.ceil((endT - startT) * perimeter / 18));
    ctx.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const point = pointAtOriginalLoop(startT + ((endT - startT) * index) / samples, inset);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  drawRuleWoodCore(ctx, entity);
  ctx.save();
  roundedRect(ctx, -halfWidth, -halfHeight, loopWidth, loopHeight, 6);
  ctx.clip();

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.lineWidth = outer.thickness;
  for (const segment of outer.segments) {
    ctx.strokeStyle = BAND_STYLES[segment.color];
    strokeSegment(segment.start, segment.end, outerInset);
  }
  ctx.restore();
}

function drawRuleWood(ctx, entity, time) {
  if (entity.shape === 'circle') drawCircularRuleWood(ctx, entity, time);
  else drawRectRuleWood(ctx, entity, time);
}

function drawBody(ctx, body, time) {
  const entity = body.plugin?.entity;
  if (!entity) return;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  if (entity.type === 'arrow') drawArrow(ctx, entity);
  if (entity.type === 'balloon') drawBalloon(ctx, entity);
  if (entity.type === 'ground') drawGround(ctx, entity);
  else if (entity.type === 'ruleWood') drawRuleWood(ctx, entity, time);
  else if (entity.material === 'wood') drawWood(ctx, entity);
  if (entity.material === 'rubber') drawRubber(ctx, entity);
  if (entity.material === 'stone') drawStone(ctx, entity);
  ctx.restore();
}

function drawHinges(ctx, world) {
  ctx.strokeStyle = 'rgba(70, 76, 84, 0.42)';
  ctx.fillStyle = '#f1f1f1';
  ctx.lineWidth = 3;
  for (const constraint of world.engine.world.constraints) {
    if (!constraint.bodyB || !constraint.pointA || constraint.bodyB.plugin?.entity?.type !== 'hinged-plank') continue;
    ctx.beginPath();
    ctx.moveTo(constraint.pointA.x, constraint.pointA.y);
    ctx.lineTo(constraint.bodyB.position.x, constraint.bodyB.position.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(constraint.pointA.x, constraint.pointA.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawShotArea(ctx, shotArea) {
  if (!shotArea) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeStyle = 'rgba(47, 59, 72, 0.42)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(shotArea.center.x, shotArea.center.y, shotArea.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(230, 77, 145, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(shotArea.center.x, shotArea.center.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 0.35);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrajectory(ctx, aimState, startPoint) {
  const step = 18;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  for (let i = 1; i <= 10; i += 1) {
    const t = i * step;
    const x = startPoint.x + aimState.launchVector.x * t;
    const y = startPoint.y + aimState.launchVector.y * t + i * i * 2.2;
    ctx.beginPath();
    ctx.rect(x - 5, y - 5, 10, 10);
    ctx.fill();
  }
}

function drawBowPreview(ctx, aimState) {
  const geometry = getBowPreviewGeometry(aimState);
  const center = aimState.center;
  const angle = aimState.angle;

  drawTrajectory(ctx, aimState, geometry.arrowTip);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#d98225';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 58, -1.15, 1.15);
  ctx.stroke();
  ctx.restore();

  const pullRatio = Math.max(0, Math.min(1, (aimState.pullDistance || 0) / MAX_PULL_FOR_STRING));
  const stringWidth = Math.max(0.8, 3.2 - pullRatio * 2.2);
  ctx.strokeStyle = '#273746';
  ctx.lineWidth = stringWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(geometry.stringTop.x, geometry.stringTop.y);
  ctx.lineTo(geometry.pullPoint.x, geometry.pullPoint.y);
  ctx.lineTo(geometry.stringBottom.x, geometry.stringBottom.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.save();
  ctx.translate(geometry.arrowCenter.x, geometry.arrowCenter.y);
  ctx.rotate(angle);
  drawArrow(ctx, { length: 92, color: aimState.arrowColor });
  ctx.restore();
}

function drawArrowColorHud(ctx, arrowColors) {
  if (!arrowColors) return;
  const x = 18;
  const y = 18;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.strokeStyle = 'rgba(47, 59, 72, 0.18)';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, 122, 56, 8);
  ctx.fill();
  ctx.stroke();

  function swatch(label, color, offsetX) {
    ctx.fillStyle = '#2f3b48';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(label, x + offsetX, y + 14);
    ctx.fillStyle = colorForArrow(color);
    ctx.beginPath();
    ctx.arc(x + offsetX + 18, y + 34, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(47, 59, 72, 0.24)';
    ctx.stroke();
  }

  swatch('NOW', arrowColors.current, 12);
  swatch('NEXT', arrowColors.next, 68);
  ctx.restore();
}

export function renderFrame({ ctx, canvas, camera, world, aimState, shotArea, arrowColors, time = 0 }) {
  drawSky(ctx, canvas);

  const shake = camera.shakeTime > 0 ? camera.shakeStrength * (camera.shakeTime / 0.18) : 0;
  const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
  const shakeY = shake ? (Math.random() - 0.5) * shake : 0;

  ctx.save();
  ctx.translate(canvas.clientWidth / 2 + shakeX, canvas.clientHeight / 2 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawShotArea(ctx, shotArea);
  drawHinges(ctx, world);
  getWorldBodies(world).forEach((body) => drawBody(ctx, body, time));
  drawParticles(ctx, world.particles);
  if (aimState) drawBowPreview(ctx, aimState);
  ctx.restore();
  drawArrowColorHud(ctx, arrowColors);
}
