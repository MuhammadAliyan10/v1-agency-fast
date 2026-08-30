"use client";

import { useCart } from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

interface DealItem {
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  variantId?: string;
}

interface Deal {
  id: string;
  name: string;
  dealPrice: number;
  items: DealItem[];
}

export function DealAddToCart({ deal }: { deal: Deal }) {
  const { addItem, clearCart } = useCart();

  const handleAdd = () => {
    const itemCount = deal.items.reduce((s, i) => s + i.quantity, 0);
    const pricePerItem = Math.floor(deal.dealPrice / itemCount);

    deal.items.forEach((item) => {
      addItem({
        menuItemId: item.menuItemId,
        name: `${item.itemName} (Deal)`,
        quantity: item.quantity,
        unitPrice: pricePerItem,
        subtotal: pricePerItem * item.quantity,
      });
    });

    toast.success(`"${deal.name}" added to cart!`);
  };

  return (
    <Button onClick={handleAdd} size="sm" className="rounded-sm h-10 px-4 font-bold text-xs uppercase tracking-wide gap-1.5">
      <ShoppingBag className="w-3.5 h-3.5" />
      Add Deal
    </Button>
  );
}
