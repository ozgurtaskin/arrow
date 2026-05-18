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
