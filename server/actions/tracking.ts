"use server";

import { db } from "@/database/db";
import { orders } from "@/database/schema";
import { eq, or } from "drizzle-orm";

export async function getOrderTrackingStatus(tokenOrId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: or(
        eq(orders.trackingToken, tokenOrId),
        eq(orders.id, tokenOrId)
      ),
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

    // Mask PII
    let maskedName = order.customerName;
    if (maskedName.includes(" ")) {
      const parts = maskedName.split(" ");
      maskedName = `${parts[0]} ${parts[1][0]}***`;
    } else {
      maskedName = `${maskedName.substring(0, 3)}***`;
    }

    let maskedPhone = order.customerPhone;
    if (maskedPhone.length >= 7) {
      const prefix = maskedPhone.substring(0, 5); // +92 3
      const suffix = maskedPhone.substring(maskedPhone.length - 3);
      maskedPhone = `${prefix}** ****${suffix}`;
    }

    let maskedAddress = order.deliveryAddress;
    if (maskedAddress) {
      // Just keep Area or Mask it
      const areaIndex = maskedAddress.indexOf("Area:");
      if (areaIndex !== -1) {
        maskedAddress = maskedAddress.substring(areaIndex);
      } else {
        maskedAddress = "(Masked for privacy)";
      }
    }

    const maskedOrder = {
      ...order,
      customerName: maskedName,
      customerPhone: maskedPhone,
      deliveryAddress: maskedAddress
    };

    return { success: true, data: maskedOrder };
  } catch (error) {
    console.error("Error fetching order status:", error);
    return { success: false, error: "Failed to fetch order tracking information" };
  }
}
