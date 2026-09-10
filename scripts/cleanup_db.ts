import { config } from "dotenv";
config();
import { db } from "../database/db";
import {
  orderItems,
  orderStatusHistory,
  orders,
  registerShifts,
  whatsappMessages,
  outboundMessages,
  whatsappSessions,
  activityLog,
  reviews,
  users,
  inventoryTransactions,
} from "../database/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting database cleanup...");

  // Delete all order related data
  console.log("Deleting order items...");
  await db.delete(orderItems);

  console.log("Deleting order status history...");
  await db.delete(orderStatusHistory);

  console.log("Deleting orders...");
  await db.delete(orders);

  // Delete all finance/shift data
  console.log("Deleting register shifts...");
  await db.delete(registerShifts);

  console.log("Deleting inventory transactions...");
  await db.delete(inventoryTransactions);

  // Delete all whatsapp/messaging data
  console.log("Deleting whatsapp messages...");
  await db.delete(whatsappMessages);

  console.log("Deleting outbound messages...");
  await db.delete(outboundMessages);

  console.log("Deleting whatsapp sessions...");
  await db.delete(whatsappSessions);

  // Delete logs and reviews
  console.log("Deleting activity logs...");
  await db.delete(activityLog);

  console.log("Deleting reviews...");
  await db.delete(reviews);

  // Delete customer users
  console.log("Deleting customers...");
  await db.delete(users).where(eq(users.role, "customer"));

  console.log("Database cleanup complete! Fresh start ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during cleanup:", err);
  process.exit(1);
});
