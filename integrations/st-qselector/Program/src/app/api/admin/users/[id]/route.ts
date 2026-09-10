import { NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { canManageRole, type UserRole } from "@/lib/auth/policy";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { requireRequestSession, verifyCsrf } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError } from "@/lib/auth/security";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSafeOrigin(request);
    const session = await requireRequestSession(request, ["teacher", "superadmin"]);
    await verifyCsrf(request, session);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "admin-delete-user",
      limit: 20,
      windowSeconds: 60 * 60,
    });
    const { id } = await context.params;
    if (!/^\d+$/.test(id) || id === session.user.id) throw new AuthError(400, "无效的目标账号");

    await withTransaction(async (client) => {
      const result = await client.query<{ username: string; role: UserRole }>(
        "SELECT username, role FROM users WHERE id = $1 FOR UPDATE",
        [id],
      );
      const target = result.rows[0];
      if (!target) throw new AuthError(404, "账号不存在");
      if (!canManageRole(session.user.role, target.role)) throw new AuthError(403, "不能删除该角色的账号");
      await client.query(
        `INSERT INTO audit_log (actor_user_id, action, target_user_id, details)
         VALUES ($1, 'user.deleted', $2, $3::jsonb)`,
        [session.user.id, id, JSON.stringify({ username: target.username, role: target.role })],
      );
      await client.query("DELETE FROM users WHERE id = $1", [id]);
    });
    return Response.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
