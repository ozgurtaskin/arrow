# Rule Wood Colored Bands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static color-gated `ruleWood` targets, random colored arrows with current/next HUD, and band-based stick/bounce rules for upward climbing play.

**Architecture:** Keep each `ruleWood` target as one Matter body and interpret the collision point against deterministic visual bands. Band math lives in a pure helper module, arrow color sequencing lives in a pure helper module, and existing physics/render/main files consume those helpers through narrow interfaces.

**Tech Stack:** Vite, Matter.js, Canvas 2D, Vitest.

---

## File Structure

- Create `src/bands.js`: deterministic band generation, loop-position lookup, and `ruleWood` hit classification helpers.
- Create `src/bands.test.js`: pure tests for segment generation, circle lookup, box lookup, rainbow hits, and core hits.
- Create `src/arrowColors.js`: random current/next arrow color queue helpers.
- Create `src/arrowColors.test.js`: pure tests for queue initialization and advancement.
- Modify `src/entities.js`: add arrow color metadata, `createRuleWoodBox`, and `createRuleWoodCircle`.
- Modify `src/entities.test.js`: verify colored arrows and `ruleWood` metadata.
- Modify `src/collisions.js`: route `ruleWood` collisions through band hit classification.
- Modify `src/collisions.test.js`: verify matching color sticks, nonmatching color bounces, rainbow sticks, and existing materials still behave.
- Modify `src/physics.js`: pass impact point into collision classification and spawn `ruleWood` items from generated clusters.
- Modify `src/generator.js`: make upward clusters dominated by static `ruleWood` boxes/circles.
- Modify `src/generator.test.js`: verify generated clusters include `ruleWood` targets.
- Modify `src/render.js`: draw colored bands, colored arrows, bow preview arrow color, and a compact current/next HUD.
- Modify `src/main.js`: own the arrow color queue, pass current color to fired arrows, advance after firing, and pass HUD data to rendering/debug.

---

### Task 1: Add Pure Band Generation And Lookup

**Files:**
- Create: `src/bands.js`
- Create: `src/bands.test.js`

- [ ] **Step 1: Write failing tests for band generation and hit lookup**

Create `src/bands.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  BAND_COLORS,
  createRuleWoodBands,
  findRuleWoodHit,
  generateBandSegments,
  getCircleLoopT,
  getRectangleLoopT
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
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
npm test -- src/bands.test.js
```

Expected: FAIL because `src/bands.js` does not exist.

- [ ] **Step 3: Implement the pure band helpers**

Create `src/bands.js`:

