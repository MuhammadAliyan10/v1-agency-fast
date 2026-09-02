import { z } from "zod";
import type { SessionPayload } from "./session";

// ── Zod Schema for strict JSONB fallback ──────────────────────────────────────
export const CRUDSchema = z.object({
  read: z.boolean().default(false),
  create: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const RBACMatrixSchema = z.object({
  menu: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  finance: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  coupons: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  inventory: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  staff: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  orders: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
  whatsapp: CRUDSchema.default({ read: false, create: false, update: false, delete: false }),
});

export type RBACMatrix = z.infer<typeof RBACMatrixSchema>;
export type RBACDomain = keyof RBACMatrix;
export type RBACAction = keyof z.infer<typeof CRUDSchema>;

export const DEFAULT_RBAC_MATRIX = RBACMatrixSchema.parse({});

// ── Authorization Utility ──────────────────────────────────────────────────────
export function hasPermission(
  session: SessionPayload | null | undefined,
  domain: RBACDomain,
  action: RBACAction
): boolean {
  if (!session) return false;
  
  // Admin bypasses all checks
  if (session.role === "admin") return true;
  
  // Managers are evaluated against their parsed matrix
  if (session.role === "manager" && session.permissions) {
    const domainPerms = session.permissions[domain];
    return domainPerms ? domainPerms[action] : false;
  }
  
  return false;
}
