import { getSession } from "@/lib/auth/session";
import { AdminLayoutClient } from "./AdminLayoutClient";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState ? sidebarState === "true" : true;

  return (
    <AdminLayoutClient session={session} defaultOpen={defaultOpen}>
      {children}
    </AdminLayoutClient>
  );
}