```js
export const BAND_COLORS = ['green', 'yellow', 'blue'];
export const RAINBOW_COLOR = 'rainbow';

function createSeededRandom(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeLoopT(value) {
  return ((value % 1) + 1) % 1;
}

function chooseColor(random, previousColor) {
  const choices = BAND_COLORS.filter((color) => color !== previousColor);
  return choices[Math.floor(random() * choices.length)] || BAND_COLORS[0];
}

export function generateBandSegments({ seed = 1, minPercent = 0.15, segmentCount = 4 } = {}) {
  const count = Math.max(1, Math.min(segmentCount, Math.floor(1 / minPercent)));
  const random = createSeededRandom(seed);
  const freeSpace = Math.max(0, 1 - count * minPercent);
  const weights = Array.from({ length: count }, () => 0.2 + random());
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  let previousColor = null;

  return weights.map((weight, index) => {
    const isLast = index === count - 1;
    const size = isLast ? 1 - cursor : minPercent + (freeSpace * weight) / totalWeight;
    const color = chooseColor(random, previousColor);
    const start = cursor;
    const end = isLast ? 1 : cursor + size;
    previousColor = color;
    cursor = end;
    return { color, start, end, size: end - start };
  });
}

export function createRuleWoodBands({ seed = 1, outerThickness = 18, rainbowThickness = 14, segmentCount = 4 } = {}) {
  return {
    seed,
    layers: [
      {
        kind: 'segmented',
        name: 'outer',
        thickness: outerThickness,
        segments: generateBandSegments({ seed, minPercent: 0.15, segmentCount })
      },
      {
        kind: 'rainbow',
        name: 'rainbow',
        thickness: rainbowThickness,
        segments: [{ color: RAINBOW_COLOR, start: 0, end: 1, size: 1 }]
      }
    ]
  };
}

export function getCircleLoopT(localPoint) {
  return normalizeLoopT(Math.atan2(localPoint.y, localPoint.x) / (Math.PI * 2));
}

export function getRectangleLoopT(localPoint, width, height) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const x = Math.max(-halfWidth, Math.min(halfWidth, localPoint.x));
  const y = Math.max(-halfHeight, Math.min(halfHeight, localPoint.y));
  const distances = [
    { edge: 'top', value: Math.abs(y + halfHeight) },
    { edge: 'right', value: Math.abs(x - halfWidth) },
    { edge: 'bottom', value: Math.abs(y - halfHeight) },
    { edge: 'left', value: Math.abs(x + halfWidth) }
  ];
  const nearest = distances.reduce((best, item) => (item.value < best.value ? item : best), distances[0]).edge;
  const perimeter = 2 * (width + height);

  if (nearest === 'top') return normalizeLoopT((x + halfWidth) / perimeter);
  if (nearest === 'right') return normalizeLoopT((width + y + halfHeight) / perimeter);
  if (nearest === 'bottom') return normalizeLoopT((width + height + (halfWidth - x)) / perimeter);
  return normalizeLoopT((width + height + width + (halfHeight - y)) / perimeter);
}

function findSegment(segments, loopT) {
  const t = normalizeLoopT(loopT);
  return segments.find((segment) => t >= segment.start && t < segment.end) || segments.at(-1);
}

function edgeDepth(entity, localPoint) {
  if (entity.shape === 'circle') return entity.radius - Math.hypot(localPoint.x, localPoint.y);
  const halfWidth = entity.width / 2;
  const halfHeight = entity.height / 2;
  return Math.min(halfWidth - Math.abs(localPoint.x), halfHeight - Math.abs(localPoint.y));
}

function loopTForEntity(entity, localPoint) {
  if (entity.shape === 'circle') return getCircleLoopT(localPoint);
  return getRectangleLoopT(localPoint, entity.width, entity.height);
}

export function findRuleWoodHit(entity, localPoint) {
  const bands = entity.bands;
  const depth = edgeDepth(entity, localPoint);
  if (!bands || depth < 0) return { layer: 'outside', color: null };

  let accumulated = 0;
  for (const layer of bands.layers) {
    accumulated += layer.thickness;
    if (depth <= accumulated) {
      if (layer.kind === 'rainbow') return { layer: 'rainbow', color: RAINBOW_COLOR };
      const segment = findSegment(layer.segments, loopTForEntity(entity, localPoint));
      return { layer: 'outer', color: segment.color };
    }
  }

  return { layer: 'core', color: 'wood' };
}
```

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run:

```bash
npm test -- src/bands.test.js
```

Expected: PASS for `src/bands.test.js`.

- [ ] **Step 5: Commit the band helper task**

Run:

```bash
git add src/bands.js src/bands.test.js
git commit -m "feat: add rule wood band helpers"
```

Expected: commit succeeds.

---

### Task 2: Add Arrow Color Queue Helpers

**Files:**
- Create: `src/arrowColors.js`
- Create: `src/arrowColors.test.js`

- [ ] **Step 1: Write failing tests for arrow color queue behavior**

