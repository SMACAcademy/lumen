/**
 * A small, dimension-aware unit registry. Each unit declares its physical
 * dimension and a linear factor to the SI (or SI-coherent) unit, so that
 * conversions like km/h ↔ m/s or deg ↔ rad are data, not code.
 */

export type Dimension =
  | "dimensionless"
  | "angle"
  | "angular-velocity"
  | "angular-acceleration"
  | "length"
  | "time"
  | "velocity"
  | "acceleration"
  | "mass"
  | "force"
  | "energy"
  | "power"
  | "momentum"
  | "torque"
  | "inertia"
  | "specific-energy"
  | "pressure"
  | "area"
  | "volume"
  | "density"
  | "temperature"
  | "specific-heat"
  | "absolute-temperature"
  | "frequency"
  | "wavenumber"
  | "concentration"
  | "reaction-rate"
  | "molar-energy"
  | "amount"
  | "voltage"
  | "current"
  | "resistance"
  | "molality"
  | "colligative-constant"
  | "molar-entropy"
  | "charge"
  | "conductivity"
  | "molar-conductivity"
  | "molar-mass"
  | "electric-field"
  | "capacitance"
  | "magnetic-field"
  | "magnetic-flux"
  | "inductance"
  | "sound-level"
  | "intensity"
  | "viscosity"
  | "surface-tension"
  | "thermal-conductivity"
  | "charge-density"
  | "power-of-lens"
  | "heat-capacity"
  | "decay-constant"
  | "activity";

export interface UnitDefinition {
  id: string;
  symbol: string;
  name: string;
  dimension: Dimension;
  /** Multiply a value in this unit by `toSI` to get the SI value. */
  toSI: number;
}

const DEG = Math.PI / 180;

