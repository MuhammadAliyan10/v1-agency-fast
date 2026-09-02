"use client";

import React, { useState } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCartStore } from "@/lib/store/cart-store";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { submitOrder } from "@/server/actions/checkout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Minus, Plus, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDrawer({ open, onOpenChange }: CheckoutDrawerProps) {
  const { items, getTotals, updateQuantity, removeItem, clearCart } = useCartStore();
  const { itemCount, totalPrice } = getTotals();
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: "delivery",
      customerName: "",
      customerPhone: "",
      deliveryZone: "",
      deliveryAddress: "",
      deliveryNotes: "",
      paymentMethod: "COD",
    },
  });

  const orderType = form.watch("orderType");
  const deliveryZoneId = form.watch("deliveryZone");
  
  let deliveryFee = 0;
  if (orderType === "delivery") {
    const zone = STORE_CONSTANTS.DELIVERY_ZONES.find(z => z.id === deliveryZoneId);
    deliveryFee = zone ? zone.fee : STORE_CONSTANTS.DELIVERY_FEE;
  }
  
  const finalTotal = totalPrice + deliveryFee;

  const onSubmit = async (data: CheckoutValues) => {
    if (items.length === 0) return;
    
    // Generate idempotency key for this submission
    const idempotencyKey = crypto.randomUUID();
    
    try {
      const mappedItems = items.map(item => ({
        cartItemId: crypto.randomUUID(),
        menuItemId: item.id,
        name: item.name,
        variantName: item.options?.variant || null,
        unitPrice: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        addOns: item.options?.addOns || [],
        specialInstructions: null
      }));
      const response = await submitOrder(data, mappedItems as any, idempotencyKey);
      if (response.success && response.orderId) {
        clearCart();
        setSuccessOrderId(response.orderId);
      } else {
        toast.error(response.error || "Failed to place order");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after drawer closes fully (e.g. 300ms)
    setTimeout(() => {
      setSuccessOrderId(null);
      form.reset();
    }, 300);
  };

  if (successOrderId) {
    return (
      <AppDrawer open={open} onOpenChange={handleClose} className="max-h-[95vh] h-[95vh]">
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold mb-2">Order Confirmed!</h2>
          <p className="text-muted-foreground mb-8">
            Your order has been placed successfully.
          </p>
          <div className="bg-muted w-full p-4 border border-border mb-8">
            <span className="block text-sm text-muted-foreground mb-1">Order ID</span>
            <span className="text-xl font-bold tracking-widest">{successOrderId}</span>
          </div>
          
          <div className="w-full space-y-3">
            <Button 
              className="w-full h-12 rounded-none font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.open(`https://wa.me/${STORE_CONSTANTS.WHATSAPP_NUMBER}?text=Hi, I want to track my order ${successOrderId}`, "_blank")}
            >
              Track on WhatsApp
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-none font-bold"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </AppDrawer>
    );
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} className="max-h-[95vh] h-[95vh]">
      <div className="flex flex-col h-full bg-background relative">
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <h2 className="font-bold text-xl tracking-tight text-foreground">Checkout</h2>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" strokeWidth={1} />
            <h3 className="text-lg font-bold mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Button onClick={() => onOpenChange(false)} className="h-12 w-full rounded-none font-bold">
              Browse Menu
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 pb-32">
            {/* Cart Review Section */}
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-muted-foreground">Order Summary</h3>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm line-clamp-2 pr-2">{item.name}</span>
                        <span className="font-bold text-sm shrink-0">Rs. {item.price * item.quantity}</span>
                      </div>
                      {(item.options?.variant || (item.options?.addOns && item.options.addOns.length > 0)) && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {item.options.variant && <div>Size: {item.options.variant}</div>}
                          {item.options.addOns?.map((addon: { name: string; price: number }, i: number) => (
                            <div key={i}>+ {addon.name}</div>
                          ))}
                        </div>
                      )}
                      
                      {/* Controls */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center border border-border h-8 bg-background">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-8 rounded-none"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-8 rounded-none"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkout Form */}
            <div className="p-4 space-y-6 flex-1">
              {/* Order Type */}
              <div className="space-y-2">
                <Tabs 
                  value={orderType} 
                  onValueChange={(v) => form.setValue("orderType", v as "delivery" | "pickup")}
                  className="w-full"
                >
                  <TabsList className="w-full h-12 rounded-none p-0 grid grid-cols-2 bg-muted">
                    <TabsTrigger value="delivery" className="rounded-none h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold transition-all border-none">
                      Delivery
                    </TabsTrigger>
                    <TabsTrigger value="pickup" className="rounded-none h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold transition-all border-none">
                      Pickup
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customerName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input 
                    id="customerName" 
                    placeholder="e.g. John Doe"
                    autoComplete="name"
                    className="h-12 rounded-none border-border focus-visible:ring-primary"
                    {...form.register("customerName")}
                  />
                  {form.formState.errors.customerName && (
                    <span className="text-xs text-red-500 font-medium">{form.formState.errors.customerName.message}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input 
                    id="customerPhone" 
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 03001234567"
                    className="h-12 rounded-none border-border focus-visible:ring-primary"
                    {...form.register("customerPhone")}
                  />
                  {form.formState.errors.customerPhone && (
                    <span className="text-xs text-red-500 font-medium">{form.formState.errors.customerPhone.message}</span>
                  )}
                </div>

                {orderType === "delivery" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area / Neighborhood</Label>
                      <Select onValueChange={(val) => form.setValue("deliveryZone", val)} defaultValue={form.watch("deliveryZone")}>
                        <SelectTrigger className="w-full h-12 rounded-none border-border focus:ring-primary">
                          <SelectValue placeholder="Select your area" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          {STORE_CONSTANTS.DELIVERY_ZONES.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id} className="cursor-pointer">
                              {zone.name} (Rs. {zone.fee})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.deliveryZone && (
                        <span className="text-xs text-red-500 font-medium">{form.formState.errors.deliveryZone.message}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="deliveryAddress" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Complete Address</Label>
                      <Textarea 
                        id="deliveryAddress" 
                        placeholder="Street, House No..."
                        autoComplete="street-address"
                        className="min-h-[80px] rounded-none border-border focus-visible:ring-primary resize-none"
                        {...form.register("deliveryAddress")}
                      />
                      {form.formState.errors.deliveryAddress && (
                        <span className="text-xs text-red-500 font-medium">{form.formState.errors.deliveryAddress.message}</span>
                      )}
                    </div>
                  </>
                )}
                
                <div className="space-y-1.5">
                    <Label htmlFor="deliveryNotes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Notes (Optional)</Label>
                    <Input 
                      id="deliveryNotes" 
                      placeholder="e.g. Less spicy, extra napkins"
                      className="h-12 rounded-none border-border focus-visible:ring-primary"
                      {...form.register("deliveryNotes")}
                    />
                </div>

                <div className="space-y-1.5 mt-6">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Payment Method</Label>
                  <RadioGroup 
                    value={form.watch("paymentMethod")} 
                    onValueChange={(v) => form.setValue("paymentMethod", v as "COD" | "JazzCash" | "EasyPaisa")}
                    className="grid gap-2"
                  >
                    <Label className="flex items-center space-x-3 border border-border p-4 cursor-pointer hover:bg-muted/50 rounded-none transition-colors">
                      <RadioGroupItem value="COD" />
                      <span className="font-semibold">Cash on Delivery</span>
                    </Label>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-muted-foreground">Total to pay</span>
                <span className="text-xl font-bold tracking-tight">Rs. {finalTotal}</span>
              </div>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="w-full h-14 rounded-none font-bold text-base tracking-wide"
              >
                {form.formState.isSubmitting ? "Processing..." : "Place Order"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppDrawer>
  );
}
