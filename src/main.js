import './styles.css';
import { advanceArrowColorQueue, createArrowColorQueue, swapArrowColorQueue } from './arrowColors.js';
import { updateCamera, createCamera, startCameraTransition, startShake } from './camera.js';
import { computeLaunchForce } from './forceCurve.js';
import { createInputController } from './input.js';
import {
  applyLiveSettings,
  cleanupFarBelow,
  createPhysicsWorld,
  ensureGeneratedAhead,
  fireArrow,
  stepPhysics
} from './physics.js';
import { renderFrame, resizeCanvas, screenToWorld } from './render.js';
import { createSettingsStore, SETTING_DEFS } from './settings.js';
import { isPointInsideShotArea } from './shotArea.js';

const MAX_PULL = 190;

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const settingsToggle = document.querySelector('#settings-toggle');
const settingsPanel = document.querySelector('#settings-panel');
const swapArrowButton = document.querySelector('#swap-arrow');
const settingsStore = createSettingsStore();
const camera = createCamera({ width: window.innerWidth, height: window.innerHeight });
const debugParams = new URLSearchParams(window.location.search);
const STARTING_ARROWS = 10;
const START_SCORE_Y = 260;
const SCORE_WORLD_UNITS = 10;

let aimState = null;
let lastNow = performance.now();
let seenImpactSerial = 0;
let shotAnchor = { x: 0, y: START_SCORE_Y };
let arrowColorQueue = createArrowColorQueue();
let ammoCount = STARTING_ARROWS;
let highScore = 0;

const world = createPhysicsWorld(settingsStore, {
  onBalloonPop({ reward }) {
    ammoCount += reward;
    updateDebugDataset();
  }
});

function resize() {
  resizeCanvas(canvas, ctx);
  camera.width = window.innerWidth;
  camera.height = window.innerHeight;
}

function formatLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function createNumericControl(key, def) {
  const row = document.createElement('label');
  row.className = 'setting-row';
  const name = document.createElement('span');
  name.textContent = formatLabel(key);
  const range = document.createElement('input');
  range.type = 'range';
  range.min = def.min;
  range.max = def.max;
  range.step = def.step;
  const number = document.createElement('input');
  number.type = 'number';
  number.min = def.min;
  number.max = def.max;
  number.step = def.step;

  function sync(value) {
    range.value = value;
    number.value = Number(value).toFixed(def.step < 0.1 ? 2 : 1);
  }

  range.addEventListener('input', () => settingsStore.set(key, range.value));
  number.addEventListener('input', () => settingsStore.set(key, number.value));
  row.append(name, range, number);
  return { row, sync };
}

function createSelectControl(key, def) {
  const row = document.createElement('label');
  row.className = 'setting-row setting-row-select';
  const name = document.createElement('span');
  name.textContent = formatLabel(key);
  const select = document.createElement('select');
  for (const option of def.options) {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = formatLabel(option);
    select.append(optionElement);
  }
  select.addEventListener('change', () => settingsStore.set(key, select.value));
  row.append(name, select);
  return {
    row,
    sync(value) {
      select.value = value;
    }
  };
}

function setSettingsOpen(isOpen) {
  settingsPanel.classList.toggle('is-open', isOpen);
  settingsPanel.setAttribute('aria-hidden', String(!isOpen));
  settingsToggle.setAttribute('aria-expanded', String(isOpen));
}

function buildSettingsPanel() {
  settingsPanel.innerHTML = '';
  settingsPanel.setAttribute('aria-hidden', 'true');
  const header = document.createElement('div');
  header.className = 'settings-header';
  const title = document.createElement('h1');
  title.textContent = 'Settings';
  const closeButton = document.createElement('button');
  closeButton.className = 'settings-close';
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => setSettingsOpen(false));
  header.append(title, closeButton);
  settingsPanel.append(header);
  const controls = new Map();
  for (const [key, def] of Object.entries(SETTING_DEFS)) {
    const control = def.type === 'select' ? createSelectControl(key, def) : createNumericControl(key, def);
    controls.set(key, control);
    settingsPanel.append(control.row);
  }
  function syncAll(settings) {
    for (const [key, control] of controls) {
      control.sync(settings[key]);
    }
  }
  syncAll(settingsStore.get());
  settingsStore.subscribe(syncAll);
}

function shouldMoveCameraToImpact(impact) {
  const entity = impact.body?.plugin?.entity;
  if (entity?.canAnchor === false) return false;
  return !entity || entity.state !== 'flying';
}

function updateImpactCamera(settings) {
  const impact = world.lastImpact;
  if (!impact || impact.serial === seenImpactSerial || !shouldMoveCameraToImpact(impact)) return;
  seenImpactSerial = impact.serial;
  shotAnchor = { x: impact.x, y: impact.y };
  startCameraTransition(camera, {
    x: impact.x,
    y: impact.y,
    zoom: settings.cameraZoomToArrow
  }, settings);
}

function updateHighScore() {
  const climbScore = Math.max(0, Math.round((START_SCORE_Y - shotAnchor.y) / SCORE_WORLD_UNITS));
  highScore = Math.max(highScore, climbScore);
}

