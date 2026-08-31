import { NextRequest, NextResponse } from "next/server";
import { reviewedQuestionIndex } from "@/generated/reviewed-questions";
import { adoptOwnedAiDrafts, getOwnedAiDrafts, reviewAiDrafts } from "@/lib/ai-drafts";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import { withTransaction } from "@/lib/db";

export const runtime = "nodejs";

function normalized(value: string): string {
  return value.toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

function requestedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
      return (item as { id: string }).id;
    }
    return "";
  }).filter((id) => /^ai_[a-z0-9_]+$/i.test(id)))].slice(0, 60);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    const drafts = await getOwnedAiDrafts(session.user.id);
    const response = NextResponse.json({
      questions: drafts.map((draft) => ({
        ...draft.question,
        reviewStatus: `${draft.reviewStatus}:server-stored`,
      })),
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "questions-import-generated",
      limit: 30,
      windowSeconds: 60 * 60,
    });
    const body = await readLimitedJson(request, 64 * 1024) as { ids?: unknown; questions?: unknown };
    const ids = requestedIds(body.ids ?? body.questions);
    if (!ids.length) return NextResponse.json({ imported: 0, reused: 0, idMap: {}, questions: [], persisted: true });

    const owned = await getOwnedAiDrafts(session.user.id, { ids });
    if (owned.length !== ids.length) {
      throw new AuthError(400, "只能采用由当前账号服务端生成的 AI 草稿");
    }

    const bankByContent = new Map(
      reviewedQuestionIndex.questions.map((question) => [normalized(question.content), question.id]),
    );
    const idMap: Record<string, string> = {};
    const adoptIds: string[] = [];
    let reused = 0;
    for (const draft of owned) {
      const duplicateId = bankByContent.get(normalized(draft.question.content));
      if (duplicateId) {
        idMap[draft.question.id] = duplicateId;
        reused += 1;
      } else {
        idMap[draft.question.id] = draft.question.id;
        adoptIds.push(draft.question.id);
      }
    }
    const adopted = await adoptOwnedAiDrafts(session.user.id, adoptIds);
    return NextResponse.json({
      imported: adopted.length,
      reused,
      idMap,
      questions: adopted.map((draft) => draft.question),
      persisted: true,
      reviewStatus: "pending",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["superadmin"]);
    await verifyCsrf(request, session);
    const body = await readLimitedJson(request, 32 * 1024) as { ids?: unknown; status?: unknown };
    const ids = requestedIds(body.ids);
    if (!ids.length || (body.status !== "approved" && body.status !== "rejected")) {
      throw new AuthError(400, "审核状态或草稿 ID 无效");
    }
    const updated = await withTransaction(async (client) => {
      const count = await reviewAiDrafts(client, session.user.id, ids, body.status as "approved" | "rejected");
      await client.query(
        `INSERT INTO audit_log (actor_user_id, action, details)
         VALUES ($1, 'ai_draft.reviewed', $2::jsonb)`,
        [session.user.id, JSON.stringify({ ids, status: body.status, updated: count })],
      );
      return count;
    });
    return NextResponse.json({ updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}
