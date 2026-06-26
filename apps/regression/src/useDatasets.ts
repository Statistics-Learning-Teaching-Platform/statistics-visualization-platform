import { annotateOutliers } from "@stats-viz/shared/regression";
import { DATASET_PATHS, type Dataset } from "./constants";

interface DatasetJson {
  name?: string;
  source?: string;
  xLabel?: string;
  yLabel?: string;
  data: Dataset["data"];
}

// Bundle the dataset JSON at build time via Vite's glob import. Previously the
// app fetched these files at runtime against a base URL derived from
// `window.location.pathname`; in the platform shell that base resolves to the
// shell root, where the nested app's `public/data` folder is never served, so
// every dataset silently 404'd. Glob-importing bundles the JSON into the
// module graph so it is available synchronously in both dev and production.
const modules = import.meta.glob("../public/data/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, DatasetJson>;

function annotateDatasetOutliers(dataset: Dataset): Dataset {
  if (dataset.data.some((p) => p.outlier)) return dataset;
  return { ...dataset, data: annotateOutliers(dataset.data) };
}

const LOADED_DATASETS: Dataset[] = DATASET_PATHS.map((relPath) => {
  const key = `../public/${relPath}`;
  const json = modules[key];
  if (!json) {
    console.warn(`[regression] dataset not bundled: ${relPath}`);
    return null;
  }
  const id = relPath.split("/").pop()!.replace(".json", "");
  return {
    id,
    name: json.name ?? id,
    source: json.source,
    xLabel: json.xLabel,
    yLabel: json.yLabel,
    data: json.data as Dataset["data"],
  } as Dataset;
})
  .filter((d): d is Dataset => d !== null)
  .map(annotateDatasetOutliers);

/**
 * Returns all regression datasets (outlier-annotated) and the id of the first
 * dataset for initial selection. Data is bundled at build time, so this is
 * synchronous and never produces an empty list.
 */
export function useDatasets(): {
  datasets: Dataset[];
  initialId: string;
} {
  return {
    datasets: LOADED_DATASETS,
    initialId: LOADED_DATASETS[0]?.id ?? "",
  };
}
