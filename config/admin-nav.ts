import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FolderTree,
  Boxes,
  Bike,
  Users,
  Settings,
} from "lucide-react";

export const adminNavConfig = {
  operations: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Live Orders",
      url: "/admin/orders",
      icon: ShoppingBag,
      badge: "3", // Placeholder
    },
  ],
  store: [
    {
      title: "Menu Items",
      url: "/admin/menu",
      icon: UtensilsCrossed,
    },
    {
      title: "Categories",
      url: "/admin/categories",
      icon: FolderTree,
    },
    {
      title: "Inventory",
      url: "/admin/inventory",
      icon: Boxes,
    },
  ],
  people: [
    {
      title: "Riders",
      url: "/admin/riders",
      icon: Bike,
    },
    {
      title: "Staff",
      url: "/admin/staff",
      icon: Users,
    },
  ],
  system: [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
    },
  ],
};
