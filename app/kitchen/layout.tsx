// app/kitchen/layout.tsx
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  await verifySessionOrRedirect(["kitchen", "admin"]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
