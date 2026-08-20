import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { queryDatabase, withTransaction } from "@/lib/db";
import { canManageRole, type UserRole } from "@/lib/auth/policy";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import { createUserSchema } from "@/lib/auth/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    const visibleRoles: UserRole[] = session.user.role === "teacher" ? ["student"] : ["student", "teacher"];
    const result = await queryDatabase<{
      id: string;
      username: string;
      role: UserRole;
      must_change_password: boolean;
      disabled: boolean;
      created_at: Date;
      last_login_at: Date | null;
    }>(
      `SELECT id::text, username, role, must_change_password, disabled, created_at, last_login_at
         FROM users
        WHERE role = ANY($1::text[])
        ORDER BY role, lower(username)`,
      [visibleRoles],
    );
    return Response.json({
      users: result.rows.map((row) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        mustChangePassword: row.must_change_password,
        disabled: row.disabled,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      })),
    });
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
      route: "admin-create-user",
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const parsed = createUserSchema.safeParse(await readLimitedJson(request, 8_192));
    if (!parsed.success) throw new AuthError(400, parsed.error.issues[0]?.message ?? "账号格式无效");
    if (!canManageRole(session.user.role, parsed.data.role)) {
      throw new AuthError(403, "不能创建该角色的账号");
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await withTransaction(async (client) => {
      try {
        const inserted = await client.query<{ id: string; username: string; role: UserRole }>(
          `INSERT INTO users (username, password_hash, role, must_change_password, created_by)
           VALUES ($1, $2, $3, true, $4)
           RETURNING id::text, username, role`,
          [parsed.data.username, passwordHash, parsed.data.role, session.user.id],
        );
        await client.query(
          `INSERT INTO audit_log (actor_user_id, action, target_user_id, details)
           VALUES ($1, 'user.created', $2, $3::jsonb)`,
          [session.user.id, inserted.rows[0].id, JSON.stringify({ role: parsed.data.role })],
        );
        return inserted.rows[0];
      } catch (error) {
        if ((error as { code?: string }).code === "23505") throw new AuthError(409, "该用户名已被使用");
        throw error;
      }
    });
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
