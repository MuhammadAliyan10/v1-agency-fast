// components/features/storefront/checkout-drawer.tsx
"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/lib/store/cart-store";
import { checkoutSchema, CheckoutValues } from "@/lib/validations/checkout";
import { submitOrder } from "@/server/actions/checkout";
import { validateCoupon } from "@/server/actions/coupons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Copy,
  MapPin,
  Tag,
  X,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { STORE_CONSTANTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/store/cart-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppliedCoupon {
  code: string;
  discountType: "flat" | "percent";
  discountValue: number;
  applicableItemIds: string[] | null;
}

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strips the "[DEAL] " prefix from a deal name for display. */
function formatItemName(name: string): string {
  return name.startsWith("[DEAL] ") ? name.replace("[DEAL] ", "") : name;
}

/**
 * Parses deal slot details from specialInstructions.
 * Format stored: "[DEAL: Name] - Step 1: 1× Burger, Step 2: 1× Pepsi"
 */
function parseDealSlots(specialInstructions: string | undefined): string[] {
  if (!specialInstructions) return [];
  const withoutPrefix = specialInstructions.replace(/^\[DEAL:.*?\]\s*-?\s*/, "").trim();
  if (!withoutPrefix) return [];
  return withoutPrefix
    .split(",")
    .map((s) => s.trim().replace(/^Step \d+:\s*/, ""))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckoutDrawer({ open, onOpenChange }: CheckoutDrawerProps) {
  const router = useRouter();
  const { items, getTotals, updateQuantity, removeItem, clearCart } = useCartStore();
  const { totalPrice } = getTotals();

  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

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
      couponCode: "",
    },
  });

  const orderType = form.watch("orderType");
  const paymentMethod = form.watch("paymentMethod");
  const isDelivery = orderType === "delivery";

  // Dynamic delivery fee is removed for now, admin sets it later
  const deliveryFee = 0;

  // Coupon discount computed client-side for preview
  const getCouponDiscount = (): number => {
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

  const couponDiscount = getCouponDiscount();
  const finalTotal = totalPrice + deliveryFee - couponDiscount;

  // ── Coupon handlers ───────────────────────────────────────────────────────

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const result = await validateCoupon(couponInput.trim(), totalPrice);
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
        toast.error(result.message ?? "Invalid or expired coupon.");
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

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: CheckoutValues) => {
    if (items.length === 0) return;
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await submitOrder(data, items, idempotencyKey);
      if (response.success && response.orderId) {
        clearCart();
        setAppliedCoupon(null);
        setCouponInput("");
        setSuccessOrderId(response.orderId);
      } else {
        toast.error(response.error ?? "Failed to place order. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccessOrderId(null);
      setAppliedCoupon(null);
      setCouponInput("");
      form.reset();
    }, 300);
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (successOrderId) {
    return (
      <AppDrawer open={open} onOpenChange={handleClose} className="max-h-[95vh] h-[95vh]">
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
          <div className="w-20 h-20 bg-green-50 text-green-500 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Order Confirmed!</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Your order is on its way to the kitchen.
          </p>

          <div className="bg-muted w-full p-4 border border-border mb-6">
            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Order ID
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl font-bold tracking-widest font-mono">
                {successOrderId}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(successOrderId);
                  toast.success("Copied!");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Copy order ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full space-y-3">
            <Button
              className="w-full h-12 rounded-none font-bold"
              onClick={() => {
                handleClose();
                router.push(`/track/${successOrderId}`);
              }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Track My Order
            </Button>
            <Button
              className="w-full h-12 rounded-none font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={() =>
                window.open(
                  `https://wa.me/${STORE_CONSTANTS.WHATSAPP_NUMBER}?text=Hi, I want to track my order ${successOrderId}`,
                  "_blank"
                )
              }
            >
              Ask on WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-none font-bold"
              onClick={handleClose}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </AppDrawer>
    );
  }

  // ── Main drawer ───────────────────────────────────────────────────────────

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} className="max-h-[95vh] h-[95vh]">
      <div className="flex flex-col h-full bg-background relative">
        {/* Sticky header */}
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-between">
          <h2 className="font-bold text-xl tracking-tight text-foreground">Your Order</h2>
          {items.length > 0 && (
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1">
              {items.reduce((t, i) => t + i.quantity, 0)} item(s)
            </span>
          )}
        </div>

        {/* Empty cart */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <ShoppingBag
              className="w-16 h-16 text-muted-foreground/30 mb-4"
              strokeWidth={1}
            />
            <h3 className="text-lg font-bold mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Add some delicious items from the menu.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="h-12 w-full rounded-none font-bold"
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 h-full"
          >
            <div className="flex-1 overflow-y-auto">

              {/* ── Cart Items ─────────────────────────────────────────── */}
              <div className="p-4 border-b border-border bg-muted/20">
                <div className="space-y-4">
                  {items.map((item: CartItem) => {
                    const isDealItem = item.name.startsWith("[DEAL]");
                    const dealSlots = isDealItem ? parseDealSlots(item.specialInstructions) : [];

                    return (
                      <div key={item.cartItemId} className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-14 h-14 shrink-0 bg-muted overflow-hidden rounded-sm">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm leading-snug line-clamp-2">
                                {formatItemName(item.name)}
                              </span>
                              {/* Variant or deal slots */}
                              {!isDealItem && item.variantName && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.variantName}
                                </p>
                              )}
                              {isDealItem && dealSlots.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {dealSlots.map((slot, i) => (
                                    <p
                                      key={i}
                                      className="text-[11px] text-muted-foreground leading-tight"
                                    >
                                      • {slot}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {!isDealItem &&
                                item.addOns &&
                                item.addOns.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    + {item.addOns.map((a) => a.name).join(", ")}
                                  </p>
                                )}
                            </div>
                            <span className="font-bold text-sm shrink-0">
                              Rs. {item.subtotal}
                            </span>
                          </div>

                          {/* Qty controls */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center border border-border h-7 bg-background">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-full w-7 rounded-none"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartItemId,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center font-bold text-xs">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-full w-7 rounded-none"
                                onClick={() =>
                                  updateQuantity(item.cartItemId, item.quantity + 1)
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.cartItemId)}
                              className="text-destructive hover:bg-destructive/10 p-1 transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Checkout Form ──────────────────────────────────────── */}
              <div className="p-4 space-y-5">

                {/* Order Type */}
                <Tabs
                  value={orderType}
                  onValueChange={(v) =>
                    form.setValue("orderType", v as "delivery" | "pickup")
                  }
                  className="w-full"
                >
                  <TabsList className="w-full h-12 rounded-none p-0 grid grid-cols-2 bg-muted">
                    <TabsTrigger
                      value="delivery"
                      className="rounded-none h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold transition-all border-none"
                    >
                      Home Delivery
                    </TabsTrigger>
                    <TabsTrigger
                      value="pickup"
                      className="rounded-none h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold transition-all border-none"
                    >
                      Self Pickup
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Pickup info */}
                {!isDelivery && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 text-blue-800 text-xs flex flex-col gap-1">
                    <span className="font-black uppercase text-[10px] tracking-wider">
                      Pickup Address
                    </span>
                    <span>Classy Crave, Sillanwali, Pakistan</span>
                    <span className="font-semibold opacity-80">
                      Call: {STORE_CONSTANTS.PHONE_NUMBER}
                    </span>
                  </div>
                )}

                {/* Contact fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="cd-name"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="cd-name"
                      placeholder="Ali Khan"
                      autoComplete="name"
                      className="h-12 rounded-none border-border focus-visible:ring-primary"
                      {...form.register("customerName")}
                    />
                    {form.formState.errors.customerName && (
                      <span className="text-xs text-destructive font-medium">
                        {form.formState.errors.customerName.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="cd-phone"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="cd-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="03XXXXXXXXX"
                      className="h-12 rounded-none border-border focus-visible:ring-primary"
                      {...form.register("customerPhone")}
                    />
                    {form.formState.errors.customerPhone && (
                      <span className="text-xs text-destructive font-medium">
                        {form.formState.errors.customerPhone.message}
                      </span>
                    )}
                  </div>

                  {/* Delivery-only fields */}
                  {isDelivery && (
                    <>
                      {/* Delivery Area field removed, admin sets delivery charge based on address */}

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="cd-address"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Complete Address
                        </Label>
                        <Textarea
                          id="cd-address"
                          placeholder="Street, Mohallah, House No..."
                          autoComplete="street-address"
                          className="min-h-[80px] rounded-none border-border focus-visible:ring-primary resize-none"
                          {...form.register("deliveryAddress")}
                        />
                        {form.formState.errors.deliveryAddress && (
                          <span className="text-xs text-destructive font-medium">
                            {form.formState.errors.deliveryAddress.message}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="cd-notes"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Order Notes{" "}
                      <span className="font-normal opacity-60">(Optional)</span>
                    </Label>
                    <Input
                      id="cd-notes"
                      placeholder="e.g. Less spicy, extra napkins"
                      className="h-12 rounded-none border-border focus-visible:ring-primary"
                      {...form.register("deliveryNotes")}
                    />
                  </div>
                </div>

                {/* ── Coupon field removed per client request ── */}

                {/* ── Payment Method ────────────────────────────────────── */}
                <div className="space-y-2 pb-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Payment Method
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
                    Cash on Delivery available — pay when food arrives.
                  </p>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) =>
                      form.setValue(
                        "paymentMethod",
                        v as "COD" | "EasyPaisa"
                      )
                    }
                    className="grid gap-2"
                  >
                    {[
                      {
                        value: "COD",
                        label: "Cash on Delivery",
                        desc: isDelivery
                          ? "Pay the rider when your order arrives"
                          : "Pay at the counter on pickup",
                        info: null,
                      },
                      {
                        value: "EasyPaisa",
                        label: "EasyPaisa",
                        desc: "Send payment then place order",
                        info: { account: "03027261544", title: "Roman Aftab" },
                      },
                    ].map((opt) => (
                      <div key={opt.value} className="flex flex-col gap-1">
                        <Label
                          className={cn(
                            "flex items-center gap-3 border p-4 cursor-pointer rounded-none transition-all",
                            paymentMethod === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value={opt.value} />
                          <div className="flex flex-col flex-1">
                            <span className="font-bold text-sm">{opt.label}</span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {opt.desc}
                            </span>
                          </div>
                        </Label>
                        {paymentMethod === opt.value && opt.info && (
                          <div className="p-3 ml-8 bg-muted text-sm text-muted-foreground border-l-4 border-primary space-y-1">
                            <p>
                              <strong>Account Title:</strong> {(opt.info as any)?.title || "Classy Crave"}
                            </p>
                            <p className="flex items-center gap-2">
                              <strong>Account No:</strong>
                              <span className="font-mono">{opt.info.account}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(opt.info!.account);
                                  toast.success("Copied!");
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Copy account number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* ── Sticky Footer ─────────────────────────────────────────── */}
            <div className="shrink-0 bg-background border-t border-border p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
              {/* Price breakdown */}
              <div className="space-y-1.5 mb-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">
                    Rs. {totalPrice}
                  </span>
                </div>
                {isDelivery && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className="font-semibold text-muted-foreground/60 text-xs">
                      TBD (Added later)
                    </span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount</span>
                    <span>− Rs. {couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base text-foreground pt-1 border-t border-dashed border-border">
                  <span>Total</span>
                  <span>Rs. {finalTotal}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-14 rounded-none font-bold text-base tracking-wide active:scale-[0.98] transition-transform"
              >
                {form.formState.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Place Order — Rs. ${finalTotal}`
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppDrawer>
  );
}
