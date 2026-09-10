import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { queryDatabase } from "@/lib/db";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { attachSession, createSession } from "@/lib/auth/session";
import { assertSafeOrigin, authErrorResponse, AuthError, readLimitedJson } from "@/lib/auth/security";
import { loginSchema } from "@/lib/auth/validation";
import type { UserRole } from "@/lib/auth/policy";

const DUMMY_HASH = "$2b$12$r52iGbyRxfsok6w1CsDFheJnr3K.GmRDWn9UBaJUfP9ggjxN/Hqcy";

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const principal = await requestPrincipal(request);
    await consumeRateLimit({ principal, route: "auth-login", limit: 10, windowSeconds: 15 * 60 });

    const parsed = loginSchema.safeParse(await readLimitedJson(request, 4_096));
    if (!parsed.success) throw new AuthError(400, "用户名或密码格式无效");

    const result = await queryDatabase<{
      id: string;
      username: string;
      password_hash: string;
      role: UserRole;
      must_change_password: boolean;
      disabled: boolean;
      session_version: number;
    }>(
      `SELECT id::text, username, password_hash, role, must_change_password, disabled, session_version
         FROM users
        WHERE lower(username) = lower($1)`,
      [parsed.data.username],
    );
    const row = result.rows[0];
    const passwordMatches = await bcrypt.compare(parsed.data.password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !passwordMatches || row.disabled) {
      throw new AuthError(401, "用户名或密码错误");
    }

    await queryDatabase("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id]);
    await queryDatabase("DELETE FROM sessions WHERE expires_at <= now()");
    const session = await createSession(row.id, row.session_version);
    const response = NextResponse.json({
      user: {
        id: row.id,
        username: row.username,
        role: row.role,
        mustChangePassword: row.must_change_password,
      },
      csrfToken: session.csrf,
    });
    attachSession(response, session);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
