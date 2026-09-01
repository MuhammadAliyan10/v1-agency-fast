// app/waiter/layout.tsx
import { verifySessionOrRedirect } from "@/lib/auth/verify-session";
import { LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center justify-between border-b px-6 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-black text-primary-foreground">CC</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Classy Crave</p>
            <p className="text-[10px] text-muted-foreground">Floor Staff · {session.name}</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <main className="p-4 max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
