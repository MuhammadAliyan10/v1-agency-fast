"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Minus, Plus, ShoppingCart, Flame, Leaf } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
}

export function ProductDialog({ isOpen, onClose, item }: ProductDialogProps) {
  const { addItem } = useCart();
  
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item && isOpen) {
      if (item.variants && item.variants.length > 0) {
        setSelectedVariant(item.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setSelectedAddOns([]);
      setQuantity(1);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const fallbackImage = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80";
  
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
      imageUrl: item.imageUrl || fallbackImage,
    });
    
    toast.success(`${item.name} added to cart!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 m-0 overflow-hidden bg-background border-none sm:border-solid sm:border-border rounded-none sm: shadow-2xl flex flex-col gap-0 duration-200">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <DialogClose className="absolute right-4 top-4 z-50 bg-white/80 backdrop-blur-md p-2 hover:bg-white transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-primary">
          <X className="h-5 w-5 text-foreground" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left: Image Area */}
          <div className="relative w-full md:w-1/2 aspect-[4/3] md:aspect-auto md:h-full shrink-0 bg-muted">
            <Image
              src={item.imageUrl || fallbackImage}
              alt={item.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r pointer-events-none" />
            
            {/* Mobile Title Over Image */}
            <div className="absolute bottom-4 left-4 right-4 md:hidden text-white">
              <h2 className="text-xl font-bold leading-tight shadow-sm drop-shadow-md tracking-tight">{item.name}</h2>
              <p className="font-medium text-primary text-lg drop-shadow-md mt-1">
                {STORE_CONSTANTS.CURRENCY} {item.basePrice || item.price}
              </p>
            </div>
          </div>

          {/* Right: Details & Config */}
          <div className="flex flex-col flex-1 w-full md:w-1/2 h-full max-h-full overflow-hidden bg-card relative">
            <ScrollArea className="flex-1 px-4 pt-4 md:px-8 md:pt-8 pb-28 md:pb-32">
              <div className="hidden md:block mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground">{item.name}</h2>
                  {(item.tags?.isSpicy || item.tags?.isVeg) && (
                    <div className="flex gap-1 shrink-0">
                      {item.tags?.isSpicy && (
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 p-1.5" title="Spicy">
                          <Flame className="w-4 h-4" />
                        </div>
                      )}
                      {item.tags?.isVeg && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 p-1.5" title="Vegetarian">
                          <Leaf className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description || "Fresh, delicious, and made just for you with the finest ingredients."}
                </p>
              </div>

              {/* Variants Selection */}
              {variants.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground tracking-tight">Size & Options</h3>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 tracking-widest uppercase">Required</span>
                  </div>
                  <RadioGroup 
                    value={selectedVariant?.id?.toString()} 
                    onValueChange={handleVariantChange}
                    className="grid gap-3"
                  >
                    {variants.map((variant: any) => (
                      <Label
                        key={variant.id}
                        htmlFor={`variant-${variant.id}`}
                        className={cn(
                          "flex items-center justify-between p-3 md:p-4 border  md: cursor-pointer transition-all hover:bg-muted/50",
                          selectedVariant?.id === variant.id ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border/50 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={variant.id?.toString()} id={`variant-${variant.id}`} />
                          <span className="font-medium text-xs md:text-sm">{variant.name}</span>
                        </div>
                        <span className="font-semibold text-foreground text-xs md:text-sm">
                          {STORE_CONSTANTS.CURRENCY} {variant.price}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Add-ons Selection */}
              {addOns.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground tracking-tight">Extra Add-ons</h3>
                    <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Optional</span>
                  </div>
                  <div className="grid gap-3">
                    {addOns.map((addon: any) => (
                      <Label
                        key={addon.id}
                        htmlFor={`addon-${addon.id}`}
                        className={cn(
                          "flex items-center justify-between p-3 md:p-4 border  md: cursor-pointer transition-all hover:bg-muted/50",
                          selectedAddOns.includes(addon.id) ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/50 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id={`addon-${addon.id}`} 
                            checked={selectedAddOns.includes(addon.id)}
                            onCheckedChange={() => handleAddOnToggle(addon.id)}
                          />
                          <span className="font-medium text-xs md:text-sm">{addon.name}</span>
                        </div>
                        <span className="text-muted-foreground font-medium text-xs md:text-sm">
                          +{STORE_CONSTANTS.CURRENCY} {addon.price}
                        </span>
                      </Label>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Bottom Actions Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-background/95 backdrop-blur-md border-t border-border/50 z-20">
              <div className="flex items-center gap-3 md:gap-4 max-w-full">
                {/* Quantity Controls */}
                <div className="flex items-center bg-white md: p-1 border border-border/50 shadow-sm shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 md:h-12 md:w-12 md: shrink-0 hover:bg-muted"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <span className="w-6 md:w-10 text-center font-bold text-sm md:text-lg">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 md:h-12 md:w-12 md: shrink-0 hover:bg-muted"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  onClick={handleAddToCart} 
                  className="flex-1 h-12 md:h-14 md: font-bold shadow-lg hover:shadow-xl transition-all text-sm md:text-base px-2 sm:px-6 tracking-wide active:scale-[0.98]"
                >
                  <span className="hidden sm:inline">Add to Cart • </span>
                  <span className="sm:hidden">Add • </span>
                  {STORE_CONSTANTS.CURRENCY} {totalPrice}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
