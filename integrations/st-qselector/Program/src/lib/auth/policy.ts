export const userRoles = ["student", "teacher", "superadmin"] as const;
export type UserRole = (typeof userRoles)[number];

export function canManageRole(actor: UserRole, target: UserRole): boolean {
  if (actor === "teacher") return target === "student";
  if (actor === "superadmin") return target === "student" || target === "teacher";
  return false;
}
export function canUseTeacherTools(role: UserRole): boolean {
  return role === "teacher" || role === "superadmin";
}

export function canUseTutor(role: UserRole): boolean {
  return userRoles.includes(role);
}
