import { withBasePath } from "@/lib/base-path";

export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const prefix = "stat_csrf=";
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
}
export function authenticatedFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.method && init.method.toUpperCase() !== "GET") {
    headers.set("X-CSRF-Token", csrfToken());
  }
  return fetch(withBasePath(path), { ...init, headers, credentials: "same-origin" });
}
