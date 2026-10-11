import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { init } from "./core/store";
import { App } from "./app/App";
import "../styles/tokens.css";
import "../styles/layout.css";
import "../styles/components.css";

// Load persisted state (or a populated demo for first-time visitors).
init();

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );
}
