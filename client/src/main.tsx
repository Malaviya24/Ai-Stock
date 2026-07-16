import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "@/lib/clerk";
import "./index.css";

// Only wrap in ClerkProvider when a publishable key is configured, so the
// app keeps working (dashboard open, no login) before Clerk is set up.
createRoot(document.getElementById("root")!).render(
  CLERK_ENABLED ? (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!}>
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
