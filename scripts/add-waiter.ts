import { config } from "dotenv";
config();
import { db } from "../database/db";
import { users } from "../database/schema";

async function main() {
  try {
    await db.insert(users).values({
      name: "Test Waiter Ali",
      phone: "00000000000",
      role: "manager",
    });
    console.log("Added Test Waiter Ali");
  } catch (error) {
    console.error("Failed:", error);
  }
  process.exit(0);
}

main();
