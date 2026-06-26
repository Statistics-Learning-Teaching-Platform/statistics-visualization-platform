import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { AppShell } from "./shell/AppShell";
import "./styles.css";

const container = document.querySelector<HTMLElement>("#app");
if (!container) {
  throw new Error("Missing #app mount point.");
}

createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  </StrictMode>,
);
