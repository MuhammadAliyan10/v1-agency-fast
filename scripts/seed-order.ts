import crypto from "crypto";
import { db } from "../database/db";
import { orders, menuItems, orderItems } from "../database/schema";

async function main() {
  console.log("Creating a test order...");

  try {
    // 1. Get a random menu item
    const items = await db.query.menuItems.findMany({ limit: 1 });
    if (items.length === 0) {
      console.log("No menu items found. Please create one in the admin panel first.");
      return;
    }
    const item = items[0];

    for (let i = 0; i < 5; i++) {
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await db.insert(orders).values({
        id: orderId,
        trackingToken: crypto.randomUUID(),
        customerName: `Test User ${i + 1}`,
        customerPhone: `+92 300 123456${i}`,
        deliveryAddress: `${123 + i} Test Street, Lahore`,
        status: "pending",
        paymentMethod: "COD",
        paymentStatus: "unpaid",
        subtotal: item.basePrice * 2,
        deliveryFee: 150,
        discountAmount: 0,
        totalAmount: item.basePrice * 2 + 150,
      });

      // 3. Create the order item
      await db.insert(orderItems).values({
        orderId: orderId,
        menuItemId: item.id,
        itemName: item.name,
        quantity: 2,
        unitPrice: item.basePrice,
        subtotal: item.basePrice * 2,
      });

      console.log(`Successfully created test order: ${orderId}`);
    }
  } catch (error) {
    console.error("Error creating test order:", error);
  } finally {
    process.exit(0);
  }
}

main();
