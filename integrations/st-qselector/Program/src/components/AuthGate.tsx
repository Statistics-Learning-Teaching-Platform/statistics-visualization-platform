"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname.endsWith("/login");
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginPage) return;
    const controller = new AbortController();
    void fetch(withBasePath("/api/auth/me"), { signal: controller.signal, credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace(withBasePath("/login"));
          return;
        }
        const payload = await response.json() as { user?: { mustChangePassword?: boolean } };
        if (payload.user?.mustChangePassword && !pathname.endsWith("/account")) {
          window.location.replace(withBasePath("/account"));
          return;
        }
        setVerifiedPath(pathname);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          window.location.replace(withBasePath("/login"));
        }
      });
    return () => controller.abort();
  }, [isLoginPage, pathname]);

  if (!isLoginPage && verifiedPath !== pathname) {
    return <main className="auth-page"><div className="auth-loading"><Loader2 className="auth-spin" /> 正在验证登录状态…</div></main>;
  }
  return children;
}
