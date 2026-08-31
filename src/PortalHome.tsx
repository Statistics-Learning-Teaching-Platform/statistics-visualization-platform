import "./visual-demo/editorial-tailwind.css";
import "./visual-demo/editorial/editorial-demo.css";
import { EditorialHomePage } from "./visual-demo/editorial/EditorialHomePage";

/**
 * The production entrance intentionally shares the exact editorial structure
 * with the approved visual demo. Product mode only swaps demo URLs for the
 * real workspaces and connects the global language state.
 */
export function PortalHome() {
  return <EditorialHomePage siteMode="product" />;
}

export default PortalHome;
