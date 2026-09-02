// config/admin-nav.ts
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FolderTree,
  Bike,
  Users,
  Settings,
  History,
  Contact,
  TrendingUp,
  Tag,
  Ticket,
  Megaphone,
  Activity,
  ChefHat,
  Coffee,
  ExternalLink,
  Package,
} from "lucide-react";

export const adminNavConfig = {
  operations: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Live Orders", url: "/admin/orders", icon: ShoppingBag },
    { title: "Order History", url: "/admin/orders/history", icon: History },
    { title: "Finance", url: "/admin/finance", icon: TrendingUp, permission: "canViewFinance" },
  ],
  store: [
    { title: "Menu Items", url: "/admin/menu", icon: UtensilsCrossed, permission: "canManageMenu" },
    { title: "Categories", url: "/admin/categories", icon: FolderTree, permission: "canManageMenu" },
    { title: "Deals", url: "/admin/deals", icon: Tag, permission: "canManageMenu" },
    { title: "Coupons", url: "/admin/coupons", icon: Ticket, permission: "canManageCoupons" },
    { title: "Inventory", url: "/admin/inventory", icon: Package, permission: "canViewInventory" },
  ],
  people: [
    { title: "Customers", url: "/admin/customers", icon: Contact },
    { title: "CRM Outbox", url: "/admin/outbox", icon: Megaphone, permission: "canBroadcastWhatsapp" },
    { title: "Riders", url: "/admin/riders", icon: Bike, permission: "canManageStaff" },
    { title: "Staff", url: "/admin/staff", icon: Users, permission: "canManageStaff" },
  ],
  system: [
    { title: "Settings", url: "/admin/settings", icon: Settings, permission: "adminOnly" },
    { title: "Activity Log", url: "/admin/activity", icon: Activity, permission: "adminOnly" },
  ],
  portals: [
    { title: "Kitchen (KDS)", url: "/kitchen", icon: ChefHat },
    { title: "Waiter Portal", url: "/waiter", icon: Coffee },
    { title: "Rider App", url: "/rider", icon: ExternalLink },
  ]
};
