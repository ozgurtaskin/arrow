import { describe, expect, it } from 'vitest';
import { createGenerator, nextCluster } from './generator.js';

describe('generator', () => {
  it('creates deterministic upward clusters with mixed objects', () => {
    const generator = createGenerator({ seed: 42, startY: 0 });
    const cluster = nextCluster(generator);
    expect(cluster.y).toBeLessThan(0);
    expect(cluster.items.length).toBeGreaterThanOrEqual(3);
    expect(cluster.items.some((item) => item.kind === 'balloon')).toBe(true);
    expect(cluster.items.some((item) => item.kind === 'piece' && item.isStatic && item.shape === 'box')).toBe(true);
  });

  it('continues upward after each cluster', () => {
    const generator = createGenerator({ seed: 7, startY: 0 });
    const first = nextCluster(generator);
    const second = nextCluster(generator);
    expect(second.y).toBeLessThan(first.y);
  });
});
