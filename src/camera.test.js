import { describe, expect, it } from 'vitest';
import { createCamera, easeInOut, startCameraTransition, startShake, updateCamera } from './camera.js';

describe('easeInOut', () => {
  it('starts at 0, ends at 1, and eases through the middle', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
  });
});

describe('camera transitions', () => {
  it('does not move until a transition starts', () => {
    const camera = createCamera({ width: 400, height: 800 });
    updateCamera(camera, 0.2);
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
  });

  it('eases toward an impact target', () => {
    const camera = createCamera({ width: 400, height: 800 });
    startCameraTransition(
      camera,
      { x: 200, y: -500, zoom: 1.2 },
      { cameraFollowX: 1, cameraFollowY: 1, cameraEaseDuration: 1 }
    );
    updateCamera(camera, 0.5);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.y).toBeLessThan(0);
    updateCamera(camera, 0.5);
    expect(camera.x).toBe(200);
    expect(camera.y).toBe(-500);
    expect(camera.zoom).toBe(1.2);
  });
});

describe('camera shake', () => {
  it('tracks shake strength and decays shake time', () => {
    const camera = createCamera({ width: 400, height: 800 });
    startShake(camera, 9, 0.25);
    expect(camera.shakeStrength).toBe(9);
    expect(camera.shakeTime).toBe(0.25);

    updateCamera(camera, 0.1);
    expect(camera.shakeTime).toBeCloseTo(0.15);

    updateCamera(camera, 0.2);
    expect(camera.shakeTime).toBe(0);
  });
});
