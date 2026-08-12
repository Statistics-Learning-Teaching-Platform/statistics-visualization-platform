import { apps, getDefaultVisualizer } from "../../scripts/apps";
import { chapterManifests } from "./courseManifest";
import { activityManifests, topicManifests } from "./topicRegistry";

export const chapterRouteSegments: Readonly<Record<string, string>> = {
  "statistics-introduction": "introduction",
  "data-and-sampling": "data-and-sampling",
  "data-visualization": "visualization",
  "descriptive-statistics": "descriptive-statistics",
  "probability-and-random-variables": "probability",
  "probability-distributions": "distributions",
  "central-limit-theorem": "sampling",
  "parameter-estimation": "inference",
  "hypothesis-testing": "inference",
  "regression-analysis": "regression",
  "categorical-data": "categorical-data",
  "nonparametric-tests": "nonparametric-tests",
  "time-series": "time-series",
  "simulation-laboratory": "simulation",
};

export const activityRouteSegments: Readonly<Record<string, string>> = {
  "compare-probability-distributions": "comparison",
  "normal-distribution-comparison": "comparison",
  "visualize-random-variables": "generator",
  "explore-central-limit-theorem": "sampling-distribution",
  "confidence-interval-coverage": "coverage",
  "confidence-interval-case-study": "case-study",
  "explore-testing-errors": "errors-and-power",
  "explore-anova": "group-comparison",
  "draw-regression-line": "draw-a-line",
  "linear-regression-city-case": "city-case",
  "introduce-statistical-simulation": "foundations",
  "explore-resampling": "resampling",
  "explore-mcmc": "chain-explorer",
  "explore-variance-reduction": "efficiency",
};

export type ParsedLearnRoute =
  | { kind: "home" }
  | { kind: "chapter"; chapterIds: string[]; section: string }
  | { kind: "topic"; chapterIds: string[]; section: string; topicId: string }
  | {
      kind: "activity";
      activityId: string;
      chapterIds: string[];
      section: string;
      topicId: string;
    }
  | { kind: "not-found" };

export function getChapterRoute(chapterId: string): string {
  const section = chapterRouteSegments[chapterId];
  if (!section) throw new Error(`No learning route registered for chapter ${chapterId}`);
  return `/learn/${section}`;
}

export function getTopicRoute(topicId: string): string {
  const topic = topicManifests.find(({ id }) => id === topicId);
  if (!topic) throw new Error(`Unknown topic ${topicId}`);
  return `${getChapterRoute(topic.chapterId)}/${topic.id}`;
}

export function getActivityRoute(activityId: string): string {
  const activity = activityManifests.find(({ id }) => id === activityId);
  if (!activity) throw new Error(`Unknown activity ${activityId}`);
  const segment = activityRouteSegments[activityId] ?? activityId;
  return `${getTopicRoute(activity.topicId)}/${segment}`;
}

export function getLegacyTeachingRoute(hash: string): string {
  const appId = hash.replace(/^#\/?/, "") || getDefaultVisualizer().id;
  const app = apps.find(({ id }) => id === appId) ?? getDefaultVisualizer();
  return getActivityRoute(app.activityId);
}

export function parseLearnRoute(pathname: string): ParsedLearnRoute {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length === 1 && segments[0] === "learn") return { kind: "home" };
  if (segments[0] !== "learn" || segments.length < 2 || segments.length > 4) {
    return { kind: "not-found" };
  }

  const section = segments[1];
  const chapterIds = chapterManifests
    .filter(({ id }) => chapterRouteSegments[id] === section)
    .map(({ id }) => id);
  if (chapterIds.length === 0) return { kind: "not-found" };
  if (segments.length === 2) return { kind: "chapter", chapterIds, section };

  const topic = topicManifests.find(
    ({ id, chapterId }) => id === segments[2] && chapterIds.includes(chapterId),
  );
  if (!topic) return { kind: "not-found" };
  if (segments.length === 3) {
    return { kind: "topic", chapterIds, section, topicId: topic.id };
  }

  const activity = activityManifests.find(
    ({ id, topicId }) =>
      topicId === topic.id && (activityRouteSegments[id] ?? id) === segments[3],
  );
  if (!activity) return { kind: "not-found" };
  return {
    kind: "activity",
    activityId: activity.id,
    chapterIds,
    section,
    topicId: topic.id,
  };
}
