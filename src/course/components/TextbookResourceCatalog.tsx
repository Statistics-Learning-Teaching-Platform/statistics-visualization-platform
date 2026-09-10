import "../../visual-demo/editorial-tailwind.css";
import "../../visual-demo/editorial/editorial-demo.css";
import { EditorialTextbookPage } from "../../visual-demo/editorial/EditorialTextbookPage";

/**
 * Production textbook route. It uses the approved three-column editorial
 * reader while EditorialTextbookPage adapts the canonical 12-chapter catalog
 * to real visualization, R, Python, and question-bank destinations.
 */
export function TextbookResourceCatalog() {
  return <EditorialTextbookPage siteMode="product" />;
}

export default TextbookResourceCatalog;
