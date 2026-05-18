import { describe, expect, it, vi } from 'vitest';
import { getAimState } from './aim.js';
import { createInputController } from './input.js';

describe('getAimState', () => {
  it('aims opposite the pull vector', () => {
    const aim = getAimState({ center: { x: 100, y: 100 }, pointer: { x: 60, y: 140 }, maxPull: 200 });
    expect(aim.pullDistance).toBeCloseTo(Math.hypot(-40, 40));
    expect(aim.launchVector.x).toBeGreaterThan(0);
    expect(aim.launchVector.y).toBeLessThan(0);
  });

  it('caps visual pull distance while keeping angle stable', () => {
    const aim = getAimState({ center: { x: 0, y: 0 }, pointer: { x: -500, y: 0 }, maxPull: 120 });
    expect(aim.visualPull.x).toBe(-120);
    expect(aim.normalizedPull).toBe(1);
  });
});

describe('createInputController', () => {
  it('converts pointer events into world-space aim callbacks', () => {
    const listeners = {};
    const canvas = {
      addEventListener: vi.fn((type, listener) => {
        listeners[type] = listener;
      }),
      getBoundingClientRect: () => ({ left: 10, top: 20 }),
      setPointerCapture: vi.fn()
    };
    const camera = { x: 100, y: -50 };
    const screenToWorld = vi.fn((point, activeCamera) => ({
      x: point.x + activeCamera.x,
      y: point.y + activeCamera.y
    }));
    const onAimStart = vi.fn();
    const onAimMove = vi.fn();
    const onAimEnd = vi.fn();

    createInputController({
      canvas,
      camera,
      maxPull: 120,
      onAimStart,
      onAimMove,
      onAimEnd,
      screenToWorld
    });

    listeners.pointerdown({ pointerId: 7, clientX: 30, clientY: 70 });
    listeners.pointermove({ pointerId: 8, clientX: 0, clientY: 70 });
    listeners.pointermove({ pointerId: 7, clientX: 0, clientY: 70 });
    listeners.pointerup({ pointerId: 7, clientX: 0, clientY: 70 });

    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
    expect(onAimStart).toHaveBeenCalledWith({ x: 120, y: 0 });
    expect(onAimMove).toHaveBeenCalledTimes(1);
    expect(onAimMove.mock.calls[0][0].launchVector.x).toBeGreaterThan(0);
    expect(onAimEnd.mock.calls[0][0].pullDistance).toBe(30);
    expect(screenToWorld).toHaveBeenCalledWith({ x: 20, y: 50 }, camera);
  });

  it('ignores aim starts outside the active shot area', () => {
    const listeners = {};
    const canvas = {
      addEventListener: vi.fn((type, listener) => {
        listeners[type] = listener;
      }),
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      setPointerCapture: vi.fn()
    };
    const onAimStart = vi.fn();

    createInputController({
      canvas,
      camera: {},
      maxPull: 120,
      onAimStart,
      onAimMove: vi.fn(),
      onAimEnd: vi.fn(),
      screenToWorld: (point) => point,
      canStartAim: (point) => point.x < 50
    });

    listeners.pointerdown({ pointerId: 1, clientX: 80, clientY: 20 });
    listeners.pointermove({ pointerId: 1, clientX: 10, clientY: 20 });
    listeners.pointerup({ pointerId: 1, clientX: 10, clientY: 20 });
    listeners.pointerdown({ pointerId: 2, clientX: 20, clientY: 20 });

    expect(canvas.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(2);
    expect(onAimStart).toHaveBeenCalledTimes(1);
    expect(onAimStart).toHaveBeenCalledWith({ x: 20, y: 20 });
  });
});
