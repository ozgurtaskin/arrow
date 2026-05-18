# Arrow Physics Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved first playable portrait web sandbox where the player pulls a bow, fires physical arrows, sticks into wood, bounces from rubber, pops balloons, affects dynamic and hinged objects, and tunes the feel live.

**Architecture:** Use a small Vite app with focused ES modules. Keep gameplay math testable in pure modules, put Matter.js integration behind `src/physics.js`, and keep rendering in a canvas renderer that reads entity metadata instead of owning game behavior.

**Tech Stack:** HTML Canvas, JavaScript ES modules, Vite, Vitest, Matter.js.

---

## Planning Notes

- Design spec: `docs/superpowers/specs/2026-05-19-arrow-physics-sandbox-design.md`.
- Scope check: this is one first playable prototype, not multiple independent products.
- Pre-commit gate scan: no `.git/hooks/pre-commit` or `.git/hooks/commit-msg` exists, so there is no per-commit LOC or message gate.
- Use small commits per task. Each task should leave the app buildable or tests passing.

## File Map

- Create `package.json`: npm scripts and dependencies.
- Create `.gitignore`: generated files and dependencies.
- Create `index.html`: canvas root, settings shell, mobile viewport metadata.
- Create `src/styles.css`: portrait layout, settings panel styling, canvas sizing.
- Create `src/main.js`: app boot, game loop, module wiring.
- Create `src/forceCurve.js`: pull distance to launch force mapping.
- Create `src/forceCurve.test.js`: force curve tests.
- Create `src/settings.js`: live settings state, validation, subscriptions.
- Create `src/settings.test.js`: settings tests.
- Create `src/camera.js`: camera easing, zoom, and shake model.
- Create `src/camera.test.js`: camera behavior tests.
- Create `src/materials.js`: material presets and mass multipliers.
- Create `src/materials.test.js`: material tests.
- Create `src/entities.js`: factories for arrows, balloons, wood, rubber, stone, hinged objects, particles.
- Create `src/entities.test.js`: entity metadata tests.
- Create `src/aim.js`: pointer pull vector, aim angle, normalized pull math.
- Create `src/aim.test.js`: aim math tests.
- Create `src/physics.js`: Matter engine setup, body lifecycle, collisions, live setting propagation.
- Create `src/collisions.js`: collision classification and response helpers.
- Create `src/collisions.test.js`: collision helper tests.
- Create `src/generator.js`: procedural vertical object spawning.
- Create `src/generator.test.js`: deterministic generator tests.
- Create `src/render.js`: canvas drawing for world, bow, arrows, objects, effects, trajectory.

## Tasks

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`

- [ ] **Step 1: Create npm project metadata**

Create `package.json` with:

```json
{
  "name": "arrow-physics-sandbox",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "matter-js": "^0.20.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Add generated file ignores**

Create `.gitignore` with:

```gitignore
node_modules/
dist/
.DS_Store
coverage/
```

- [ ] **Step 3: Create HTML shell**

Create `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Arrow Physics Sandbox</title>
  </head>
  <body>
    <div id="app">
      <canvas id="game" aria-label="Arrow physics sandbox"></canvas>
      <aside id="settings-panel" class="settings-panel" aria-label="Live settings"></aside>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create base styles**

Create `src/styles.css` with a full-screen portrait-first canvas, fixed settings panel, and touch-safe controls:

```css
html,
body,
#app {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #bfeeff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#app {
  position: relative;
}

#game {
  display: block;
  width: 100vw;
  height: 100vh;
  touch-action: none;
}

