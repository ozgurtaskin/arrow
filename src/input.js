import { getAimState } from './aim.js';

export function createInputController({ canvas, camera, maxPull, onAimStart, onAimMove, onAimEnd, screenToWorld }) {
  let activePointerId = null;
  let center = null;

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, camera);
  }

  function onPointerDown(event) {
    if (activePointerId !== null) return;
    activePointerId = event.pointerId;
    canvas.setPointerCapture(activePointerId);
    center = getPoint(event);
    onAimStart(center);
  }

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId || !center) return;
    onAimMove(getAimState({ center, pointer: getPoint(event), maxPull }));
  }

  function onPointerUp(event) {
    if (event.pointerId !== activePointerId || !center) return;
    const aim = getAimState({ center, pointer: getPoint(event), maxPull });
    activePointerId = null;
    center = null;
    onAimEnd(aim);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  const mouseTarget = typeof window === 'undefined' ? canvas : window;

  canvas.addEventListener('mousedown', (event) => {
    if (activePointerId !== null) return;
    activePointerId = 'mouse';
    center = getPoint(event);
    onAimStart(center);
  });

  mouseTarget.addEventListener('mousemove', (event) => {
    if (activePointerId !== 'mouse' || !center) return;
    onAimMove(getAimState({ center, pointer: getPoint(event), maxPull }));
  });

  mouseTarget.addEventListener('mouseup', (event) => {
    if (activePointerId !== 'mouse' || !center) return;
    const aim = getAimState({ center, pointer: getPoint(event), maxPull });
    activePointerId = null;
    center = null;
    onAimEnd(aim);
  });
}
