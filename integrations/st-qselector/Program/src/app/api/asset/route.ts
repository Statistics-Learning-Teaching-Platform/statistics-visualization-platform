import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getChapterDir } from "@/lib/data";
import { isMetafile, metafileToPng } from "@/lib/formula";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// 提供章节附件（题目/答案中的图片、数据文件）。
// 用法: /api/asset?chapter=Ch01&file=Assests/xxx.jpeg  或  file=Answers/Q1.png
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const chapter = sp.get("chapter") || "";
  const file = sp.get("file") || "";
  const forceDownload = sp.get("download") === "1";
  if (!chapter || !file) {
    return NextResponse.json({ error: "缺少 chapter 或 file 参数" }, { status: 400 });
  }

  const chapterDir = getChapterDir(chapter);
  if (!chapterDir) {
    return NextResponse.json({ error: "未知章节" }, { status: 404 });
  }

  // 依次尝试：<章节目录>/<file>，再退回 <章节目录>/Assests/<file>
  const candidates = [
    path.resolve(chapterDir, file),
    path.resolve(chapterDir, "Assests", file),
  ];

  for (const abs of candidates) {
    // 越界保护：解析后的路径必须仍在章节目录内。
    if (abs !== chapterDir && !abs.startsWith(chapterDir + path.sep)) continue;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      // emf/wmf（Word 公式矢量图）浏览器无法渲染，转成 PNG 再返回。
      // 非下载请求才转换；download=1 时保留原始矢量文件。
      if (isMetafile(abs) && !forceDownload) {
        const png = await metafileToPng(abs);
        if (png) {
          const buf = fs.readFileSync(png);
          return new NextResponse(new Uint8Array(buf), {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
        // 转换失败：返回 415，前端据此回退到占位符。
        return NextResponse.json({ error: "公式转换失败" }, { status: 415 });
      }

      const buf = fs.readFileSync(abs);
      const ext = path.extname(abs).toLowerCase();
      const headers: Record<string, string> = {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      };
      if (forceDownload) {
        const base = path.basename(abs);
        headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(base)}`;
      }
      return new NextResponse(new Uint8Array(buf), { status: 200, headers });
    }
  }

  return NextResponse.json({ error: "文件不存在" }, { status: 404 });
}
