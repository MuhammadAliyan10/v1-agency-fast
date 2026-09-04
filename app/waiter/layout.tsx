// app/waiter/layout.tsx
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { logoutStaff } from "@/server/actions/auth";

async function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await logoutStaff();
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
    </form>
  );
}

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySessionOrRedirect(["waiter", "admin"]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slim header */}
      <header className="flex h-11 items-center justify-between border-b px-4 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          <span className="text-sm font-black tracking-tight">Floor Map</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs font-semibold text-muted-foreground">{session.name}</span>
        </div>
        <LogoutButton />
      </header>
      {/* Full-width content — no max-width constraint */}
      <main className="flex-1 p-3 sm:p-4 overflow-auto">{children}</main>
    </div>
  );
}
