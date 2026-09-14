"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus, Utensils } from "lucide-react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCrossSellDrinks } from "@/server/actions/cross-sell";

export interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
}

export function ProductDetailDrawer({ isOpen, onClose, item }: ProductDetailDrawerProps) {
  const addItem = useCartStore((state) => state.addItem);
  
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [crossSellDrinks, setCrossSellDrinks] = useState<any[]>([]);
  const [crossSellSelections, setCrossSellSelections] = useState<Record<string, {
    menuItemId: string;
    name: string;
    variantName?: string;
    unitPrice: number;
    imageUrl?: string;
    quantity: number;
  }>>({});

  useEffect(() => {
    if (item && isOpen) {
      if (item.variants && item.variants.length > 0) {
        setSelectedVariant(item.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setSelectedAddOns([]);
      setQuantity(1);
      setCrossSellSelections({});
      
      // Fetch drinks for upselling, passing the item's categoryId to prevent recursive cross-selling
      getCrossSellDrinks(item.categoryId).then(res => {
        if (res.success && res.data) setCrossSellDrinks(res.data);
      });
    }
  }, [item, isOpen]);

  if (!item) return null;
  
  const variants = item.variants || [];
  const addOns = item.addOns || [];

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const handleVariantChange = (variantId: string) => {
    const variant = variants.find((v: any) => v.id === variantId);
    if (variant) setSelectedVariant(variant);
  };

  const currentPrice = (selectedVariant ? selectedVariant.price : (item.basePrice || item.price)) + 
    selectedAddOns.reduce((sum, id) => {
      const addon = addOns.find((a: any) => a.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);

  const crossSellTotal = Object.values(crossSellSelections).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalPrice = (currentPrice * quantity) + crossSellTotal;

  const handleAddToCart = () => {
    if (variants.length > 0 && !selectedVariant) {
      toast.error("Please select an option");
      return;
    }

    const selectedAddOnsData = selectedAddOns.map(id => {
      const a = addOns.find((addon: any) => addon.id === id);
      return { name: a.name, price: a.price };
    }).filter(Boolean);

    // Add main item
    addItem({
      menuItemId: item.id,
      name: item.name,
      variantName: selectedVariant?.name,
      addOns: selectedAddOnsData.length > 0 ? selectedAddOnsData : undefined,
      quantity,
      unitPrice: currentPrice,
      imageUrl: item.imageUrl,
    });

    // Add cross-sells
    Object.values(crossSellSelections).forEach(crossItem => {
      addItem({
        menuItemId: crossItem.menuItemId,
        name: crossItem.name,
        variantName: crossItem.variantName,
        quantity: crossItem.quantity,
        unitPrice: crossItem.unitPrice,
        imageUrl: crossItem.imageUrl,
      });
    });
    
    toast.success("Added to cart");
    onClose();
  };

  const updateCrossSellQty = (key: string, data: any, delta: number) => {
    setCrossSellSelections(prev => {
      const currentQty = prev[key]?.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      const next = { ...prev };
      if (newQty === 0) {
        delete next[key];
      } else {
        next[key] = { ...data, quantity: newQty };
      }
      return next;
    });
  };

  return (
    <AppDrawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="flex flex-col h-full bg-background rounded-none min-h-0 overflow-hidden">
        {/* Scrollable Content Body with Side Padding */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 pt-2">
          
          {/* Details header (moved above image for immediate visibility) */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">{item.name}</h2>
          </div>

          {/* Hero Image (Shorter height) */}
          <div className="relative w-full h-40 shrink-0 bg-muted rounded-none overflow-hidden mb-5">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                <Utensils className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Variants Selection (Moved above description) */}
          {variants.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 bg-muted/50 p-2.5">
                <h3 className="font-semibold text-foreground text-sm">Size & Options</h3>
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Required</span>
              </div>
              <RadioGroup 
                value={selectedVariant?.id?.toString()} 
                onValueChange={handleVariantChange}
                className="grid gap-2"
              >
                {variants.map((variant: any) => (
                  <Label
                    key={variant.id}
                    htmlFor={`variant-${variant.id}`}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-none cursor-pointer transition-all min-h-[48px]",
                      selectedVariant?.id === variant.id ? "border-primary bg-primary/5" : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={variant.id?.toString()} id={`variant-${variant.id}`} />
                      <span className="font-medium text-sm">{variant.name}</span>
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      Rs. {variant.price}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Description */}
          <div className="mb-6 bg-muted/30 p-4 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
            </p>
          </div>

          {/* Add-ons Selection */}
          {addOns.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 bg-muted/50 p-2.5">
                <h3 className="font-semibold text-foreground text-sm">Extra Add-ons</h3>
                <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Optional</span>
              </div>
              <div className="grid gap-2">
                {addOns.map((addon: any) => (
                  <Label
                    key={addon.id}
                    htmlFor={`addon-${addon.id}`}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-none cursor-pointer transition-all min-h-[48px]",
                      selectedAddOns.includes(addon.id) ? "border-primary/50 bg-primary/5" : "border-border bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id={`addon-${addon.id}`} 
                        checked={selectedAddOns.includes(addon.id)}
                        onCheckedChange={() => handleAddOnToggle(addon.id)}
                        className="rounded-none"
                      />
                      <span className="font-medium text-sm">{addon.name}</span>
                    </div>
                    <span className="text-muted-foreground font-medium text-sm">
                      +Rs. {addon.price}
                    </span>
                  </Label>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Sell Drinks */}
          {crossSellDrinks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 bg-muted/50 p-2.5">
                <h3 className="font-semibold text-foreground text-sm">Add a refreshing drink?</h3>
                <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Optional</span>
              </div>
              <div className="border border-border bg-background divide-y divide-border">
                {crossSellDrinks.flatMap(drink => {
                  if (drink.variants && drink.variants.length > 0) {
                    return drink.variants.map((v: any) => ({
                      id: drink.id,
                      variantId: v.id,
                      name: drink.name,
                      variantName: v.name,
                      price: v.price,
                      imageUrl: drink.imageUrl
                    }));
                  }
                  return [{
                    id: drink.id,
                    name: drink.name,
                    price: drink.basePrice,
                    imageUrl: drink.imageUrl
                  }];
                }).map((item, index) => {
                  const key = item.variantId ? `${item.id}_${item.variantId}` : item.id;
                  const qty = crossSellSelections[key]?.quantity || 0;

                  return (
                    <div key={`${key}-${index}`} className="flex items-center justify-between p-3 transition-colors hover:bg-muted/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative bg-muted rounded overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold leading-tight text-foreground">
                            {item.name} {item.variantName && <span className="text-muted-foreground font-normal">({item.variantName})</span>}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground mt-0.5">
                            +Rs. {item.price}
                          </span>
                        </div>
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center border border-border h-8 rounded overflow-hidden bg-muted/20 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-full w-8 rounded-none hover:bg-muted text-foreground"
                            onClick={() => updateCrossSellQty(key, {
                              menuItemId: item.id,
                              name: item.name,
                              variantName: item.variantName,
                              unitPrice: item.price,
                              imageUrl: item.imageUrl
                            }, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-bold text-xs">{qty}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-full w-8 rounded-none hover:bg-muted text-foreground"
                            onClick={() => updateCrossSellQty(key, {
                              menuItemId: item.id,
                              name: item.name,
                              variantName: item.variantName,
                              unitPrice: item.price,
                              imageUrl: item.imageUrl
                            }, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded text-xs font-bold px-4 shrink-0"
                          onClick={() => updateCrossSellQty(key, {
                            menuItemId: item.id,
                            name: item.name,
                            variantName: item.variantName,
                            unitPrice: item.price,
                            imageUrl: item.imageUrl
                          }, 1)}
                        >
                          ADD
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="shrink-0 p-4 bg-background border-t border-border z-50">
          <div className="flex items-center gap-4 max-w-xl mx-auto">
            {/* Quantity Controls */}
            <div className="flex items-center border border-border h-12 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-10 rounded-none hover:bg-muted"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-10 rounded-none hover:bg-muted"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart} 
              className="flex-1 h-12 rounded-none font-bold text-sm shadow-lg active:scale-[0.98] transition-transform"
            >
              Add • Rs. {totalPrice}
            </Button>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
}
