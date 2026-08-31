import { Maximize2Icon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

type KnowledgeMapControlsProps = {
	onZoomIn: () => void;
	onZoomOut: () => void;
	onFitView: () => void;
	onReset: () => void;
	language: "zh" | "en";
};

export function KnowledgeMapControls({ onZoomIn, onZoomOut, onFitView, onReset, language }: KnowledgeMapControlsProps) {
	const labels = language === "zh"
		? { zoomIn: "放大", zoomOut: "缩小", fit: "适合视图", reset: "重置地图" }
		: { zoomIn: "Zoom in", zoomOut: "Zoom out", fit: "Fit view", reset: "Reset map" };
	return (
		<div className="knowledge-map-controls" aria-label={language === "zh" ? "知识地图控件" : "Knowledge map controls"}>
			<div className="knowledge-map-controls__group">
				<button type="button" onClick={onZoomIn} aria-label={labels.zoomIn} title={labels.zoomIn}><PlusIcon aria-hidden="true" /></button>
				<button type="button" onClick={onZoomOut} aria-label={labels.zoomOut} title={labels.zoomOut}><MinusIcon aria-hidden="true" /></button>
			</div>
			<span className="knowledge-map-controls__divider" aria-hidden="true" />
			<div className="knowledge-map-controls__group">
				<button type="button" onClick={onFitView} aria-label={labels.fit} title={labels.fit}><Maximize2Icon aria-hidden="true" /></button>
				<button type="button" onClick={onReset} aria-label={labels.reset} title={labels.reset}><RotateCcwIcon aria-hidden="true" /></button>
			</div>
		</div>
	);
}
