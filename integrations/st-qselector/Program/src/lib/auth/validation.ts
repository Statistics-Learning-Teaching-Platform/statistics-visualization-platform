import { z } from "zod";
import { userRoles } from "./policy";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少需要 3 个字符")
  .max(64, "用户名不能超过 64 个字符")
  .regex(/^[A-Za-z0-9_.-]+$/, "用户名只能包含字母、数字、点、下划线和连字符");

export const passwordSchema = z
  .string()
  .min(8, "密码至少需要 8 个字符")
  .max(128, "密码不能超过 128 个字符");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
});
export const profileUpdateSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    username: usernameSchema.optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((value) => value.username !== undefined || value.newPassword !== undefined, {
    message: "没有需要更新的内容",
  });

export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(userRoles),
});
