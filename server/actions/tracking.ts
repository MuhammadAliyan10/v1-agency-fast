"use server";

import { db } from "@/database/db";
import { orders } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function getOrderTrackingStatus(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: {
          with: {
            menuItem: {
              columns: {
                imageUrl: true,
              }
            }
          }
        },
        rider: {
          columns: {
            name: true,
            phone: true,
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching order status:", error);
    return { success: false, error: "Failed to fetch order tracking information" };
  }
}
