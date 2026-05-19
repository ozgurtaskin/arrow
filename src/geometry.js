import { ARROW_LENGTH } from './tuning.js';

export function rotatePoint(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}

export function addPoints(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function worldToLocal(body, point) {
  return rotatePoint({
    x: point.x - body.position.x,
    y: point.y - body.position.y
  }, -body.angle);
}

export function localToWorld(body, point) {
  return addPoints(body.position, rotatePoint(point, body.angle));
}

export function getStuckArrowPose(targetBody, arrowEntity) {
  return {
    position: localToWorld(targetBody, arrowEntity.stuckLocalPosition),
    angle: targetBody.angle + arrowEntity.stuckRelativeAngle
  };
}

export function getBowPreviewGeometry(aimState, { bowRadius = 58, arcLimit = 1.15, arrowLength = ARROW_LENGTH, nockInset = 8 } = {}) {
  const pullPoint = {
    x: aimState.center.x + aimState.visualPull.x,
    y: aimState.center.y + aimState.visualPull.y
  };
  const stringTop = addPoints(aimState.center, rotatePoint({
    x: Math.cos(-arcLimit) * bowRadius,
    y: Math.sin(-arcLimit) * bowRadius
  }, aimState.angle));
  const stringBottom = addPoints(aimState.center, rotatePoint({
    x: Math.cos(arcLimit) * bowRadius,
    y: Math.sin(arcLimit) * bowRadius
  }, aimState.angle));
  const arrowCenter = {
    x: pullPoint.x + aimState.launchVector.x * (arrowLength / 2 - nockInset),
    y: pullPoint.y + aimState.launchVector.y * (arrowLength / 2 - nockInset)
  };
  const arrowTip = {
    x: arrowCenter.x + aimState.launchVector.x * (arrowLength / 2),
    y: arrowCenter.y + aimState.launchVector.y * (arrowLength / 2)
  };
  return {
    pullPoint,
    stringTop,
    stringBottom,
    arrowCenter,
    arrowTip,
    angle: aimState.angle
  };
}
