import { NextRequest, NextResponse } from "next/server";
import { configuredStatAiModel, listStatAiModels } from "@/lib/ai-client";
import { requireRequestSession } from "@/lib/auth/session";
import { authErrorResponse } from "@/lib/auth/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Scans the inference server on every request so users always see the
// currently available online models.
export async function GET(request: NextRequest) {
  try {
    // This is a read-only, same-origin GET. Browsers do not consistently send
    // an Origin header for same-origin GET fetches, so applying the mutation
    // CSRF/origin guard here would turn a valid authenticated request into a
    // production-only 403. Session authentication still protects the data.
    await requireRequestSession(request);
    const models = await listStatAiModels(request.signal);
    return NextResponse.json(
      { models, defaultModel: configuredStatAiModel() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return new NextResponse(null, { status: 499 });
    return authErrorResponse(error);
  }
}
