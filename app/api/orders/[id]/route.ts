import { NextResponse } from "next/server";
import { db } from "@/database/db";
import { eq } from "drizzle-orm";
import { orders } from "@/database/schema";
import { updateOrderStatusSchema } from "@/lib/validations/order";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Fetch current order to validate transition
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const validatedData = updateOrderStatusSchema.safeParse({
      currentStatus: currentOrder.status,
      targetStatus: body.targetStatus,
    });

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Invalid status transition", data: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { targetStatus } = validatedData.data;

    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        status: targetStatus as any,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("[ORDERS_PATCH]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update order" },
      { status: 500 }
    );
  }
}
