"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginRedirectUrl, withoutBasePath, withBasePath } from "@/lib/base-path";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routePathname = withoutBasePath(pathname);
  const isLoginPage = routePathname === "/login";
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (isLoginPage) return;
    const controller = new AbortController();
    void fetch(withBasePath("/api/auth/me"), { signal: controller.signal, credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace(loginRedirectUrl(window.location));
          return;
        }
        const payload = await response.json() as { user?: { mustChangePassword?: boolean } };
        if (payload.user?.mustChangePassword && routePathname !== "/account") {
          window.location.replace(withBasePath("/account"));
          return;
        }
        setVerifiedPath(pathname);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          window.location.replace(loginRedirectUrl(window.location));
        }
      });
    return () => controller.abort();
  }, [isLoginPage, pathname, routePathname]);

  if (!isLoginPage && verifiedPath !== pathname) {
    return <main className="auth-page"><div className="auth-loading"><Loader2 className="auth-spin" /> 正在验证登录状态…</div></main>;
  }
  return children;
}
