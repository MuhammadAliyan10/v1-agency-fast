"use client";

import React, { useState, useEffect } from "react";
import { Minus, Plus, Flame, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";

interface ProductOrderFormProps {
  item: any;
}

export function ProductOrderForm({ item }: ProductOrderFormProps) {
  const { addItem } = useCart();
  
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const variants = item.variants || [];
  const addOns = item.addOns || [];

  useEffect(() => {
    if (variants.length > 0) {
      setSelectedVariant(variants[0]);
    }
  }, [variants]);

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const currentPrice = (selectedVariant ? selectedVariant.price : item.basePrice) + 
    selectedAddOns.reduce((sum, id) => {
      const addon = addOns.find((a: any) => a.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);

  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    const selectedAddOnsData = selectedAddOns.map(id => {
      const a = addOns.find((addon: any) => addon.id === id);
      return { name: a.name, price: a.price };
    }).filter(Boolean);

    addItem({
      menuItemId: item.id,
      name: item.name,
      variantName: selectedVariant ? selectedVariant.name : undefined,
      addOns: selectedAddOnsData.length > 0 ? selectedAddOnsData : undefined,
      quantity,
      unitPrice: currentPrice,
      subtotal: totalPrice,
      imageUrl: item.imageUrl || undefined,
    });
    
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <div className="flex flex-col w-full mt-4">
      {(item.tags?.isSpicy || item.tags?.isVeg) && (
        <div className="flex gap-2 mb-2">
          {item.tags?.isSpicy && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3" /> Spicy
            </div>
          )}
          {item.tags?.isVeg && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
              <Leaf className="w-3 h-3" /> Vegetarian
            </div>
          )}
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mt-6 mb-3 uppercase tracking-wider text-muted-foreground">Choose Size</h3>
          <div className="grid grid-cols-2 gap-3">
            {variants.map((variant: any) => (
              <label
                key={variant.id}
                className="relative cursor-pointer group"
              >
                <input
                  type="radio"
                  name="variant"
                  value={variant.id}
                  checked={selectedVariant?.id === variant.id}
                  onChange={() => setSelectedVariant(variant)}
                  className="peer sr-only"
                />
                <div className="border border-muted bg-transparent p-3 rounded-lg transition-all peer-checked:border-primary peer-checked:bg-primary/5 flex flex-col justify-center items-center text-center">
                  <span className="font-medium text-sm text-foreground">{variant.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Rs. {variant.price}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {addOns.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mt-6 mb-3 uppercase tracking-wider text-muted-foreground">Add Extras</h3>
          <div className="grid grid-cols-2 gap-3">
            {addOns.map((addon: any) => (
              <label
                key={addon.id}
                className="relative cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedAddOns.includes(addon.id)}
                  onChange={() => handleAddOnToggle(addon.id)}
                  className="peer sr-only"
                />
                <div className="border border-muted bg-transparent p-3 rounded-lg transition-all peer-checked:border-primary peer-checked:bg-primary/5 flex flex-col justify-center items-center text-center">
                  <span className="font-medium text-sm text-foreground leading-tight">{addon.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">+ Rs. {addon.price}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Spacer for mobile fixed bottom bar */}
      <div className="h-20" />

      {/* Quantity & Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-3 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-row items-center gap-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 w-auto justify-between border border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md shrink-0 text-foreground"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-bold text-sm">{quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md shrink-0 text-foreground"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            onClick={handleAddToCart} 
            className="flex-1 h-10 rounded-lg font-bold shadow-sm text-sm"
          >
            Add • {STORE_CONSTANTS.CURRENCY} {totalPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}
