import "../editorial-tailwind.css";
import "./editorial-demo.css";
import { EditorialExperimentPage } from "./EditorialExperimentPage";
import { EditorialHomePage } from "./EditorialHomePage";
import {
	EditorialPythonPage,
	EditorialRPage,
} from "./EditorialLearningIdePage";
import { EditorialPaperPage } from "./EditorialPaperPage";
import { EditorialTextbookPage } from "./EditorialTextbookPage";

export function EditorialDemoRouter() {
	const path = window.location.pathname.replace(/\/$/, "");

	if (path === "/visual-demo" || path === "") return <EditorialHomePage />;
	if (path === "/visual-demo/catalog") return <EditorialTextbookPage />;
	if (path === "/visual-demo/experiment") return <EditorialExperimentPage />;
	if (path === "/visual-demo/paper") return <EditorialPaperPage />;
	if (path === "/visual-demo/r") return <EditorialRPage />;
	if (path === "/visual-demo/python") return <EditorialPythonPage />;

	return <EditorialHomePage />;
}

export default EditorialDemoRouter;