Create `src/arrowColors.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { ARROW_COLORS, advanceArrowColorQueue, createArrowColorQueue, pickArrowColor } from './arrowColors.js';

describe('arrow color queue', () => {
  it('picks only supported arrow colors', () => {
    expect(ARROW_COLORS).toEqual(['green', 'yellow', 'blue']);
    expect(ARROW_COLORS).toContain(pickArrowColor(() => 0));
    expect(ARROW_COLORS).toContain(pickArrowColor(() => 0.99));
  });

  it('stores current and next colors', () => {
    const queue = createArrowColorQueue({ random: () => 0 });
    expect(queue.current).toBe('green');
    expect(queue.next).toBe('green');
  });

  it('advances next into current and rolls a new next color', () => {
    const values = [0.1, 0.8, 0.4];
    const random = () => values.shift();
    const queue = createArrowColorQueue({ random });
    const advanced = advanceArrowColorQueue(queue, random);

    expect(queue).toEqual({ current: 'green', next: 'blue' });
    expect(advanced).toEqual({ current: 'blue', next: 'yellow' });
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
npm test -- src/arrowColors.test.js
```

Expected: FAIL because `src/arrowColors.js` does not exist.

- [ ] **Step 3: Implement arrow color queue helpers**

Create `src/arrowColors.js`:

```js
export const ARROW_COLORS = ['green', 'yellow', 'blue'];

export function pickArrowColor(random = Math.random) {
  const index = Math.min(ARROW_COLORS.length - 1, Math.floor(random() * ARROW_COLORS.length));
  return ARROW_COLORS[index];
}

export function createArrowColorQueue({ random = Math.random } = {}) {
  return {
    current: pickArrowColor(random),
    next: pickArrowColor(random)
  };
}

export function advanceArrowColorQueue(queue, random = Math.random) {
  return {
    current: queue.next,
    next: pickArrowColor(random)
  };
}
```

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run:

```bash
npm test -- src/arrowColors.test.js
```

Expected: PASS for `src/arrowColors.test.js`.

- [ ] **Step 5: Commit the arrow color queue task**

Run:

```bash
git add src/arrowColors.js src/arrowColors.test.js
git commit -m "feat: add arrow color queue"
```

Expected: commit succeeds.

---

### Task 3: Add Rule Wood Entity Factories And Colored Arrows

**Files:**
- Modify: `src/entities.js`
- Modify: `src/entities.test.js`

- [ ] **Step 1: Extend entity tests first**

Modify the import in `src/entities.test.js`:

```js
import {
  createArrow,
  createBalloon,
  createBoxPiece,
  createGround,
  createHingedPlank,
  createRuleWoodBox,
  createRuleWoodCircle
} from './entities.js';
```

Add these tests inside `describe('entity factories', () => { ... })`:

```js
  it('stores arrow color metadata', () => {
    const arrow = createArrow({ x: 0, y: 0, angle: 0, mass: 1, color: 'blue' });
    expect(arrow.plugin.entity.color).toBe('blue');
  });

  it('creates static rule wood boxes with deterministic band metadata', () => {
    const body = createRuleWoodBox({ x: 10, y: 20, width: 120, height: 80, seed: 8, settings: { woodMass: 1 } });
    expect(body.isStatic).toBe(true);
    expect(body.plugin.entity.type).toBe('ruleWood');
    expect(body.plugin.entity.material).toBe('wood');
    expect(body.plugin.entity.bands.layers[0].segments.length).toBeGreaterThan(0);
  });

  it('creates static rule wood circles with deterministic band metadata', () => {
    const body = createRuleWoodCircle({ x: 10, y: 20, radius: 55, seed: 9, settings: { woodMass: 1 } });
    expect(body.isStatic).toBe(true);
    expect(body.plugin.entity.type).toBe('ruleWood');
    expect(body.plugin.entity.shape).toBe('circle');
    expect(body.plugin.entity.radius).toBe(55);
  });
```

- [ ] **Step 2: Run entity tests and confirm they fail**

Run:

```bash
npm test -- src/entities.test.js
```

Expected: FAIL because `createRuleWoodBox`, `createRuleWoodCircle`, and arrow color metadata are missing.

