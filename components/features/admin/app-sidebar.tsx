"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { adminNavConfig } from "@/config/admin-nav";
import { logoutAdmin } from "@/server/actions/auth";
import { getLiveOrders } from "@/server/actions/live-orders";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { state } = useSidebar();
  
  const [pendingOrdersCount, setPendingOrdersCount] = React.useState(0);

  React.useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const res = await getLiveOrders();
        if (res.success && res.data) {
          const count = res.data.filter(o => o.status === "pending").length;
          console.log("Live orders count:", count);
          setPendingOrdersCount(count);
        } else {
          console.error("Failed to fetch live orders:", res.error);
        }
      } catch (e) {
        console.error("Live orders catch error:", e);
      }
    };

    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-5 pb-2 px-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/admin/dashboard" className="flex items-center gap-0.5 font-bold text-lg tracking-tight">
              {state === "collapsed" ? (
                <span>C<span className="text-orange-500">.</span></span>
              ) : (
                <>Classy Crave<span className="text-orange-500">.</span></>
              )}
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="absolute right-[-12px] top-4 z-50 hidden">
           <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {Object.entries(adminNavConfig).map(([key, items]) => (
          <SidebarGroup key={key} className="pt-3">
            <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground/70 px-3 mb-0.5">
              {key === "Main" ? "Platform" : key}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        className={`font-medium transition-colors ${
                          isActive 
                            ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25" 
                            : "text-foreground/80 hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <Link href={item.url} className="flex items-center gap-2.5">
                          {/* @ts-ignore */}
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.url === "/admin/orders" ? (
                        pendingOrdersCount > 0 && (
                          <SidebarMenuBadge className="bg-orange-500 text-white rounded-full px-1.5 py-0 text-[9px] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                            {pendingOrdersCount}
                          </SidebarMenuBadge>
                        )
                      ) : (item as any).badge ? (
                        <SidebarMenuBadge className="bg-orange-500 text-white rounded-full px-1.5 py-0 text-[9px]">
                          {(item as any).badge}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8 rounded-full border shadow-sm">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="rounded-full bg-slate-900 text-white font-bold text-xs">MA</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                    <span className="truncate font-semibold text-sm">Muhammad Aliyan</span>
                    <span className="truncate text-xs text-muted-foreground">aliyannadeem10@gmail.com</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up w-4 h-4 text-muted-foreground"><path d="m18 15-6-6-6 6"/></svg>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-[200px]">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="w-full cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                  <Sun className="mr-2 h-4 w-4" />
                  Light Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">Store Online</span>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={async () => {
                    await logoutAdmin();
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
