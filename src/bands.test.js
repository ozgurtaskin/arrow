import { describe, expect, it } from 'vitest';
import {
  BAND_COLORS,
  createRuleWoodBands,
  findRuleWoodHit,
  generateBandSegments,
  getCircleLoopT,
  getRectangleLoopT,
  projectRuleWoodSurfacePoint
} from './bands.js';

describe('generateBandSegments', () => {
  it('creates deterministic segments that cover the full loop', () => {
    const first = generateBandSegments({ seed: 12, minPercent: 0.15, segmentCount: 4 });
    const second = generateBandSegments({ seed: 12, minPercent: 0.15, segmentCount: 4 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first.reduce((sum, segment) => sum + segment.size, 0)).toBeCloseTo(1);
    expect(first.every((segment) => segment.size >= 0.15)).toBe(true);
    expect(first.every((segment) => BAND_COLORS.includes(segment.color))).toBe(true);
  });

  it('stores start and end positions for direct segment lookup', () => {
    const segments = generateBandSegments({ seed: 5, minPercent: 0.15, segmentCount: 5 });
    expect(segments[0].start).toBe(0);
    expect(segments.at(-1).end).toBeCloseTo(1);
    for (let index = 1; index < segments.length; index += 1) {
      expect(segments[index].start).toBeCloseTo(segments[index - 1].end);
    }
  });

  it('floors fractional segment counts before calculating segment sizes', () => {
    const segments = generateBandSegments({ seed: 7, minPercent: 0.15, segmentCount: 4.5 });

    expect(segments).toHaveLength(4);
    expect(segments.reduce((sum, segment) => sum + segment.size, 0)).toBeCloseTo(1);
    expect(segments.at(-1).end).toBeCloseTo(1);
  });

  it('exposes an immutable color list', () => {
    expect(Object.isFrozen(BAND_COLORS)).toBe(true);
    expect(() => BAND_COLORS.push('red')).toThrow(TypeError);
  });
});

describe('loop position helpers', () => {
  it('maps circle angle into a normalized loop', () => {
    expect(getCircleLoopT({ x: 1, y: 0 })).toBeCloseTo(0);
    expect(getCircleLoopT({ x: 0, y: 1 })).toBeCloseTo(0.25);
    expect(getCircleLoopT({ x: -1, y: 0 })).toBeCloseTo(0.5);
    expect(getCircleLoopT({ x: 0, y: -1 })).toBeCloseTo(0.75);
  });

  it('maps rectangle perimeter clockwise from the top-left corner', () => {
    expect(getRectangleLoopT({ x: -50, y: -20 }, 100, 40)).toBeCloseTo(0);
    expect(getRectangleLoopT({ x: 50, y: -20 }, 100, 40)).toBeCloseTo(100 / 280);
    expect(getRectangleLoopT({ x: 50, y: 20 }, 100, 40)).toBeCloseTo(140 / 280);
    expect(getRectangleLoopT({ x: -50, y: 20 }, 100, 40)).toBeCloseTo(240 / 280);
  });
});

describe('projectRuleWoodSurfacePoint', () => {
  it('projects circle hits onto the outer radius', () => {
    expect(projectRuleWoodSurfacePoint({ shape: 'circle', radius: 50 }, { x: -30, y: 0 })).toEqual({ x: -50, y: 0 });
    expect(projectRuleWoodSurfacePoint({ shape: 'circle', radius: 50 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 0 });
  });

  it('projects box hits onto the nearest original edge', () => {
    expect(projectRuleWoodSurfacePoint({ shape: 'box', width: 100, height: 40 }, { x: 45, y: 3 })).toEqual({
      x: 50,
      y: 3
    });
    expect(projectRuleWoodSurfacePoint({ shape: 'box', width: 100, height: 40 }, { x: -80, y: 12 })).toEqual({
      x: -50,
      y: 12
    });
  });

  it('projects box hits back along the entry direction when available', () => {
    expect(projectRuleWoodSurfacePoint(
      { shape: 'box', width: 100, height: 40 },
      { x: -30, y: 0 },
      { x: 1, y: 0 }
    )).toEqual({
      x: -50,
      y: 0
    });
  });
});

describe('findRuleWoodHit', () => {
  it('returns the matching outer color segment for a circle edge hit', () => {
    const bands = {
      layers: [
        {
          kind: 'segmented',
          thickness: 12,
          segments: [
            { color: 'green', start: 0, end: 0.5, size: 0.5 },
            { color: 'blue', start: 0.5, end: 1, size: 0.5 }
          ]
        },
        { kind: 'rainbow', thickness: 10, segments: [{ color: 'rainbow', start: 0, end: 1, size: 1 }] }
      ]
    };

    expect(findRuleWoodHit({ shape: 'circle', radius: 50, bands }, { x: 49, y: 0 })).toEqual({
      layer: 'outer',
      color: 'green'
    });
  });

  it('returns the matching outer color segment for a rectangle edge hit', () => {
    const bands = {
      layers: [
        {
          kind: 'segmented',
          thickness: 12,
          segments: [
            { color: 'green', start: 0, end: 0.5, size: 0.5 },
            { color: 'blue', start: 0.5, end: 1, size: 0.5 }
          ]
        },
        { kind: 'rainbow', thickness: 10, segments: [{ color: 'rainbow', start: 0, end: 1, size: 1 }] }
      ]
    };

    expect(findRuleWoodHit({ shape: 'box', width: 100, height: 40, bands }, { x: 0, y: 20 })).toEqual({
      layer: 'outer',
      color: 'blue'
    });
  });

  it('returns rainbow for the wildcard inner band', () => {
    const bands = createRuleWoodBands({ seed: 2, outerThickness: 12, rainbowThickness: 10 });
    expect(findRuleWoodHit({ shape: 'circle', radius: 50, bands }, { x: 30, y: 0 })).toEqual({
      layer: 'rainbow',
      color: 'rainbow'
    });
  });

  it('returns core for the center wood area', () => {
    const bands = createRuleWoodBands({ seed: 2, outerThickness: 12, rainbowThickness: 10 });
    expect(findRuleWoodHit({ shape: 'box', width: 120, height: 80, bands }, { x: 0, y: 0 })).toEqual({
      layer: 'core',
      color: 'wood'
    });
  });
});