function fireQueuedArrow({ x, y, angle, force }, settings) {
  if (ammoCount <= 0) return false;
  ammoCount -= 1;
  fireArrow(world, {
    x,
    y,
    angle,
    force,
    color: arrowColorQueue.current
  });
  arrowColorQueue = advanceArrowColorQueue(arrowColorQueue);
  startShake(camera, settings.cameraShake);
  return true;
}

function installDebugState() {
  if (!debugParams.has('debug') && !debugParams.has('autofire')) return;
  window.__ARROW_SANDBOX_DEBUG__ = {
    getState() {
      const bodies = world.engine.world.bodies;
      return {
        bodyCount: bodies.length,
        arrowCount: world.arrows.length,
        particleCount: world.particles.length,
        lastImpactSerial: world.lastImpact?.serial || 0,
        camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
        shotAnchor,
        ammoCount,
        highScore,
        aimActive: Boolean(aimState),
        arrowColors: { ...arrowColorQueue },
        bodies: bodies.map((body) => ({
          type: body.plugin?.entity?.type,
          material: body.plugin?.entity?.material,
          state: body.plugin?.entity?.state,
          x: body.position.x,
          y: body.position.y
        }))
      };
    }
  };
}

function updateDebugDataset() {
  if (!debugParams.has('debug') && !debugParams.has('autofire')) return;
  canvas.dataset.bodyCount = String(world.engine.world.bodies.length);
  canvas.dataset.arrowCount = String(world.arrows.length);
  canvas.dataset.lastImpactSerial = String(world.lastImpact?.serial || 0);
  canvas.dataset.cameraY = String(Math.round(camera.y));
  canvas.dataset.aimActive = String(Boolean(aimState));
  canvas.dataset.currentArrowColor = arrowColorQueue.current;
  canvas.dataset.nextArrowColor = arrowColorQueue.next;
  canvas.dataset.ammoCount = String(ammoCount);
  canvas.dataset.highScore = String(highScore);
}

function maybeRunAutofireProbe() {
  if (!debugParams.has('autofire')) return;
  const target = world.engine.world.bodies.find((body) => body.plugin?.entity?.material === 'wood');
  if (!target) return;
  fireQueuedArrow({
    x: target.position.x - 180,
    y: target.position.y,
    angle: 0,
    force: 1
  }, settingsStore.get());
  updateDebugDataset();
}

function loop(now) {
  const dt = Math.min(1 / 60, (now - lastNow) / 1000);
  lastNow = now;
  const settings = settingsStore.get();
  stepPhysics(world, dt * 1000);
  updateImpactCamera(settings);
  updateHighScore();
  updateCamera(camera, dt);
  ensureGeneratedAhead(world, camera.y, settings);
  cleanupFarBelow(world, camera.y);
  updateDebugDataset();
  renderFrame({
    ctx,
    canvas,
    camera,
    world,
    aimState,
    settings,
    shotArea: { center: shotAnchor, radius: settings.shotRadius },
    arrowColors: arrowColorQueue,
    hud: {
      ammo: ammoCount,
      highScore
    },
    time: now
  });
  requestAnimationFrame(loop);
}

window.addEventListener('resize', resize);
settingsToggle.addEventListener('click', () => setSettingsOpen(!settingsPanel.classList.contains('is-open')));
swapArrowButton.addEventListener('click', (event) => {
  event.preventDefault();
  arrowColorQueue = swapArrowColorQueue(arrowColorQueue);
  if (aimState) aimState = { ...aimState, arrowColor: arrowColorQueue.current };
  updateDebugDataset();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSettingsOpen(false);
});
resize();
buildSettingsPanel();
ensureGeneratedAhead(world, camera.y, settingsStore.get());
installDebugState();
updateDebugDataset();
maybeRunAutofireProbe();

settingsStore.subscribe((settings, changedKey) => {
  applyLiveSettings(world, settings, changedKey);
});

createInputController({
  canvas,
  camera,
  maxPull: MAX_PULL,
  screenToWorld,
  canStartAim(point) {
    const settings = settingsStore.get();
    return ammoCount > 0 && isPointInsideShotArea(point, { center: shotAnchor, radius: settings.shotRadius });
  },
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
  onAimMove(nextAimState) {
    aimState = { ...nextAimState, arrowColor: arrowColorQueue.current };
  },
  onAimEnd(finalAimState) {
    const settings = settingsStore.get();
    if (finalAimState.pullDistance > 8) {
      const force = computeLaunchForce({
        pullDistance: finalAimState.pullDistance,
        maxPull: MAX_PULL,
        preset: settings.forcePreset,
        intensity: settings.forceIntensity,
        launchSpeed: settings.launchSpeed
      });
      fireQueuedArrow({
        x: finalAimState.center.x,
        y: finalAimState.center.y,
        angle: finalAimState.angle,
        force
      }, settings);
    }
    aimState = null;
  }
});

requestAnimationFrame(loop);
