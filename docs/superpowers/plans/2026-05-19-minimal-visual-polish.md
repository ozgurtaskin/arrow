# Minimal Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the illustrative arrow/bow/band visuals with a minimal but toy-like style, while keeping arrow color gameplay readable.

**Architecture:** Keep the polish in the existing Canvas renderer, with only small gameplay-state additions for stuck-arrow wobble timing. Band default thickness changes stay in the band helper so entity factories continue to produce consistent metadata.

**Tech Stack:** Vite, Matter.js, Canvas 2D, Vitest.

---

## File Structure

- Modify `src/bands.js`: reduce default `ruleWood` band thicknesses.
- Modify `src/bands.test.js`: protect the new thin default thicknesses.
- Modify `src/physics.js`: set and decay a short `stickWobble` timer on stuck arrows.
- Modify `src/physics.test.js`: verify stuck wobble is created and decays.
- Modify `src/render.js`: simplify arrows, bow, string, trail, stuck wobble drawing, and static thin ruleWood bands.

---

### Task 1: Thin Rule Wood Band Defaults

**Files:**
- Modify: `src/bands.js`
- Modify: `src/bands.test.js`

- [ ] **Step 1: Add a failing default thickness test**

Add this test inside `describe('findRuleWoodHit', ...)` or a new `describe('createRuleWoodBands', ...)` in `src/bands.test.js`:

```js
describe('createRuleWoodBands', () => {
  it('uses thin rubber-strip defaults for visual bands', () => {
    const bands = createRuleWoodBands({ seed: 3 });

    expect(bands.layers[0].thickness).toBe(8);
    expect(bands.layers[1].thickness).toBe(6);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/bands.test.js
```

Expected: FAIL because current defaults are thicker than `8` and `6`.

- [ ] **Step 3: Change default band thicknesses**

In `src/bands.js`, change `createRuleWoodBands` defaults from:

```js
export function createRuleWoodBands({ seed = 1, outerThickness = 18, rainbowThickness = 14, segmentCount = 4 } = {}) {
```

to:

```js
export function createRuleWoodBands({ seed = 1, outerThickness = 8, rainbowThickness = 6, segmentCount = 4 } = {}) {
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- src/bands.test.js
```

Expected: PASS for `src/bands.test.js`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/bands.js src/bands.test.js
git commit -m "style: thin rule wood band defaults"
```

Expected: commit succeeds.

---

### Task 2: Add Stuck Arrow Wobble State

**Files:**
- Modify: `src/physics.js`
- Modify: `src/physics.test.js`

- [ ] **Step 1: Add a failing physics regression test**

In `src/physics.test.js`, change the entity import from:

```js
import { createRuleWoodCircle } from './entities.js';
```

to:

```js
import { createBoxPiece, createRuleWoodCircle } from './entities.js';
```

Add this test inside the existing physics describe block:

```js
  it('starts and decays a short stuck-arrow wobble timer', () => {
    const world = createPhysicsWorld(createSettingsStore({ gravity: 0 }));
    addBody(world, createBoxPiece({
      x: 0,
      y: 0,
      width: 80,
      height: 80,
      material: 'wood',
      isStatic: true,
      settings: { woodMass: 1 }
    }));

    const arrow = fireArrow(world, { x: -150, y: 0, angle: 0, force: 1, color: 'green' });

    for (let index = 0; index < 80 && arrow.plugin.entity.state !== 'stuck'; index += 1) {
      stepPhysics(world, 1000 / 60);
    }

    expect(arrow.plugin.entity.state).toBe('stuck');
    expect(arrow.plugin.entity.stickWobble).toBeGreaterThan(0);

    stepPhysics(world, 220);

    expect(arrow.plugin.entity.stickWobble).toBe(0);
  });
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/physics.test.js
```

Expected: FAIL because stuck arrows do not set `stickWobble`.

- [ ] **Step 3: Add wobble timer setup and decay**

In `src/physics.js`, add a constant near the other timing constants:

```js
const STICK_WOBBLE_MS = 160;
```

Inside `stickArrow`, after `arrowEntity.state = 'stuck';`, add:

```js
  arrowEntity.stickWobble = STICK_WOBBLE_MS;
```

Inside the `for` loop in `stepPhysics`, after the existing `entity.wobble` decay, add:

```js
    if (entity.stickWobble) entity.stickWobble = Math.max(0, entity.stickWobble - deltaMs);
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- src/physics.test.js
```

Expected: PASS for `src/physics.test.js`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/physics.js src/physics.test.js
git commit -m "feat: add stuck arrow wobble state"
```

Expected: commit succeeds.

---

### Task 3: Simplify Arrow, Bow, Trail, And Bands

**Files:**
- Modify: `src/render.js`

- [ ] **Step 1: Add visual constants**

Near the existing color constants in `src/render.js`, add:

```js
const STATIC_RAINBOW_STYLES = ['#ff3f7f', '#ff8a24', '#ffdf24', '#37e85f', '#27d7ff', '#4b5bff'];
const MAX_PULL_FOR_STRING = 190;
const STICK_WOBBLE_MS = 160;
```

- [ ] **Step 2: Replace arrow drawing with a toothpick line**

Replace the body of `drawArrow(ctx, entity)` with:

