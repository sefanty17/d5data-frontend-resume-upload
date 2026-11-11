import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted Inter (SIL OFL). The woff2 files are bundled by Vite - no CDN,
// no runtime request to a third party.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
// Design tokens and base styles first, component styles afterwards so the
// cascade order stays predictable in dev and in the production bundle.
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root was not found.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
