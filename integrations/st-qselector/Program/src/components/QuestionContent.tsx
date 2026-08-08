"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { withBasePath } from "@/lib/base-path";

// 把题目/答案原文中的自定义占位符转换成标准 markdown：
//   [IMG:file]      -> 图片（经 /api/asset 提供）
//   [IMG:file|alt]  -> 带替代文字的图片
//   [FORMULA:file]  -> 公式图片（多为 wmf/emf，交给 img 渲染器兜底显示）
// 同时清理 pandoc 转换残留标记，减少视觉噪音。
function preprocess(raw: string, chapterId: string): string {
  let s = raw;
  s = s.replace(/`<!--.*?-->`\{=html\}/g, "");
  s = s.replace(/\{=html\}/g, "");
  s = s.replace(/\[([^\]]*)\]\{\.underline\}/g, "$1");
  s = s.replace(/\]\{\.underline\}/g, "");
  s = s.replace(/\{\.underline\}/g, "");

  const toAsset = (file: string, label: string) =>
    `![${label}](${withBasePath("/api/asset")}?chapter=${encodeURIComponent(chapterId)}&file=${encodeURIComponent(
      file.trim()
    )})`;

  s = s.replace(
    /\[IMG:([^|\]]+)(?:\|([^\]]+))?\]/g,
    (_m, f, alt) => toAsset(f, alt?.trim() || "题目图片")
  );
  s = s.replace(/\[FORMULA:([^\]]+)\]/g, (_m, f) => toAsset(f, "公式"));
  return s;
}

const IS_FORMULA = /\.(emf|wmf)$/i;

function SmartImg({ src, alt }: { src?: string | Blob; alt?: string }) {
  const url = typeof src === "string" ? src : "";
  const [failed, setFailed] = useState(false);
  const fileParam = useMemo(() => {
    try {
      const u = new URL(url, "http://x");
      return u.searchParams.get("file") || url;
    } catch {
      return url;
    }
  }, [url]);

  const label = alt || "图片";
  const isFormula = IS_FORMULA.test(fileParam);

  // emf/wmf 公式由 /api/asset 转成 PNG 返回，直接当图片渲染；
  // 仅在后端转换失败（图片加载报错）时才回退到占位符。
  if (failed) {
    return (
      <span className="inline-flex items-center rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-500 align-middle">
        {isFormula ? "〔公式图片，无法预览〕" : `〔图片: ${fileParam.split("/").pop()}（无法预览）〕`}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={label}
      onError={() => setFailed(true)}
      className={
        isFormula
          ? "inline-block align-middle max-h-[2.2em] w-auto"
          : "mx-auto my-3 block h-auto max-h-[420px] w-auto max-w-full rounded-xl border border-slate-200 bg-transparent object-contain"
      }
    />
  );
}

export default function QuestionContent({
  text,
  chapterId,
  className,
}: {
  text: string;
  chapterId: string;
  className?: string;
}) {
  const processed = useMemo(() => preprocess(text, chapterId), [text, chapterId]);
  return (
    <div className={"md " + (className || "")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ img: (props) => <SmartImg src={props.src} alt={props.alt} /> }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
