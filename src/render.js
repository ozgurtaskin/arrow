import { getWorldBodies } from './physics.js';

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
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#8c5a25';
  ctx.beginPath();
  ctx.moveTo(-length / 2, 0);
  ctx.lineTo(length / 2 - 12, 0);
  ctx.stroke();

  ctx.fillStyle = '#f3a12d';
  ctx.strokeStyle = '#8c5a25';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(length / 2, 0);
  ctx.lineTo(length / 2 - 17, -9);
  ctx.lineTo(length / 2 - 13, 0);
  ctx.lineTo(length / 2 - 17, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e94f28';
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-length / 2 + 6, 0);
    ctx.lineTo(-length / 2 + 24, sign * 13);
    ctx.lineTo(-length / 2 + 31, sign * 4);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBody(ctx, body) {
  const entity = body.plugin?.entity;
  if (!entity) return;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  if (entity.type === 'arrow') drawArrow(ctx, entity);
  if (entity.type === 'balloon') drawBalloon(ctx, entity);
  if (entity.material === 'wood') drawWood(ctx, entity);
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

function drawTrajectory(ctx, aimState) {
  const step = 18;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  for (let i = 1; i <= 10; i += 1) {
    const t = i * step;
    const x = aimState.center.x + aimState.launchVector.x * t;
    const y = aimState.center.y + aimState.launchVector.y * t + i * i * 2.2;
    ctx.beginPath();
    ctx.rect(x - 5, y - 5, 10, 10);
    ctx.fill();
  }
}

function drawBowPreview(ctx, aimState) {
  const center = aimState.center;
  const pull = {
    x: center.x + aimState.visualPull.x,
    y: center.y + aimState.visualPull.y
  };
  const angle = aimState.angle;

  drawTrajectory(ctx, aimState);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#d7791f';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 58, -1.15, 1.15);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#273746';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - 56);
  ctx.lineTo(pull.x, pull.y);
  ctx.lineTo(center.x, center.y + 56);
  ctx.stroke();

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  drawArrow(ctx, { length: 92 });
  ctx.restore();
}

export function renderFrame({ ctx, canvas, camera, world, aimState }) {
  drawSky(ctx, canvas);

  const shake = camera.shakeTime > 0 ? camera.shakeStrength * (camera.shakeTime / 0.18) : 0;
  const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
  const shakeY = shake ? (Math.random() - 0.5) * shake : 0;

  ctx.save();
  ctx.translate(canvas.clientWidth / 2 + shakeX, canvas.clientHeight / 2 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawHinges(ctx, world);
  getWorldBodies(world).forEach((body) => drawBody(ctx, body));
  drawParticles(ctx, world.particles);
  if (aimState) drawBowPreview(ctx, aimState);
  ctx.restore();
}
