import {
  FALLBACK_USD_EXCHANGE_RATES,
  SupportedCurrencyCode,
  getCurrencyByCode,
} from "@/lib/currency/exchange-rates";

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertUsdToCurrency(amountUsd: number, currencyCode: SupportedCurrencyCode) {
  const rate = FALLBACK_USD_EXCHANGE_RATES[currencyCode] ?? 1;
  return roundToCents(amountUsd * rate);
}

export function convertCurrencyToUsd(amountInCurrency: number, currencyCode: SupportedCurrencyCode) {
  const rate = FALLBACK_USD_EXCHANGE_RATES[currencyCode] ?? 1;

  if (rate <= 0) {
    return amountInCurrency;
  }

  return roundToCents(amountInCurrency / rate);
}

export function formatCurrencyAmount(amountInCurrency: number, currencyCode: SupportedCurrencyCode) {
  const currency = getCurrencyByCode(currencyCode);

  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCurrency);
}

export function formatUsdInCurrency(amountUsd: number, currencyCode: SupportedCurrencyCode) {
  const converted = convertUsdToCurrency(amountUsd, currencyCode);
  return formatCurrencyAmount(converted, currencyCode);
}
