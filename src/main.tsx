import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { AppShell } from "./shell/AppShell";
import { PortalHome } from "./PortalHome";
import "./styles.css";

const container = document.querySelector<HTMLElement>("#app");
if (!container) {
  throw new Error("Missing #app mount point.");
}

createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      {window.location.pathname === "/" ? <PortalHome /> : <AppShell />}
    </LanguageProvider>
  </StrictMode>,
);
