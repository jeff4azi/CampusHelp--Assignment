import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initAnalytics } from "./utils/analytics.js";

// Apply saved theme before first render to avoid flash
const saved = localStorage.getItem("theme") || "dark";
document.documentElement.classList.add(saved);

// Init PostHog analytics
initAnalytics();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
