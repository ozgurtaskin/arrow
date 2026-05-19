# Minimal Visual Polish Design

## Context

The current arrow sandbox now has color-gated `ruleWood` targets, random arrow colors, a current/next HUD, and physics rules for sticking or bouncing. The visuals are still more illustrative than desired: arrows have heads and feathers, bows are thick, rubber strings are constant-width, ruleWood bands are too thick, and rainbow bands animate.

The new direction is "minimal but toy-like": simpler shapes, fewer decorative details, and fast tactile feedback.

## Goals

- Make arrows look like simple colored toothpick lines.
- Make the bow and rubber string very simple.
- Make the rubber string thinner as the player pulls farther.
- Add a subtle short trail behind flying arrows.
- Add a very fast wobble from the stuck tip back through the arrow body when an arrow sticks.
- Make colored ruleWood bands thinner and stop rainbow movement.
- Keep the gameplay color readability: arrow color, band colors, and current/next HUD must remain clear.

## Non-Goals

- Do not change collision rules, arrow force, camera behavior, or level generation.
- Do not replace the canvas renderer or add a sprite pipeline.
- Do not make a new art system; this is a focused polish pass in the current renderer.

## Visual Direction

Use the approved **B** direction:

- Minimal base geometry.
- Slight toy-like color punch.
- Feedback effects remain visible but short-lived.

The arrow is a straight line with rounded caps. It has no triangular head and no feathers. Its stroke color matches the current arrow color. A darker hairline or tiny tip accent can be used only if needed for readability.

The bow is a single thin curved stroke. The string is two simple line segments from bow endpoints to the pull point. The string width shrinks as pull distance increases, making it feel stretched.

The flying trail is subtle: two or three fading line segments behind the arrow, using the arrow color with low alpha. It must not look like a particle spray.

The stuck wobble is a render-only effect. When an arrow transitions to stuck, store a short wobble timer on the arrow entity. During that timer, draw the arrow as a lightly curved line whose bend falls off from the stuck tip toward the tail. The effect should finish in about `0.12` to `0.18` seconds.

## Rule Wood Bands

Rule wood bands should read as thin rubber strips, not thick tubes.

- Outer green/yellow/blue band thickness should be reduced.
- Rainbow/wildcard band thickness should be reduced.
- Rainbow/wildcard should be static, not moving.
- For circles and boxes, bands should sit inside the object boundary enough to avoid visual overflow.
- Segment boundaries must continue to align with collision classification.

The dark core can remain simple and readable, but should avoid heavy decorative texture.

## Implementation Notes

- Most changes belong in `src/render.js`.
- Band default thickness belongs in `src/bands.js` via `createRuleWoodBands` defaults.
- Stuck wobble timing belongs in `src/physics.js` where arrow state changes to `stuck`, and the timer decay can happen in the existing physics step.
- Trail can be derived from the current arrow position, angle, velocity, and color at render time; no persistent particle system is required.

## Testing And Verification

- Existing tests must continue to pass.
- Add focused tests only where behavior/state changes need protection, such as stuck wobble timer setup/decay if practical.
- Run `npm test`.
- Run `npm run build`.
- Verify in the browser that:
  - arrows are simple lines;
  - bow and string are thin and simple;
  - string thins when pulled;
  - flying arrows leave only a subtle trail;
  - stuck arrows wobble very briefly;
  - ruleWood bands are thin, static, and not overflowing visually.
