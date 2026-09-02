import { getSession } from "@/lib/auth/session";
import { AdminLayoutClient } from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <AdminLayoutClient session={session}>
      {children}
    </AdminLayoutClient>
  );
}
