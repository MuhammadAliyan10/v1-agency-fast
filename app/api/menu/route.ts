import { NextResponse } from "next/server";
import { db } from "@/database/db";
import { eq } from "drizzle-orm";
import { menuItems } from "@/database/schema";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const data = await db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
      with: {
        menuItems: {
          where: eq(menuItems.isAvailable, true),
          with: {
            variants: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[MENU_GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
