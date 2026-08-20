import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { moduleConfig } from "./module-config";
import "@stats-viz/shared/styles/tokens.css";
import "@stats-viz/shared/styles/wals-custom.css";
import "@stats-viz/shared/styles/workspace.css";

export default function App() {
  return <WalsApp moduleConfig={moduleConfig} />;
}
