export function isPointInsideShotArea(point, shotArea) {
  if (!shotArea) return true;
  const dx = point.x - shotArea.center.x;
  const dy = point.y - shotArea.center.y;
  return Math.hypot(dx, dy) <= shotArea.radius;
}
