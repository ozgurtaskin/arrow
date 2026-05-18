function normalizePull(pullDistance, maxPull) {
  if (!Number.isFinite(pullDistance) || !Number.isFinite(maxPull) || maxPull <= 0) return 0;
  return Math.max(0, Math.min(1, pullDistance / maxPull));
}

export function getAimState({ center, pointer, maxPull }) {
  const pull = { x: pointer.x - center.x, y: pointer.y - center.y };
  const pullDistance = Math.hypot(pull.x, pull.y);
  const safeDistance = pullDistance || 1;
  const unit = { x: pull.x / safeDistance, y: pull.y / safeDistance };
  const cappedDistance = Math.min(pullDistance, Math.max(0, maxPull));
  const visualPull = { x: unit.x * cappedDistance, y: unit.y * cappedDistance };
  const launchVector = { x: -unit.x, y: -unit.y };

  return {
    center,
    pointer,
    pull,
    pullDistance,
    visualPull,
    launchVector,
    angle: Math.atan2(launchVector.y, launchVector.x),
    normalizedPull: normalizePull(pullDistance, maxPull)
  };
}
