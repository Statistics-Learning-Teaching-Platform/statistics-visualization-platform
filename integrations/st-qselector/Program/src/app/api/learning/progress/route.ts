import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, withTransaction } from "@/lib/db";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import {
  learningProgressRequestSchema,
  mergeStoredProgress,
  normalizeStoredProgress,
} from "@/lib/learning/progress";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSession(request);
    const result = await queryDatabase<{ payload: unknown; revision: string }>(
      "SELECT payload, revision FROM learning_progress WHERE user_id = $1",
      [session.user.id],
    );
    const row = result.rows[0];
    if (!row) return NextResponse.json({ progress: null, revision: 0 });
    return NextResponse.json({
      progress: normalizeStoredProgress(row.payload),
      revision: Number(row.revision),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "learning-progress",
      limit: 300,
      windowSeconds: 60 * 60,
    });
    const parsed = learningProgressRequestSchema.safeParse(
      await readLimitedJson(request, 32_000),
    );
    if (!parsed.success) {
      throw new AuthError(400, parsed.error.issues[0]?.message ?? "学习进度格式无效");
    }
    const incoming = parsed.data.progress;
    const baseRevision = parsed.data.revision;

    const outcome = await withTransaction(async (client) => {
      const existing = await client.query<{ payload: unknown; revision: string }>(
        "SELECT payload, revision FROM learning_progress WHERE user_id = $1 FOR UPDATE",
        [session.user.id],
      );
      const row = existing.rows[0];
      if (row && BigInt(row.revision) !== BigInt(baseRevision)) {
        // Another device wrote since our GET: union-merge instead of clobbering.
        const merged = mergeStoredProgress(normalizeStoredProgress(row.payload), incoming);
        const revision = BigInt(row.revision) + 1n;
        await client.query(
          "UPDATE learning_progress SET payload = $2, revision = $3, updated_at = now() WHERE user_id = $1",
          [session.user.id, JSON.stringify(merged), revision.toString()],
        );
        return { progress: merged, revision: Number(revision), merged: true };
      }
      const revision = (row ? BigInt(row.revision) : 0n) + 1n;
      await client.query(
        `INSERT INTO learning_progress (user_id, payload, revision, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id) DO UPDATE SET payload = $2, revision = $3, updated_at = now()`,
        [session.user.id, JSON.stringify(incoming), revision.toString()],
      );
      return { progress: incoming, revision: Number(revision), merged: false };
    });
    return NextResponse.json(outcome);
  } catch (error) {
    return authErrorResponse(error);
  }
}
