import type { RegressionPoint } from "@stats-viz/shared/regression";
import type { ChartLayout } from "@stats-viz/shared/chart-utils";

export type Point = RegressionPoint;

export interface Dataset {
  id: string;
  name: string;
  source?: string;
  xLabel?: string;
  yLabel?: string;
  data: Point[];
}

export const CHART_LAYOUT: ChartLayout = {
  width: 860,
  height: 520,
  margin: { top: 34, right: 34, bottom: 58, left: 64 },
};

export const DATASET_PATHS = [
  "data/outlier-impact.json",
  "data/positive-correlation.json",
  "data/negative-correlation.json",
  "data/no-correlation.json",
  "data/strong-linear.json",
  "data/exponential-growth.json",
  "data/textbook/chapter-8-height-exercise-hours.json",
  "data/textbook/chapter-8-height-latitude.json",
  "data/textbook/chapter-8-height-father-height.json",
  "data/textbook/chapter-8-height-mother-height.json",
  "data/textbook/chapter-8-height-sleep-hours.json",
  "data/textbook/chapter-8-skyscrapers-built-gdp.json",
  "data/textbook/chapter-8-skyscrapers-planned-gdp.json",
  "data/textbook/chapter-8-us-population-year.json",
  "data/textbook/chapter-8-book-spending-education.json",
  "data/textbook/chapter-8-book-spending-income.json",
  "data/textbook/chapter-8-tourism-gdp.json",
  "data/textbook/chapter-8-tourism-restaurants.json",
  "data/textbook/chapter-8-tourism-hotels.json",
  "data/textbook/chapter-8-tourism-roads.json",
  "data/textbook/chapter-8-tourism-universities.json",
  "data/textbook/chapter-8-tourism-service-workers.json",
];

export interface CustomLineState {
  start: Point | null;
  end: Point | null;
}