- [ ] **Step 3: Implement entity factory changes**

At the top of `src/entities.js`, add:

```js
import { createRuleWoodBands } from './bands.js';
```

Change `createArrow` to accept color:

```js
export function createArrow({ x, y, angle, mass, color = 'green' }) {
  const body = Matter.Bodies.rectangle(x, y, 92, 8, {
    label: 'arrow',
    angle,
    frictionAir: 0.002,
    chamfer: { radius: 3 }
  });
  Matter.Body.setMass(body, mass);
  return attachEntity(body, { type: 'arrow', state: 'ready', length: 92, wobble: 0, color });
}
```

Add these factories after `createCirclePiece`:

```js
export function createRuleWoodBox({ x, y, width, height, angle = 0, seed = 1, settings = {} }) {
  const config = getMaterialConfig('wood', settings);
  return attachEntity(Matter.Bodies.rectangle(x, y, width, height, {
    label: 'rule-wood-box',
    isStatic: true,
    angle,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction,
    chamfer: { radius: 8 }
  }), {
    type: 'ruleWood',
    material: 'wood',
    shape: 'box',
    width,
    height,
    wobble: 0,
    bands: createRuleWoodBands({ seed })
  });
}

export function createRuleWoodCircle({ x, y, radius, seed = 1, settings = {} }) {
  const config = getMaterialConfig('wood', settings);
  return attachEntity(Matter.Bodies.circle(x, y, radius, {
    label: 'rule-wood-circle',
    isStatic: true,
    density: config.density,
    restitution: config.restitution,
    friction: config.friction
  }), {
    type: 'ruleWood',
    material: 'wood',
    shape: 'circle',
    radius,
    wobble: 0,
    bands: createRuleWoodBands({ seed })
  });
}
```

- [ ] **Step 4: Run entity tests and confirm they pass**

Run:

```bash
npm test -- src/entities.test.js
```

Expected: PASS for `src/entities.test.js`.

- [ ] **Step 5: Commit the entity task**

Run:

```bash
git add src/entities.js src/entities.test.js
git commit -m "feat: add rule wood entities"
```

Expected: commit succeeds.

---

### Task 4: Route Rule Wood Collision By Arrow Color And Hit Point

**Files:**
- Modify: `src/collisions.js`
- Modify: `src/collisions.test.js`
- Modify: `src/physics.js`

- [ ] **Step 1: Write failing collision tests**

Modify `src/collisions.test.js` so the arrow fixture includes color:

```js
const arrow = { plugin: { entity: { type: 'arrow', color: 'green' } } };
```

Add this helper and tests:

```js
function ruleWoodTarget() {
  return {
    position: { x: 0, y: 0 },
    angle: 0,
    plugin: {
      entity: {
        type: 'ruleWood',
        material: 'wood',
        shape: 'circle',
        radius: 50,
        bands: {
          layers: [
            {
              kind: 'segmented',
              name: 'outer',
              thickness: 12,
              segments: [
                { color: 'green', start: 0, end: 0.5, size: 0.5 },
                { color: 'blue', start: 0.5, end: 1, size: 0.5 }
              ]
            },
            { kind: 'rainbow', name: 'rainbow', thickness: 10, segments: [{ color: 'rainbow', start: 0, end: 1, size: 1 }] }
          ]
        }
      }
    }
  };
}

describe('rule wood collision classification', () => {
  it('sticks when arrow color matches the hit band', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 49, y: 0 } })).toBe('stick');
  });

  it('bounces when arrow color does not match the hit band', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: -49, y: 0 } })).toBe('bounce');
  });

  it('sticks any arrow color into rainbow and core zones', () => {
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 30, y: 0 } })).toBe('stick');
    expect(classifyArrowCollision(arrow, ruleWoodTarget(), { point: { x: 0, y: 0 } })).toBe('stick');
  });
});
```

