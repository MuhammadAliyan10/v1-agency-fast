"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/features/admin/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If we are on the login page, do not render sidebar and header
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full flex flex-col min-h-screen">
        <div className="flex-1 p-6 bg-muted/40 overflow-auto">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
