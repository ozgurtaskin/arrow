import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, createSettingsStore } from './settings.js';

describe('createSettingsStore', () => {
  it('starts with sandbox defaults', () => {
    const store = createSettingsStore();
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps numeric settings and notifies subscribers with changed keys', () => {
    const store = createSettingsStore();
    const seen = [];
    store.subscribe((settings, changedKey) => {
      seen.push({ changedKey, gravity: settings.gravity, rubberEnergy: settings.rubberEnergy });
    });
    store.set('gravity', 3);
    store.set('rubberEnergy', 20);
    store.set('shotRadius', 10);
    expect(store.get().gravity).toBe(3);
    expect(store.get().rubberEnergy).toBe(5);
    expect(store.get().shotRadius).toBe(60);
    expect(seen).toEqual([
      { changedKey: 'gravity', gravity: 3, rubberEnergy: 1.6 },
      { changedKey: 'rubberEnergy', gravity: 3, rubberEnergy: 5 },
      { changedKey: 'shotRadius', gravity: 3, rubberEnergy: 5 }
    ]);
  });
});
