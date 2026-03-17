import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

// Default to dark mode (music studio feel)
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
} else {
  // Still default to dark for this app
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