- [ ] **Step 2: Run collision tests and confirm they fail**

Run:

```bash
npm test -- src/collisions.test.js
```

Expected: FAIL because `classifyArrowCollision` ignores `ruleWood` hit points.

- [ ] **Step 3: Implement rule wood classification**

At the top of `src/collisions.js`, add:

```js
import { findRuleWoodHit } from './bands.js';
import { worldToLocal } from './geometry.js';
```

Change `classifyArrowCollision` to:

```js
export function classifyArrowCollision(arrowBody, targetBody, { point } = {}) {
  const arrow = getEntity(arrowBody);
  const target = getEntity(targetBody);
  if (arrow.type !== 'arrow') return 'ignore';
  if (target.type === 'balloon') return 'pop';
  if (target.type === 'ruleWood') {
    const localPoint = point ? worldToLocal(targetBody, point) : { x: 0, y: 0 };
    const hit = findRuleWoodHit(target, localPoint);
    if (hit.color === 'rainbow' || hit.color === 'wood' || hit.color === arrow.color) return 'stick';
    return 'bounce';
  }
  if (target.material === 'wood') return 'stick';
  if (target.material === 'rubber') return 'bounce';
  if (target.material === 'stone') return 'deflect';
  return 'ignore';
}
```

In `src/physics.js`, change:

```js
const action = classifyArrowCollision(arrow, target);
```

to:

```js
const action = classifyArrowCollision(arrow, target, { point });
```

- [ ] **Step 4: Run collision tests and confirm they pass**

Run:

```bash
npm test -- src/collisions.test.js
```

Expected: PASS for `src/collisions.test.js`.

- [ ] **Step 5: Commit the collision task**

Run:

```bash
git add src/collisions.js src/collisions.test.js src/physics.js
git commit -m "feat: classify rule wood collisions"
```

Expected: commit succeeds.

---

### Task 5: Generate A Rule Wood Climbing Route

**Files:**
- Modify: `src/generator.js`
- Modify: `src/generator.test.js`
- Modify: `src/physics.js`

- [ ] **Step 1: Write failing generator tests**

Add this assertion to the first test in `src/generator.test.js`:

```js
    expect(cluster.items.filter((item) => item.kind === 'ruleWood').length).toBeGreaterThanOrEqual(2);
```

- [ ] **Step 2: Run generator tests and confirm they fail**

Run:

```bash
npm test -- src/generator.test.js
```

Expected: FAIL because generated clusters do not include `ruleWood`.

- [ ] **Step 3: Update cluster generation**

In `src/generator.js`, change the first static wood platform item to a `ruleWood` box:

```js
      {
        kind: 'ruleWood',
        shape: 'box',
        x: centerX - 105,
        y,
        width: 230,
        height: 72,
        angle: (random() - 0.5) * 0.5,
        seed: generator.index * 100 + 1
      },
```

Change the later wood platform item to a second `ruleWood` target:

```js
      {
        kind: 'ruleWood',
        shape: random() > 0.45 ? 'circle' : 'box',
        x: centerX + (random() - 0.5) * 420,
        y: y + 245,
        width: 132 + random() * 80,
        height: 74 + random() * 24,
        radius: 48 + random() * 14,
        angle: (random() - 0.5) * 0.65,
        seed: generator.index * 100 + 2
      },
```

Keep rubber, balloons, hinged planks, and dynamic pieces as supporting objects.

- [ ] **Step 4: Spawn rule wood bodies from generated clusters**

In `src/physics.js`, update imports:

```js
import {
  createArrow,
  createBalloon,
  createBoxPiece,
  createCirclePiece,
  createGround,
  createHingedPlank,
  createRuleWoodBox,
  createRuleWoodCircle
} from './entities.js';
```

Add these cases in `spawnCluster` before the generic `piece` cases:

