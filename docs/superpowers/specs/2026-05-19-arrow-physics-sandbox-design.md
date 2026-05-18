# Arrow Physics Sandbox Design

Date: 2026-05-19
Status: Approved for implementation planning

## Goal

Build a first playable browser prototype for a portrait mobile physics sandbox about spawning a bow at the press point, pulling an elastic string, aiming by drag direction, and firing arrows into a procedural vertical world.

The prototype should prioritize toy-like physics feel over scoring or level rules. The player should be able to shoot arrows, stick them into physical objects, push and rotate objects, bounce off rubber surfaces, pop balloons, and tune the feel live through settings without restarting.

## Platform

- Web prototype.
- HTML Canvas rendering.
- Matter.js for 2D physics.
- Portrait mobile-first layout, also usable with desktop mouse.
- No heavy art pipeline for the first prototype; visuals are simple drawn canvas shapes inspired by the reference concept.

## Core Interaction

1. On pointer down, create the bow center at the press position.
2. While dragging, stretch the bow string from the center toward the pointer.
3. The arrow aim direction is the opposite of the pull vector.
4. Changing the drag angle rotates the bow and arrow so the player can aim.
5. On release, compute launch force from pull distance, force preset, force intensity, and launch speed.
6. Play a short camera shake.
7. Spawn/fire a physical arrow from the bow.
8. During arrow flight, do not move the camera to follow the arrow.
9. After the arrow sticks, pops a balloon, or settles, move the camera smoothly toward the relevant impact/settle point.

## Camera

The world is an endless vertical portrait sandbox with horizontal movement. The camera can move up/down and left/right, but it should not chase the arrow while it is flying.

Camera behavior:

- During aiming and flight, camera remains anchored to the current gameplay view, with only optional shake on release.
- After a meaningful impact or settle event, camera transitions to the target using ease-in/ease-out smoothing.
- The target is usually the stuck arrow, last impact point, or settled arrow position.
- Settings control how strongly camera follows X and Y, how much it zooms toward the arrow, and transition duration.

## Physics Materials

Every physical object has a material type. Material controls mass, restitution, friction, stick behavior, and visual feedback.

### Wood

- Medium mass.
- Medium friction.
- Low bounce.
- Arrows stick into wood.
- If the wood object is dynamic, the stuck arrow attaches by a constraint and transfers momentum.
- If the wood surface is static, the arrow remains fixed at the hit point.

### Rubber

- Configurable mass.
- High restitution.
- Arrows do not stick.
- On collision, the arrow bounces away using surface normal and rubber energy.
- Rubber may add energy according to the settings value, producing a stronger-than-normal bounce.
- The rubber object or its outline plays a wobble animation on impact.
- Visual style is glossy pink with a separate outline, matching the concept image.

### Stone

- Heavy by default.
- Low bounce.
- High inertia.
- Arrows generally do not stick.
- Arrows collide, transfer some impulse, and may fall or deflect.
- Stone is useful as a heavy sandbox object that can still be nudged by enough force.

### Balloon

- Non-heavy target object.
- Pops immediately on arrow contact.
- Plays a small burst effect and is removed from the world.
- Does not need complex physical response in the first prototype.

## Object Types

The procedural world should contain a mix of:

- Balloons.
- Static wood platforms.
- Static rubber bounce blobs or capsules.
- Dynamic wood pieces.
- Dynamic rubber pieces.
- Dynamic stone pieces.
- Random simple shapes such as boxes, circles, capsules, and rough polygon-like pieces.
- Hinged objects, such as long wooden planks attached to a pivot point.

Hinged objects use Matter.js constraints. A long plank can hang from a screw/pivot; when arrows stick into it or collide with it, the plank should rotate and swing.

## Arrow Behavior

Arrows are physical bodies with configurable mass.

Arrow outcomes:

- Wood hit: stick and create a constraint to the hit object when dynamic, or fix to static surface.
- Rubber hit: bounce; do not stick.
- Stone hit: collide/deflect; do not stick in the first prototype.
- Balloon hit: pop balloon and continue or settle depending on remaining velocity.
- Miss: continue under gravity until it hits something or falls away.

Stuck arrows remain visible in the world and should accumulate. For performance, the prototype may keep a generous cap and remove oldest arrows only when needed.

## Force Curve

Use preset-based force control instead of a full graph editor.

Settings:

- Force preset: Linear, Soft, Punchy.
- Force intensity slider.
- Launch speed slider.

The force curve maps normalized pull distance to launch impulse. It should avoid uncontrolled exponential growth. All presets are clamped and tuned for readable changes:

- Linear: direct proportional response.
- Soft: gentler early pull, smoother max force.
- Punchy: stronger response near the upper pull range, but still clamped.

## Live Settings

The settings panel is available during gameplay and applies changes without restarting the scene.

Initial settings:

- Gravity.
- Launch speed.
- Force preset.
- Force intensity.
- Rubber energy.
- Arrow mass.
- Wood mass multiplier.
- Rubber mass multiplier.
- Stone mass multiplier.
- Camera follow X.
- Camera follow Y.
- Camera zoom to arrow.
- Camera ease duration.
- Camera shake strength.

When mass settings change, existing matching bodies should be updated where practical, and newly spawned bodies should use the new values.

## Procedural Generation

The world should feel vertically endless.

Generation behavior:

- Spawn new object clusters above the current camera progression.
- Include horizontal spread so camera can move left and right.
- Mix balloons, rubber bounce surfaces, static platforms, dynamic pieces, stone pieces, and hinged planks.
- Use simple seeded or random generation for first prototype.
- Keep enough space around the player view for readable shots.
- Clean up far-below free objects when needed.
- Preserve stuck arrows for accumulation until a performance cap is reached.

The first version does not need score, fail state, level completion, or authored puzzle objectives.

## Visual Style

The style should be simple, readable, and close to the reference concept:

- Light blue sky background.
- Soft distant hills/clouds.
- Pink glossy rubber objects with darker pink outline.
- Brown wooden objects with simple grain lines.
- Dark gray stone objects.
- Red and blue balloons.
- Orange/brown bow and arrows.
- Dotted trajectory preview while pulling.
- Short pop particles for balloons.
- Outline wobble marks for rubber impacts.

Canvas drawing is acceptable for all first-pass visuals.

## File Structure

Planned files:

- `index.html`: canvas root and settings UI.
- `src/main.js`: boot, game loop, input wiring.
- `src/physics.js`: Matter.js world, collision handling, material behavior.
- `src/entities.js`: factories for arrows, bow, balloons, rubber, wood, stone, and hinged objects.
- `src/camera.js`: camera transform, ease movement, zoom, shake.
- `src/generator.js`: vertical procedural spawning.
- `src/settings.js`: settings state and UI binding.
- `src/render.js`: canvas rendering, trajectory preview, rubber outline wobble.
- `src/forceCurve.js`: Linear, Soft, and Punchy force presets.

## Testing and Verification

Manual browser verification is required for the first prototype:

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

Automated tests are optional for this first sandbox, but force curve math can be covered by small unit tests if the project setup makes that cheap.

## Out of Scope for First Prototype

- Score, objectives, level win/fail state.
- Full curve graph editor.
- Advanced authored puzzle levels.
- Asset pipeline or imported sprite atlas.
- Sound design.
- Mobile app packaging.
- Save/load of sandbox state.

