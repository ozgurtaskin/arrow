import { describe, expect, it } from 'vitest';
import { BAND_COLORS } from './bands.js';
import { createGenerator, nextCluster } from './generator.js';

describe('generator', () => {
  it('creates deterministic upward clusters with mixed objects', () => {
    const generator = createGenerator({ seed: 42, startY: 0 });
    const cluster = nextCluster(generator);
    expect(cluster.y).toBeLessThan(0);
    expect(cluster.items.length).toBeGreaterThanOrEqual(3);
    expect(cluster.items.some((item) => item.kind === 'balloon')).toBe(true);
    expect(cluster.items.some((item) => item.kind === 'piece' && item.isStatic && item.shape === 'box')).toBe(true);
    expect(cluster.items.filter((item) => item.kind === 'ruleWood').length).toBeGreaterThanOrEqual(2);
  });

  it('assigns constrained color designs to generated rule wood shapes', () => {
    const generator = createGenerator({ seed: 42, startY: 0 });
    const cluster = nextCluster(generator);
    const ruleWoods = cluster.items.filter((item) => item.kind === 'ruleWood');

    expect(ruleWoods.length).toBeGreaterThan(0);
    for (const item of ruleWoods) {
      expect(item.colorCount).toBeGreaterThanOrEqual(1);
      expect(item.colorCount).toBeLessThanOrEqual(3);
      expect(item.segmentCount).toBeGreaterThanOrEqual(item.colorCount);
      expect(item.segmentCount).toBeLessThanOrEqual(5);
    }
  });

  it('adds black shields to a minority of generated rule wood shapes', () => {
    const generator = createGenerator({ seed: 11, startY: 0 });
    const ruleWoods = [];
    for (let index = 0; index < 20; index += 1) {
      ruleWoods.push(...nextCluster(generator).items.filter((item) => item.kind === 'ruleWood'));
    }

    const shielded = ruleWoods.filter((item) => item.hasShield);
    expect(shielded.length).toBeGreaterThan(0);
    expect(shielded.length / ruleWoods.length).toBeGreaterThanOrEqual(0.15);
    expect(shielded.length / ruleWoods.length).toBeLessThanOrEqual(0.45);
  });

  it('creates dense hovering colored balloon targets', () => {
    const generator = createGenerator({ seed: 5, startY: 0 });
    const cluster = nextCluster(generator);
    const balloons = cluster.items.filter((item) => item.kind === 'balloon');
    const otherItems = cluster.items.filter((item) => item.kind !== 'balloon');

    expect(balloons.length).toBeGreaterThanOrEqual(Math.floor(otherItems.length * 0.75));
    expect(balloons.every((item) => BAND_COLORS.includes(item.color))).toBe(true);
    expect(balloons.every((item) => item.isStatic)).toBe(true);
  });

  it('assigns each balloon a visible arrow reward between 2 and 5', () => {
    const generator = createGenerator({ seed: 17, startY: 0 });
    const rewards = [];
    for (let index = 0; index < 6; index += 1) {
      rewards.push(...nextCluster(generator).items.filter((item) => item.kind === 'balloon').map((item) => item.rewardArrows));
    }

    expect(rewards.length).toBeGreaterThan(0);
    expect(rewards.every((reward) => reward >= 2 && reward <= 5)).toBe(true);
    expect(new Set(rewards).size).toBeGreaterThan(1);
  });

  it('continues upward after each cluster', () => {
    const generator = createGenerator({ seed: 7, startY: 0 });
    const first = nextCluster(generator);
    const second = nextCluster(generator);
    expect(second.y).toBeLessThan(first.y);
  });
});
