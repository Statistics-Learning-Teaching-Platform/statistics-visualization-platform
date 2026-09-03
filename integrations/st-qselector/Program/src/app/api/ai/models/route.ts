import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_AI_MODEL, listStatAiModels } from "@/lib/ai-client";
import { requireRequestSession } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse } from "@/lib/auth/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Scans the inference server on every request so users always see the
// currently available online models.
export async function GET(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    await requireRequestSession(request);
    const models = await listStatAiModels(request.signal);
    return NextResponse.json(
      { models, defaultModel: DEFAULT_AI_MODEL },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return new NextResponse(null, { status: 499 });
    return authErrorResponse(error);
  }
}
