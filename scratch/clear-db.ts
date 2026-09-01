import { db } from "../database/db";
import { orders, orderItems, orderStatusHistory, outboundMessages, whatsappMessages, whatsappSessions } from "../database/schema";
import { sql } from "drizzle-orm";

async function clearDB() {
  console.log("Clearing all test data...");
  await db.delete(orderStatusHistory);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(whatsappMessages);
  await db.delete(whatsappSessions);
  console.log("Done.");
  process.exit(0);
}

clearDB();