```js
    if (item.kind === 'ruleWood' && item.shape === 'box') {
      addBody(world, createRuleWoodBox({ ...item, settings }));
    }
    if (item.kind === 'ruleWood' && item.shape === 'circle') {
      addBody(world, createRuleWoodCircle({ ...item, settings }));
    }
```

- [ ] **Step 5: Run generator tests and full tests**

Run:

```bash
npm test -- src/generator.test.js
npm test
```

Expected: PASS for focused and full test suites.

- [ ] **Step 6: Commit the generation task**

Run:

```bash
git add src/generator.js src/generator.test.js src/physics.js
git commit -m "feat: generate rule wood climbing targets"
```

Expected: commit succeeds.

---

### Task 6: Render Rule Wood, Colored Arrows, Bow Preview Color, And HUD

**Files:**
- Modify: `src/render.js`

- [ ] **Step 1: Add rendering constants and band helpers**

Near the top of `src/render.js`, add:

```js
const ARROW_COLOR_STYLES = {
  green: '#39e85f',
  yellow: '#ffd91f',
  blue: '#2458ff'
};

const BAND_STYLES = {
  green: '#2cff4c',
  yellow: '#ffdf24',
  blue: '#244bff'
};
```

Add this helper after `roundedRect`:

```js
function colorForArrow(color) {
  return ARROW_COLOR_STYLES[color] || '#e94f28';
}
```

- [ ] **Step 2: Make arrow art use the arrow color**

In `drawArrow`, replace:

```js
  ctx.fillStyle = '#e94f28';
```

before feathers with:

```js
  ctx.fillStyle = colorForArrow(entity.color);
```

Also replace the arrow head fill:

```js
  ctx.fillStyle = '#f3a12d';
```

with:

```js
  ctx.fillStyle = colorForArrow(entity.color);
```

- [ ] **Step 3: Add circular rule wood drawing**

Add this function before `drawBody`:

```js
function drawCircularRuleWood(ctx, entity, time = 0) {
  const outer = entity.bands.layers[0];
  const rainbow = entity.bands.layers[1];
  const rainbowRadius = entity.radius - outer.thickness - rainbow.thickness / 2;
  const coreRadius = entity.radius - outer.thickness - rainbow.thickness;

  ctx.lineCap = 'butt';
  ctx.lineWidth = outer.thickness;
  for (const segment of outer.segments) {
    ctx.beginPath();
    ctx.strokeStyle = BAND_STYLES[segment.color];
    ctx.arc(0, 0, entity.radius - outer.thickness / 2, segment.start * Math.PI * 2, segment.end * Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineWidth = rainbow.thickness;
  for (let index = 0; index < 18; index += 1) {
    const start = ((index / 18) * Math.PI * 2 + time * 0.003) % (Math.PI * 2);
    const end = start + Math.PI * 2 / 18 + 0.03;
    ctx.strokeStyle = `hsl(${(index * 28 + time * 0.08) % 360} 92% 58%)`;
    ctx.beginPath();
    ctx.arc(0, 0, rainbowRadius, start, end);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#15100d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#201711';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let y = -coreRadius * 0.55; y <= coreRadius * 0.55; y += 14) {
    ctx.beginPath();
    ctx.moveTo(-coreRadius * 0.55, y);
    ctx.quadraticCurveTo(0, y + 4, coreRadius * 0.55, y - 3);
    ctx.stroke();
  }
}
```

- [ ] **Step 4: Add rectangular rule wood drawing**

Add this function after `drawCircularRuleWood`:

