import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { AppShell } from "./shell/AppShell";
import { PortalHome } from "./PortalHome";
import "./styles.css";

const RLearningWorkspace = lazy(() => import("./r-learning/RLearningWorkspace"));
const PythonLearningWorkspace = lazy(() => import("./python-learning/PythonLearningWorkspace"));

function CurrentPage() {
  if (window.location.pathname === "/") return <PortalHome />;
  if (window.location.pathname.startsWith("/r-learning")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading R Coding Studio…</div>}>
        <RLearningWorkspace />
      </Suspense>
    );
  }
  if (window.location.pathname.startsWith("/python-learning")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading Python Coding Studio…</div>}>
        <PythonLearningWorkspace />
      </Suspense>
    );
  }
  return <AppShell />;
}

const container = document.querySelector<HTMLElement>("#app");
if (!container) {
  throw new Error("Missing #app mount point.");
}

createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      <CurrentPage />
    </LanguageProvider>
  </StrictMode>,
);
