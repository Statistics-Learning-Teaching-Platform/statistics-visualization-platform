import { WalsApp } from "@stats-viz/shared/wals/WalsApp";
import { moduleConfig } from "./module-config";
import "./styles/custom.css";
import "@stats-viz/shared/styles/tokens.css";

export default function App() {
  return <WalsApp moduleConfig={moduleConfig} />;
}