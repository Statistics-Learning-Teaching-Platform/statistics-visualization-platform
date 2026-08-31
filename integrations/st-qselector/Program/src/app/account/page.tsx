"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, Trash2, UserPlus } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth/client";
import { withBasePath } from "@/lib/base-path";
import type { UserRole } from "@/lib/auth/policy";

interface Viewer {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
}

interface ManagedUser {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

interface AccountData {
  viewer: Viewer;
  users: ManagedUser[];
}

const roleLabel: Record<UserRole, string> = {
  student: "学生",
  teacher: "老师",
  superadmin: "超级管理员",
};

async function fetchAccountData(): Promise<AccountData | null> {
  const meResponse = await authenticatedFetch("/api/auth/me");
  if (meResponse.status === 401) {
    window.location.assign(withBasePath("/login"));
    return null;
  }
  if (!meResponse.ok) throw new Error("账号信息加载失败");

  const me = (await meResponse.json()) as { user: Viewer };
  let users: ManagedUser[] = [];
  if (me.user.role !== "student") {
    const usersResponse = await authenticatedFetch("/api/admin/users");
    if (usersResponse.ok) {
      users = ((await usersResponse.json()) as { users: ManagedUser[] }).users;
    }
  }
  return { viewer: me.user, users };
}

export default function AccountPage() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchAccountData();
    if (!data) return;
    setViewer(data.viewer);
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAccountData()
      .then((data) => {
        if (!active || !data) return;
        setViewer(data.viewer);
        setUsers(data.users);
        setLoading(false);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "账号信息加载失败");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = { currentPassword: String(form.get("currentPassword") ?? "") };
    const username = String(form.get("username") ?? "").trim();
    const newPassword = String(form.get("newPassword") ?? "");
    if (username && username !== viewer?.username) payload.username = username;
    if (newPassword) payload.newPassword = newPassword;
    const response = await authenticatedFetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return setError(result.error ?? "修改失败");
    setMessage("账号资料已更新");
    (event.currentTarget as HTMLFormElement).reset();
    await load();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await authenticatedFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password"), role: form.get("role") }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return setError(result.error ?? "创建失败");
    setMessage("账号已创建，首次登录后应立即修改密码");
    (event.currentTarget as HTMLFormElement).reset();
    await load();
  }

  async function removeUser(user: ManagedUser) {
    if (!window.confirm(`确定删除${roleLabel[user.role]}账号 ${user.username}？此操作会同时清除其登录会话。`)) return;
    const response = await authenticatedFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return setError(result.error ?? "删除失败");
    setMessage("账号已删除");
    await load();
  }

  async function logout() {
    await authenticatedFetch("/api/auth/logout", { method: "POST" });
    window.location.assign(withBasePath("/login"));
  }

  if (loading) return <main className="auth-page"><div className="auth-loading"><Loader2 className="auth-spin" /> 正在加载账号信息…</div></main>;

  return (
    <main className="account-page">
      <header className="account-header">
        <div><div className="auth-brand"><span>▥</span> STATMIND</div><h1>账号与权限</h1></div>
        <nav><a href={withBasePath("/")}>返回题库</a><button type="button" onClick={logout}><LogOut /> 退出登录</button></nav>
      </header>
      <div className="account-grid">
        <section className="account-panel">
          <p className="auth-eyebrow">个人资料 · {viewer ? roleLabel[viewer.role] : ""}</p>
          <h2>{viewer?.username}</h2>
          {viewer?.mustChangePassword && <p className="account-warning">这是初始密码，请立即完成密码修改。</p>}
          <form className="auth-form" onSubmit={updateProfile}>
            <label><span>新用户名</span><input name="username" defaultValue={viewer?.username} minLength={3} maxLength={64} /></label>
            <label><span>新密码（不修改可留空）</span><input name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" /></label>
            <label><span>当前密码（用于确认）</span><input name="currentPassword" type="password" required maxLength={128} autoComplete="current-password" /></label>
            <button className="auth-primary" type="submit">保存个人资料</button>
          </form>
        </section>

        {viewer && viewer.role !== "student" && <section className="account-panel account-panel--wide">
          <p className="auth-eyebrow">权限管理</p>
          <h2>账号管理</h2>
          <form className="account-create" onSubmit={createUser}>
            <input name="username" placeholder="新用户名" required minLength={3} maxLength={64} />
            <input name="password" type="password" placeholder="初始密码（至少 8 位）" required minLength={8} maxLength={128} />
            <select name="role" defaultValue="student">
              <option value="student">学生</option>
              {viewer.role === "superadmin" && <option value="teacher">老师</option>}
            </select>
            <button className="auth-primary" type="submit"><UserPlus /> 新建账号</button>
          </form>
          <div className="account-users">
            {users.map((user) => <article key={user.id}>
              <div><strong>{user.username}</strong><span>{roleLabel[user.role]}{user.mustChangePassword ? " · 待修改初始密码" : ""}</span></div>
              <button type="button" onClick={() => removeUser(user)} aria-label={`删除 ${user.username}`}><Trash2 /> 删除</button>
            </article>)}
            {!users.length && <p className="account-empty">目前没有可管理的账号。</p>}
          </div>
        </section>}
      </div>
      {(error || message) && <div className={error ? "account-toast account-toast--error" : "account-toast"} role="status">{error || message}</div>}
    </main>
  );
}
