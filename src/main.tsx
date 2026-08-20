import { lazy, StrictMode, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { AppShell } from "./shell/AppShell";
import { AppErrorBoundary } from "./shell/AppErrorBoundary";
import { PortalHome } from "./PortalHome";
import { getLegacyTeachingRoute } from "./course/routeHelpers";
import "./styles.css";

const RLearningWorkspace = lazy(() => import("./r-learning/RLearningWorkspace"));
const PythonLearningWorkspace = lazy(() => import("./python-learning/PythonLearningWorkspace"));
const LearnRouter = lazy(async () => ({
  default: (await import("./course/components/LearnRouter")).LearnRouter,
}));

function LegacyTeachingRoute() {
  const target = getLegacyTeachingRoute(window.location.hash);
  useEffect(() => {
    window.history.replaceState(null, "", target);
  }, [target]);
  return <LearnRouter pathname={target} />;
}

export function CurrentPage() {
  if (window.location.pathname === "/") return <PortalHome />;
  // The former chapter landing page is intentionally removed from the front door.
  // Keep deep /learn/... topic and activity URLs available for cross-links.
  if (window.location.pathname === "/learn" || window.location.pathname === "/learn/") {
    window.history.replaceState(null, "", "/teaching-platform");
    return <AppShell />;
  }
  if (window.location.pathname.startsWith("/learn")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading course…</div>}>
        <LearnRouter />
      </Suspense>
    );
  }
  if (window.location.pathname.startsWith("/teaching-platform")) {
    return <AppShell />;
  }
  if (window.location.pathname.startsWith("/teaching")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading course…</div>}>
        <LegacyTeachingRoute />
      </Suspense>
    );
  }
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
      <AppErrorBoundary>
        <CurrentPage />
      </AppErrorBoundary>
    </LanguageProvider>
  </StrictMode>,
);
