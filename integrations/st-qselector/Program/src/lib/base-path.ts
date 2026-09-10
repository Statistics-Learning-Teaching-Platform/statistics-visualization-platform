export const BASE_PATH = "/st-qselector";

export function withBasePath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (
    normalized === BASE_PATH ||
    (normalized.startsWith(BASE_PATH) && /^[/?#]/.test(normalized.slice(BASE_PATH.length)))
  ) {
    return normalized;
  }
  return `${BASE_PATH}${normalized}`;
}

/**
 * Return the route portion used by the app router, regardless of whether
 * Next's basePath has already been included in the value.
 */
export function withoutBasePath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === BASE_PATH) return "/";
  if (normalized.startsWith(`${BASE_PATH}/`)) {
    return normalized.slice(BASE_PATH.length) || "/";
  }
  return normalized;
}

export interface ReturnLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

/** Build the complete same-site URL that should be restored after login. */
export function currentReturnTo(location: ReturnLocation): string {
  const pathname = withBasePath(location.pathname || "/");
  return `${pathname}${location.search ?? ""}${location.hash ?? ""}` || withBasePath("/");
}

export function loginRedirectUrl(location: ReturnLocation): string {
  return `${withBasePath("/login")}?next=${encodeURIComponent(currentReturnTo(location))}`;
}

/**
 * Resolve a login `next` value without allowing an off-origin redirect.
 * The login page serves both the portal and qselector. Preserve the resolved
 * same-origin pathname exactly, including portal routes outside basePath.
 * The callers already include basePath for qselector return targets.
 */
export function resolvePostLoginTarget(
  mustChangePassword: boolean,
  search: string,
  origin: string,
): string {
  if (mustChangePassword) return withBasePath("/account");

  const next = new URLSearchParams(search).get("next");
  if (!next) return withBasePath("/");

  // Protocol-relative values are a common open-redirect shape. Reject them
  // explicitly before URL resolution, even when a browser would normalize
  // them in a surprising way.
  if (next.startsWith("//")) return withBasePath("/");

  let resolved: URL;
  try {
    resolved = new URL(next, origin);
  } catch {
    return withBasePath("/");
  }

  if (
    resolved.origin !== origin ||
    (resolved.protocol !== "http:" && resolved.protocol !== "https:") ||
    resolved.pathname.startsWith("//")
  ) {
    return withBasePath("/");
  }

  const targetPath = resolved.pathname || "/";
  return `${targetPath}${resolved.search}${resolved.hash}`;
}