```js
function drawRectRuleWood(ctx, entity, time = 0) {
  const outer = entity.bands.layers[0];
  const rainbow = entity.bands.layers[1];
  const outerInset = outer.thickness / 2;
  const rainbowInset = outer.thickness + rainbow.thickness / 2;
  const coreInset = outer.thickness + rainbow.thickness;

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.lineWidth = outer.thickness;
  const perimeter = 2 * (entity.width + entity.height);

  function pointAt(t, inset) {
    const w = entity.width - inset * 2;
    const h = entity.height - inset * 2;
    const p = 2 * (w + h);
    let d = t * p;
    if (d <= w) return { x: -w / 2 + d, y: -h / 2 };
    d -= w;
    if (d <= h) return { x: w / 2, y: -h / 2 + d };
    d -= h;
    if (d <= w) return { x: w / 2 - d, y: h / 2 };
    d -= w;
    return { x: -w / 2, y: h / 2 - d };
  }

  function strokeSegment(startT, endT, inset) {
    const samples = Math.max(2, Math.ceil((endT - startT) * perimeter / 18));
    ctx.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const point = pointAt(startT + ((endT - startT) * index) / samples, inset);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  for (const segment of outer.segments) {
    ctx.strokeStyle = BAND_STYLES[segment.color];
    strokeSegment(segment.start, segment.end, outerInset);
  }

  ctx.lineWidth = rainbow.thickness;
  for (let index = 0; index < 18; index += 1) {
    const start = (index / 18 + time * 0.00012) % 1;
    const end = start + 1 / 18;
    ctx.strokeStyle = `hsl(${(index * 28 + time * 0.08) % 360} 92% 58%)`;
    if (end <= 1) strokeSegment(start, end, rainbowInset);
    else {
      strokeSegment(start, 1, rainbowInset);
      strokeSegment(0, end - 1, rainbowInset);
    }
  }

  roundedRect(
    ctx,
    -entity.width / 2 + coreInset,
    -entity.height / 2 + coreInset,
    entity.width - coreInset * 2,
    entity.height - coreInset * 2,
    6
  );
  ctx.fillStyle = '#15100d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#201711';
  ctx.stroke();
}
```

- [ ] **Step 5: Wire rule wood drawing into bodies and bow preview**

Add this dispatcher before `drawBody`:

```js
function drawRuleWood(ctx, entity, time) {
  if (entity.shape === 'circle') drawCircularRuleWood(ctx, entity, time);
  else drawRectRuleWood(ctx, entity, time);
}
```

Change `drawBody` signature:

```js
function drawBody(ctx, body, time) {
```

Inside `drawBody`, before normal wood:

```js
  if (entity.type === 'ruleWood') drawRuleWood(ctx, entity, time);
  else if (entity.material === 'wood') drawWood(ctx, entity);
```

Change the bow preview arrow call:

```js
  drawArrow(ctx, { length: 92, color: aimState.arrowColor });
```

- [ ] **Step 6: Add compact current/next HUD drawing**

Add this function before `renderFrame`:

```js
function drawArrowColorHud(ctx, arrowColors) {
  if (!arrowColors) return;
  const x = 18;
  const y = 18;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.strokeStyle = 'rgba(47, 59, 72, 0.18)';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, 122, 56, 8);
  ctx.fill();
  ctx.stroke();

  function swatch(label, color, offsetX) {
    ctx.fillStyle = '#2f3b48';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(label, x + offsetX, y + 14);
    ctx.fillStyle = colorForArrow(color);
    ctx.beginPath();
    ctx.arc(x + offsetX + 18, y + 34, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(47, 59, 72, 0.24)';
    ctx.stroke();
  }

  swatch('NOW', arrowColors.current, 12);
  swatch('NEXT', arrowColors.next, 68);
  ctx.restore();
}
```

Update `renderFrame` signature:

```js
export function renderFrame({ ctx, canvas, camera, world, aimState, shotArea, arrowColors, time = 0 }) {
```

Update body drawing:

```js
  getWorldBodies(world).forEach((body) => drawBody(ctx, body, time));
```

After `ctx.restore();`, add:

```js
  drawArrowColorHud(ctx, arrowColors);
```

- [ ] **Step 7: Run full tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 8: Commit the rendering task**

Run:

```bash
git add src/render.js
git commit -m "feat: render rule wood bands and arrow HUD"
```

