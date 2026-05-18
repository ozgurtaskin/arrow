export const SETTING_DEFS = {
  gravity: { type: 'number', min: -2, max: 4, step: 0.05, value: 1 },
  launchSpeed: { type: 'number', min: 0.2, max: 3, step: 0.05, value: 1 },
  forcePreset: { type: 'select', options: ['linear', 'soft', 'punchy'], value: 'linear' },
  forceIntensity: { type: 'number', min: 0.2, max: 2, step: 0.05, value: 1 },
  rubberEnergy: { type: 'number', min: 0.5, max: 5, step: 0.05, value: 1.6 },
  arrowMass: { type: 'number', min: 0.2, max: 8, step: 0.1, value: 1 },
  woodMass: { type: 'number', min: 0.2, max: 8, step: 0.1, value: 1 },
  rubberMass: { type: 'number', min: 0.2, max: 8, step: 0.1, value: 1 },
  stoneMass: { type: 'number', min: 0.5, max: 14, step: 0.1, value: 4 },
  cameraFollowX: { type: 'number', min: 0, max: 1, step: 0.05, value: 0.75 },
  cameraFollowY: { type: 'number', min: 0, max: 1, step: 0.05, value: 0.9 },
  cameraZoomToArrow: { type: 'number', min: 0.75, max: 1.6, step: 0.05, value: 1.08 },
  cameraEaseDuration: { type: 'number', min: 0.15, max: 2.5, step: 0.05, value: 0.65 },
  cameraShake: { type: 'number', min: 0, max: 24, step: 1, value: 9 },
  shotRadius: { type: 'number', min: 60, max: 650, step: 10, value: 260 }
};

export const DEFAULT_SETTINGS = Object.fromEntries(
  Object.entries(SETTING_DEFS).map(([key, def]) => [key, def.value])
);

function coerceSetting(key, value) {
  const def = SETTING_DEFS[key];
  if (!def) return undefined;
  if (def.type === 'select') {
    return def.options.includes(value) ? value : def.value;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return def.value;
  return Math.max(def.min, Math.min(def.max, numberValue));
}

export function createSettingsStore(initial = {}) {
  let settings = { ...DEFAULT_SETTINGS };
  const subscribers = new Set();
  for (const [key, value] of Object.entries(initial)) {
    const coerced = coerceSetting(key, value);
    if (coerced !== undefined) settings[key] = coerced;
  }
  return {
    get() {
      return { ...settings };
    },
    set(key, value) {
      const coerced = coerceSetting(key, value);
      if (coerced === undefined || settings[key] === coerced) return;
      settings = { ...settings, [key]: coerced };
      subscribers.forEach((subscriber) => subscriber({ ...settings }, key));
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }
  };
}
