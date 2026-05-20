import { describe, expect, it } from 'vitest';
import { getBowPreviewGeometry, getStuckArrowPose, worldToLocal } from './geometry.js';

describe('getBowPreviewGeometry', () => {
  it('rotates string anchors with the bow and places the arrow on the pulled string', () => {
    const aimState = {
      center: { x: 100, y: 100 },
      visualPull: { x: -60, y: 30 },
      launchVector: { x: 0.8944271909999159, y: -0.4472135954999579 },
      angle: -Math.PI / 4
    };
    const geometry = getBowPreviewGeometry(aimState, { bowRadius: 60, arcLimit: 1, arrowLength: 90, nockInset: 9, stringSlack: 0 });

    expect(geometry.pullPoint).toEqual({ x: 40, y: 130 });
    expect(geometry.stringTop.x).not.toBeCloseTo(100);
    expect(geometry.stringBottom.x).not.toBeCloseTo(100);
    expect(geometry.arrowCenter.x).toBeGreaterThan(geometry.pullPoint.x);
    expect(geometry.arrowCenter.y).toBeLessThan(geometry.pullPoint.y);
  });

  it('keeps the bow string relaxed through the early pull slack', () => {
    const geometry = getBowPreviewGeometry({
      center: { x: 100, y: 100 },
      visualPull: { x: 12, y: 0 },
      launchVector: { x: -1, y: 0 },
      angle: Math.PI
    }, { stringSlack: 20, arrowLength: 60, nockInset: 6 });

    expect(geometry.pullPoint).toEqual({ x: 100, y: 100 });
    expect(geometry.arrowCenter.x).toBe(76);
  });

  it('starts stretching the bow string only after slack is exceeded', () => {
    const geometry = getBowPreviewGeometry({
      center: { x: 100, y: 100 },
      visualPull: { x: 50, y: 0 },
      launchVector: { x: -1, y: 0 },
      angle: Math.PI
    }, { stringSlack: 20, arrowLength: 60, nockInset: 6 });

    expect(geometry.pullPoint).toEqual({ x: 130, y: 100 });
    expect(geometry.arrowCenter.x).toBe(106);
  });
});

describe('stuck arrow pose', () => {
  it('keeps an arrow on the same local point as a rotating target body', () => {
    const target = { position: { x: 100, y: 50 }, angle: Math.PI / 6 };
    const initialArrowCenter = { x: 130, y: 60 };
    const arrowEntity = {
      stuckLocalPosition: worldToLocal(target, initialArrowCenter),
      stuckRelativeAngle: Math.PI / 8
    };

    target.position = { x: 120, y: 80 };
    target.angle = Math.PI / 3;
    const pose = getStuckArrowPose(target, arrowEntity);

    expect(pose.position.x).not.toBeCloseTo(initialArrowCenter.x);
    expect(pose.position.y).not.toBeCloseTo(initialArrowCenter.y);
    expect(pose.angle).toBeCloseTo(Math.PI / 3 + Math.PI / 8);
  });
});
