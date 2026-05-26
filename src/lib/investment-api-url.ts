const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

function isNativeCapacitorRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as CapacitorWindow).Capacitor;

  return Boolean(capacitor?.isNativePlatform?.());
}

export function getInvestmentCheckApiUrl() {
  if (API_BASE_URL) {
    return `${API_BASE_URL}/api/investment-check`;
  }

  if (isNativeCapacitorRuntime()) {
    return null;
  }

  return "/api/investment-check";
}

export function getInvestmentCheckApiRuntimeInfo() {
  return {
    hasApiBaseUrl: Boolean(API_BASE_URL),
    isNativeCapacitor: isNativeCapacitorRuntime(),
  };
}
