import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { SelectionProvider } from "@/lib/selection";

export const metadata: Metadata = {
  title: "统计学组卷系统",
  description: "按章节 / 关键词 / 难度检索题目并一键组卷，导出 PDF / DOCX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <SelectionProvider>{children}</SelectionProvider>
      </body>
    </html>
  );
}