export const UNITS = {
  "1": { id: "1", symbol: "", name: "dimensionless", dimension: "dimensionless", toSI: 1 },
  rad: { id: "rad", symbol: "rad", name: "radian", dimension: "angle", toSI: 1 },
  deg: { id: "deg", symbol: "°", name: "degree", dimension: "angle", toSI: DEG },
  "rad/s": { id: "rad/s", symbol: "rad/s", name: "radian per second", dimension: "angular-velocity", toSI: 1 },
  "deg/s": { id: "deg/s", symbol: "°/s", name: "degree per second", dimension: "angular-velocity", toSI: DEG },
  "rad/s2": { id: "rad/s2", symbol: "rad/s²", name: "radian per second squared", dimension: "angular-acceleration", toSI: 1 },
  m: { id: "m", symbol: "m", name: "metre", dimension: "length", toSI: 1 },
  mm: { id: "mm", symbol: "mm", name: "millimetre", dimension: "length", toSI: 0.001 },
  cm: { id: "cm", symbol: "cm", name: "centimetre", dimension: "length", toSI: 0.01 },
  km: { id: "km", symbol: "km", name: "kilometre", dimension: "length", toSI: 1000 },
  s: { id: "s", symbol: "s", name: "second", dimension: "time", toSI: 1 },
  "m/s": { id: "m/s", symbol: "m/s", name: "metre per second", dimension: "velocity", toSI: 1 },
  "km/h": { id: "km/h", symbol: "km/h", name: "kilometre per hour", dimension: "velocity", toSI: 1000 / 3600 },
  "m/s2": { id: "m/s2", symbol: "m/s²", name: "metre per second squared", dimension: "acceleration", toSI: 1 },
  N: { id: "N", symbol: "N", name: "newton", dimension: "force", toSI: 1 },
  kN: { id: "kN", symbol: "kN", name: "kilonewton", dimension: "force", toSI: 1000 },
  "N m": { id: "N m", symbol: "N m", name: "newton metre", dimension: "torque", toSI: 1 },
  "kg m2": { id: "kg m2", symbol: "kg m²", name: "kilogram metre squared", dimension: "inertia", toSI: 1 },
  "kg m/s": { id: "kg m/s", symbol: "kg m/s", name: "kilogram metre per second", dimension: "momentum", toSI: 1 },
  /**
   * Celsius is registered alone in its dimension on purpose: the registry
   * converts by a factor, and °C ↔ K needs an offset. With nothing to convert
   * to, the unit can only ever be a label, which is all this lab asks of it.
   */
  degC: { id: "degC", symbol: "°C", name: "degree Celsius", dimension: "temperature", toSI: 1 },
  "J/kgK": { id: "J/kgK", symbol: "J/(kg K)", name: "joule per kilogram kelvin", dimension: "specific-heat", toSI: 1 },
  m2: { id: "m2", symbol: "m²", name: "square metre", dimension: "area", toSI: 1 },
  cm2: { id: "cm2", symbol: "cm²", name: "square centimetre", dimension: "area", toSI: 1e-4 },
  mm2: { id: "mm2", symbol: "mm²", name: "square millimetre", dimension: "area", toSI: 1e-6 },
  m3: { id: "m3", symbol: "m³", name: "cubic metre", dimension: "volume", toSI: 1 },
  cm3: { id: "cm3", symbol: "cm³", name: "cubic centimetre", dimension: "volume", toSI: 1e-6 },
  L: { id: "L", symbol: "L", name: "litre", dimension: "volume", toSI: 0.001 },
  "kg/m3": { id: "kg/m3", symbol: "kg/m³", name: "kilogram per cubic metre", dimension: "density", toSI: 1 },
  "g/cm3": { id: "g/cm3", symbol: "g/cm³", name: "gram per cubic centimetre", dimension: "density", toSI: 1000 },
  Pa: { id: "Pa", symbol: "Pa", name: "pascal", dimension: "pressure", toSI: 1 },
  kPa: { id: "kPa", symbol: "kPa", name: "kilopascal", dimension: "pressure", toSI: 1000 },
  MPa: { id: "MPa", symbol: "MPa", name: "megapascal", dimension: "pressure", toSI: 1e6 },
  GPa: { id: "GPa", symbol: "GPa", name: "gigapascal", dimension: "pressure", toSI: 1e9 },
  J: { id: "J", symbol: "J", name: "joule", dimension: "energy", toSI: 1 },
  "J/kg": { id: "J/kg", symbol: "J/kg", name: "joule per kilogram", dimension: "specific-energy", toSI: 1 },
  kJ: { id: "kJ", symbol: "kJ", name: "kilojoule", dimension: "energy", toSI: 1000 },
  W: { id: "W", symbol: "W", name: "watt", dimension: "power", toSI: 1 },
  kW: { id: "kW", symbol: "kW", name: "kilowatt", dimension: "power", toSI: 1000 },
  kg: { id: "kg", symbol: "kg", name: "kilogram", dimension: "mass", toSI: 1 },
  // Atoms and light.
  nm: { id: "nm", symbol: "nm", name: "nanometre", dimension: "length", toSI: 1e-9 },
  pm: { id: "pm", symbol: "pm", name: "picometre", dimension: "length", toSI: 1e-12 },
  eV: { id: "eV", symbol: "eV", name: "electronvolt", dimension: "energy", toSI: 1.602176634e-19 },
  "km/s": { id: "km/s", symbol: "km/s", name: "kilometre per second", dimension: "velocity", toSI: 1000 },
  Hz: { id: "Hz", symbol: "Hz", name: "hertz", dimension: "frequency", toSI: 1 },
  THz: { id: "THz", symbol: "THz", name: "terahertz", dimension: "frequency", toSI: 1e12 },
  "1/cm": { id: "1/cm", symbol: "cm⁻¹", name: "reciprocal centimetre", dimension: "wavenumber", toSI: 100 },
  // Reactions. Kelvin has a dimension of its own, away from °C, for the reason given above.
  K: { id: "K", symbol: "K", name: "kelvin", dimension: "absolute-temperature", toSI: 1 },
  min: { id: "min", symbol: "min", name: "minute", dimension: "time", toSI: 60 },
  "1/min": { id: "1/min", symbol: "min⁻¹", name: "per minute", dimension: "frequency", toSI: 1 / 60 },
  "mol/L": { id: "mol/L", symbol: "mol L⁻¹", name: "mole per litre", dimension: "concentration", toSI: 1000 },
  "mol/L/min": { id: "mol/L/min", symbol: "mol L⁻¹ min⁻¹", name: "mole per litre per minute", dimension: "reaction-rate", toSI: 1000 / 60 },
  "J/molK": { id: "J/molK", symbol: "J mol⁻¹ K⁻¹", name: "joule per mole kelvin", dimension: "molar-entropy", toSI: 1 },
  V: { id: "V", symbol: "V", name: "volt", dimension: "voltage", toSI: 1 },
  A: { id: "A", symbol: "A", name: "ampere", dimension: "current", toSI: 1 },
  ohm: { id: "ohm", symbol: "Ω", name: "ohm", dimension: "resistance", toSI: 1 },
  "mol/kg": { id: "mol/kg", symbol: "mol kg⁻¹", name: "mole per kilogram", dimension: "molality", toSI: 1 },
  "K kg/mol": { id: "K kg/mol", symbol: "K kg mol⁻¹", name: "kelvin kilogram per mole", dimension: "colligative-constant", toSI: 1 },
  mol: { id: "mol", symbol: "mol", name: "mole", dimension: "amount", toSI: 1 },
  mL: { id: "mL", symbol: "mL", name: "millilitre", dimension: "volume", toSI: 1e-6 },
  atm: { id: "atm", symbol: "atm", name: "atmosphere", dimension: "pressure", toSI: 101325 },
  "kJ/mol": { id: "kJ/mol", symbol: "kJ mol⁻¹", name: "kilojoule per mole", dimension: "molar-energy", toSI: 1000 },
  g: { id: "g", symbol: "g", name: "gram", dimension: "mass", toSI: 0.001 },
  C: { id: "C", symbol: "C", name: "coulomb", dimension: "charge", toSI: 1 },
  "S/cm": { id: "S/cm", symbol: "S cm⁻¹", name: "siemens per centimetre", dimension: "conductivity", toSI: 100 },
  bar: { id: "bar", symbol: "bar", name: "bar", dimension: "pressure", toSI: 1e5 },
  "S cm2/mol": { id: "S cm2/mol", symbol: "S cm² mol⁻¹", name: "siemens square centimetre per mole", dimension: "molar-conductivity", toSI: 1e-4 },
  "g/mol": { id: "g/mol", symbol: "g/mol", name: "gram per mole", dimension: "molar-mass", toSI: 0.001 },
  "g/mL": { id: "g/mL", symbol: "g/mL", name: "gram per millilitre", dimension: "density", toSI: 1000 },
  u: { id: "u", symbol: "u", name: "unified atomic mass unit", dimension: "mass", toSI: 1.66053907e-27 },
  fm: { id: "fm", symbol: "fm", name: "femtometre", dimension: "length", toSI: 1e-15 },
  MeV: { id: "MeV", symbol: "MeV", name: "megaelectronvolt", dimension: "energy", toSI: 1.602176634e-13 },
  "N/C": { id: "N/C", symbol: "N/C", name: "newton per coulomb", dimension: "electric-field", toSI: 1 },
  "V/m": { id: "V/m", symbol: "V/m", name: "volt per metre", dimension: "electric-field", toSI: 1 },
  "kV/m": { id: "kV/m", symbol: "kV/m", name: "kilovolt per metre", dimension: "electric-field", toSI: 1000 },
  kV: { id: "kV", symbol: "kV", name: "kilovolt", dimension: "voltage", toSI: 1000 },
  mV: { id: "mV", symbol: "mV", name: "millivolt", dimension: "voltage", toSI: 0.001 },
  mA: { id: "mA", symbol: "mA", name: "milliampere", dimension: "current", toSI: 0.001 },
  uA: { id: "uA", symbol: "µA", name: "microampere", dimension: "current", toSI: 1e-6 },
  kohm: { id: "kohm", symbol: "kΩ", name: "kilohm", dimension: "resistance", toSI: 1000 },
  uC: { id: "uC", symbol: "µC", name: "microcoulomb", dimension: "charge", toSI: 1e-6 },
  nC: { id: "nC", symbol: "nC", name: "nanocoulomb", dimension: "charge", toSI: 1e-9 },
  F: { id: "F", symbol: "F", name: "farad", dimension: "capacitance", toSI: 1 },
  uF: { id: "uF", symbol: "µF", name: "microfarad", dimension: "capacitance", toSI: 1e-6 },
  pF: { id: "pF", symbol: "pF", name: "picofarad", dimension: "capacitance", toSI: 1e-12 },
  T: { id: "T", symbol: "T", name: "tesla", dimension: "magnetic-field", toSI: 1 },
  mT: { id: "mT", symbol: "mT", name: "millitesla", dimension: "magnetic-field", toSI: 0.001 },
  uT: { id: "uT", symbol: "µT", name: "microtesla", dimension: "magnetic-field", toSI: 1e-6 },
  Wb: { id: "Wb", symbol: "Wb", name: "weber", dimension: "magnetic-flux", toSI: 1 },
  mWb: { id: "mWb", symbol: "mWb", name: "milliweber", dimension: "magnetic-flux", toSI: 0.001 },
  H: { id: "H", symbol: "H", name: "henry", dimension: "inductance", toSI: 1 },
  mH: { id: "mH", symbol: "mH", name: "millihenry", dimension: "inductance", toSI: 0.001 },
  kHz: { id: "kHz", symbol: "kHz", name: "kilohertz", dimension: "frequency", toSI: 1000 },
  MHz: { id: "MHz", symbol: "MHz", name: "megahertz", dimension: "frequency", toSI: 1e6 },
  dB: { id: "dB", symbol: "dB", name: "decibel", dimension: "sound-level", toSI: 1 },
  "W/m2": { id: "W/m2", symbol: "W/m²", name: "watt per square metre", dimension: "intensity", toSI: 1 },
  "Pa s": { id: "Pa s", symbol: "Pa·s", name: "pascal second", dimension: "viscosity", toSI: 1 },
  "mPa s": { id: "mPa s", symbol: "mPa·s", name: "millipascal second", dimension: "viscosity", toSI: 0.001 },
  "N/m": { id: "N/m", symbol: "N/m", name: "newton per metre", dimension: "surface-tension", toSI: 1 },
  "W/mK": { id: "W/mK", symbol: "W/(m·K)", name: "watt per metre kelvin", dimension: "thermal-conductivity", toSI: 1 },
  "C/m2": { id: "C/m2", symbol: "C/m²", name: "coulomb per square metre", dimension: "charge-density", toSI: 1 },
  D: { id: "D", symbol: "D", name: "dioptre", dimension: "power-of-lens", toSI: 1 },
  "J/K": { id: "J/K", symbol: "J/K", name: "joule per kelvin", dimension: "heat-capacity", toSI: 1 },
  "1/s": { id: "1/s", symbol: "s⁻¹", name: "per second", dimension: "decay-constant", toSI: 1 },
  Bq: { id: "Bq", symbol: "Bq", name: "becquerel", dimension: "activity", toSI: 1 },
  ms: { id: "ms", symbol: "ms", name: "millisecond", dimension: "time", toSI: 0.001 },
  us: { id: "us", symbol: "µs", name: "microsecond", dimension: "time", toSI: 1e-6 },
  h: { id: "h", symbol: "h", name: "hour", dimension: "time", toSI: 3600 },
  year: { id: "year", symbol: "y", name: "year", dimension: "time", toSI: 3.15576e7 },
  um: { id: "um", symbol: "µm", name: "micrometre", dimension: "length", toSI: 1e-6 },
  "km/s2": { id: "km/s2", symbol: "km/s²", name: "kilometre per second squared", dimension: "acceleration", toSI: 1000 },
  "J/mol": { id: "J/mol", symbol: "J/mol", name: "joule per mole", dimension: "molar-energy", toSI: 1 },
  "mm/s": { id: "mm/s", symbol: "mm/s", name: "millimetre per second", dimension: "velocity", toSI: 0.001 },
  "cm/s": { id: "cm/s", symbol: "cm/s", name: "centimetre per second", dimension: "velocity", toSI: 0.01 },
  "rev/s": { id: "rev/s", symbol: "rev/s", name: "revolution per second", dimension: "frequency", toSI: 1 },
  "%": { id: "%", symbol: "%", name: "percent", dimension: "dimensionless", toSI: 0.01 },
} as const satisfies Record<string, UnitDefinition>;

export type UnitId = keyof typeof UNITS;

export const UNIT_IDS = Object.keys(UNITS) as [UnitId, ...UnitId[]];

export function isUnitId(id: string): id is UnitId {
  return Object.prototype.hasOwnProperty.call(UNITS, id);
}

export function getUnit(id: UnitId): UnitDefinition {
  return UNITS[id];
}

export class DimensionMismatchError extends Error {
  constructor(from: UnitId, to: UnitId) {
    super(`Cannot convert ${from} (${UNITS[from].dimension}) to ${to} (${UNITS[to].dimension})`);
    this.name = "DimensionMismatchError";
  }
}

export function convert(value: number, from: UnitId, to: UnitId): number {
  const a = UNITS[from];
  const b = UNITS[to];
  if (a.dimension !== b.dimension) throw new DimensionMismatchError(from, to);
  if (from === to) return value;
  return (value * a.toSI) / b.toSI;
}
