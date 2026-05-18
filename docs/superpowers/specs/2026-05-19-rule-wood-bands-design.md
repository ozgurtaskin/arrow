# Rule Wood Colored Bands Design

## Context

The current arrow sandbox has normal wood, rubber, stone, balloons, gravity, camera follow after arrow impact, and a restricted shot circle around the last stuck arrow. Wood currently accepts arrows as a full-body material, while rubber bounces arrows and stone deflects them.

This feature adds a new dedicated target type, separate from normal wood, for a vertical climbing sandbox. The player should use randomly colored arrows to hit matching colored bands or wildcard bands, then continue shooting from the newly stuck arrow's area.

## Goals

- Add a separate `ruleWood` object type that is visually wrapped in colored bands.
- Use mostly static or hanging `ruleWood` objects in the level so the player climbs upward by aiming at valid band colors.
- Give each shot a random arrow color and show the current and next arrow colors in a compact HUD.
- Make green, yellow, and blue band segments accept only arrows of the same color.
- Make the animated rainbow band accept every arrow color.
- Make nonmatching colored bands bounce arrows with a rubber-like response.
- Keep normal wood behavior unchanged so both classic wood and rule-based wood can exist in the sandbox.

## Non-Goals

- Do not create true physical bodies for every band segment in the first pass.
- Do not support arbitrary hand-drawn shape outlines in the first pass; use the existing box and circle body primitives.
- Do not make the colored bands destructible yet.
- Do not require a restart when testing the rule; arrow colors and object placement should work during normal play.

## Object Model

`ruleWood` is a new metadata material/type layered on top of the existing Matter body system. A `ruleWood` body remains one stable physics body, but it owns a band definition used by both rendering and collision classification.

A band definition contains:

- `layers`: ordered from outside to inside.
- `segments`: normalized loop ranges where the full perimeter is `1.0`.
- `color`: `green`, `yellow`, `blue`, or `rainbow`.
- `thickness`: world-space visual/collision thickness.
- `seed`: deterministic seed so a placed object keeps the same random band layout.

The first implementation should generate:

- Outer layer: random green/yellow/blue segments around the full loop.
- Minimum segment length: `0.15`.
- Inner layer: one full-loop `rainbow` segment.
- Core: wood tile texture, accepts arrows like normal wood after the band logic does not block the hit.

## Band Generation

The generator treats the object's perimeter as a normalized loop from `0` to `1`.

1. Choose segment count from a small range that can satisfy the minimum segment size.
2. Split the loop into random normalized lengths.
3. Enforce every segment length to be at least `0.15`.
4. Assign green/yellow/blue colors while avoiding long runs of identical adjacent colors where possible.
5. Normalize the final lengths so they sum exactly to `1.0`.

The generator should be deterministic per object seed. Tests should verify that generated segments sum to `1.0`, every segment is at least `0.15`, and every segment has an allowed color.

## Arrow Colors And HUD

The game keeps a small arrow color queue:

- `currentArrowColor`: used by the next arrow fired.
- `nextArrowColor`: shown as a preview.

When the player fires:

1. The spawned arrow receives `currentArrowColor` in metadata.
2. `nextArrowColor` becomes the new `currentArrowColor`.
3. A new random `nextArrowColor` is generated.

The HUD should be small and nonintrusive. It should show two compact swatches or mini arrow icons labeled as the current and next shot. It must not cover the main aiming area.

## Collision Rules

When an arrow collides with a `ruleWood` body:

1. Estimate the collision point in world space from the Matter collision data.
2. Convert the point to the target body's local space.
3. Determine whether the point is in a band layer or the wood core.
4. If it hits a green/yellow/blue segment:
   - Matching arrow color sticks.
   - Nonmatching arrow color bounces like rubber.
5. If it hits a rainbow segment:
   - Every arrow color sticks.
6. If it hits the core:
   - Treat it as normal wood and stick.

Only successful sticks update the camera target, shot anchor, and allowed shot circle. Nonmatching bounces do not move the player's valid firing area.

For boxes, the normalized loop position is computed around the rectangle perimeter. For circles, it is computed from the local angle. This keeps the system compatible with the current primitive object model.

## Rendering

`ruleWood` rendering should make the rule readable at gameplay scale:

- Draw the wood core with the existing warm wood/tile look.
- Draw the inner rainbow band as a full-loop animated band. The animation can be a moving hue gradient or shifting stripe offset.
- Draw the outer green/yellow/blue segments as thick, rounded perimeter bands.
- Keep a clean dark or slightly shadowed separation line between the core and colored bands so the hit zones are legible.

For circles, segments are drawn as arcs. For boxes, segments are drawn along the rectangle perimeter. Rounded corners can be approximated in the first pass if needed, but the colored hit regions must visually align with collision classification.

## Level Composition

The sandbox level should include more `ruleWood` targets than normal wood so the main loop becomes climbing through color-gated targets.

Initial placement:

- Static circular and rectangular `ruleWood` targets arranged upward.
- Some targets offset horizontally so camera follow and side aiming matter.
- Normal wood, rubber, balloons, and ground can remain as supporting objects, but the climb route should be dominated by `ruleWood`.

The existing camera behavior remains: the camera should move after a successful stick, not while the arrow is flying. A successful stick on `ruleWood` updates the shot anchor and allowed shot circle like existing wood.

## Testing

Add focused tests for:

- Band generation minimum segment size and full-loop sum.
- Band lookup for circle and rectangle shapes.
- Collision classification for matching color, nonmatching color, rainbow, and core hits.
- Arrow color queue advancement after a shot.

Manual verification should include:

- Launch the local app.
- Confirm current and next color HUD is visible.
- Fire a matching color into a colored band and see the arrow stick.
- Fire a nonmatching color into a colored band and see it bounce.
- Fire any color into the rainbow band and see it stick.
- Confirm successful sticks move the camera and shot circle to the new arrow.