Expected: commit succeeds.

---

### Task 7: Integrate Arrow Color Queue Into Gameplay

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Import and initialize the color queue**

At the top of `src/main.js`, add:

```js
import { advanceArrowColorQueue, createArrowColorQueue } from './arrowColors.js';
```

Near the other state variables, add:

```js
let arrowColorQueue = createArrowColorQueue();
```

- [ ] **Step 2: Carry current color through aim state**

Change `onAimStart`:

```js
  onAimStart(center) {
    aimState = {
      center,
      pointer: center,
      visualPull: { x: 0, y: 0 },
      launchVector: { x: 1, y: 0 },
      angle: 0,
      pullDistance: 0,
      arrowColor: arrowColorQueue.current
    };
  },
```

Change `onAimMove`:

```js
  onAimMove(nextAimState) {
    aimState = { ...nextAimState, arrowColor: arrowColorQueue.current };
  },
```

- [ ] **Step 3: Fire the current color and advance the queue after a shot**

In `onAimEnd`, change the `fireArrow` call:

```js
      fireArrow(world, {
        x: finalAimState.center.x,
        y: finalAimState.center.y,
        angle: finalAimState.angle,
        force,
        color: arrowColorQueue.current
      });
      arrowColorQueue = advanceArrowColorQueue(arrowColorQueue);
```

In `maybeRunAutofireProbe`, pass a color:

```js
  fireArrow(world, {
    x: target.position.x - 180,
    y: target.position.y,
    angle: 0,
    force: 1,
    color: arrowColorQueue.current
  });
```

- [ ] **Step 4: Pass queue data and time into rendering/debug**

In `renderFrame({ ... })`, add:

```js
    arrowColors: arrowColorQueue,
    time: now,
```

In `installDebugState().getState()`, add:

```js
        arrowColors: { ...arrowColorQueue },
```

In `updateDebugDataset`, add:

```js
  canvas.dataset.currentArrowColor = arrowColorQueue.current;
  canvas.dataset.nextArrowColor = arrowColorQueue.next;
```

- [ ] **Step 5: Update physics fireArrow to accept color**

In `src/physics.js`, change:

```js
export function fireArrow(world, { x, y, angle, force }) {
  const arrow = createArrow({ x, y, angle, mass: world.settings.arrowMass });
```

to:

```js
export function fireArrow(world, { x, y, angle, force, color = 'green' }) {
  const arrow = createArrow({ x, y, angle, mass: world.settings.arrowMass, color });
```

- [ ] **Step 6: Run full tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit the gameplay integration task**

Run:

```bash
git add src/main.js src/physics.js
git commit -m "feat: add random arrow colors to gameplay"
```

Expected: commit succeeds.

---

### Task 8: Browser Verification And Final Polish

**Files:**
- Modify only files touched above if verification exposes a concrete issue.

- [ ] **Step 1: Start or reuse the dev server**

Run:

```bash
npm run dev -- --port 5174
```

Expected: Vite serves the app at `http://127.0.0.1:5174/`.

- [ ] **Step 2: Open the app with debug and inspect generated state**

Open:

```text
http://127.0.0.1:5174/?debug=1
```

Expected:

- Canvas loads without runtime errors.
- The HUD shows two color swatches.
- Debug dataset includes `currentArrowColor` and `nextArrowColor`.
- Generated bodies include multiple `ruleWood` entities above the start.

- [ ] **Step 3: Manually verify the gameplay rule**

Use the current/next HUD and shoot into generated targets.

Expected:

- Matching green/yellow/blue hits stick.
- Nonmatching green/yellow/blue hits bounce with rubber-like energy.
- Any arrow color sticks into the rainbow band.
- Any arrow color sticks into the dark wood core.
- Successful sticks move the camera and allowed shot circle.
- Nonmatching bounces do not move the camera target or shot circle.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- Tests pass.
- Build passes.
- `git status --short` is clean after commits.

