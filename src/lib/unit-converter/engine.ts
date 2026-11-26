// Unit Converter Engine - Core conversion logic for 12 categories

// Base units for each category (all convert to base unit)
export const UNIT_DEFINITIONS: Record<string, Record<string, number>> = {
  length: {
    meter: 1, kilometer: 1000, centimeter: 0.01, millimeter: 0.001,
    mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254,
    nautical_mile: 1852, light_year: 9.461e15,
    micrometer: 1e-6, nanometer: 1e-9, angstrom: 1e-10
  },
  mass: {
    kilogram: 1, gram: 0.001, milligram: 0.000001,
    pound: 0.453592, ounce: 0.0283495, stone: 6.35029,
    ton: 1000, metric_ton: 1000, microgram: 1e-9,
    carat: 0.0002, grain: 0.0000648
  },
  temperature: {
    // Special handling - not linear
    celsius: 1, fahrenheit: 1, kelvin: 1
  },
  volume: {
    liter: 1, milliliter: 0.001, cubic_meter: 1000,
    gallon_us: 3.78541, gallon_uk: 4.54609,
    quart_us: 0.946353, pint_us: 0.473176,
    cup_us: 0.236588, fluid_ounce_us: 0.0295735,
    tablespoon_us: 0.0147868, teaspoon_us: 0.00492892,
    cubic_centimeter: 0.001, cubic_inch: 0.0163871,
    cubic_foot: 28.3168, barrel_oil: 158.987
  },
  area: {
    square_meter: 1, square_kilometer: 1e6,
    square_centimeter: 0.0001, square_millimeter: 1e-6,
    square_mile: 2.59e6, acre: 4046.86, hectare: 10000,
    square_foot: 0.092903, square_inch: 0.00064516,
    square_yard: 0.836127
  },
  speed: {
    meter_per_second: 1, kilometer_per_hour: 1/3.6,
    mile_per_hour: 0.44704, knot: 0.514444,
    mach: 343, speed_of_light: 299792458,
    foot_per_second: 0.3048
  },
  time: {
    second: 1, minute: 60, hour: 3600,
    day: 86400, week: 604800,
    month: 2629746, year: 31556952,
    millisecond: 0.001, microsecond: 1e-6,
    nanosecond: 1e-9, decade: 315569520,
    century: 3155695200
  },
  pressure: {
    pascal: 1, kilopascal: 1000, bar: 100000,
    psi: 6894.76, atm: 101325, torr: 133.322,
    millibar: 100, millimeter_hg: 133.322,
    inch_hg: 3386.39, inch_h2o: 249.089
  },
  energy: {
    joule: 1, kilojoule: 1000, calorie: 4.184,
    kilocalorie: 4184, watt_hour: 3600,
    kilowatt_hour: 3.6e6, electronvolt: 1.602e-19,
    british_thermal_unit: 1055.06,
    foot_pound: 1.35582, therm: 105506000
  },
  power: {
    watt: 1, kilowatt: 1000, megawatt: 1e6,
    horsepower: 745.7, metric_horsepower: 735.5,
    btu_per_hour: 0.293071, foot_pound_per_minute: 0.022597,
    kilocalorie_per_hour: 1.16222
  },
  data: {
    bit: 1, kilobit: 1000, megabit: 1e6, gigabit: 1e9,
    byte: 8, kilobyte: 8000, megabyte: 8e6,
    gigabyte: 8e9, terabyte: 8e12, petabyte: 8e15,
    kibibit: 1024, mebibit: 1048576,
    kibibyte: 8192, mebibyte: 8388608
  }
}

export const UNIT_CATEGORIES = [
  { id: 'length', name: 'Length', icon: 'ruler' },
  { id: 'mass', name: 'Mass / Weight', icon: 'scale' },
  { id: 'temperature', name: 'Temperature', icon: 'thermometer' },
  { id: 'volume', name: 'Volume', icon: 'beaker' },
  { id: 'area', name: 'Area', icon: 'square' },
  { id: 'speed', name: 'Speed', icon: 'gauge' },
  { id: 'time', name: 'Time', icon: 'clock' },
  { id: 'pressure', name: 'Pressure', icon: 'gauge' },
  { id: 'energy', name: 'Energy', icon: 'zap' },
  { id: 'power', name: 'Power', icon: 'bolt' },
  { id: 'data', name: 'Data Storage', icon: 'database' },
  { id: 'currency', name: 'Currency', icon: 'dollar-sign' }
] as { id: string; name: string; icon: string }[]

export type UnitCategory = typeof UNIT_CATEGORIES[number]['id']

