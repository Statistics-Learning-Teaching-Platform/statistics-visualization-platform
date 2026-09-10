import { NextRequest, NextResponse } from "next/server";
import { requireRequestSession } from "@/lib/auth/session";
import { authErrorResponse, AuthError } from "@/lib/auth/security";
import { consumeRateLimit, requestPrincipal } from "@/lib/auth/rate-limit";
import { getPrivateAssetContent, getPrivateAssetMetadata } from "@/lib/private-assets";

function safeRelativePath(value: string): string | null {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (!normalized || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\0"))) {
    return null;
  }
  return segments.join("/");
}
export async function GET(request: NextRequest) {
  try {
    const session = await requireRequestSession(request);
    await consumeRateLimit({
      principal: await requestPrincipal(request, session.user.id),
      route: "asset-get",
      limit: 180,
      windowSeconds: 60,
    });
    const chapter = request.nextUrl.searchParams.get("chapter") ?? "";
    const requestedFile = safeRelativePath(request.nextUrl.searchParams.get("file") ?? "");
    const forceDownload = request.nextUrl.searchParams.get("download") === "1";
    if (!/^Ch(?:0[1-9]|1[0-3])$/.test(chapter) || !requestedFile) {
      return NextResponse.json({ error: "chapter 或 file 参数无效" }, { status: 400 });
    }

    const extension = requestedFile.split(".").at(-1)?.toLowerCase();
    if (!forceDownload && (extension === "emf" || extension === "wmf")) {
      return NextResponse.json({ error: "该矢量公式尚未生成浏览器预览图" }, { status: 415 });
    }

    const relativeCandidates = requestedFile.startsWith("Assests/")
      ? [requestedFile]
      : [requestedFile, `Assests/${requestedFile}`];
    const asset = await getPrivateAssetMetadata(relativeCandidates.map((candidate) => `${chapter}/${candidate}`));
    if (!asset) return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    if (asset.accessScope === "answer" && session.user.role === "student") {
      return NextResponse.json({ error: "当前账号没有查看答案附件的权限" }, { status: 403 });
    }

    const etag = `"${asset.sha256}"`;
    const headers = new Headers({
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600, must-revalidate",
      "ETag": etag,
      "X-Content-Type-Options": "nosniff",
    });
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    if (forceDownload) {
      const baseName = asset.key.split("/").at(-1) ?? "attachment";
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`);
    }
    const content = await getPrivateAssetContent(asset);
    if (!content) throw new AuthError(409, "附件在读取期间发生变化，请重试");
    const body = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    return authErrorResponse(error);
  }
}
