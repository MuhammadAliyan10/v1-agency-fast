import "dotenv/config";
import { db } from "../db";
import { users } from "../schema";
import { hashPassword } from "../../lib/auth/password";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding Default Admin User...");

  const targetEmail = "admin@classycrave.com";
  
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, targetEmail),
  });

  if (existingAdmin) {
    console.log(`Admin user with email ${targetEmail} already exists.`);
    process.exit(0);
  }

  const hashedPassword = await hashPassword("AdminPassword123!");

  await db.insert(users).values({
    name: "System Owner",
    phone: "03001234567",
    email: targetEmail,
    passwordHash: hashedPassword,
    role: "admin",
  });

  console.log(`✅ Default admin created successfully. (${targetEmail})`);
}

main().catch((err) => {
  console.error("❌ Admin seeding failed:", err);
  process.exit(1);
});
