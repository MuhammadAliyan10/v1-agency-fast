"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/use-cart";
import { STORE_CONSTANTS } from "@/lib/constants";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, getCartTotal, updateQuantity, removeItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const cartTotal = getCartTotal();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-background p-0 border-l shadow-2xl">
        <SheetHeader className="p-6 border-b bg-muted/20">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Your Order
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-in fade-in zoom-in duration-300">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="font-medium">Your cart is hungry.</p>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="text-primary border-primary hover:bg-primary/10 mt-2"
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm relative group overflow-hidden">
                  {/* Item Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/50">
                    <Image 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col pr-5 min-w-0">
                    <h4 className="font-bold text-sm leading-tight text-foreground truncate">{item.name}</h4>
                    
                    <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {item.variantName && <span className="font-medium text-foreground/80">Size: {item.variantName}</span>}
                      {item.variantName && item.addOns && item.addOns.length > 0 && <span> • </span>}
                      {item.addOns && item.addOns.length > 0 && (
                        <span>+ {item.addOns.map(a => a.name).join(", ")}</span>
                      )}
                      {!item.variantName && (!item.addOns || item.addOns.length === 0) && (
                        <span>Freshly prepared and packed to perfection.</span>
                      )}
                    </div>
                    
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div className="font-black text-primary text-sm">
                        {STORE_CONSTANTS.CURRENCY} {item.unitPrice}
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-muted/50 border border-border/50 rounded-full p-0.5">
                        <button 
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-background hover:bg-foreground/5 text-foreground transition-colors shadow-sm disabled:opacity-50" 
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button 
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-background hover:bg-foreground/5 text-foreground transition-colors shadow-sm" 
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full" 
                    onClick={() => removeItem(item.cartItemId)}
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t bg-card shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span>{STORE_CONSTANTS.CURRENCY} {cartTotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Delivery Fee</span>
                <span>{STORE_CONSTANTS.CURRENCY} {STORE_CONSTANTS.DELIVERY_FEE}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-black text-xl">
                <span>Total</span>
                <span className="text-primary">{STORE_CONSTANTS.CURRENCY} {cartTotal + STORE_CONSTANTS.DELIVERY_FEE}</span>
              </div>
            </div>
            
            <Button 
              className="w-full h-12 text-md font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              onClick={() => {
                onOpenChange(false);
                router.push("/checkout");
              }}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
