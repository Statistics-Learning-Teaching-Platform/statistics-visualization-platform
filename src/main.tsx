import { LanguageProvider } from "@stats-viz/shared/i18n";
import { StrictMode, Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getLegacyTeachingRoute } from "./course/routeHelpers";
import { AppShell } from "./shell/AppShell";
import "./styles.css";

const PortalHome = lazy(() => import("./PortalHome"));
const ProfilePage = lazy(() => import("./profile/ProfilePage"));
const RLearningWorkspace = lazy(
	() => import("./r-learning/RLearningWorkspace"),
);
const PythonLearningWorkspace = lazy(
	() => import("./python-learning/PythonLearningWorkspace"),
);
const TextbookResourceCatalog = lazy(
	() => import("./course/components/TextbookResourceCatalog"),
);
const EditorialDemoRouter = lazy(
	() => import("./visual-demo/editorial/EditorialDemoRouter"),
);
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
	if (
		window.location.pathname === "/visual-demo" ||
		window.location.pathname.startsWith("/visual-demo/")
	) {
		return (
			<Suspense
				fallback={<div className="route-loading">Loading editorial demo…</div>}
			>
				<EditorialDemoRouter />
			</Suspense>
		);
	}
	if (window.location.pathname === "/") {
		return (
			<Suspense
				fallback={<div className="route-loading">Loading StatMind…</div>}
			>
				<PortalHome />
			</Suspense>
		);
	}
	if (
		window.location.pathname === "/profile" ||
		window.location.pathname === "/profile/"
	) {
		return (
			<Suspense
				fallback={<div className="route-loading">Loading profile…</div>}
			>
				<ProfilePage />
			</Suspense>
		);
	}
	if (
		window.location.pathname === "/catalog" ||
		window.location.pathname === "/catalog/"
	) {
		return (
			<Suspense
				fallback={
					<div className="route-loading">Loading resource catalog…</div>
				}
			>
				<TextbookResourceCatalog />
			</Suspense>
		);
	}
	// The former chapter landing page is intentionally removed from the front door.
	// Keep deep /learn/... topic and activity URLs available for cross-links.
	if (
		window.location.pathname === "/learn" ||
		window.location.pathname === "/learn/"
	) {
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
			<Suspense
				fallback={<div className="route-loading">Loading R Coding Studio…</div>}
			>
				<RLearningWorkspace />
			</Suspense>
		);
	}
	if (window.location.pathname.startsWith("/python-learning")) {
		return (
			<Suspense
				fallback={
					<div className="route-loading">Loading Python Coding Studio…</div>
				}
			>
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
