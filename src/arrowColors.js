export const ARROW_COLORS = Object.freeze(['green', 'yellow', 'blue']);

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

export function swapArrowColorQueue(queue) {
  return {
    current: queue.next,
    next: queue.current
  };
}
