import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { queryDatabase, withTransaction } from "@/lib/db";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import {
  attachSession,
  createSession,
  requireRequestSessionForPasswordChange,
  verifyCsrf,
} from "@/lib/auth/session";
import {
  assertSafeOrigin,
  authErrorResponse,
  AuthError,
  readLimitedJson,
} from "@/lib/auth/security";
import { profileUpdateSchema } from "@/lib/auth/validation";

export async function PATCH(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSessionForPasswordChange(request);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "auth-profile",
      limit: 8,
      windowSeconds: 15 * 60,
    });
    const parsed = profileUpdateSchema.safeParse(await readLimitedJson(request, 8_192));
    if (!parsed.success) throw new AuthError(400, parsed.error.issues[0]?.message ?? "资料格式无效");

    const initial = await queryDatabase<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [session.user.id],
    );
    const initialPasswordHash = initial.rows[0]?.password_hash;
    if (!initialPasswordHash || !(await bcrypt.compare(parsed.data.currentPassword, initialPasswordHash))) {
      throw new AuthError(401, "当前密码错误");
    }

    const newHash = parsed.data.newPassword ? await bcrypt.hash(parsed.data.newPassword, 12) : null;
    const newVersion = await withTransaction(async (client) => {
      try {
        const current = await client.query<{ password_hash: string }>(
          "SELECT password_hash FROM users WHERE id = $1 FOR UPDATE",
          [session.user.id],
        );
        const row = current.rows[0];
        if (!row || row.password_hash !== initialPasswordHash) {
          throw new AuthError(409, "账号资料已发生变化，请重试");
        }

        const updated = await client.query<{ session_version: number }>(
          `UPDATE users
              SET username = COALESCE($2, username),
                  password_hash = COALESCE($3, password_hash),
                  must_change_password = CASE WHEN $3::text IS NULL THEN must_change_password ELSE false END,
                  session_version = CASE WHEN $3::text IS NULL THEN session_version ELSE session_version + 1 END,
                  updated_at = now()
            WHERE id = $1
        RETURNING session_version`,
          [session.user.id, parsed.data.username ?? null, newHash],
        );
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, target_user_id, details)
           VALUES ($1, 'profile.updated', $1, $2::jsonb)`,
          [session.user.id, JSON.stringify({ usernameChanged: Boolean(parsed.data.username), passwordChanged: Boolean(newHash) })],
        );
        if (newHash) await client.query("DELETE FROM sessions WHERE user_id = $1", [session.user.id]);
        return updated.rows[0].session_version;
      } catch (error) {
        if ((error as { code?: string }).code === "23505") throw new AuthError(409, "该用户名已被使用");
        throw error;
      }
    });

    const response = NextResponse.json({ success: true });
    if (newHash) attachSession(response, await createSession(session.user.id, newVersion));
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
