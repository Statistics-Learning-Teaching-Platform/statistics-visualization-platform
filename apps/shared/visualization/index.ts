export * from "./VisualizationFrame";
export * from "./VisualizationHeader";
export * from "./ReadingGuide";
export * from "./ParameterPanel";
export * from "./MetricGrid";
export * from "./ChartFrame";
export * from "./FormulaCard";
export * from "./ObservationCard";
export * from "./WorkspaceLayout";
export * from "./ExperimentMetricStrip";
export * from "./ExperimentMetric";
export * from "./ExperimentExplanationDrawer";
export * from "./ExperimentChangeSummary";
export * from "./ControlGroup";
export * from "./RunControls";
export * from "./StatisticsTable";
export * from "./VisualizationTabs";
export * from "./experimentMetadata";

// Semantic names used by the laboratory specification. The implementation
// stays consolidated in the existing primitives so modules do not fork shell,
// rail, chart, formula, or observation markup.
export { ExperimentShell } from "./ExperimentShell";
export { ExperimentHeader } from "./ExperimentHeader";
export { ExperimentParameterRail } from "./ExperimentParameterRail";
export { VisualizationPanel } from "./VisualizationPanel";
export { FormulaSection } from "./FormulaSection";
export { ObservationSection } from "./ObservationSection";
