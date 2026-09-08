import "server-only";

import { queryDatabase, withTransaction, type DatabaseClient } from "@/lib/db";
import { sha256 } from "@/lib/auth/security";
import type { Question } from "@/lib/types";
import { validateQuestionVisualizations } from "@/lib/question-visualizations";

export type AiDraftReviewStatus = "pending" | "approved" | "rejected";

interface DraftRow {
  id: string;
  payload: unknown;
  review_status: AiDraftReviewStatus;
  adopted: boolean;
}

export interface StoredAiDraft {
  question: Question;
  reviewStatus: AiDraftReviewStatus;
  adopted: boolean;
}

function parsePayload(value: unknown): Question {
  const payload = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!payload || typeof payload !== "object") throw new Error("AI draft payload is invalid");
  const question = payload as Partial<Question>;
  if (
    typeof question.id !== "string" || !/^ai_[a-z0-9_]+$/i.test(question.id)
    || (question.origin !== "variant" && question.origin !== "generated")
    || typeof question.content !== "string" || typeof question.answer !== "string"
    || typeof question.chapterId !== "string" || !/^Ch(?:0[1-9]|1[0-3])$/.test(question.chapterId)
  ) {
    throw new Error("AI draft payload failed integrity validation");
  }
  const visualizations = validateQuestionVisualizations(question.visualizations);
  if (!visualizations) throw new Error("AI draft visualizations failed integrity validation");
  return { ...question, visualizations } as Question;
}

async function draftHash(question: Question): Promise<string> {
  return sha256(JSON.stringify({
    chapterId: question.chapterId,
    type: question.type,
    difficulty: question.difficulty,
    content: question.content,
    answer: question.answer,
    origin: question.origin,
    parentQuestionId: question.parentQuestionId ?? null,
    verification: question.verification ?? null,
    visualizations: question.visualizations ?? [],
  }));
}

export async function persistAiDrafts(
  ownerUserId: string,
  records: Array<{ question: Question; generationJob: unknown; verifierOutput: unknown }>,
): Promise<Question[]> {
  return withTransaction(async (client) => {
    const stored: Question[] = [];
    for (const record of records) {
      const contentHash = await draftHash(record.question);
      const result = await client.query<DraftRow>(
        `INSERT INTO ai_question_drafts
           (id, owner_user_id, payload, content_hash, generation_job, verifier_output, review_status)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, 'pending')
         ON CONFLICT (owner_user_id, content_hash) DO UPDATE
         SET generation_job = EXCLUDED.generation_job,
             verifier_output = EXCLUDED.verifier_output,
             updated_at = now()
         RETURNING id, payload, review_status, adopted`,
        [
          record.question.id,
          ownerUserId,
          JSON.stringify(record.question),
          contentHash,
          JSON.stringify(record.generationJob),
          JSON.stringify(record.verifierOutput),
        ],
      );
      stored.push(parsePayload(result.rows[0].payload));
    }
    return stored;
  });
}

function mapRows(rows: DraftRow[]): StoredAiDraft[] {
  return rows.map((row) => ({
    question: parsePayload(row.payload),
    reviewStatus: row.review_status,
    adopted: row.adopted,
  }));
}

export async function getOwnedAiDrafts(
  ownerUserId: string,
  options: { ids?: readonly string[]; adoptedOnly?: boolean } = {},
): Promise<StoredAiDraft[]> {
  const ids = options.ids ? [...new Set(options.ids)] : null;
  if (ids && !ids.length) return [];
  const result = await queryDatabase<DraftRow>(
    `SELECT id, payload, review_status, adopted
       FROM ai_question_drafts
      WHERE owner_user_id = $1
        AND ($2::text[] IS NULL OR id = ANY($2::text[]))
        AND ($3::boolean = false OR adopted = true)
        AND review_status <> 'rejected'
      ORDER BY updated_at DESC
      LIMIT 200`,
    [ownerUserId, ids, options.adoptedOnly === true],
  );
  return mapRows(result.rows);
}

export async function adoptOwnedAiDrafts(ownerUserId: string, ids: readonly string[]): Promise<StoredAiDraft[]> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return [];
  return withTransaction(async (client) => {
    const result = await client.query<DraftRow>(
      `UPDATE ai_question_drafts
          SET adopted = true, updated_at = now()
        WHERE owner_user_id = $1 AND id = ANY($2::text[]) AND review_status <> 'rejected'
        RETURNING id, payload, review_status, adopted`,
      [ownerUserId, uniqueIds],
    );
    return mapRows(result.rows);
  });
}

export async function reviewAiDrafts(
  client: DatabaseClient,
  reviewerUserId: string,
  ids: readonly string[],
  status: Exclude<AiDraftReviewStatus, "pending">,
): Promise<number> {
  const result = await client.query(
    `UPDATE ai_question_drafts
        SET review_status = $3, reviewed_by = $1, reviewed_at = now(), updated_at = now()
      WHERE id = ANY($2::text[]) AND owner_user_id <> $1`,
    [reviewerUserId, [...new Set(ids)], status],
  );
  return result.rowCount ?? 0;
}
