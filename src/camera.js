export function easeInOut(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

export function createCamera({ width, height }) {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    width,
    height,
    shakeTime: 0,
    shakeStrength: 0,
    transition: null
  };
}

export function startShake(camera, strength, duration = 0.18) {
  camera.shakeStrength = strength;
  camera.shakeTime = duration;
}

export function startCameraTransition(camera, target, settings) {
  const duration = Math.max(0.01, settings.cameraEaseDuration);
  camera.transition = {
    elapsed: 0,
    duration,
    from: { x: camera.x, y: camera.y, zoom: camera.zoom },
    to: {
      x: camera.x + (target.x - camera.x) * settings.cameraFollowX,
      y: camera.y + (target.y - camera.y) * settings.cameraFollowY,
      zoom: target.zoom
    }
  };
}

export function updateCamera(camera, dt) {
  if (camera.shakeTime > 0) {
    camera.shakeTime = Math.max(0, camera.shakeTime - dt);
  }
  if (!camera.transition) return;
  camera.transition.elapsed = Math.min(camera.transition.duration, camera.transition.elapsed + dt);
  const t = easeInOut(camera.transition.elapsed / camera.transition.duration);
  const { from, to } = camera.transition;
  camera.x = from.x + (to.x - from.x) * t;
  camera.y = from.y + (to.y - from.y) * t;
  camera.zoom = from.zoom + (to.zoom - from.zoom) * t;
  if (camera.transition.elapsed >= camera.transition.duration) {
    camera.transition = null;
  }
}
