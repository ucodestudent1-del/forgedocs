// Currency Conversion Module - Uses free exchange rate APIs

const CURRENCY_CACHE = new Map<string, { rates: Record<string, number>; timestamp: number }>()

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY',
  'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK',
  'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB',
  'TRY', 'ZAR', 'ILS', 'THB', 'MYR', 'PHP', 'IDR', 'VND',
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP'
]

const CURRENCY_LABELS: Record<string, string> = {
  USD: 'US Dollar ($)', EUR: 'Euro (€)', GBP: 'British Pound (£)',
  JPY: 'Japanese Yen (¥)', CHF: 'Swiss Franc (CHF)', CAD: 'Canadian Dollar (C$)',
  AUD: 'Australian Dollar (A$)', CNY: 'Chinese Yuan (¥)', INR: 'Indian Rupee (₹)',
  BRL: 'Brazilian Real (R$)', MXN: 'Mexican Peso ($)', KRW: 'South Korean Won (₩)',
  SGD: 'Singapore Dollar (S$)', HKD: 'Hong Kong Dollar (HK$)', NOK: 'Norwegian Krone (kr)',
  SEK: 'Swedish Krona (kr)', DKK: 'Danish Krone (kr)', PLN: 'Polish Złoty (zł)',
  CZK: 'Czech Koruna (Kč)', HUF: 'Hungarian Forint (Ft)', RON: 'Romanian Leu (lei)',
  BGN: 'Bulgarian Lev (лв)', HRK: 'Croatian Kuna (kn)', RUB: 'Russian Ruble (₽)',
  TRY: 'Turkish Lira (₺)', ZAR: 'South African Rand (R)', ILS: 'Israeli Shekel (₪)',
  THB: 'Thai Baht (฿)', MYR: 'Malaysian Ringgit (RM)', PHP: 'Philippine Peso (₱)',
  IDR: 'Indonesian Rupiah (Rp)', VND: 'Vietnamese Dong (₫)', AED: 'UAE Dirham (د.إ)',
  SAR: 'Saudi Riyal (﷼)', QAR: 'Qatari Riyal (﷼)', KWD: 'Kuwaiti Dinar (د.ك)',
  BHD: 'Bahraini Dinar (ب.د)', OMR: 'Omani Rial (﷼)', JOD: 'Jordanian Dinar (د.ا)',
  LBP: 'Lebanese Pound (ل.ل)'
}

const CURRENCY_APIS = [
  'https://api.frankfurter.dev/v1/latest',
  'https://api.exchangerate.host/latest',
  'https://open.er-api.com/v6/latest'
]

async function fetchRatesFromAPI(base: string): Promise<Record<string, number> | null> {
  for (const api of CURRENCY_APIS) {
    try {
      const url = `${api}?base=${base}`
      const response = await fetch(url, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      // Handle different API response formats
      let rates: Record<string, number> | null = null
      if (data.rates) rates = data.rates
      else if (data.data?.rates) rates = data.data.rates
      
      if (rates) {
        return { [base]: 1, ...rates }
      }
    } catch (error) {
      console.warn(`Currency API failed: ${api}`, error)
      continue
    }
  }
  return null
}

async function getExchangeRates(base: string): Promise<Record<string, number>> {
  const cached = CURRENCY_CACHE.get(base)
  if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
    return cached.rates
  }
  
  const rates = await fetchRatesFromAPI(base)
  if (!rates) {
    // Fallback to static rates (approximate, for offline use)
    return getFallbackRates(base)
  }
  
  CURRENCY_CACHE.set(base, { rates, timestamp: Date.now() })
  return rates
}

function getFallbackRates(base: string): Record<string, number> {
  // Approximate rates relative to USD (update periodically)
  const usdRates: Record<string, number> = {
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CHF: 0.88,
    CAD: 1.35, AUD: 1.52, CNY: 7.24, INR: 83, BRL: 4.95,
    MXN: 17.0, KRW: 1320, SGD: 1.34, HKD: 7.81, NOK: 10.7,
    SEK: 10.6, DKK: 6.9, PLN: 4.0, CZK: 22.5, HUF: 360,
    RON: 4.6, BGN: 1.8, HRK: 6.8, RUB: 92, TRY: 32,
    ZAR: 18.8, ILS: 3.7, THB: 35.5, MYR: 4.7, PHP: 56,
    IDR: 15500, VND: 24500, AED: 3.67, SAR: 3.75, QAR: 3.64,
    KWD: 0.31, BHD: 0.38, OMR: 0.38, JOD: 0.71, LBP: 89500
  }
  
  if (base === 'USD') return usdRates
  
  const baseRate = usdRates[base] || 1
  const rates: Record<string, number> = { [base]: 1 }
  for (const [currency, rate] of Object.entries(usdRates)) {
    if (currency !== base) {
      rates[currency] = rate / baseRate
    }
  }
  return rates
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ result: number; rate: number; from: string; to: string }> {
  if (from === to) return { result: amount, rate: 1, from, to }
  
  const rates = await getExchangeRates(from.toUpperCase())
  const rate = rates[to.toUpperCase()]
  
  if (!rate) {
    throw new Error(`No exchange rate available for ${from} -> ${to}`)
  }
  
  return {
    result: amount * rate,
    rate,
    from: from.toUpperCase(),
    to: to.toUpperCase()
  }
}

export function getSupportedCurrencies(): { value: string; label: string }[] {
  return SUPPORTED_CURRENCIES.map(code => ({
    value: code,
    label: `${code} - ${CURRENCY_LABELS[code] || code}`
  }))
}

export function getCurrencyLabel(currency: string): string {
  return CURRENCY_LABELS[currency.toUpperCase()] || currency
}

export function isValidCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase())
}

export async function convertCurrencyWithDetails(
  amount: number,
  from: string,
  to: string
): Promise<{
  result: number
  rate: number
  from: string
  to: string
  timestamp: number
  source: string
}> {
  const { result, rate, from: f, to: t } = await convertCurrency(amount, from, to)
  return {
    result,
    rate,
    from: f,
    to: t,
    timestamp: Date.now(),
    source: 'frankfurter.dev / exchangerate.host'
  }
}

export function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase()
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
    INR: '₹', KRW: '₩', BRL: 'R$', MXN: '$', TRY: '₺'
  }
  const symbol = symbols[code] || code
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}