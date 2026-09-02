"use client";

import { useCart } from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

interface DealSlot {
  id: string;
  slotName: string;
  quantity: number;
  menuItemId?: string | null;
  categoryId?: string | null;
  requiredVariantName?: string | null;
  menuItem?: {
    id: string;
    name: string;
    basePrice: number;
  } | null;
}

interface Deal {
  id: string;
  name: string;
  dealPrice: number;
  slots: DealSlot[];
}

export function DealAddToCart({ deal }: { deal: Deal }) {
  const { addItem } = useCart();

  const handleAdd = () => {
    // Check if any slot requires configuration
    const requiresConfig = deal.slots.some(slot => !slot.menuItemId && slot.categoryId);
    
    if (requiresConfig) {
      toast.error("This combo requires customization. Please order via WhatsApp for now!");
      return;
    }

    const slotCount = deal.slots.reduce((s, i) => s + i.quantity, 0);
    const pricePerSlot = slotCount > 0 ? Math.floor(deal.dealPrice / slotCount) : deal.dealPrice;

    deal.slots.forEach((slot) => {
      if (slot.menuItemId) {
        addItem({
          menuItemId: slot.menuItemId,
          name: `[DEAL: ${deal.name}] ${slot.slotName}`,
          quantity: slot.quantity,
          unitPrice: pricePerSlot,
          subtotal: pricePerSlot * slot.quantity,
          specialInstructions: `[DEAL: ${deal.name}]`
        });
      }
    });

    toast.success(`"${deal.name}" added to cart!`);
  };

  return (
    <Button onClick={handleAdd} size="sm" className="h-10 px-4 font-bold text-xs uppercase tracking-wide gap-1.5">
      <ShoppingBag className="w-3.5 h-3.5" />
      Add Deal
    </Button>
  );
}
