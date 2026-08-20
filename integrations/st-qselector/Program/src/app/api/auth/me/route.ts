import { NextRequest } from "next/server";
import { authErrorResponse } from "@/lib/auth/security";
import { requireRequestSessionForPasswordChange } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSessionForPasswordChange(request);
    return Response.json({ user: session.user });
  } catch (error) {
    return authErrorResponse(error);
  }
}
