"use server";

import { db } from "@/database/db";
import { eq, inArray } from "drizzle-orm";
import { users } from "@/database/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

export async function loginAdmin(data: LoginInput) {
  try {
    const parsed = loginSchema.safeParse(data);

    if (!parsed.success) {
      return { error: "Invalid input fields." };
    }

    const { email, password } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || (user.role !== "admin" && user.role !== "manager") || !user.passwordHash) {
      return { error: "Invalid email or password." };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid email or password." };
    }

    await createSession(user.id, user.role);

    return { success: true };
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return { error: "An unexpected error occurred. Please try again later." };
  }
}

export async function logoutAdmin() {
  await deleteSession();
  return { success: true };
}
