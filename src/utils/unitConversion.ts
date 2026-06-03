export type Dimension = 'WEIGHT' | 'VOLUME' | 'COUNT';

export const UNITS = {
  WEIGHT: ['g', 'kg'] as const,
  VOLUME: ['mL', 'L'] as const,
  COUNT: ['item'] as const,
};

export type WeightUnit = (typeof UNITS.WEIGHT)[number];
export type VolumeUnit = (typeof UNITS.VOLUME)[number];
export type CountUnit = (typeof UNITS.COUNT)[number];
export type Unit = WeightUnit | VolumeUnit | CountUnit;

/**
 * Validates whether the given units belong to the correct dimension.
 */
export function validateUnits(dimension: Dimension, baseUnit: string, orderUnit: string): boolean {
  const allowed = UNITS[dimension] as readonly string[];
  return allowed.includes(baseUnit) && allowed.includes(orderUnit);
}

/**
 * Gets the multiplier factor to convert from `fromUnit` to `toUnit`.
 * Formula: valueInToUnit = valueInFromUnit * factor
 */
export function getConversionFactor(fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return 1;

  // Weight dimension conversions
  if (fromUnit === 'g' && toUnit === 'kg') return 0.001;
  if (fromUnit === 'kg' && toUnit === 'g') return 1000;

  // Volume dimension conversions
  if (fromUnit === 'mL' && toUnit === 'L') return 0.001;
  if (fromUnit === 'L' && toUnit === 'mL') return 1000;

  throw new Error(`Incompatible units: cannot convert from "${fromUnit}" to "${toUnit}"`);
}

/**
 * Formats a description explaining the conversion math.
 * Example: "500 g -> 0.5 kg @ ₹100.00/kg = ₹50.00"
 */
export function formatConversionDetails(
  orderedQty: number,
  orderedUnit: string,
  baseQty: number,
  baseUnit: string,
  basePrice: number,
  totalPrice: number
): string {
  const priceFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(basePrice);

  const totalFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  if (orderedUnit === baseUnit) {
    return `${orderedQty} ${orderedUnit} @ ${priceFormatted}/${baseUnit} = ${totalFormatted}`;
  }

  return `${orderedQty} ${orderedUnit} (${baseQty.toFixed(4)} ${baseUnit}) @ ${priceFormatted}/${baseUnit} = ${totalFormatted}`;
}

/**
 * Converts a quantity from one unit to another
 */
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const factor = getConversionFactor(fromUnit, toUnit);
  return quantity * factor;
}
