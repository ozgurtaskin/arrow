function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function createRuleWoodBandDesign(random) {
  const colorCount = 1 + Math.floor(random() * 3);
  return {
    colorCount,
    segmentCount: colorCount === 1 ? 1 : colorCount + Math.floor(random() * (6 - colorCount))
  };
}

function createRuleWoodItem(random, base) {
  return {
    ...base,
    ...createRuleWoodBandDesign(random)
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

  const centerX = (random() - 0.5) * 560;
  const balloonColor = random() > 0.5 ? '#f25565' : '#4ba5ff';
  const dynamicMaterial = pick(random, ['wood', 'rubber', 'stone']);

  return {
    y,
    items: [
      { kind: 'balloon', x: centerX + 92, y: y - 120, color: balloonColor },
      createRuleWoodItem(random, {
        kind: 'ruleWood',
        shape: 'box',
        x: centerX - 105,
        y,
        width: 230,
        height: 72,
        angle: (random() - 0.5) * 0.5,
        seed: generator.index * 100 + 1
      }),
      {
        kind: 'piece',
        material: 'rubber',
        shape: 'box',
        x: centerX + 110,
        y: y + 125,
        width: 170,
        height: 38,
        angle: (random() - 0.5) * 0.8,
        isStatic: true
      },
      createRuleWoodItem(random, {
        kind: 'ruleWood',
        shape: random() > 0.45 ? 'circle' : 'box',
        x: centerX + (random() - 0.5) * 420,
        y: y + 245,
        width: 132 + random() * 80,
        height: 74 + random() * 24,
        radius: 48 + random() * 14,
        angle: (random() - 0.5) * 0.65,
        seed: generator.index * 100 + 2
      }),
      random() > 0.5
        ? { kind: 'hinged-plank', x: centerX - 175, y: y + 205, length: 170, angle: (random() - 0.5) * 0.7 }
        : {
            kind: 'piece',
            material: dynamicMaterial,
            shape: 'circle',
            x: centerX - 170,
            y: y + 205,
            radius: 30 + random() * 14,
            isStatic: false
          }
    ]
  };
}
