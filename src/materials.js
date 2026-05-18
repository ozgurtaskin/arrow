const BASE_MATERIALS = {
  wood: { density: 0.001, restitution: 0.15, friction: 0.65, arrowBehavior: 'stick' },
  rubber: { density: 0.0008, restitution: 1.15, friction: 0.35, arrowBehavior: 'bounce' },
  stone: { density: 0.0028, restitution: 0.08, friction: 0.85, arrowBehavior: 'deflect' }
};

const MASS_KEYS = {
  wood: 'woodMass',
  rubber: 'rubberMass',
  stone: 'stoneMass'
};

export function getMaterialConfig(material, settings = {}) {
  const base = BASE_MATERIALS[material] || BASE_MATERIALS.wood;
  const multiplier = settings[MASS_KEYS[material]] ?? 1;
  return {
    ...base,
    density: base.density * multiplier
  };
}
