"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  DEFAULT_CURRENCY_CODE,
  SupportedCurrency,
  SupportedCurrencyCode,
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  isSupportedCurrencyCode,
} from "@/lib/currency/exchange-rates";
import {
  convertCurrencyToUsd,
  convertUsdToCurrency,
  formatUsdInCurrency,
} from "@/lib/currency/format";

type CurrencyContextValue = {
  selectedCurrencyCode: SupportedCurrencyCode;
  selectedCurrency: SupportedCurrency;
  supportedCurrencies: SupportedCurrency[];
  setCurrency: (currencyCode: SupportedCurrencyCode) => void;
  formatUsd: (amountUsd: number) => string;
  convertUsd: (amountUsd: number) => number;
  convertToUsd: (amountInSelectedCurrency: number) => number;
  isHydrated: boolean;
};

const STORAGE_KEY = "smart-collector.currency.v1";

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<SupportedCurrencyCode>(DEFAULT_CURRENCY_CODE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored && isSupportedCurrencyCode(stored)) {
        setSelectedCurrencyCode(stored);
      }
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, selectedCurrencyCode);
  }, [isHydrated, selectedCurrencyCode]);

  const value = useMemo<CurrencyContextValue>(() => {
    const selectedCurrency = getCurrencyByCode(selectedCurrencyCode);

    return {
      selectedCurrencyCode,
      selectedCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      setCurrency: setSelectedCurrencyCode,
      formatUsd: (amountUsd: number) => formatUsdInCurrency(amountUsd, selectedCurrencyCode),
      convertUsd: (amountUsd: number) => convertUsdToCurrency(amountUsd, selectedCurrencyCode),
      convertToUsd: (amountInSelectedCurrency: number) =>
        convertCurrencyToUsd(amountInSelectedCurrency, selectedCurrencyCode),
      isHydrated,
    };
  }, [isHydrated, selectedCurrencyCode]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }

  return context;
}
