import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "@/lib/clerk";
import { API_BASE, getClerkToken } from "@/lib/api";
import { ClerkTokenProvider } from "@/components/clerk-token-provider";
import "./index.css";

// Global fetch interceptor: when a split deployment is configured
// (VITE_API_URL set), automatically prefix any relative "/api/..." request
// with the backend origin. This avoids editing every single page's fetch calls.
// It also attaches the Clerk Bearer token for cross-origin auth.
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      const url = `${API_BASE}${input}`;
      const headers = new Headers(init?.headers);

      // Attach Clerk session token for cross-origin auth (cookies don't
      // travel between Vercel and Render domains).
      if (CLERK_ENABLED && getClerkToken) {
        try {
          const token = await getClerkToken();
          if (token) headers.set("Authorization", `Bearer ${token}`);
        } catch {
          // Token fetch failed — let the request go without auth
        }
      }

      return originalFetch(url, { ...init, headers });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

// wouter doesn't expose a navigate() outside of components, so Clerk's
// routerPush/routerReplace call straight into the History API. wouter
// monkey-patches history.pushState/replaceState on import (see wouter's
// use-browser-location.js) to dispatch its own re-render event whenever
// they're called — by anyone, not just wouter's own navigate(). Since "wouter"
// is imported by App.tsx before this ever runs, calling the native History
// API here is enough to make redirects (e.g. after sign-up -> /dashboard)
// instant and client-side instead of a full page reload.
function wouterPush(to: string) {
  window.history.pushState(null, "", to);
}
function wouterReplace(to: string) {
  window.history.replaceState(null, "", to);
}

// Only wrap in ClerkProvider when a publishable key is configured, so the
// app keeps working (dashboard open, no login) before Clerk is set up.
createRoot(document.getElementById("root")!).render(
  CLERK_ENABLED ? (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      routerPush={wouterPush}
      routerReplace={wouterReplace}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ClerkTokenProvider>
        <App />
      </ClerkTokenProvider>
    </ClerkProvider>
  ) : (
    <App />
  ),
);

// Fade out and remove the production splash screen once the app has mounted.
function hideSplash() {
  const splash = document.getElementById("app-splash");
  if (!splash) return;
  splash.classList.add("splash-hide");
  // Remove from the DOM after the fade transition completes.
  window.setTimeout(() => splash.remove(), 500);
}

// Wait for the first paint so the UI is ready behind the splash, then hide it.
requestAnimationFrame(() => {
  window.setTimeout(hideSplash, 350);
});
