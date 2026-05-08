export type SupportedCurrencyCode = "USD" | "ZAR" | "GBP" | "EUR";

export type SupportedCurrency = {
  code: SupportedCurrencyCode;
  country: string;
  flag: string;
  locale: string;
};

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "USD", country: "United States", flag: "🇺🇸", locale: "en-US" },
  { code: "ZAR", country: "South Africa", flag: "🇿🇦", locale: "en-ZA" },
  { code: "GBP", country: "United Kingdom", flag: "🇬🇧", locale: "en-GB" },
  { code: "EUR", country: "Eurozone", flag: "🇪🇺", locale: "en-IE" },
];

export const DEFAULT_CURRENCY_CODE: SupportedCurrencyCode = "USD";

export const FALLBACK_USD_EXCHANGE_RATES: Record<SupportedCurrencyCode, number> = {
  USD: 1,
  ZAR: 18.4,
  GBP: 0.79,
  EUR: 0.92,
};

// TODO: Replace these fallback rates with live exchange rates from a trusted provider.
// Keep USD as the base currency and update conversion timestamps from API responses.
export const FALLBACK_RATE_SOURCE = "static-fallback";
export const FALLBACK_RATE_TIMESTAMP = "2026-05-01";

export function getCurrencyByCode(code: SupportedCurrencyCode) {
  return SUPPORTED_CURRENCIES.find((currency) => currency.code === code) ?? SUPPORTED_CURRENCIES[0];
}

export function isSupportedCurrencyCode(value: string): value is SupportedCurrencyCode {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === value);
}
