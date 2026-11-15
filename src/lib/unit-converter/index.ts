export { 
  convertUnit, 
  getUnitsForCategory, 
  getCategories, 
  getUnitLabel,
  isValidUnit,
  UNIT_DEFINITIONS,
  UNIT_CATEGORIES,
  UNIT_LABELS
} from './engine'

export type { UnitCategory } from './engine'

export {
  convertCurrency,
  convertCurrencyWithDetails,
  getSupportedCurrencies,
  getCurrencyLabel,
  isValidCurrency,
  formatCurrency
} from './currency'