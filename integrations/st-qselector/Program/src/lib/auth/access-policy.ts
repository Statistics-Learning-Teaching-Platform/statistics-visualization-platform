import type { UserRole } from "./policy";

export interface SessionAccessUser {
  role: UserRole;
  mustChangePassword: boolean;
}

export function sessionAccessError(
  user: SessionAccessUser,
  roles?: readonly UserRole[],
): { status: 403; message: string } | null {
  if (user.mustChangePassword) {
    return { status: 403, message: "首次登录必须先修改初始密码" };
  }
  if (roles && !roles.includes(user.role)) {
    return { status: 403, message: "当前账号没有此操作权限" };
  }
  return null;
}
