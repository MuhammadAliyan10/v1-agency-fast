"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBag, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/store/use-cart";
import { STORE_CONSTANTS } from "@/lib/constants";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { submitOrder } from "@/server/actions/checkout";
import { getStoreStatus } from "@/server/actions/settings";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isCheckingStore, setIsCheckingStore] = useState(true);
  const { items, getCartTotal, clearCart } = useCart();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      deliveryNotes: "",
      paymentMethod: "COD",
    },
  });

  const idempotencyKeyRef = React.useRef<string>("");
  
  useEffect(() => {
    setMounted(true);
    idempotencyKeyRef.current = window.crypto.randomUUID();
    
    // Check if store is open
    const checkStoreStatus = async () => {
      try {
        const isOpen = await getStoreStatus();
        setIsStoreOpen(isOpen);
      } catch (error) {
        console.error("Failed to check store status", error);
      } finally {
        setIsCheckingStore(false);
      }
    };
    
    checkStoreStatus();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    toast.loading("Fetching your location...", { id: "location-toast" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using OpenStreetMap Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error("Failed to fetch address");
          const data = await res.json();
          
          if (data && data.display_name) {
            form.setValue("deliveryAddress", data.display_name, { shouldValidate: true });
            toast.success("Location found!", { id: "location-toast" });
          } else {
            throw new Error("Address not found");
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          toast.error("Could not determine address. Please enter manually.", { id: "location-toast" });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Permission denied or location unavailable.", { id: "location-toast" });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Prevent rendering if not mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <ShoppingBag className="w-20 h-20 text-muted-foreground opacity-20 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">
          You need to add some delicious items to your cart before checking out!
        </p>
        <Button onClick={() => router.push("/")} className="w-full">
          Browse Menu
        </Button>
      </div>
    );
  }

  const subtotal = getCartTotal();
  const deliveryFee = STORE_CONSTANTS.DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const onSubmit = async (data: CheckoutValues) => {
    setIsSubmitting(true);
    
    // Use the persisted idempotency key for this checkout session
    const idempotencyKey = idempotencyKeyRef.current;
    
    try {
      const result = await submitOrder(data, items, idempotencyKey);
      
      if (result.success && result.orderId) {
        toast.success("Order placed successfully!");
        clearCart();
        router.push(`/track/${result.orderId}`);
      } else {
        toast.error(result.error || "Failed to place order");
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-24">
      <div className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight mb-3">Checkout</h1>
        <p className="text-muted-foreground text-lg">Please provide your details to complete your order.</p>
      </div>

      {/* Closed Banner */}
      {!isCheckingStore && !isStoreOpen && (
        <div className="mb-8 p-5 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-4">
          <div className="mt-0.5"><Navigation className="w-6 h-6" /></div>
          <div>
            <h3 className="font-bold text-lg">The Restaurant is Currently Closed</h3>
            <p className="opacity-90 mt-1">We are not accepting new orders at this time. Please check back later during our normal operating hours.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Delivery Details */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border/30">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black">1</span>
                  Delivery Details
                </h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground/80">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ali Khan" {...field} className="bg-white h-12 rounded-xl shadow-sm border-border/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground/80">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="03XXXXXXXXX" {...field} className="bg-white h-12 rounded-xl shadow-sm border-border/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="font-semibold text-foreground/80">Delivery Address</FormLabel>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-primary hover:text-primary hover:bg-primary/10 px-2"
                            onClick={handleGetLocation}
                            disabled={isLocating}
                          >
                            {isLocating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 mr-1.5" />}
                            <span className="text-xs font-bold uppercase tracking-wider">Auto-fill Location</span>
                          </Button>
                        </div>
                        <FormControl>
                          <Input placeholder="Street, Mohallah, House Number (Sillanwali)" {...field} className="bg-white h-12 rounded-xl shadow-sm border-border/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deliveryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground/80">Delivery Instructions <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. Ring the bell, beware of dog" 
                            {...field} 
                            className="bg-white resize-none min-h-[100px] rounded-xl shadow-sm border-border/50" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border/30">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black">2</span>
                  Payment Method
                </h2>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col gap-3"
                        >
                          <FormItem className="relative flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:shadow-sm">
                            <FormControl>
                              <RadioGroupItem value="COD" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-base">Cash on Delivery</FormLabel>
                              <span className="text-sm text-muted-foreground mt-0.5 font-medium">Pay when you receive your food</span>
                            </div>
                          </FormItem>

                          <FormItem className="relative flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:shadow-sm">
                            <FormControl>
                              <RadioGroupItem value="JazzCash" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-base">JazzCash</FormLabel>
                              <span className="text-sm text-muted-foreground mt-0.5 font-medium">Manual payment verification</span>
                            </div>
                          </FormItem>
                          
                          <FormItem className="relative flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:shadow-sm">
                            <FormControl>
                              <RadioGroupItem value="EasyPaisa" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-base">EasyPaisa</FormLabel>
                              <span className="text-sm text-muted-foreground mt-0.5 font-medium">Manual payment verification</span>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="hidden lg:block pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isStoreOpen}
                  className="w-full h-14 rounded-full text-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing your order...
                    </>
                  ) : !isStoreOpen ? (
                    "Store is Closed"
                  ) : (
                    `Place Order - ${STORE_CONSTANTS.CURRENCY} ${total}`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2">
          <div className="bg-white rounded-3xl border border-border/30 p-6 md:p-8 sticky top-28 shadow-sm">
            <h3 className="font-heading font-black text-2xl mb-6">Order Summary</h3>
            
            <div className="space-y-5 max-h-[45vh] overflow-y-auto no-scrollbar pr-2 mb-6">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 text-sm group">
                  <div className="font-black text-muted-foreground bg-muted w-7 h-7 flex items-center justify-center shrink-0">
                    {item.quantity}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                    {item.variantName && <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>}
                    {item.addOns && item.addOns.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        + {item.addOns.map(a => a.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="font-bold text-foreground shrink-0">
                    {STORE_CONSTANTS.CURRENCY} {item.subtotal}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mb-6 bg-border/50" />
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span className="text-foreground">{STORE_CONSTANTS.CURRENCY} {subtotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-medium">
                <span>Delivery Fee</span>
                <span className="text-foreground">{STORE_CONSTANTS.CURRENCY} {deliveryFee}</span>
              </div>
            </div>
            
            <div className="bg-muted p-4 flex justify-between items-center mb-6 border border-border/50">
              <span className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Total</span>
              <span className="font-black text-2xl text-primary">{STORE_CONSTANTS.CURRENCY} {total}</span>
            </div>

            {/* Mobile Submit Button (shows above fold on mobile) */}
            <div className="lg:hidden mt-2">
              <Button 
                onClick={() => form.handleSubmit(onSubmit)()}
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-black tracking-wide shadow-lg"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShoppingBag className="w-5 h-5 mr-3" />}
                {isSubmitting ? "Processing..." : `Place Order`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