.settings-panel {
  position: fixed;
  right: 12px;
  top: 12px;
  width: min(300px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 28px rgba(37, 50, 64, 0.2);
  color: #2f3b48;
  font-size: 12px;
}
```

- [ ] **Step 5: Create temporary app boot**

Create `src/main.js` with:

```js
import './styles.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();
ctx.fillStyle = '#bfeeff';
ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
ctx.fillStyle = '#2f3b48';
ctx.font = '20px system-ui';
ctx.fillText('Arrow Physics Sandbox', 24, 44);
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits successfully.

- [ ] **Step 7: Verify build**

Run:

```bash
npm run build
```

Expected: Vite creates `dist/` with no errors.

- [ ] **Step 8: Commit scaffold**

```bash
git add .gitignore index.html package.json package-lock.json src/main.js src/styles.css
git commit -m "chore: scaffold arrow sandbox web app"
```

### Task 2: Force Curve

**Files:**
- Create: `src/forceCurve.js`
- Create: `src/forceCurve.test.js`

- [ ] **Step 1: Write force curve tests**

Create `src/forceCurve.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { computeLaunchForce, normalizePull } from './forceCurve.js';

describe('normalizePull', () => {
  it('clamps pull distance to 0..1', () => {
    expect(normalizePull(-10, 200)).toBe(0);
    expect(normalizePull(0, 200)).toBe(0);
    expect(normalizePull(100, 200)).toBe(0.5);
    expect(normalizePull(240, 200)).toBe(1);
  });
});

describe('computeLaunchForce', () => {
  it('keeps every preset clamped and monotonic', () => {
    for (const preset of ['linear', 'soft', 'punchy']) {
      const low = computeLaunchForce({ pullDistance: 40, maxPull: 200, preset, intensity: 1, launchSpeed: 1 });
      const high = computeLaunchForce({ pullDistance: 180, maxPull: 200, preset, intensity: 1, launchSpeed: 1 });
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeGreaterThan(low);
      expect(high).toBeLessThanOrEqual(1);
    }
  });

  it('uses intensity and launch speed as readable multipliers', () => {
    const base = computeLaunchForce({ pullDistance: 100, maxPull: 200, preset: 'linear', intensity: 1, launchSpeed: 1 });
    const boosted = computeLaunchForce({ pullDistance: 100, maxPull: 200, preset: 'linear', intensity: 1.5, launchSpeed: 1.2 });
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/forceCurve.test.js
```

Expected: FAIL because `src/forceCurve.js` does not exist.

- [ ] **Step 3: Implement force curve module**

Create `src/forceCurve.js` with:

```js
export const FORCE_PRESETS = ['linear', 'soft', 'punchy'];

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function normalizePull(pullDistance, maxPull) {
  if (maxPull <= 0) return 0;
  return clamp01(pullDistance / maxPull);
}

export function computePresetValue(normalizedPull, preset) {
  const t = clamp01(normalizedPull);
  if (preset === 'soft') {
    return t * t * (3 - 2 * t);
  }
  if (preset === 'punchy') {
    return clamp01(t * (0.72 + t * 0.38));
  }
  return t;
}

export function computeLaunchForce({ pullDistance, maxPull, preset, intensity, launchSpeed }) {
  const normalized = normalizePull(pullDistance, maxPull);
  const shaped = computePresetValue(normalized, preset);
  return clamp01(shaped * Math.max(0, intensity) * Math.max(0, launchSpeed));
}
```

- [ ] **Step 4: Run force curve tests**

Run:

```bash
npm test -- src/forceCurve.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit force curve**

```bash
git add src/forceCurve.js src/forceCurve.test.js
git commit -m "feat: add launch force presets"
```

### Task 3: Live Settings Model

**Files:**
- Create: `src/settings.js`
- Create: `src/settings.test.js`

- [ ] **Step 1: Write settings tests**

Create `src/settings.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, createSettingsStore } from './settings.js';

