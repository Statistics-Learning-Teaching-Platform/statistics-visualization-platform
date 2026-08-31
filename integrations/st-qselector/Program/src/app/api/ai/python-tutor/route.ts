import { createTutorPost } from "@/lib/tutor-route";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = createTutorPost({
  runtimeName: "Python",
  route: "python-tutor",
  systemDetail: "Teach Python for statistical analysis with NumPy, pandas, Matplotlib, and SciPy.",
});
