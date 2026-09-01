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
} from "lucide-react";

export const adminNavConfig = {
  operations: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Live Orders", url: "/admin/orders", icon: ShoppingBag },
    { title: "Order History", url: "/admin/orders/history", icon: History },
    { title: "Finance", url: "/admin/finance", icon: TrendingUp },
  ],
  store: [
    { title: "Menu Items", url: "/admin/menu", icon: UtensilsCrossed },
    { title: "Categories", url: "/admin/categories", icon: FolderTree },
    { title: "Deals", url: "/admin/deals", icon: Tag },
    { title: "Coupons", url: "/admin/coupons", icon: Ticket },
  ],
  people: [
    { title: "Customers", url: "/admin/customers", icon: Contact },
    { title: "CRM Outbox", url: "/admin/outbox", icon: Megaphone },
    { title: "Riders", url: "/admin/riders", icon: Bike },
    { title: "Staff", url: "/admin/staff", icon: Users },
  ],
  system: [
    { title: "Settings", url: "/admin/settings", icon: Settings },
    { title: "Activity Log", url: "/admin/activity", icon: Activity },
  ],
  portals: [
    { title: "Kitchen (KDS)", url: "/kitchen", icon: ChefHat },
    { title: "Waiter Portal", url: "/waiter", icon: Coffee },
    { title: "Rider App", url: "/rider", icon: ExternalLink },
  ]
};
