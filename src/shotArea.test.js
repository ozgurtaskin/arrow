import { describe, expect, it } from 'vitest';
import { isPointInsideShotArea } from './shotArea.js';

describe('isPointInsideShotArea', () => {
  it('allows shots when no shot area is active', () => {
    expect(isPointInsideShotArea({ x: 999, y: 999 }, null)).toBe(true);
  });

  it('allows only points inside the editable shot radius', () => {
    const shotArea = { center: { x: 10, y: 20 }, radius: 50 };
    expect(isPointInsideShotArea({ x: 60, y: 20 }, shotArea)).toBe(true);
    expect(isPointInsideShotArea({ x: 61, y: 20 }, shotArea)).toBe(false);
  });
});
