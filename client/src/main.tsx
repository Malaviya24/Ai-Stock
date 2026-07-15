import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

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
