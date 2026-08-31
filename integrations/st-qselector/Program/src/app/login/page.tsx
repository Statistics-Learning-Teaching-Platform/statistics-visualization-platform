"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

function resolvePostLoginTarget(mustChangePassword: boolean): string {
  if (mustChangePassword) return withBasePath("/account");
  const next = new URLSearchParams(window.location.search).get("next");
  if (next) {
    // Only same-origin destinations: bare in-app paths, or absolute URLs on
    // this origin. Anything else (protocol-relative, other hosts) is ignored.
    if (next.startsWith("/") && !next.startsWith("//")) return next;
    try {
      const resolved = new URL(next, window.location.origin);
      if (resolved.origin === window.location.origin) return resolved.href;
    } catch {
      // Malformed next value falls through to the default.
    }
  }
  return withBasePath("/");
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const payload = (await response.json()) as { error?: string; user?: { mustChangePassword?: boolean } };
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      window.location.assign(resolvePostLoginTarget(Boolean(payload.user?.mustChangePassword)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand"><span>▥</span> STATMIND</div>
        <p className="auth-eyebrow">STATISTICS THINKING PLATFORM</p>
        <h1 id="login-title">登录统计思维平台</h1>
        <p className="auth-lead">使用学校分配的账号进入题库、AI 助教和账号管理。</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>用户名</span>
            <span className="auth-input"><UserRound aria-hidden="true" /><input name="username" autoComplete="username" required minLength={3} maxLength={64} /></span>
          </label>
          <label>
            <span>密码</span>
            <span className="auth-input"><LockKeyhole aria-hidden="true" /><input name="password" type="password" autoComplete="current-password" required maxLength={128} /></span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-primary" type="submit" disabled={loading}>
            {loading ? <><Loader2 className="auth-spin" /> 正在登录…</> : "登录"}
          </button>
        </form>
        <Link className="auth-back" href="/">← 返回主界面</Link>
      </section>
    </main>
  );
}
