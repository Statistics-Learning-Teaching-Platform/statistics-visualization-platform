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

let cachedSession: PortalSession | null = null;
let inflight: Promise<PortalSession> | null = null;

export function loadPortalSession(): Promise<PortalSession> {
  if (cachedSession) return Promise.resolve(cachedSession);
  if (inflight) return inflight;
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
    cachedSession = next;
    inflight = null;
    return next;
  })();
  return inflight;
}

export function usePortalSession(): PortalSession {
  const [session, setSession] = useState<PortalSession>(
    () => cachedSession ?? { status: "loading" },
  );
  useEffect(() => {
    let active = true;
    void loadPortalSession().then((resolved) => {
      if (active) setSession(resolved);
    });
    return () => {
      active = false;
    };
  }, []);
  return session;
}

export function portalLoginUrl(returnTo: string): string {
  return `/st-qselector/login?next=${encodeURIComponent(returnTo)}`;
}

/** Test hook: the module-level session cache would otherwise leak across cases. */
export function resetPortalSessionCache(): void {
  cachedSession = null;
  inflight = null;
}
