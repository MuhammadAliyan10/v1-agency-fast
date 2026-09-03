import { db } from "../database/db";
import { orders } from "../database/schema";
async function main() {
  await db.delete(orders);
  console.log("Deleted all orders");
  process.exit(0);
}
main();
