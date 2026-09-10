import { ChevronDownIcon, LogInIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useLanguage } from "@stats-viz/shared/i18n";
import { authenticatedFetch } from "../authenticatedFetch";
import {
  clearPortalSessionCache,
  portalLoginUrl,
  usePortalSession,
} from "./session";

interface PortalAuthEntryProps {
  currentIsProfile?: boolean;
  navigateHome?: () => void;
}

function currentReturnTo(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || "/";
}

function defaultNavigateHome(): void {
  window.location.assign("/");
}

export function PortalAuthEntry({
  currentIsProfile = false,
  navigateHome = defaultNavigateHome,
}: PortalAuthEntryProps) {
  const language = useLanguage();
  const session = usePortalSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuPinnedRef = useRef(false);
  const isChinese = language === "zh";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        menuPinnedRef.current = false;
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  function closeWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      menuPinnedRef.current = false;
      setMenuOpen(false);
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    // Focusing the trigger fires this container's focus-capture opener. Apply
    // the close state after that focus event so Escape does not immediately
    // reopen the menu it just dismissed.
    triggerRef.current?.focus();
    menuPinnedRef.current = false;
    setMenuOpen(false);
  }

  async function logout() {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutError("");
    try {
      const response = await authenticatedFetch("/st-qselector/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(isChinese ? "退出登录失败，请稍后重试。" : "Sign-out failed. Try again.");
      }
      clearPortalSessionCache();
      navigateHome();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : isChinese
            ? "退出登录失败，请稍后重试。"
            : "Sign-out failed. Try again.",
      );
      setLogoutPending(false);
      setMenuOpen(true);
    }
  }

  if (session.status === "loading") {
    return (
      <span
        className="ed-auth-entry ed-auth-entry--loading"
        aria-label={isChinese ? "正在确认登录状态" : "Checking sign-in status"}
      >
        <UserRoundIcon aria-hidden="true" />
      </span>
    );
  }

  if (session.status === "anonymous") {
    return (
      <a className="ed-auth-login" href={portalLoginUrl(currentReturnTo())}>
        <LogInIcon aria-hidden="true" />
        <span>{isChinese ? "登录" : "Sign in"}</span>
      </a>
    );
  }

  const avatarText = Array.from(session.username.trim())[0]?.toLocaleUpperCase() || "S";
  const menuLabel = isChinese
    ? `${session.username} 的账户菜单`
    : `Account menu for ${session.username}`;

  return (
    <div
      ref={containerRef}
      className="ed-auth-entry"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => {
        if (!menuPinnedRef.current) setMenuOpen(false);
      }}
      onBlurCapture={closeWhenFocusLeaves}
      onKeyDown={closeOnEscape}
    >
      <button
        ref={triggerRef}
        className="ed-account-trigger"
        type="button"
        aria-label={menuLabel}
        aria-expanded={menuOpen}
        aria-controls="ed-account-menu"
        onClick={() => {
          menuPinnedRef.current = !menuPinnedRef.current;
          setMenuOpen(menuPinnedRef.current);
        }}
      >
        <span className="ed-account-avatar" aria-hidden="true">
          {avatarText}
        </span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      <div
        id="ed-account-menu"
        className="ed-account-menu"
        role="group"
        aria-label={menuLabel}
        hidden={!menuOpen}
      >
        <a
          href="/profile"
          data-current={currentIsProfile || undefined}
          aria-current={currentIsProfile ? "page" : undefined}
        >
          <UserRoundIcon aria-hidden="true" />
          <span>{isChinese ? "个人中心" : "Profile"}</span>
        </a>
        <button type="button" disabled={logoutPending} onClick={() => void logout()}>
          <LogOutIcon aria-hidden="true" />
          <span>
            {logoutPending
              ? isChinese
                ? "正在退出…"
                : "Signing out…"
              : isChinese
                ? "退出登录"
                : "Sign out"}
          </span>
        </button>
        {logoutError ? (
          <p className="ed-account-menu__error" role="alert">
            {logoutError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
