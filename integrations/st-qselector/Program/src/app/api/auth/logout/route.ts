import { NextRequest, NextResponse } from "next/server";
import { assertSafeOrigin, AuthError } from "@/lib/auth/security";
import { clearSessionCookies, deleteSession, getRequestSession, verifyCsrf } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    assertSafeOrigin(request);
    const session = await getRequestSession(request);
    if (session) {
      await verifyCsrf(request, session);
      await deleteSession(session.tokenHash).catch((error) => {
        console.error("Failed to revoke server session during logout", error);
      });
    }
    const response = NextResponse.json({ success: true });
    clearSessionCookies(response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: error instanceof AuthError ? error.message : "服务器暂时无法处理请求" },
      { status: error instanceof AuthError ? error.status : 500 },
    );
    clearSessionCookies(response);
    return response;
  }
}
