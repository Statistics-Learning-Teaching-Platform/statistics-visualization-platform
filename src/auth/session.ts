import { useEffect, useState } from "react";

export type PortalUserRole = "student" | "teacher" | "superadmin";

export type PortalSession =
  | { status: "loading" }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      username: string;
      role: PortalUserRole;
    };

const ME_ENDPOINT = "/st-qselector/api/auth/me";
const SESSION_INVALIDATION_KEY = "statmind.portal-session-invalidated";

let cachedSession: PortalSession | null = null;
let inflight: Promise<PortalSession> | null = null;
let cacheEpoch = 0;
let storageListenerInstalled = false;
const listeners = new Set<(session: PortalSession) => void>();

function notifySession(session: PortalSession): void {
  for (const listener of listeners) listener(session);
}

function invalidateSession(broadcast: boolean): void {
  cacheEpoch += 1;
  cachedSession = null;
  inflight = null;
  notifySession({ status: "anonymous" });
  if (!broadcast || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SESSION_INVALIDATION_KEY,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // Storage can be unavailable in privacy modes. Same-tab subscribers have
    // already been updated, and navigation will re-check the session cookie.
  }
}

function ensureStorageListener(): void {
  if (storageListenerInstalled || typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_INVALIDATION_KEY) invalidateSession(false);
  });
  storageListenerInstalled = true;
}

export function loadPortalSession(): Promise<PortalSession> {
  ensureStorageListener();
  if (cachedSession) return Promise.resolve(cachedSession);
  if (inflight) return inflight;
  const requestEpoch = cacheEpoch;
  inflight = (async () => {
    let next: PortalSession = { status: "anonymous" };
    try {
      const response = await fetch(ME_ENDPOINT, {
        credentials: "same-origin",
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          user?: { username?: string; role?: PortalUserRole };
        };
        if (payload.user?.username) {
          next = {
            status: "authenticated",
            username: payload.user.username,
            role: payload.user.role ?? "student",
          };
        }
      }
    } catch {
      // The account worker being unreachable must not break learning tools;
      // treat it as signed out. Personal pages fail closed either way.
    }
    if (requestEpoch !== cacheEpoch) return cachedSession ?? { status: "anonymous" };
    cachedSession = next;
    inflight = null;
    notifySession(next);
    return next;
  })();
  return inflight;
}

export function usePortalSession(): PortalSession {
  const [session, setSession] = useState<PortalSession>(
    () => cachedSession ?? { status: "loading" },
  );
  useEffect(() => {
    ensureStorageListener();
    let active = true;
    const update = (next: PortalSession) => {
      if (active) setSession(next);
    };
    listeners.add(update);
    void loadPortalSession().then((resolved) => {
      update(resolved);
    });
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);
  return session;
}

export function portalLoginUrl(returnTo: string): string {
  return `/st-qselector/login?next=${encodeURIComponent(returnTo)}`;
}

export function clearPortalSessionCache(): void {
  invalidateSession(true);
}

/** Test hook: the module-level session cache would otherwise leak across cases. */
export function resetPortalSessionCache(): void {
  invalidateSession(false);
}