export const UNIT_LABELS: Record<string, string> = {
  // Length
  meter: 'Meter (m)', kilometer: 'Kilometer (km)', centimeter: 'Centimeter (cm)',
  millimeter: 'Millimeter (mm)', mile: 'Mile (mi)', yard: 'Yard (yd)',
  foot: 'Foot (ft)', inch: 'Inch (in)', nautical_mile: 'Nautical Mile (nmi)',
  light_year: 'Light Year (ly)', micrometer: 'Micrometer (µm)',
  nanometer: 'Nanometer (nm)', angstrom: 'Ångström (Å)',
  
  // Mass
  kilogram: 'Kilogram (kg)', gram: 'Gram (g)', milligram: 'Milligram (mg)',
  pound: 'Pound (lb)', ounce: 'Ounce (oz)', stone: 'Stone (st)',
  ton: 'Ton (t)', metric_ton: 'Metric Ton (t)', microgram: 'Microgram (µg)',
  carat: 'Carat (ct)', grain: 'Grain (gr)',
  
  // Temperature
  celsius: 'Celsius (°C)', fahrenheit: 'Fahrenheit (°F)', kelvin: 'Kelvin (K)',
  
  // Volume
  liter: 'Liter (L)', milliliter: 'Milliliter (mL)', cubic_meter: 'Cubic Meter (m³)',
  gallon_us: 'US Gallon (gal)', gallon_uk: 'UK Gallon (gal)',
  quart_us: 'US Quart (qt)', pint_us: 'US Pint (pt)',
  cup_us: 'US Cup (cup)', fluid_ounce_us: 'US Fl Oz (fl oz)',
  tablespoon_us: 'US Tbsp (tbsp)', teaspoon_us: 'US Tsp (tsp)',
  cubic_centimeter: 'cm³', cubic_inch: 'in³', cubic_foot: 'ft³', barrel_oil: 'Oil Barrel (bbl)',
  
  // Area
  square_meter: 'm²', square_kilometer: 'km²', square_centimeter: 'cm²',
  square_millimeter: 'mm²', square_mile: 'mi²', acre: 'Acre (ac)',
  hectare: 'Hectare (ha)', square_foot: 'ft²', square_inch: 'in²',
  square_yard: 'yd²',
  
  // Speed
  meter_per_second: 'm/s', kilometer_per_hour: 'km/h',
  mile_per_hour: 'mph', knot: 'Knot (kn)', mach: 'Mach',
  speed_of_light: 'c', foot_per_second: 'ft/s',
  
  // Time
  second: 'Second (s)', minute: 'Minute (min)', hour: 'Hour (h)',
  day: 'Day (d)', week: 'Week (wk)', month: 'Month (mo)',
  year: 'Year (yr)', millisecond: 'Millisecond (ms)',
  microsecond: 'Microsecond (µs)', nanosecond: 'Nanosecond (ns)',
  decade: 'Decade', century: 'Century',
  
  // Pressure
  pascal: 'Pascal (Pa)', kilopascal: 'Kilopascal (kPa)', bar: 'Bar',
  psi: 'PSI', atm: 'Atmosphere (atm)', torr: 'Torr',
  millibar: 'Millibar (mbar)', millimeter_hg: 'mmHg',
  inch_hg: 'inHg', inch_h2o: 'inH₂O',
  
  // Energy
  joule: 'Joule (J)', kilojoule: 'Kilojoule (kJ)', calorie: 'Calorie (cal)',
  kilocalorie: 'Kilocalorie (kcal)', watt_hour: 'Wh',
  kilowatt_hour: 'kWh', electronvolt: 'eV',
  british_thermal_unit: 'BTU', foot_pound: 'ft·lb', therm: 'Therm',
  
  // Power
  watt: 'Watt (W)', kilowatt: 'Kilowatt (kW)', megawatt: 'Megawatt (MW)',
  horsepower: 'HP', metric_horsepower: 'PS (Metric HP)',
  btu_per_hour: 'BTU/h', foot_pound_per_minute: 'ft·lb/min',
  kilocalorie_per_hour: 'kcal/h',
  
  // Data
  bit: 'Bit (b)', kilobit: 'Kilobit (kb)', megabit: 'Megabit (Mb)',
  gigabit: 'Gigabit (Gb)', byte: 'Byte (B)', kilobyte: 'KB',
  megabyte: 'MB', gigabyte: 'GB', terabyte: 'TB', petabyte: 'PB',
  kibibit: 'Kibit', mebibit: 'Mibit', kibibyte: 'KiB', mebibyte: 'MiB'
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: string
): number {
  const units = UNIT_DEFINITIONS[category]
  if (!units) throw new Error(`Unknown category: ${category}`)
  
  const fromFactor = units[fromUnit]
  const toFactor = units[toUnit]
  
  if (!fromFactor || !toFactor) {
    throw new Error(`Unknown unit: ${fromUnit} or ${toUnit} in ${category}`)
  }

  // Special handling for temperature
  if (category === 'temperature') {
    return convertTemperature(value, fromUnit, toUnit)
  }

  // Convert to base unit, then to target unit
  const baseValue = value * fromFactor
  return baseValue / toFactor
}

function convertTemperature(value: number, from: string, to: string): number {
  // Convert to Celsius first
  let celsius: number
  switch (from) {
    case 'celsius': celsius = value; break
    case 'fahrenheit': celsius = (value - 32) * 5/9; break
    case 'kelvin': celsius = value - 273.15; break
    default: throw new Error(`Unknown temperature unit: ${from}`)
  }
  
  // Convert from Celsius to target
  switch (to) {
    case 'celsius': return celsius
    case 'fahrenheit': return celsius * 9/5 + 32
    case 'kelvin': return celsius + 273.15
    default: throw new Error(`Unknown temperature unit: ${to}`)
  }
}

export function getUnitsForCategory(category: string): { value: string; label: string }[] {
  const units = UNIT_DEFINITIONS[category]
  if (!units) return []
  // Cache the mapped array so repeated calls for the same category avoid
  // rebuilding Object.entries + map on every invocation.
  const cached = (getUnitsForCategory as any)._cache ??= new Map<string, { value: string; label: string }[]>()
  const existing = cached.get(category)
  if (existing) return existing
  const result = Object.entries(units).map(([value]) => ({
    value,
    label: UNIT_LABELS[value] || value
  }))
  cached.set(category, result)
  return result
}

export function getCategories(): { id: string; name: string; icon: string }[] {
  return UNIT_CATEGORIES
}

export function getUnitLabel(unit: string): string {
  return UNIT_LABELS[unit] || unit
}

export function isValidUnit(unit: string, category: string): boolean {
  return !!UNIT_DEFINITIONS[category]?.[unit]
}