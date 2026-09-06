// This is a one-time migration to fix all managers that have zero permissions
import { db } from "@/database/db";
import { users, staffPermissions } from "@/database/schema";
import { eq } from "drizzle-orm";

const defaultFloorManagerPerms = {
  orders:    { read: true,  create: true,  update: true,  delete: true  },
  menu:      { read: true,  create: false, update: true,  delete: false },
  coupons:   { read: true,  create: false, update: false, delete: false },
  finance:   { read: false, create: false, update: false, delete: false },
  inventory: { read: false, create: false, update: false, delete: false },
  staff:     { read: false, create: false, update: false, delete: false },
  whatsapp:  { read: false, create: false, update: false, delete: false },
};

export async function fixManagerPermissions() {
  try {
    const managers = await db.query.users.findMany({
      where: eq(users.role, "manager"),
      with: { staffPermissions: true },
    });

    let repaired = 0;
    for (const mgr of managers) {
      const perms = mgr.staffPermissions?.permissions as any;
      const isEmpty = !perms || !perms.orders?.read;

      if (isEmpty) {
        await db
          .insert(staffPermissions)
          .values({
            userId: mgr.id,
            permissions: defaultFloorManagerPerms,
            maxDiscountPercentage: 0,
          })
          .onConflictDoUpdate({
            target: staffPermissions.userId,
            set: { permissions: defaultFloorManagerPerms, updatedAt: new Date() },
          });
        repaired++;
      }
    }

    console.log(`✓ Repaired permissions for ${repaired} manager(s).`);
    return repaired;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}
