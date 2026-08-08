import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// EMF/WMF（Word 公式导出的矢量图）浏览器无法渲染，这里转成 PNG 后再提供。
// 优先用 Windows 内置 GDI+（System.Drawing，输出紧贴公式边界、瞬时完成、零外部依赖），
// 失败时回退到 LibreOffice。转换结果缓存到磁盘，按 源文件路径+修改时间 作为 key。

const CACHE_DIR = path.join(process.cwd(), ".cache", "formula");
const SOFFICE = process.env.SOFFICE_PATH || "F:\\libreoffice26\\program\\soffice.com";

export function isMetafile(file: string): boolean {
  return /\.(emf|wmf)$/i.test(file);
}

function cachePathFor(absSrc: string, mtimeMs: number): string {
  const key = crypto.createHash("sha1").update(absSrc).digest("hex").slice(0, 16);
  const base = path.basename(absSrc).replace(/\.[^.]+$/, "");
  return path.join(CACHE_DIR, `${base}.${key}.${Math.round(mtimeMs)}.png`);
}

// 同一文件并发请求时只转换一次。
const inflight = new Map<string, Promise<string | null>>();

/** 把 emf/wmf 转成 PNG，返回缓存 PNG 的绝对路径；失败返回 null。 */
export async function metafileToPng(absSrc: string): Promise<string | null> {
  let st: fs.Stats;
  try {
    st = fs.statSync(absSrc);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;

  const outPath = cachePathFor(absSrc, st.mtimeMs);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return outPath;

  if (inflight.has(outPath)) return inflight.get(outPath)!;
  const job = (async () => {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (await tryGdiPlus(absSrc, outPath)) return outPath;
    if (await tryLibreOffice(absSrc, outPath)) return outPath;
    return null;
  })().finally(() => inflight.delete(outPath));
  inflight.set(outPath, job);
  return job;
}

// Windows GDI+：把矢量图按 3x 光栅化到紧贴边界的位图，白底抗锯齿。
async function tryGdiPlus(src: string, out: string): Promise<boolean> {
  const script = `
$ErrorActionPreference='Stop';
Add-Type -AssemblyName System.Drawing;
$img=[System.Drawing.Image]::FromFile($env:FML_SRC);
$g=$null; $bmp=$null;
try {
  $scale=3.0;
  $w=[int][math]::Max(1,[math]::Round($img.Width*$scale));
  $h=[int][math]::Max(1,[math]::Round($img.Height*$scale));
  $bmp=New-Object System.Drawing.Bitmap($w,$h);
  $bmp.SetResolution(288,288);
  $g=[System.Drawing.Graphics]::FromImage($bmp);
  $g.SmoothingMode='AntiAlias';
  $g.InterpolationMode='HighQualityBicubic';
  $g.PixelOffsetMode='HighQuality';
  $g.Clear([System.Drawing.Color]::White);
  $g.DrawImage($img,0,0,$w,$h);
  $bmp.Save($env:FML_OUT,[System.Drawing.Imaging.ImageFormat]::Png);
} finally {
  if($g){$g.Dispose()}; if($bmp){$bmp.Dispose()}; $img.Dispose();
}
`;
  try {
    await execFileP(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { env: { ...process.env, FML_SRC: src, FML_OUT: out }, timeout: 20000, windowsHide: true }
    );
    return fs.existsSync(out) && fs.statSync(out).size > 0;
  } catch {
    return false;
  }
}

// LibreOffice 兜底：headless 转 PNG。用独立临时用户配置避免并发实例锁冲突。
async function tryLibreOffice(src: string, out: string): Promise<boolean> {
  if (!fs.existsSync(SOFFICE)) return false;
  const outDir = path.join(CACHE_DIR, "_lo");
  fs.mkdirSync(outDir, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lo-prof-"));
  const profileUrl = "file:///" + profile.replace(/\\/g, "/");
  try {
    await execFileP(
      SOFFICE,
      [
        "--headless",
        "--nolockcheck",
        "--nodefault",
        `-env:UserInstallation=${profileUrl}`,
        "--convert-to",
        "png",
        "--outdir",
        outDir,
        src,
      ],
      { timeout: 120000, windowsHide: true }
    );
  } catch {
    return false;
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
  const produced = path.join(outDir, path.basename(src).replace(/\.[^.]+$/, "") + ".png");
  if (!fs.existsSync(produced)) return false;
  try {
    fs.renameSync(produced, out);
  } catch {
    fs.copyFileSync(produced, out);
    fs.rmSync(produced, { force: true });
  }
  return fs.existsSync(out) && fs.statSync(out).size > 0;
}