describe('createSettingsStore', () => {
  it('starts with sandbox defaults', () => {
    const store = createSettingsStore();
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps numeric settings and notifies subscribers', () => {
    const store = createSettingsStore();
    const seen = [];
    store.subscribe((settings) => seen.push(settings.gravity));
    store.set('gravity', 3);
    store.set('rubberEnergy', 20);
    expect(store.get().gravity).toBe(3);
    expect(store.get().rubberEnergy).toBe(5);
    expect(seen).toEqual([3]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/settings.test.js
```

Expected: FAIL because `src/settings.js` does not exist.

- [ ] **Step 3: Implement settings store**

Create `src/settings.js` with:

```js
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
  cameraShake: { type: 'number', min: 0, max: 24, step: 1, value: 9 }
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
```

- [ ] **Step 4: Run settings tests**

Run:

```bash
npm test -- src/settings.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit settings model**

```bash
git add src/settings.js src/settings.test.js
git commit -m "feat: add live settings model"
```

### Task 4: Camera Model

**Files:**
- Create: `src/camera.js`
- Create: `src/camera.test.js`

- [ ] **Step 1: Write camera tests**

Create `src/camera.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { createCamera, easeInOut, startCameraTransition, updateCamera } from './camera.js';

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
    startCameraTransition(camera, { x: 200, y: -500, zoom: 1.2 }, { cameraFollowX: 1, cameraFollowY: 1, cameraEaseDuration: 1 });
    updateCamera(camera, 0.5);
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.y).toBeLessThan(0);
    updateCamera(camera, 0.5);
    expect(camera.x).toBe(200);
    expect(camera.y).toBe(-500);
    expect(camera.zoom).toBe(1.2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/camera.test.js
```

Expected: FAIL because `src/camera.js` does not exist.

- [ ] **Step 3: Implement camera module**

Create `src/camera.js` with:

```js
export function easeInOut(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

export function createCamera({ width, height }) {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    width,
    height,
    shakeTime: 0,
    shakeStrength: 0,
    transition: null
  };
}

export function startShake(camera, strength, duration = 0.18) {
  camera.shakeStrength = strength;
  camera.shakeTime = duration;
}

export function startCameraTransition(camera, target, settings) {
  const duration = Math.max(0.01, settings.cameraEaseDuration);
  camera.transition = {
    elapsed: 0,
    duration,
    from: { x: camera.x, y: camera.y, zoom: camera.zoom },
    to: {
      x: camera.x + (target.x - camera.x) * settings.cameraFollowX,
      y: camera.y + (target.y - camera.y) * settings.cameraFollowY,
      zoom: target.zoom
    }
  };
}

export function updateCamera(camera, dt) {
  if (camera.shakeTime > 0) {
    camera.shakeTime = Math.max(0, camera.shakeTime - dt);
  }
  if (!camera.transition) return;
  camera.transition.elapsed = Math.min(camera.transition.duration, camera.transition.elapsed + dt);
  const t = easeInOut(camera.transition.elapsed / camera.transition.duration);
  const { from, to } = camera.transition;
  camera.x = from.x + (to.x - from.x) * t;
  camera.y = from.y + (to.y - from.y) * t;
  camera.zoom = from.zoom + (to.zoom - from.zoom) * t;
  if (camera.transition.elapsed >= camera.transition.duration) {
    camera.transition = null;
  }
}
```

- [ ] **Step 4: Run camera tests**

Run:

```bash
npm test -- src/camera.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit camera model**

```bash
git add src/camera.js src/camera.test.js
git commit -m "feat: add impact camera transitions"
```

### Task 5: Materials and Entity Factories

**Files:**
- Create: `src/materials.js`
- Create: `src/materials.test.js`
- Create: `src/entities.js`
- Create: `src/entities.test.js`

- [ ] **Step 1: Write material tests**

Create `src/materials.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { getMaterialConfig } from './materials.js';

describe('getMaterialConfig', () => {
  it('applies material mass multipliers', () => {
    expect(getMaterialConfig('wood', { woodMass: 2 }).density).toBeCloseTo(0.002);
    expect(getMaterialConfig('rubber', { rubberMass: 3 }).restitution).toBeGreaterThan(1);
    expect(getMaterialConfig('stone', { stoneMass: 4 }).density).toBeGreaterThan(getMaterialConfig('wood', { woodMass: 1 }).density);
  });

  it('defines arrow stick behavior by material', () => {
    expect(getMaterialConfig('wood', {}).arrowBehavior).toBe('stick');
    expect(getMaterialConfig('rubber', {}).arrowBehavior).toBe('bounce');
    expect(getMaterialConfig('stone', {}).arrowBehavior).toBe('deflect');
  });
});
```

- [ ] **Step 2: Write entity tests**

Create `src/entities.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { createArrow, createBalloon, createBoxPiece, createHingedPlank } from './entities.js';

describe('entity factories', () => {
  it('creates arrows with metadata and mass', () => {
    const arrow = createArrow({ x: 10, y: 20, angle: 0.5, mass: 2 });
    expect(arrow.label).toBe('arrow');
    expect(arrow.plugin.entity.type).toBe('arrow');
    expect(arrow.mass).toBeCloseTo(2);
  });

  it('creates material pieces with readable metadata', () => {
    const piece = createBoxPiece({ x: 0, y: 0, width: 80, height: 30, material: 'wood', isStatic: false, settings: { woodMass: 1 } });
    expect(piece.plugin.entity.material).toBe('wood');
  });

  it('creates hinged plank with body and pivot constraint', () => {
    const hinged = createHingedPlank({ x: 0, y: 0, length: 160, angle: 0, settings: { woodMass: 1 } });
    expect(hinged.body.plugin.entity.type).toBe('hinged-plank');
    expect(hinged.constraint.pointA).toBeTruthy();
  });

  it('creates balloons as sensors', () => {
    const balloon = createBalloon({ x: 0, y: 0, radius: 24, color: '#f25565' });
    expect(balloon.isSensor).toBe(true);
    expect(balloon.plugin.entity.type).toBe('balloon');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- src/materials.test.js src/entities.test.js
```

Expected: FAIL because implementation files do not exist.

- [ ] **Step 4: Implement materials and entities**

Create `src/materials.js` with:

```js
const BASE_MATERIALS = {
  wood: { density: 0.001, restitution: 0.15, friction: 0.65, arrowBehavior: 'stick' },
  rubber: { density: 0.0008, restitution: 1.15, friction: 0.35, arrowBehavior: 'bounce' },
  stone: { density: 0.0028, restitution: 0.08, friction: 0.85, arrowBehavior: 'deflect' }
};

const MASS_KEYS = {
  wood: 'woodMass',
  rubber: 'rubberMass',
  stone: 'stoneMass'
};

export function getMaterialConfig(material, settings = {}) {
  const base = BASE_MATERIALS[material] || BASE_MATERIALS.wood;
  const multiplier = settings[MASS_KEYS[material]] ?? 1;
  return {
    ...base,
    density: base.density * multiplier
  };
}
```

Create `src/entities.js` using Matter factory functions:

```js
import Matter from 'matter-js';
import { getMaterialConfig } from './materials.js';

function attachEntity(body, entity) {
  body.plugin = body.plugin || {};
  body.plugin.entity = entity;
  return body;
}

export function createArrow({ x, y, angle, mass }) {
  const body = Matter.Bodies.rectangle(x, y, 92, 8, {
    label: 'arrow',
    angle,
    frictionAir: 0.002,
    chamfer: { radius: 3 }
  });
  Matter.Body.setMass(body, mass);
  return attachEntity(body, { type: 'arrow', state: 'ready', length: 92, wobble: 0 });
}

export function createBalloon({ x, y, radius, color }) {
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: 'balloon',
    isSensor: true,
    frictionAir: 0.01
  }), { type: 'balloon', color, radius });
}

export function createBoxPiece({ x, y, width, height, material, isStatic = false, angle = 0, settings = {} }) {
  const config = getMaterialConfig(material, settings);
  return attachEntity(Matter.Bodies.rectangle(x, y, width, height, {
    label: `${material}-box`,
    isStatic,
    angle,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction,
    chamfer: { radius: material === 'rubber' ? 18 : 6 }
  }), { type: 'piece', material, shape: 'box', width, height, wobble: 0 });
}

export function createCirclePiece({ x, y, radius, material, isStatic = false, settings = {} }) {
  const config = getMaterialConfig(material, settings);
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: `${material}-circle`,
    isStatic,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction
  }), { type: 'piece', material, shape: 'circle', radius, wobble: 0 });
}

export function createHingedPlank({ x, y, length, angle = 0, settings = {} }) {
  const body = createBoxPiece({ x, y, width: length, height: 26, material: 'wood', isStatic: false, angle, settings });
  body.label = 'hinged-plank';
  body.plugin.entity.type = 'hinged-plank';
  const constraint = Matter.Constraint.create({
    pointA: { x: x - Math.cos(angle) * length * 0.42, y: y - Math.sin(angle) * length * 0.42 },
    bodyB: body,
    pointB: { x: -length * 0.42, y: 0 },
    stiffness: 0.92,
    damping: 0.04,
    length: 0
  });
  return { body, constraint };
}
```

Keep entity metadata under `body.plugin.entity` exactly as shown because renderer, collision routing, and live settings all read that shape.

- [ ] **Step 5: Run material and entity tests**

Run:

```bash
npm test -- src/materials.test.js src/entities.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit materials and entities**

```bash
git add src/materials.js src/materials.test.js src/entities.js src/entities.test.js
git commit -m "feat: add material entity factories"
```

### Task 6: Aim Math and Pointer Input

**Files:**
- Create: `src/aim.js`
- Create: `src/aim.test.js`
- Create: `src/input.js`

- [ ] **Step 1: Write aim tests**

Create `src/aim.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { getAimState } from './aim.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/aim.test.js
```

Expected: FAIL because `src/aim.js` does not exist.

- [ ] **Step 3: Implement aim math**

Create `src/aim.js` with:

```js
import { normalizePull } from './forceCurve.js';

export function getAimState({ center, pointer, maxPull }) {
  const pull = { x: pointer.x - center.x, y: pointer.y - center.y };
  const pullDistance = Math.hypot(pull.x, pull.y);
  const safeDistance = pullDistance || 1;
  const unit = { x: pull.x / safeDistance, y: pull.y / safeDistance };
  const cappedDistance = Math.min(pullDistance, maxPull);
  const visualPull = { x: unit.x * cappedDistance, y: unit.y * cappedDistance };
  const launchVector = { x: -unit.x, y: -unit.y };
  return {
    center,
    pointer,
    pull,
    pullDistance,
    visualPull,
    launchVector,
    angle: Math.atan2(launchVector.y, launchVector.x),
    normalizedPull: normalizePull(pullDistance, maxPull)
  };
}
```

- [ ] **Step 4: Create pointer input adapter**

Create `src/input.js` with an adapter that converts pointer events into world-space aiming callbacks:

```js
import { getAimState } from './aim.js';

export function createInputController({ canvas, camera, maxPull, onAimStart, onAimMove, onAimEnd, screenToWorld }) {
  let activePointerId = null;
  let center = null;

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, camera);
  }

  canvas.addEventListener('pointerdown', (event) => {
    activePointerId = event.pointerId;
    canvas.setPointerCapture(activePointerId);
    center = getPoint(event);
    onAimStart(center);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointerId || !center) return;
    onAimMove(getAimState({ center, pointer: getPoint(event), maxPull }));
  });

  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId !== activePointerId || !center) return;
    const aim = getAimState({ center, pointer: getPoint(event), maxPull });
    activePointerId = null;
    center = null;
    onAimEnd(aim);
  });
}
```

- [ ] **Step 5: Run aim tests**

Run:

```bash
npm test -- src/aim.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit aim and input**

```bash
git add src/aim.js src/aim.test.js src/input.js
git commit -m "feat: add bow aiming input"
```

### Task 7: Physics World and Live Setting Propagation

**Files:**
- Create: `src/physics.js`
- Modify: `src/entities.js`
- Modify: `src/settings.js`

- [ ] **Step 1: Add physics world API**

Create `src/physics.js` with these imports and world structure:

```js
import Matter from 'matter-js';
import { createArrow } from './entities.js';
import { getMaterialConfig } from './materials.js';

export function createPhysicsWorld(settingsStore) {
  const engine = Matter.Engine.create();
  engine.gravity.y = settingsStore.get().gravity;
  return {
    engine,
    arrows: [],
    materialBodies: [],
    particles: [],
    stuckArrowConstraints: [],
    lastImpact: null,
    impactSerial: 0,
    generator: null,
    arrowCap: 80
  };
}

export function stepPhysics(world, deltaMs) {
  Matter.Engine.update(world.engine, deltaMs);
  world.particles = world.particles
    .map((particle) => ({ ...particle, life: particle.life - deltaMs / 1000 }))
    .filter((particle) => particle.life > 0);
}

export function addBody(world, body) {
  Matter.World.add(world.engine.world, body);
  if (body.plugin?.entity?.material) world.materialBodies.push(body);
}

export function removeBody(world, body) {
  Matter.World.remove(world.engine.world, body);
  world.arrows = world.arrows.filter((arrow) => arrow !== body);
  world.materialBodies = world.materialBodies.filter((item) => item !== body);
}
```

Then add `fireArrow(world, launch)` and `applyLiveSettings(world, settings, changedKey)` in the next steps of this task.

- [ ] **Step 2: Wire gravity and mass updates**

Implement `applyLiveSettings` so:

```js
if (changedKey === 'gravity') {
  world.engine.gravity.y = settings.gravity;
}
if (changedKey === 'arrowMass') {
  world.arrows.forEach((arrow) => Matter.Body.setMass(arrow, settings.arrowMass));
}
if (['woodMass', 'rubberMass', 'stoneMass'].includes(changedKey)) {
  world.materialBodies.forEach((body) => {
    const material = body.plugin.entity.material;
    const config = getMaterialConfig(material, settings);
    Matter.Body.setDensity(body, config.density);
  });
}
```

- [ ] **Step 3: Add arrow launch**

Implement `fireArrow` to create an arrow at the bow center, set its velocity from the aim angle and normalized force, add it to Matter, and mark it as `state: 'flying'` in metadata.

- [ ] **Step 4: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: all existing tests PASS and Vite build succeeds.

- [ ] **Step 5: Commit physics world**

```bash
git add src/physics.js src/entities.js src/settings.js
git commit -m "feat: add physics world settings propagation"
```

### Task 8: Collision Outcomes

**Files:**
- Create: `src/collisions.js`
- Create: `src/collisions.test.js`
- Modify: `src/physics.js`

- [ ] **Step 1: Write collision helper tests**

Create `src/collisions.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { classifyArrowCollision, reflectVelocity } from './collisions.js';

const arrow = { plugin: { entity: { type: 'arrow' } } };

describe('classifyArrowCollision', () => {
  it('routes arrow impacts by target material or type', () => {
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'wood' } } })).toBe('stick');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'rubber' } } })).toBe('bounce');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'piece', material: 'stone' } } })).toBe('deflect');
    expect(classifyArrowCollision(arrow, { plugin: { entity: { type: 'balloon' } } })).toBe('pop');
  });
});

