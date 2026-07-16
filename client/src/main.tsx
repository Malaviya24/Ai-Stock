import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "@/lib/clerk";
import { API_BASE } from "@/lib/api";
import "./index.css";

// Global fetch interceptor: when a split deployment is configured
// (VITE_API_URL set), automatically prefix any relative "/api/..." request
// with the backend origin. This avoids editing every single page's fetch calls.
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api")) {
      return originalFetch(`${API_BASE}${input}`, init);
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
      <App />
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
