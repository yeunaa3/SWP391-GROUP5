import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./assets/styles.css";
import "./assets/motion.css";
import "./assets/experience.css";
import "./assets/reading-experience.css";
import "./assets/ad-preview.css";
import "./assets/navigation-fixes.css";
import "./assets/analytics.css";
import "./assets/preferences.css";
import "./assets/toolbars.css";
import "./assets/business-live.css";
import "./assets/visual-refresh.css";
import "./assets/auth-editorial.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
