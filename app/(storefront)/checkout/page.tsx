"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingBag, Loader2, Navigation, CheckCircle2 } from "lucide-react";
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
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const { items, getCartTotal, clearCart } = useCart();

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onChange",
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      deliveryNotes: "",
      paymentMethod: "COD",
    },
  });

  const { isValid } = form.formState;

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

  // Redirect if cart is empty and not in success state
  if (items.length === 0 && !successOrderId) {
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
        setSuccessOrderId(result.orderId);
      } else {
        toast.error(result.error || "Failed to place order");
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  if (successOrderId) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 py-12 lg:py-20 px-4 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="bg-white border border-border/40 rounded-sm p-8 w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-50 text-green-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-heading font-bold tracking-tight mb-2 text-foreground">Order Confirmed!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Thank you for your order. We've received it and are sending it to the kitchen.
          </p>
          
          <div className="border-t-2 border-dashed border-border/50 pt-6 mb-8">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Your Order ID</p>
            <p className="text-lg font-bold font-mono tracking-wider text-foreground">{successOrderId}</p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button 
              onClick={() => router.push(`/track/${successOrderId}`)} 
              className="w-full h-12 text-base font-bold rounded-sm shadow-none"
            >
              Track Order
            </Button>
            <Button 
              onClick={() => router.push("/")} 
              variant="outline"
              className="w-full h-12 text-base font-bold rounded-sm shadow-none"
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12 lg:pb-24">
      <div className="mb-6 lg:mb-8 px-4 lg:px-0">
        <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight mb-2">Checkout</h1>
        <p className="text-muted-foreground text-sm md:text-base">Please provide your details to complete your order.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Delivery Details */}
              <div className="bg-white rounded-sm p-5 md:p-6 border border-border/40">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  Delivery Details
                </h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-sm text-foreground/80">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ali Khan" {...field} className="bg-white rounded-sm h-11 border-border/50" />
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
                          <FormLabel className="font-semibold text-sm text-foreground/80">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="03XXXXXXXXX" {...field} className="bg-white rounded-sm h-11 border-border/50" />
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
                          <FormLabel className="font-semibold text-sm text-foreground/80">Delivery Address</FormLabel>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-primary hover:text-primary hover:bg-primary/10 px-2 rounded-sm"
                            onClick={handleGetLocation}
                            disabled={isLocating}
                          >
                            {isLocating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Navigation className="w-3 h-3 mr-1.5" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">Auto-fill Location</span>
                          </Button>
                        </div>
                        <FormControl>
                          <Input placeholder="Street, Mohallah, House Number (Sillanwali)" {...field} className="bg-white rounded-sm h-11 border-border/50" />
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
                        <FormLabel className="font-semibold text-sm text-foreground/80">Delivery Instructions <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. Ring the bell, beware of dog" 
                            {...field} 
                            className="bg-white resize-none min-h-[80px] rounded-sm border-border/50" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-sm p-5 md:p-6 border border-border/40">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
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
                          className="flex flex-col gap-2"
                        >
                          <FormItem className="relative flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl>
                              <RadioGroupItem value="COD" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-sm">Cash on Delivery</FormLabel>
                              <span className="text-xs text-muted-foreground mt-0.5">Pay when you receive your food</span>
                            </div>
                          </FormItem>

                          <FormItem className="relative flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl>
                              <RadioGroupItem value="JazzCash" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-sm">JazzCash</FormLabel>
                              <span className="text-xs text-muted-foreground mt-0.5">Manual payment verification</span>
                            </div>
                          </FormItem>
                          
                          <FormItem className="relative flex items-center gap-3 p-3 border rounded-sm cursor-pointer transition-all hover:bg-muted/30 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                            <FormControl>
                              <RadioGroupItem value="EasyPaisa" />
                            </FormControl>
                            <div className="flex flex-col cursor-pointer">
                              <FormLabel className="font-bold text-foreground cursor-pointer text-sm">EasyPaisa</FormLabel>
                              <span className="text-xs text-muted-foreground mt-0.5">Manual payment verification</span>
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
                  disabled={isSubmitting || !isStoreOpen || !isValid}
                  className="w-full h-12 rounded-sm text-base font-bold disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : !isStoreOpen ? (
                    "Store is Closed"
                  ) : (
                    `Place Order`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Column: Order Summary (Receipt Style) */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-white rounded-sm border border-border/40 p-5 md:p-6 sticky top-28 font-mono">
            <div className="text-center mb-6">
              <h3 className="font-heading font-black text-xl mb-1 uppercase tracking-widest">Order Summary</h3>
              <p className="text-xs text-muted-foreground">Classy Crave</p>
            </div>
            
            <div className="border-t-2 border-dashed border-border/50 my-4" />
            
            <div className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar pr-1 mb-4 text-sm">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between items-start gap-4">
                  <div className="flex gap-2">
                    <span className="font-bold shrink-0">{item.quantity}x</span>
                    <div>
                      <p className="font-semibold text-foreground leading-snug">{item.name}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>}
                      {item.addOns && item.addOns.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          + {item.addOns.map(a => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="font-bold shrink-0">
                    {STORE_CONSTANTS.CURRENCY} {item.subtotal}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-border/50 my-4" />
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{STORE_CONSTANTS.CURRENCY} {subtotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Fee</span>
                <span>{STORE_CONSTANTS.CURRENCY} {deliveryFee}</span>
              </div>
            </div>
            
            <div className="border-t-2 border-dashed border-border/50 my-4" />
            
            <div className="flex justify-between items-center mb-6 text-base font-black">
              <span>TOTAL</span>
              <span>{STORE_CONSTANTS.CURRENCY} {total}</span>
            </div>

            {/* Mobile Submit Button */}
            <div className="lg:hidden">
              <Button 
                onClick={() => form.handleSubmit(onSubmit)()}
                disabled={isSubmitting || !isValid || !isStoreOpen}
                className="w-full h-12 text-base font-bold rounded-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSubmitting ? "Processing..." : `Place Order`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
