import {
	CatalogVisualDemo,
	ExperimentVisualDemo,
	PaperVisualDemo,
	PythonVisualDemo,
	RVisualDemo,
} from "./WorkspaceDemos";

export function WorkspaceDemoRouter() {
	const path = window.location.pathname.replace(/\/$/, "");

	if (path === "/visual-demo/catalog") return <CatalogVisualDemo />;
	if (path === "/visual-demo/experiment") return <ExperimentVisualDemo />;
	if (path === "/visual-demo/paper") return <PaperVisualDemo />;
	if (path === "/visual-demo/r") return <RVisualDemo />;
	if (path === "/visual-demo/python") return <PythonVisualDemo />;

	return <CatalogVisualDemo />;
}

export default WorkspaceDemoRouter;
