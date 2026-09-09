export const MEASURE_GROUPS = [
  { key: "general", types: ["weight", "height", "bodyFat"] },
  { key: "torso", types: ["chest", "waist", "hips", "neck"] },
  { key: "arms", types: ["shoulders", "biceps", "forearm"] },
  { key: "legs", types: ["quadriceps", "calves"] },
];

export const LEGACY_TYPE_MAP = { belly: "waist", arms: "biceps", legs: "quadriceps" };

const MEASURE_UNITS = { weight: "kg", bodyFat: "%" };

export const UNIT_PRESETS = ["cm", "kg", "%"];

export function getMeasureUnit(type, customTypes = []) {
  if (MEASURE_UNITS[type]) return MEASURE_UNITS[type];
  const custom = customTypes.find((m) => m.id === type);
  return custom?.unit || "cm";
}

export function isBuiltInMeasureType(type) {
  return MEASURE_GROUPS.some((g) => g.types.includes(type))
}

export function isBuiltInGroup(key) {
  return MEASURE_GROUPS.some((g) => g.key === key)
}

export function measureTypeLabel(type, customTypes, t) {
  if (isBuiltInMeasureType(type)) return t[`measureType_${type}`]
  const custom = customTypes.find((m) => m.id === type)
  return custom ? custom.name : type
}

export function measureGroupLabel(key, t) {
  return isBuiltInGroup(key) ? t[`measureGroup_${key}`] : key
}

// Built-in groups with custom types folded in, then any fully custom groups.
export function allMeasureGroups(customTypes) {
  const builtIn = MEASURE_GROUPS.map((g) => ({
    key: g.key,
    types: [...g.types, ...customTypes.filter((m) => m.group === g.key).map((m) => m.id)],
  }))
  const customGroupKeys = [...new Set(
    customTypes.filter((m) => !isBuiltInGroup(m.group)).map((m) => m.group)
  )]
  const customGroups = customGroupKeys.map((key) => ({
    key,
    types: customTypes.filter((m) => m.group === key).map((m) => m.id),
  }))
  return [...builtIn, ...customGroups]
}
