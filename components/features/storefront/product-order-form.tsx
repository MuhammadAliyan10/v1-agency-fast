"use client";

import React, { useState, useEffect } from "react";
import { Minus, Plus, Flame, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";

interface ProductOrderFormProps {
  item: any;
  globalAddons?: { categoryId: string; categoryName: string; items: any[] }[];
}

export function ProductOrderForm({ item, globalAddons = [] }: ProductOrderFormProps) {
  const { addItem } = useCart();
  
  // Main Item State
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]); // internal itemAddOns
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Global Add-ons State (Independent line items)
  // Track selected variants for cross-sells
  const [crossSellVariantSelections, setCrossSellVariantSelections] = useState<Record<string, string>>({});
  // Track quantities for cross-sells
  const [crossSellQuantities, setCrossSellQuantities] = useState<Record<string, number>>({});

  const variants = item.variants || [];
  const addOns = item.addOns || [];

  useEffect(() => {
    if (variants.length > 0) {
      setSelectedVariant(variants[0]);
    }
  }, [variants]);

  // Handle Internal Customizations
  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  // Cross-sell Helpers
  const updateCrossSellQuantity = (menuItemId: string, delta: number) => {
    setCrossSellQuantities(prev => {
      const current = prev[menuItemId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[menuItemId];
      } else {
        updated[menuItemId] = next;
      }
      return updated;
    });
  };

  const setCrossSellVariant = (menuItemId: string, variantId: string) => {
    setCrossSellVariantSelections(prev => ({
      ...prev,
      [menuItemId]: variantId
    }));
  };

  // Pricing calculations
  const mainItemPrice = (selectedVariant ? selectedVariant.price : item.basePrice) + 
    selectedAddOns.reduce((sum, id) => {
      const addon = addOns.find((a: any) => a.id === id);
      return addon ? sum + addon.price : sum;
    }, 0);

  const mainItemTotal = mainItemPrice * quantity;

  // Calculate Cross-sell totals
  let crossSellsTotal = 0;
  globalAddons.forEach(cat => {
    cat.items.forEach(crossItem => {
      const qty = crossSellQuantities[crossItem.id] || 0;
      if (qty > 0) {
        let price = crossItem.basePrice;
        if (crossItem.variants?.length > 0) {
          const selectedVariantId = crossSellVariantSelections[crossItem.id] || crossItem.variants[0].id;
          const variant = crossItem.variants.find((v: any) => v.id === selectedVariantId);
          if (variant) price = variant.price;
        }
        crossSellsTotal += price * qty;
      }
    });
  });

  const grandTotal = mainItemTotal + crossSellsTotal;

  const handleAddToCart = () => {
    // 1. Add Main Item
    const selectedAddOnsData = selectedAddOns.map(id => {
      const a = addOns.find((addon: any) => addon.id === id);
      return a ? { name: a.name, price: a.price } : null;
    }).filter(Boolean) as { name: string; price: number }[];

    addItem({
      menuItemId: item.id,
      name: item.name,
      variantName: selectedVariant ? selectedVariant.name : undefined,
      addOns: selectedAddOnsData.length > 0 ? selectedAddOnsData : undefined,
      quantity,
      unitPrice: mainItemPrice,
      subtotal: mainItemTotal,
      imageUrl: item.imageUrl || undefined,
      specialInstructions: specialInstructions.trim() !== "" ? specialInstructions.trim() : undefined,
    });

    let addedCount = quantity;

    // 2. Add Global Cross-Sells
    globalAddons.forEach(cat => {
      cat.items.forEach(crossItem => {
        const qty = crossSellQuantities[crossItem.id] || 0;
        if (qty > 0) {
          let variantName = undefined;
          let unitPrice = crossItem.basePrice;

          if (crossItem.variants?.length > 0) {
            const selectedVariantId = crossSellVariantSelections[crossItem.id] || crossItem.variants[0].id;
            const variant = crossItem.variants.find((v: any) => v.id === selectedVariantId);
            if (variant) {
              variantName = variant.name;
              unitPrice = variant.price;
            }
          }

          addItem({
            menuItemId: crossItem.id,
            name: crossItem.name,
            variantName,
            quantity: qty,
            unitPrice,
            subtotal: unitPrice * qty,
            imageUrl: crossItem.imageUrl || undefined,
          });
          
          addedCount += qty;
        }
      });
    });
    
    toast.success(`${addedCount} item(s) added to cart!`);
    
    // Reset cross sells after adding
    setCrossSellQuantities({});
    setSpecialInstructions("");
    setQuantity(1);
  };

  return (
    <div className="flex flex-col w-full mt-4">
      {(item.tags?.isSpicy || item.tags?.isVeg) && (
        <div className="flex gap-2 mb-2">
          {item.tags?.isSpicy && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 px-2 py-1 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3" /> Spicy
            </div>
          )}
          {item.tags?.isVeg && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 px-2 py-1 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
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
                <div className="border border-muted bg-transparent p-3 transition-all peer-checked:border-primary peer-checked:bg-primary/5 flex flex-col justify-center items-center text-center">
                  <span className="font-medium text-sm text-foreground">{variant.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Rs. {variant.price}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Internal Customizations */}
      {addOns.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mt-6 mb-3 uppercase tracking-wider text-muted-foreground">Modify Your Item</h3>
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
                <div className="border border-muted bg-transparent p-3 transition-all peer-checked:border-primary peer-checked:bg-primary/5 flex flex-col justify-center items-center text-center">
                  <span className="font-medium text-sm text-foreground leading-tight">{addon.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">+ Rs. {addon.price}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Special Instructions */}
      <div className="mt-6 mb-2">
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Special Instructions</h3>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="e.g. No mayo, extra spicy..."
          className="w-full bg-transparent border border-muted p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
        />
      </div>
      
      {/* Global Add-ons / Cross-Selling */}
      {globalAddons.length > 0 && (
        <div className="mt-8 border-t pt-8 space-y-8">
          {globalAddons.map((category) => (
            <div key={category.categoryId}>
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">
                Complete Your Meal — {category.categoryName}
              </h3>
              <div className="space-y-4">
                {category.items.map(crossItem => {
                  const qty = crossSellQuantities[crossItem.id] || 0;
                  const hasVariants = crossItem.variants?.length > 0;
                  const selectedVariantId = crossSellVariantSelections[crossItem.id] || (hasVariants ? crossItem.variants[0].id : null);
                  
                  let displayPrice = crossItem.basePrice;
                  if (hasVariants && selectedVariantId) {
                    const v = crossItem.variants.find((v:any) => v.id === selectedVariantId);
                    if (v) displayPrice = v.price;
                  }

                  return (
                    <div key={crossItem.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border bg-card">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{crossItem.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Rs. {displayPrice}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                        {hasVariants && (
                          <Select 
                            value={selectedVariantId} 
                            onValueChange={(val) => setCrossSellVariant(crossItem.id, val)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              {crossItem.variants.map((v: any) => (
                                <SelectItem key={v.id} value={v.id} className="text-xs">
                                  {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <div className="flex items-center gap-2 bg-muted/50 p-0.5 border border-border/50">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-foreground hover:bg-background"
                            onClick={() => updateCrossSellQuantity(crossItem.id, -1)}
                            disabled={qty === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-4 text-center font-bold text-xs">{qty}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-foreground hover:bg-background"
                            onClick={() => updateCrossSellQuantity(crossItem.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spacer for mobile fixed bottom bar */}
      <div className="h-32" />

      {/* Quantity & Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-[100] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row items-center gap-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center bg-zinc-100/80 p-1 w-auto justify-between border border-zinc-200/50">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 text-zinc-950 hover:bg-white active:scale-95 transition-all"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="w-10 text-center font-bold text-lg text-zinc-950">{quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0 text-zinc-950 hover:bg-white active:scale-95 transition-all"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            onClick={handleAddToCart} 
            className="flex-1 h-[56px] font-bold shadow-xl shadow-primary/20 text-base active:scale-[0.98] transition-transform flex items-center justify-between px-6"
          >
            <span>Add To Cart</span>
            <span className="font-black opacity-90">{STORE_CONSTANTS.CURRENCY} {grandTotal}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
