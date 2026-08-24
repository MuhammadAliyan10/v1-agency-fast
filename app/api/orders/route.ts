import { NextResponse } from "next/server";
import { db } from "@/database/db";
import { eq, inArray } from "drizzle-orm";
import { orders, orderItems, menuItems, itemVariants } from "@/database/schema";
import { createOrderSchema } from "@/lib/validations/order";

function generateOrderCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "CC-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = createOrderSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", data: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const data = validatedData.data;

    // Idempotency check
    if (data.idempotencyKey) {
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.idempotencyKey, data.idempotencyKey),
        with: { items: true },
      });

      if (existingOrder) {
        return NextResponse.json(
          { success: true, data: existingOrder },
          { status: 200 }
        );
      }
    }

    // Fetch real prices from DB
    const itemIds = data.items.map((i) => i.menuItemId);
    const variantIds = data.items
      .map((i) => i.variantId)
      .filter((id): id is string => id !== undefined && id !== null);

    const dbItems = await db.query.menuItems.findMany({
      where: inArray(menuItems.id, itemIds),
    });

    const dbVariants = variantIds.length > 0
      ? await db.query.itemVariants.findMany({
          where: inArray(itemVariants.id, variantIds),
        })
      : [];

    let subtotal = 0;
    const deliveryFee = 0; // Fixed for now, can be calculated based on address later

    const processedItems = data.items.map((item) => {
      const dbItem = dbItems.find((i) => i.id === item.menuItemId);
      if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      let unitPrice = dbItem.basePrice;
      if (item.variantId) {
        const dbVariant = dbVariants.find((v) => v.id === item.variantId);
        if (!dbVariant) throw new Error(`Variant ${item.variantId} not found`);
        unitPrice = dbVariant.price;
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        itemName: dbItem.name,
        variantName: item.variantId ? dbVariants.find((v) => v.id === item.variantId)?.name || null : null,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions || null,
      };
    });

    const totalAmount = subtotal + deliveryFee;

    // Transaction
    const orderResult = await db.transaction(async (tx) => {
      const orderCode = generateOrderCode();

      const [newOrder] = await tx
        .insert(orders)
        .values({
          id: orderCode,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress,
          paymentMethod: data.paymentMethod,
          status: "pending",
          paymentStatus: "unpaid",
          subtotal,
          deliveryFee,
          discountAmount: 0,
          totalAmount,
          deliveryNotes: data.specialNotes || null,
          idempotencyKey: data.idempotencyKey || null,
        })
        .returning();

      const itemsToInsert = processedItems.map((item) => ({
        orderId: newOrder.id,
        ...item,
      }));

      await tx.insert(orderItems).values(itemsToInsert);

      return newOrder;
    });

    // Fetch full order with items
    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderResult.id),
      with: { items: true },
    });

    return NextResponse.json(
      { success: true, data: fullOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[ORDERS_POST]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
