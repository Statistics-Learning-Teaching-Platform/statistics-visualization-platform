import { createTutorPost } from "@/lib/tutor-route";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = createTutorPost({
  runtimeName: "R",
  route: "r-tutor",
  systemDetail: "Teach idiomatic R for statistical analysis with base R, tidyverse, ggplot2, and common modeling functions.",
});
