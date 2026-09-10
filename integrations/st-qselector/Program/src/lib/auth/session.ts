import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryDatabase } from "@/lib/db";
import type { UserRole } from "./policy";
import { AuthError, randomToken, sha256 } from "./security";
import { CSRF_COOKIE, SESSION_COOKIE } from "./constants";
import { sessionAccessError } from "./access-policy";

export { CSRF_COOKIE, SESSION_COOKIE } from "./constants";
const SESSION_SECONDS = 12 * 60 * 60;

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface ActiveSession {
  user: SessionUser;
  tokenHash: string;
  csrfHash: string;
  expiresAt: Date;
}

function setSessionCookies(response: NextResponse, token: string, csrf: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
  response.cookies.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function createSession(userId: string, sessionVersion: number) {
  const token = randomToken();
  const csrf = randomToken();
  const tokenHash = await sha256(token);
  const csrfHash = await sha256(csrf);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await queryDatabase(
    `INSERT INTO sessions (token_hash, csrf_hash, user_id, session_version, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenHash, csrfHash, userId, sessionVersion, expiresAt],
  );
  return { token, csrf, expiresAt };
}

export function attachSession(response: NextResponse, session: Awaited<ReturnType<typeof createSession>>) {
  setSessionCookies(response, session.token, session.csrf, session.expiresAt);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  response.cookies.set(CSRF_COOKIE, "", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

async function findSession(rawToken: string | undefined): Promise<ActiveSession | null> {
  if (!rawToken) return null;
  const tokenHash = await sha256(rawToken);
  const result = await queryDatabase<{
    token_hash: string;
    csrf_hash: string;
    expires_at: Date;
    id: string;
    username: string;
    role: UserRole;
    must_change_password: boolean;
  }>(
    `WITH cleanup AS (
       DELETE FROM sessions WHERE expires_at <= now()
     )
     SELECT s.token_hash, s.csrf_hash, s.expires_at,
            u.id::text, u.username, u.role, u.must_change_password
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.disabled = false
        AND u.session_version = s.session_version`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    tokenHash: row.token_hash,
    csrfHash: row.csrf_hash,
    expiresAt: row.expires_at,
    user: {
      id: row.id,
      username: row.username,
      role: row.role,
      mustChangePassword: row.must_change_password,
    },
  };
}

export async function getRequestSession(request: NextRequest): Promise<ActiveSession | null> {
  return findSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function getServerSession(): Promise<ActiveSession | null> {
  return findSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireRequestSession(request: NextRequest, roles?: readonly UserRole[]) {
  const session = await getRequestSession(request);
  if (!session) throw new AuthError(401, "请先登录");
  const accessError = sessionAccessError(session.user, roles);
  if (accessError) throw new AuthError(accessError.status, accessError.message);
  return session;
}

export async function requireRequestSessionForPasswordChange(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) throw new AuthError(401, "请先登录");
  return session;
}

export async function verifyCsrf(request: NextRequest, session: ActiveSession) {
  const header = request.headers.get("x-csrf-token");
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!header || !cookie || header !== cookie || (await sha256(header)) !== session.csrfHash) {
    throw new AuthError(403, "CSRF 校验失败，请刷新页面后重试");
  }
}

export async function deleteSession(tokenHash: string) {
  await queryDatabase("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function deleteAllUserSessions(userId: string) {
  await queryDatabase("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
