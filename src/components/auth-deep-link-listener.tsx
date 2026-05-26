"use client";

import { App } from "@capacitor/app";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthDeepLinkListener() {
  const router = useRouter();

  useEffect(() => {
    const capacitor = (window as { Capacitor?: any }).Capacitor;

    if (!capacitor?.isNativePlatform?.()) {
      return;
    }

    const routeAuthCallbackUrl = (rawUrl?: string) => {
      if (!rawUrl) {
        return false;
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        return false;
      }

      if (parsedUrl.protocol !== "com.smartcollector.app:") {
        return false;
      }

      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
      const hasAuthPayload = Boolean(
        parsedUrl.searchParams.get("code") ||
        parsedUrl.searchParams.get("token_hash") ||
        parsedUrl.searchParams.get("access_token") ||
        parsedUrl.searchParams.get("refresh_token") ||
        hashParams.get("access_token") ||
        hashParams.get("refresh_token")
      );

      const isAuthCallbackPath = parsedUrl.hostname === "auth" && parsedUrl.pathname.startsWith("/callback");
      const isAuthCallbackHost = parsedUrl.hostname === "callback";

      if (!isAuthCallbackPath && !isAuthCallbackHost && !hasAuthPayload) {
        return false;
      }

      const nextRoute = `/auth/callback${parsedUrl.search}${parsedUrl.hash}`;
      router.replace(nextRoute);
      return true;
    };

    let removeListener: (() => Promise<void>) | null = null;
    let removeWindowListener: (() => void) | null = null;
    let removeDocumentListener: (() => void) | null = null;

    void App.addListener("appUrlOpen", (event: { url?: string }) => {
      void routeAuthCallbackUrl(event?.url);
    }).then((listenerHandle: { remove: () => Promise<void> }) => {
      removeListener = () => listenerHandle.remove();
    });

    const browserEventHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: string }>;
      void routeAuthCallbackUrl(customEvent.detail?.url);
    };

    window.addEventListener("appUrlOpen", browserEventHandler as EventListener);
    document.addEventListener("appUrlOpen", browserEventHandler as EventListener);
    removeWindowListener = () => window.removeEventListener("appUrlOpen", browserEventHandler as EventListener);
    removeDocumentListener = () => document.removeEventListener("appUrlOpen", browserEventHandler as EventListener);

    void App.getLaunchUrl().then((result?: { url?: string }) => {
      void routeAuthCallbackUrl(result?.url);
    });

    return () => {
      if (removeListener) {
        void removeListener();
      }

      if (removeWindowListener) {
        removeWindowListener();
      }

      if (removeDocumentListener) {
        removeDocumentListener();
      }
    };
  }, [router]);

  return null;
}
