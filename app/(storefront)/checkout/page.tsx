"use client";
import Image from "next/image";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingBag, Loader2, Navigation, CheckCircle2, Copy,
  Home, Store, Tag, X, CheckCheck, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/store/use-cart";
import { STORE_CONSTANTS } from "@/lib/constants";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { submitOrder } from "@/server/actions/checkout";
import { getStoreStatus } from "@/server/actions/settings";
import { validateCoupon } from "@/server/actions/coupons";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isCheckingStore, setIsCheckingStore] = useState(true);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "flat" | "percent";
    discountValue: number;
    applicableItemIds: string[] | null;
  } | null>(null);
  const { items, getCartTotal, clearCart } = useCart();
  const idempotencyKeyRef = useRef<string>("");

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onChange",
    defaultValues: {
      orderType: "delivery",
      customerName: "",
      customerPhone: "",
      deliveryZone: "",
      deliveryAddress: "",
      deliveryNotes: "",
      paymentMethod: "COD",
      couponCode: "",
    },
  });

  const { isValid } = form.formState;
  const orderType = useWatch({ control: form.control, name: "orderType" });
  const deliveryZoneId = useWatch({ control: form.control, name: "deliveryZone" });
  const isDelivery = orderType === "delivery";

  // ── Dynamic delivery fee — mirrors checkout-drawer logic exactly ──────
  const selectedZone = isDelivery
    ? STORE_CONSTANTS.DELIVERY_ZONES.find((z) => z.id === deliveryZoneId) ?? null
    : null;
  const deliveryFee = selectedZone ? selectedZone.fee : isDelivery ? 0 : 0;
  const deliveryFeeLabel = selectedZone
    ? `${STORE_CONSTANTS.CURRENCY} ${selectedZone.fee}`
    : isDelivery
    ? "Select area first"
    : "FREE";

  useEffect(() => {
    setMounted(true);
    idempotencyKeyRef.current = window.crypto.randomUUID();
    const check = async () => {
      try {
        setIsStoreOpen(await getStoreStatus());
      } catch {
        /* silent */
      } finally {
        setIsCheckingStore(false);
      }
    };
    check();
  }, []);

  // ── Geolocation auto-fill ─────────────────────────────────────────────
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    toast.loading("Fetching your location...", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const locData = await res.json();
          if (locData?.display_name) {
            form.setValue("deliveryAddress", locData.display_name, { shouldValidate: true });
            form.setValue("latitude", latitude);
            form.setValue("longitude", longitude);
            toast.success("Location filled in!", { id: "loc" });
          } else {
            throw new Error("Not found");
          }
        } catch {
          toast.error("Could not determine your address.", { id: "loc" });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        toast.error("Location permission denied.", { id: "loc" });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  // ── Coupon helpers ────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const result = await validateCoupon(couponInput.trim(), getCartTotal());
      if (result.valid) {
        setAppliedCoupon({
          code: couponInput.trim().toUpperCase(),
          discountType: result.discountType!,
          discountValue: result.discountValue!,
          applicableItemIds: result.applicableItemIds ?? null,
        });
        form.setValue("couponCode", couponInput.trim().toUpperCase());
        toast.success("Coupon applied!");
      } else {
        toast.error(result.message || "Invalid or expired coupon.");
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    form.setValue("couponCode", "");
  };

  const getCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    const eligible = appliedCoupon.applicableItemIds
      ? items.filter(
          (i) =>
            i.menuItemId !== null &&
            appliedCoupon.applicableItemIds!.includes(i.menuItemId)
        )
      : items;
    const eligibleSubtotal = eligible.reduce((s, i) => s + i.subtotal, 0);
    if (appliedCoupon.discountType === "flat")
      return Math.min(appliedCoupon.discountValue, eligibleSubtotal);
    return Math.floor((eligibleSubtotal * appliedCoupon.discountValue) / 100);
  };

  // ── Early returns ─────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0 && !successOrderId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4">
        <ShoppingBag className="w-20 h-20 text-muted-foreground opacity-20 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">
          Add some delicious items before checking out!
        </p>
        <Button onClick={() => router.push("/")} className="w-full rounded-none h-12 font-bold">
          Browse Menu
        </Button>
      </div>
    );
  }

  const subtotal = getCartTotal();
  const couponDiscount = getCouponDiscount();
  const total = subtotal + deliveryFee - couponDiscount;

  // ── Form submit ───────────────────────────────────────────────────────
  const onSubmit = async (data: CheckoutValues) => {
    setIsSubmitting(true);
    try {
      const result = await submitOrder(data, items, idempotencyKeyRef.current);
      if (result.success && result.orderId) {
        toast.success("Order placed successfully!");
        clearCart();
        setSuccessOrderId(result.orderId);
        // Persist order to localStorage so the tracking page can surface it
        // without the user needing to remember the ID.
        try {
          const STORAGE_KEY = "cc_recent_orders";
          const existing: { id: string; placedAt: number }[] = JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? "[]"
          );
          // Prepend new order, keep max 10, no duplicates
          const updated = [
            { id: result.orderId, placedAt: Date.now() },
            ...existing.filter((o) => o.id !== result.orderId),
          ].slice(0, 10);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* localStorage unavailable — silently skip */ }
      } else {
        toast.error(result.error ?? "Failed to place order. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────
  if (successOrderId) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 py-12 lg:py-20 px-4 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="relative bg-white p-8 w-full text-center drop-shadow-md mb-8">
          <div
            className="absolute -top-[10px] left-0 w-full h-[10px] z-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpolygon points='0,10 10,0 20,10' fill='white'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat-x",
            }}
          />
          <div className="mx-auto w-16 h-16 bg-green-50 text-green-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-heading font-black tracking-tight mb-2 text-foreground">
            ORDER CONFIRMED
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
            {orderType === "pickup"
              ? "Your order is being prepared. Come pick it up soon!"
              : "We've received your order and the kitchen is notified."}
          </p>
          <div className="border-y-2 border-dashed border-border/50 py-6 mb-8 relative">
            <div className="absolute -left-11 top-1/2 -translate-y-1/2 w-6 h-6 bg-background" />
            <div className="absolute -right-11 top-1/2 -translate-y-1/2 w-6 h-6 bg-background" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Order Tracking ID
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-lg md:text-xl font-bold font-mono tracking-wider text-foreground">
                {successOrderId}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(successOrderId);
                  toast.success("Copied!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => router.push(`/track/${successOrderId}`)}
              className="w-full h-12 text-base font-bold shadow-none rounded-none"
            >
              Track Order Status
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full h-12 text-base font-bold shadow-none rounded-none border-border"
            >
              Back to Menu
            </Button>
          </div>
          <div
            className="absolute -bottom-[10px] left-0 w-full h-[10px] z-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpolygon points='0,0 10,10 20,0' fill='white'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat-x",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Main checkout layout ──────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 pb-32 lg:pb-24 px-4 lg:px-6 max-w-7xl mx-auto pt-8 lg:pt-10 bg-zinc-50 min-h-screen">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-zinc-950">
          Checkout
        </h1>
        <p className="text-muted-foreground text-sm md:text-base font-medium mt-1">
          Fill in your details to place the order.
        </p>
      </div>

      {/* Store closed banner */}
      {!isCheckingStore && !isStoreOpen && (
        <div className="mb-8 p-5 border border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-4">
          <div>
            <h3 className="font-bold">The Restaurant is Currently Closed</h3>
            <p className="opacity-90 mt-1 text-sm">
              We are not accepting new orders at this time.
            </p>
          </div>
        </div>
      )}

      {/* Order Type Toggle */}
      <div className="mb-6 bg-white p-1 border border-zinc-100 shadow-sm flex items-center">
        {(["delivery", "pickup"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => form.setValue("orderType", type, { shouldValidate: true })}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-2 transition-all duration-300",
              orderType === type
                ? "bg-zinc-950 text-white shadow-md"
                : "bg-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {type === "delivery" ? (
              <Home className="w-4 h-4" />
            ) : (
              <Store className="w-4 h-4" />
            )}
            <span className="font-bold text-xs uppercase tracking-widest">
              {type === "delivery" ? "Home Delivery" : "Self Pickup"}
            </span>
          </button>
        ))}
      </div>

      {/* Pickup address info */}
      {!isDelivery && (
        <div className="mb-6 p-3 bg-blue-50/50 border border-blue-100 text-blue-800 text-xs flex flex-col gap-1">
          <span className="font-black tracking-wider uppercase text-[10px]">
            Pickup Address
          </span>
          <span>Classy Crave, Sillanwali, Pakistan</span>
          <span className="font-semibold mt-1 opacity-80">
            Call: {STORE_CONSTANTS.PHONE_NUMBER}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ── Left: Form ─────────────────────────────────────────────── */}
        <div className="lg:col-span-7 order-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Contact / Delivery Details */}
              <div className="bg-white p-4 md:p-6 border border-zinc-100 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wider mb-4 text-zinc-950">
                  {isDelivery ? "Delivery Details" : "Contact Details"}
                </h2>
                <div className="space-y-4">

                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs text-zinc-500 uppercase">
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ali Khan"
                              autoComplete="name"
                              {...field}
                              className="bg-zinc-50 border-transparent h-12 px-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white font-medium rounded-none"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs text-zinc-500 uppercase">
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="03XXXXXXXXX"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              {...field}
                              className="bg-zinc-50 border-transparent h-12 px-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white font-medium rounded-none"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Delivery-only fields */}
                  {isDelivery && (
                    <>
                      {/* ── Delivery Zone Select (was missing — the P0-1 fix) ── */}
                      <FormField
                        control={form.control}
                        name="deliveryZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs text-zinc-500 uppercase flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              Delivery Area
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-none bg-zinc-50 border-transparent focus:ring-1 focus:ring-primary font-medium">
                                  <SelectValue placeholder="Select your neighbourhood" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-none">
                                {STORE_CONSTANTS.DELIVERY_ZONES.map((zone) => (
                                  <SelectItem
                                    key={zone.id}
                                    value={zone.id}
                                    className="cursor-pointer"
                                  >
                                    <span className="font-medium">{zone.name}</span>
                                    <span className="ml-2 text-muted-foreground text-xs">
                                      — {STORE_CONSTANTS.CURRENCY} {zone.fee}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Address */}
                      <FormField
                        control={form.control}
                        name="deliveryAddress"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="font-bold text-xs text-zinc-500 uppercase">
                                Complete Address
                              </FormLabel>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-primary hover:bg-primary/10 px-2"
                                onClick={handleGetLocation}
                                disabled={isLocating}
                              >
                                {isLocating ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Navigation className="w-3 h-3 mr-1" />
                                )}
                                <span className="text-[9px] font-bold uppercase tracking-wider">
                                  Auto-fill
                                </span>
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                placeholder="Street, Mohallah, House No."
                                autoComplete="street-address"
                                {...field}
                                className="bg-zinc-50 border-transparent h-12 px-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white font-medium rounded-none text-xs md:text-sm"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="deliveryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs text-zinc-500 uppercase flex items-center gap-1">
                          {isDelivery ? "Instructions" : "Pickup Notes"}{" "}
                          <span className="font-medium opacity-60">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={
                              isDelivery
                                ? "e.g. Ring the bell, 3rd floor"
                                : "e.g. Arriving at 7pm"
                            }
                            {...field}
                            className="resize-none min-h-[60px] bg-zinc-50 border-transparent p-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white text-xs md:text-sm rounded-none"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white p-4 md:p-6 border border-zinc-100 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wider mb-1 text-zinc-950">
                  Payment Method
                </h2>
                {/* COD emphasis for Pakistani users */}
                <p className="text-[11px] text-zinc-400 font-medium mb-4">
                  Cash on Delivery available — pay when your food arrives.
                </p>
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
                          {[
                            {
                              value: "COD",
                              label: "Cash on Delivery",
                              desc: isDelivery
                                ? "Pay the rider when your order arrives"
                                : "Pay at the counter when you pick up",
                            },
                            { value: "JazzCash", label: "JazzCash", desc: "Send payment then place order" },
                            { value: "EasyPaisa", label: "EasyPaisa", desc: "Send payment then place order" },
                            { value: "Bank", label: "Bank Transfer", desc: "Send payment then place order" },
                          ].map((opt) => (
                            <div key={opt.value} className="flex flex-col gap-1">
                              <FormItem className="relative flex items-center gap-3 p-3 border border-zinc-100 cursor-pointer transition-all hover:bg-zinc-50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                                <FormControl>
                                  <RadioGroupItem value={opt.value} className="h-4 w-4" />
                                </FormControl>
                                <div className="flex flex-col cursor-pointer w-full">
                                  <FormLabel className="font-bold text-zinc-950 cursor-pointer text-xs w-full">
                                    {opt.label}
                                  </FormLabel>
                                  <span className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                    {opt.desc}
                                  </span>
                                </div>
                              </FormItem>

                              {field.value === opt.value && opt.value === "JazzCash" && (
                                <div className="p-3 ml-7 bg-muted text-sm text-muted-foreground border-l-4 border-primary space-y-1">
                                  <p>
                                    <strong>Account Title:</strong> Classy Crave
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <strong>Account Number:</strong>{" "}
                                    <span className="font-mono">03001234567</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText("03001234567");
                                        toast.success("Copied!");
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </p>
                                </div>
                              )}
                              {field.value === opt.value && opt.value === "EasyPaisa" && (
                                <div className="p-3 ml-7 bg-muted text-sm text-muted-foreground border-l-4 border-primary space-y-1">
                                  <p>
                                    <strong>Account Title:</strong> Classy Crave
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <strong>Account Number:</strong>{" "}
                                    <span className="font-mono">03001234567</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText("03001234567");
                                        toast.success("Copied!");
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </p>
                                </div>
                              )}
                              {field.value === opt.value && opt.value === "Bank" && (
                                <div className="p-3 ml-7 bg-muted text-sm text-muted-foreground border-l-4 border-primary space-y-1">
                                  <p>
                                    <strong>Bank:</strong> Meezan Bank
                                  </p>
                                  <p>
                                    <strong>Account Title:</strong> Classy Crave
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <strong>Account Number:</strong>{" "}
                                    <span className="font-mono">01234567890123</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText("01234567890123");
                                        toast.success("Copied!");
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Desktop submit */}
              <div className="hidden lg:block pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isStoreOpen || !isValid}
                  className="w-full h-12 text-base font-bold disabled:opacity-50 rounded-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : !isStoreOpen ? (
                    "Store is Closed"
                  ) : (
                    "Place Order"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* ── Right: Order Summary ────────────────────────────────────── */}
        <div className="lg:col-span-5 order-2">
          <div className="bg-white p-4 md:p-6 border border-zinc-100 shadow-sm sticky top-28 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider">Order Summary</h3>
              <Badge
                variant={isDelivery ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-none"
              >
                {isDelivery ? "Delivery" : "Pickup"}
              </Badge>
            </div>

            {/* Cart items */}
            <div className="space-y-3 max-h-[35vh] overflow-y-auto no-scrollbar pr-1 mb-4">
              {items.map((item) => {
                const isDealItem = item.name.startsWith("[DEAL]");
                // Parse deal slot details from specialInstructions if present
                const dealSlots = isDealItem && item.specialInstructions
                  ? item.specialInstructions
                      .replace(/^\[DEAL:.*?\]\s*-?\s*/, "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];

                return (
                  <div key={item.cartItemId} className="flex gap-3 items-start">
                    <div className="relative w-12 h-12 shrink-0 bg-zinc-100 overflow-hidden rounded-sm">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-zinc-950 leading-snug">
                            {isDealItem
                              ? item.name.replace("[DEAL] ", "")
                              : item.name}
                          </p>
                          {item.variantName && !isDealItem && (
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              {item.variantName}
                            </p>
                          )}
                          {/* Deal slot breakdown */}
                          {isDealItem && dealSlots.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {dealSlots.map((slot, i) => (
                                <p key={i} className="text-[10px] text-zinc-400 leading-tight">
                                  • {slot}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.addOns && item.addOns.length > 0 && !isDealItem && (
                            <p className="text-[9px] text-zinc-400 mt-0.5">
                              + {item.addOns.map((a) => a.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-xs text-zinc-950 tracking-tight">
                            {STORE_CONSTANTS.CURRENCY} {item.subtotal}
                          </div>
                          <span className="text-[10px] text-zinc-400">{item.quantity}×</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-zinc-200 my-4" />

            {/* Coupon Input */}
            {!appliedCoupon ? (
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())
                      }
                      placeholder="COUPON CODE"
                      className="w-full pl-8 pr-3 h-10 border border-zinc-200 bg-zinc-50 text-xs font-mono focus:outline-none focus:border-zinc-950 transition-colors"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="h-10 text-[10px] font-bold px-4 uppercase tracking-wider rounded-none"
                  >
                    {isValidatingCoupon ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between bg-green-50/50 border border-green-200 p-3">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-700 font-mono tracking-widest">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-[10px] text-green-600 font-bold bg-green-100 px-1.5">
                    {appliedCoupon.discountType === "flat"
                      ? `-Rs. ${appliedCoupon.discountValue}`
                      : `-${appliedCoupon.discountValue}%`}
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-green-600 hover:text-green-800 bg-green-100 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-2.5 text-xs font-medium mb-1">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-bold text-zinc-950">
                  {STORE_CONSTANTS.CURRENCY} {subtotal}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>
                  Delivery Fee
                  {selectedZone && (
                    <span className="ml-1 text-zinc-400">({selectedZone.name})</span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    !isDelivery
                      ? "text-green-600"
                      : selectedZone
                      ? "text-zinc-950"
                      : "text-zinc-400"
                  )}
                >
                  {deliveryFeeLabel}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Discount</span>
                  <span>
                    - {STORE_CONSTANTS.CURRENCY} {couponDiscount}
                  </span>
                </div>
              )}
            </div>

            <div className="hidden lg:flex border-t border-dashed border-zinc-200 my-4" />
            <div className="hidden lg:flex justify-between items-center text-sm font-black text-zinc-950 tracking-tight">
              <span>TOTAL</span>
              <span>
                {STORE_CONSTANTS.CURRENCY} {total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-[100] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:hidden">
        <Button
          onClick={() => form.handleSubmit(onSubmit)()}
          disabled={isSubmitting || !isValid || !isStoreOpen}
          className="w-full h-[56px] font-bold shadow-xl shadow-primary/20 text-base active:scale-[0.98] transition-transform flex items-center justify-between px-6 rounded-none"
        >
          {isSubmitting ? (
            <span className="flex items-center mx-auto">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Processing...
            </span>
          ) : !isStoreOpen ? (
            <span className="mx-auto">Store is Closed</span>
          ) : (
            <>
              <span>Place Order</span>
              <span className="font-black opacity-90">
                {STORE_CONSTANTS.CURRENCY} {total}
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