describe('reflectVelocity', () => {
  it('reflects a velocity along a collision normal with energy', () => {
    const reflected = reflectVelocity({ x: 10, y: 0 }, { x: -1, y: 0 }, 1.5);
    expect(reflected.x).toBeLessThan(0);
    expect(Math.abs(reflected.x)).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/collisions.test.js
```

Expected: FAIL because `src/collisions.js` does not exist.

- [ ] **Step 3: Implement collision helpers**

Create `src/collisions.js` with:

```js
export function getEntity(body) {
  return body?.plugin?.entity || {};
}

export function classifyArrowCollision(arrowBody, targetBody) {
  const arrow = getEntity(arrowBody);
  const target = getEntity(targetBody);
  if (arrow.type !== 'arrow') return 'ignore';
  if (target.type === 'balloon') return 'pop';
  if (target.material === 'wood') return 'stick';
  if (target.material === 'rubber') return 'bounce';
  if (target.material === 'stone') return 'deflect';
  return 'ignore';
}

export function reflectVelocity(velocity, normal, energy) {
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  return {
    x: (velocity.x - 2 * dot * normal.x) * energy,
    y: (velocity.y - 2 * dot * normal.y) * energy
  };
}
```

- [ ] **Step 4: Implement Matter collision handling**

Modify `src/physics.js` so `Matter.Events.on(engine, 'collisionStart', handler)`:

- Finds arrow-target pairs.
- Pops balloon bodies and creates burst particles.
- Creates a stiff constraint for wood hits, stores it in `world.stuckArrowConstraints`, and marks the arrow `state: 'stuck'`.
- Applies reflected velocity for rubber hits and sets `target.plugin.entity.wobble = 1`.
- Lets stone collisions use default Matter response and records `lastImpact`.

- [ ] **Step 5: Run collision tests and build**

Run:

```bash
npm test -- src/collisions.test.js
npm run build
```

Expected: collision tests PASS and Vite build succeeds.

- [ ] **Step 6: Commit collision outcomes**

```bash
git add src/collisions.js src/collisions.test.js src/physics.js
git commit -m "feat: add arrow material collisions"
```

### Task 9: Procedural Vertical Generator

**Files:**
- Create: `src/generator.js`
- Create: `src/generator.test.js`
- Modify: `src/physics.js`

- [ ] **Step 1: Write generator tests**

Create `src/generator.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import { createGenerator, nextCluster } from './generator.js';

describe('generator', () => {
  it('creates deterministic upward clusters with mixed objects', () => {
    const generator = createGenerator({ seed: 42, startY: 0 });
    const cluster = nextCluster(generator);
    expect(cluster.y).toBeLessThan(0);
    expect(cluster.items.length).toBeGreaterThanOrEqual(3);
    expect(cluster.items.some((item) => item.kind === 'balloon')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/generator.test.js
```

Expected: FAIL because `src/generator.js` does not exist.

- [ ] **Step 3: Implement generator**

Create `src/generator.js` with:

```js
function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGenerator({ seed = 1, startY = 0 } = {}) {
  return { random: mulberry32(seed), nextY: startY - 520, index: 0 };
}

export function nextCluster(generator) {
  const random = generator.random;
  const y = generator.nextY;
  generator.nextY -= 420 + random() * 260;
  generator.index += 1;
  const centerX = (random() - 0.5) * 520;
  return {
    y,
    items: [
      { kind: 'balloon', x: centerX + 80, y: y - 80, color: random() > 0.5 ? '#f25565' : '#4ba5ff' },
      { kind: 'piece', material: 'wood', shape: 'box', x: centerX - 80, y, width: 150, height: 28, isStatic: random() > 0.45 },
      { kind: 'piece', material: 'rubber', shape: 'box', x: centerX + 80, y: y + 120, width: 130, height: 34, isStatic: random() > 0.5 },
      { kind: random() > 0.5 ? 'hinged-plank' : 'piece', material: 'stone', shape: 'circle', x: centerX - 160, y: y + 190, radius: 30, isStatic: false }
    ]
  };
}
```

- [ ] **Step 4: Add spawn integration**

Modify `src/physics.js` to export named spawn helpers with these behaviors:

```js
export function ensureGeneratedAhead(world, cameraY, settings) {
  if (!world.generator) world.generator = createGenerator({ seed: 7, startY: cameraY });
  while (world.generator.nextY > cameraY - 1800) {
    const cluster = nextCluster(world.generator);
    spawnCluster(world, cluster, settings);
  }
}

export function cleanupFarBelow(world, cameraY) {
  const bodies = Matter.Composite.allBodies(world.engine.world);
  for (const body of bodies) {
    const entity = body.plugin?.entity;
    if (!entity || entity.state === 'stuck') continue;
    if (body.position.y > cameraY + 1800) removeBody(world, body);
  }
  while (world.arrows.length > world.arrowCap) {
    removeBody(world, world.arrows[0]);
  }
}
```

`ensureGeneratedAhead` should call `nextCluster` while the generator's next Y is within two screens above the camera and convert cluster items into entity bodies. `cleanupFarBelow` should remove free non-stuck dynamic bodies far below the camera while preserving stuck arrows until the arrow cap is reached.

- [ ] **Step 5: Run generator tests and build**

Run:

```bash
npm test -- src/generator.test.js
npm run build
```

Expected: generator tests PASS and Vite build succeeds.

- [ ] **Step 6: Commit generator**

```bash
git add src/generator.js src/generator.test.js src/physics.js
git commit -m "feat: add vertical sandbox generator"
```

### Task 10: Canvas Renderer and Settings UI

**Files:**
- Create: `src/render.js`
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Modify: `index.html`

- [ ] **Step 1: Implement renderer API**

Create `src/render.js` with coordinate helpers and frame renderer:

```js
export function resizeCanvas(canvas, ctx) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function screenToWorld(point, camera) {
  return {
    x: (point.x - camera.width / 2) / camera.zoom + camera.x,
    y: (point.y - camera.height / 2) / camera.zoom + camera.y
  };
}

export function worldToScreen(point, camera) {
  return {
    x: (point.x - camera.x) * camera.zoom + camera.width / 2,
    y: (point.y - camera.y) * camera.zoom + camera.height / 2
  };
}

export function renderFrame({ ctx, canvas, camera, world, aimState, settings }) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawSky(ctx, canvas);
  ctx.save();
  ctx.translate(canvas.clientWidth / 2, canvas.clientHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorldBodies(ctx, world, settings);
  drawParticles(ctx, world.particles);
  if (aimState) drawBowPreview(ctx, aimState);
  ctx.restore();
}
```

`renderFrame` must draw sky, distant hills, generated bodies, arrows, balloons, particles, bow, stretched string, arrow preview, and dotted trajectory preview.

- [ ] **Step 2: Draw material-specific bodies**

In `renderFrame`, use entity metadata to draw:

- wood as brown rounded boards with grain lines.
- rubber as glossy pink rounded blobs/capsules with a darker pink outline.
- rubber wobble as outline offset or wave marks based on `entity.wobble`.
- stone as dark gray pieces.
- balloons as red or blue circles with a small knot and string.
- hinged pivots as a small screw circle at the constraint anchor.

- [ ] **Step 3: Build live settings controls**

Modify `src/main.js` to render controls inside `#settings-panel` from `SETTING_DEFS`. For each numeric setting, create a label, range input, number input, and current value binding. For select settings, create a select input. Both input types must call `settingsStore.set(key, value)`.

- [ ] **Step 4: Wire renderer into animation loop**

Modify `src/main.js` so the animation loop:

```js
const dt = Math.min(1 / 30, (now - lastNow) / 1000);
stepPhysics(world, dt * 1000);
updateCamera(camera, dt);
ensureGeneratedAhead(world, camera.y, settingsStore.get());
cleanupFarBelow(world, camera.y);
renderFrame({ ctx, canvas, camera, world, aimState, settings: settingsStore.get() });
```

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 6: Commit renderer and settings UI**

```bash
git add index.html src/main.js src/render.js src/styles.css
git commit -m "feat: render sandbox and live settings"
```

### Task 11: Full Gameplay Integration

**Files:**
- Modify: `src/main.js`
- Modify: `src/physics.js`
- Modify: `src/camera.js`
- Modify: `src/render.js`

- [ ] **Step 1: Wire bow release to arrow firing**

In `src/main.js`, use `createInputController` so pointer release computes:

```js
const force = computeLaunchForce({
  pullDistance: aim.pullDistance,
  maxPull: MAX_PULL,
  preset: settings.forcePreset,
  intensity: settings.forceIntensity,
  launchSpeed: settings.launchSpeed
});
fireArrow(world, { x: aim.center.x, y: aim.center.y, angle: aim.angle, force });
startShake(camera, settings.cameraShake);
```

- [ ] **Step 2: Trigger camera transition after impact or settle**

After `stepPhysics`, if `world.lastImpact` is new, call:

```js
startCameraTransition(camera, {
  x: world.lastImpact.x,
  y: world.lastImpact.y,
  zoom: settings.cameraZoomToArrow
}, settings);
```

Keep camera unchanged while arrows are flying and `world.lastImpact` has not changed.

- [ ] **Step 3: Apply live setting subscriptions**

Subscribe to `settingsStore`:

```js
settingsStore.subscribe((settings, changedKey) => {
  applyLiveSettings(world, settings, changedKey);
});
```

- [ ] **Step 4: Run automated verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and Vite build succeeds.

- [ ] **Step 5: Run local browser verification**

Run:

```bash
npm run dev
```

Open the printed local URL and verify:

- Press/drag/release spawns and fires an arrow.
- Aim rotates correctly as drag direction changes.
- Gravity slows upward shots.
- Camera does not follow during flight.
- Camera eases after arrow impact or settle.
- Arrows stick into wood and remain there.
- Arrows transfer impulse to dynamic wood through attachment.
- Rubber bounces arrows and wobbles visually.
- Balloons pop on contact.
- Hinged planks rotate when hit.
- Settings update live without scene restart.
- Material mass sliders visibly change physics response.

- [ ] **Step 6: Commit full integration**

```bash
git add src/main.js src/physics.js src/camera.js src/render.js
git commit -m "feat: integrate playable arrow sandbox"
```

## Plan Self-Review

- Spec coverage: the tasks cover bow press/drag/release, force presets, gravity, camera shake and post-impact easing, wood stick behavior, rubber bounce and wobble, balloon pop, material mass settings, hinged objects, procedural vertical generation, and simple reference-inspired visuals.
- Placeholder scan: no `TBD`, `TODO`, incomplete task, or unstated file path is intentionally left in the plan.
- Type consistency: `settingsStore`, `world`, `camera`, `aimState`, `material`, `plugin.entity`, and exported function names are consistent across tasks.
- Scope control: scoring, win/fail rules, graph curve editing, sounds, sprite atlases, save/load, and mobile packaging remain outside the first prototype.
