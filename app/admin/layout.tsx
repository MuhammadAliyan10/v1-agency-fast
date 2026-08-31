"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/features/admin/app-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Add admin-theme to body so that portals (Dialogs, Selects) inherit the theme
    document.body.classList.add("admin-theme");
    return () => {
      document.body.classList.remove("admin-theme");
    };
  }, []);

  // If we are on the login page, do not render sidebar and header
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="admin-theme flex w-full min-h-screen">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen bg-background w-full">
          <header className="md:hidden flex h-14 items-center border-b bg-muted/20 px-4 shrink-0">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