```js
function drawArrow(ctx, entity) {
  const length = entity.length || 92;
  const arrowColor = colorForArrow(entity.color);
  const wobbleTime = entity.stickWobble || 0;
  const wobbleRatio = Math.max(0, Math.min(1, wobbleTime / STICK_WOBBLE_MS));
  const bend = Math.sin(wobbleRatio * Math.PI * 5) * wobbleRatio * 5;

  if (entity.state === 'flying') {
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 0; index < 3; index += 1) {
      ctx.globalAlpha = 0.18 - index * 0.045;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2 - index * 0.35;
      ctx.beginPath();
      ctx.moveTo(-length / 2 - 10 - index * 10, 0);
      ctx.lineTo(-length / 2 - 2 - index * 8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = arrowColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(length / 2, 0);
  ctx.quadraticCurveTo(6, bend * 0.35, -length / 2, bend);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(39, 55, 70, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(length / 2 - 8, 0);
  ctx.lineTo(length / 2, 0);
  ctx.stroke();
  ctx.restore();
}
```

This removes the triangular head and feathers. The small tip accent remains only as a readability hairline.

- [ ] **Step 3: Make rainbow bands static and thinner-looking**

In `drawCircularRuleWood`, replace the rainbow loop:

```js
  ctx.lineWidth = rainbow.thickness;
  for (let index = 0; index < 18; index += 1) {
    const start = ((index / 18) * Math.PI * 2 + time * 0.003) % (Math.PI * 2);
    const end = start + Math.PI * 2 / 18 + 0.03;
    ctx.strokeStyle = `hsl(${(index * 28 + time * 0.08) % 360} 92% 58%)`;
    ctx.beginPath();
    ctx.arc(0, 0, rainbowRadius, start, end);
    ctx.stroke();
  }
```

with:

```js
  ctx.lineWidth = Math.max(2, rainbow.thickness);
  for (let index = 0; index < STATIC_RAINBOW_STYLES.length; index += 1) {
    const start = (index / STATIC_RAINBOW_STYLES.length) * Math.PI * 2;
    const end = ((index + 1) / STATIC_RAINBOW_STYLES.length) * Math.PI * 2;
    ctx.strokeStyle = STATIC_RAINBOW_STYLES[index];
    ctx.beginPath();
    ctx.arc(0, 0, rainbowRadius, start, end);
    ctx.stroke();
  }
```

In `drawRectRuleWood`, replace the animated rainbow loop:

```js
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
```

with:

```js
  ctx.lineWidth = Math.max(2, rainbow.thickness);
  for (let index = 0; index < STATIC_RAINBOW_STYLES.length; index += 1) {
    const start = index / STATIC_RAINBOW_STYLES.length;
    const end = (index + 1) / STATIC_RAINBOW_STYLES.length;
    ctx.strokeStyle = STATIC_RAINBOW_STYLES[index];
    strokeSegment(start, end, rainbowInset);
  }
```

Also remove the decorative wood-line loops in `drawCircularRuleWood` and `drawRectRuleWood` by deleting the light `ctx.strokeStyle = 'rgba(255,255,255,0.16)'` sections. The core should remain a plain dark fill/stroke.

- [ ] **Step 4: Simplify bow and make string thin as pull increases**

In `drawBowPreview`, replace the bow arc styling:

```js
  ctx.strokeStyle = '#d7791f';
  ctx.lineWidth = 9;
```

with:

```js
  ctx.strokeStyle = '#d98225';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
```

After the bow `ctx.stroke();`, reset `ctx.lineCap`:

```js
  ctx.lineCap = 'butt';
```

Before drawing the string, add:

```js
  const pullRatio = Math.max(0, Math.min(1, (aimState.pullDistance || 0) / MAX_PULL_FOR_STRING));
  const stringWidth = Math.max(0.8, 3.2 - pullRatio * 2.2);
```

Then change:

```js
  ctx.lineWidth = 2;
```

to:

```js
  ctx.lineWidth = stringWidth;
```

- [ ] **Step 5: Keep render signature compatible**

Do not change the public `renderFrame({ ctx, canvas, camera, world, aimState, shotArea, arrowColors, time = 0 })` signature. It should still pass `time` into `drawBody`, even though rainbow animation no longer uses it. Stuck wobble still uses entity state, not global time.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/render.js
git commit -m "style: simplify arrow and rule wood visuals"
```

Expected: commit succeeds.

---

### Task 4: Browser Verification

**Files:**
- Modify only if verification exposes a concrete issue.

- [ ] **Step 1: Start or reuse the dev server**

Run:

```bash
curl -I --max-time 2 http://127.0.0.1:5174/
```

Expected: HTTP 200. If not running, start:

```bash
npm run dev -- --port 5174
```

- [ ] **Step 2: Open debug URL**

Open:

```text
http://127.0.0.1:5174/?debug=1
```

Expected:

- Canvas loads.
- Settings panel loads.
- `currentArrowColor` and `nextArrowColor` dataset values are present.

- [ ] **Step 3: Manual visual checks**

Verify:

- Arrow is a simple colored line with no triangular head or feathers.
- Bow is a thin single curve.
- String becomes thinner as pull distance increases.
- Flying arrow trail is subtle and short.
- Stuck arrow wobble is fast and does not move the physics body.
- RuleWood bands are thinner and static.
- Rainbow/wildcard band no longer animates.
- RuleWood bands do not visibly overflow as thick tubes.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected:

- Tests pass.
- Build passes.
- Git status is clean after commits.
