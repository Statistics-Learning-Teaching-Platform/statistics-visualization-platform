import { NextRequest, NextResponse } from "next/server";
import { listStatAiModels } from "@/lib/ai-client";
import { consumeRateLimit, requestPrincipal, withConcurrencyLease } from "@/lib/auth/rate-limit";
import { requireRequestSession } from "@/lib/auth/session";
import { authErrorResponse, AuthError } from "@/lib/auth/security";

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
    const session = await requireRequestSession(request);
    const principal = await requestPrincipal(request, session.user.id);
    await consumeRateLimit({ principal, route: "ai-model-scan", limit: 60, windowSeconds: 60 * 60 });
    await consumeRateLimit({
      principal: "global",
      route: "ai-model-scan-budget",
      limit: 1_200,
      windowSeconds: 60 * 60,
    });
    const models = await withConcurrencyLease({
      route: "ai-model-scan",
      limit: 8,
      ttlSeconds: 20,
      requestSignal: request.signal,
      busyMessage: "模型服务当前扫描请求较多，请稍后重试",
      work: (signal) => listStatAiModels(signal),
    });
    return NextResponse.json(
      { models },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (request.signal.aborted) return new NextResponse(null, { status: 499 });
      return authErrorResponse(new AuthError(504, "模型服务扫描超时，请稍后重试"));
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return authErrorResponse(new AuthError(504, "模型服务扫描超时，请稍后重试"));
    }
    return authErrorResponse(error);
  }
}
