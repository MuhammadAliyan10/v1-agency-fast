"use server";

import { db } from "@/database/db";
import { activityLog, users } from "@/database/schema";
import { requireSuperAdmin } from "@/lib/auth/session";
import { desc, count, eq } from "drizzle-orm";

export type ActivityLogEntry = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any | null;
  createdAt: Date | null;
};

export async function getActivityLogs(page: number = 1, limit: number = 20) {
  await requireSuperAdmin();

  try {
    const offset = (page - 1) * limit;

    const [totalCountResult] = await db.select({ count: count() }).from(activityLog);
    const totalCount = totalCountResult.count;

    const logs = await db
      .select({
        id: activityLog.id,
        userId: activityLog.userId,
        userName: users.name,
        action: activityLog.action,
        targetType: activityLog.targetType,
        targetId: activityLog.targetId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset);

    return { 
      success: true, 
      data: {
        logs,
        pagination: {
          total: totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
          perPage: limit,
        }
      } 
    };
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return { success: false, error: "Failed to fetch activity logs." };
  }
}

export async function logActivity(userId: string | undefined, action: string, targetType?: string, targetId?: string, metadata?: any) {
  try {
    if (!userId) return; // Don't log if system or unauthenticated
    await db.insert(activityLog).values({
      userId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      metadata: metadata || null,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Non-blocking error
  }
}
