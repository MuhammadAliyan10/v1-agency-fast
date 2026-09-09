import "dotenv/config";
import { db } from '../database/db';
import { orders } from '../database/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const msgs = await db.query.orders.findFirst({
    where: eq(orders.id, "WA6654")
  });
  console.log(JSON.stringify(msgs, null, 2));
}
run();
