// components/features/storefront/deal-customizer-drawer.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STORE_CONSTANTS } from "@/lib/constants";
import { useCartStore } from "@/lib/store/cart-store";
import { useCart } from "@/store/use-cart";
import { toast } from "sonner";
import {
  ShoppingBag, CheckCircle2, Minus, Plus, Sparkles, Utensils,
  Tag, Clock, ArrowRight, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealVariant {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean | null;
}

export interface DealMenuItem {
  id: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  variants?: DealVariant[];
}

export interface DealSlot {
  id: string;
  slotName: string;
  quantity: number;
  menuItemId?: string | null;
  categoryId?: string | null;
  requiredVariantName?: string | null;
  menuItem?: (DealMenuItem & { variants?: DealVariant[] }) | null;
  category?: {
    id: string;
    name: string;
    menuItems?: DealMenuItem[];
  } | null;
}

export interface DealItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  dealType: "combo" | "event";
  eventLabel?: string | null;
  originalPrice: number;
  dealPrice: number;
  validUntil?: Date | string | null;
  slots: DealSlot[];
}

interface SlotSelection {
  slotId: string;
  itemId: string;
  itemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
}

// ─── Helper: filter items for a dynamic slot ─────────────────────────────────

function getSlotChoices(slot: DealSlot): DealMenuItem[] {
  if (!slot.category?.menuItems) return [];
  const required = slot.requiredVariantName?.trim().toLowerCase();
  if (!required) return slot.category.menuItems;
  // Only include items that have at least one variant matching the required name
  return slot.category.menuItems.filter((item) =>
    item.variants?.some((v) => v.name.trim().toLowerCase() === required)
  );
}

// ─── SlotStep: Renders one deal slot (fixed or dynamic) ──────────────────────

function SlotStep({
  slot,
  stepNumber,
  selection,
  onSelect,
}: {
  slot: DealSlot;
  stepNumber: number;
  selection: SlotSelection | undefined;
  onSelect: (sel: SlotSelection) => void;
}) {
  const isFixed = !!slot.menuItemId && !slot.categoryId;
  const choices = useMemo(() => getSlotChoices(slot), [slot]);
  const required = slot.requiredVariantName?.trim().toLowerCase();

  if (isFixed && slot.menuItem) {
    // Fixed slot — no user choice, just display
    return (
      <div className="border border-border/60 bg-zinc-50/50">
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 border-b border-border/40">
          <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
            ✓
          </div>
          <span className="text-xs font-black uppercase tracking-wide text-zinc-600">
            Step {stepNumber}: {slot.slotName}
          </span>
          <Badge className="ml-auto text-[9px] font-bold bg-green-100 text-green-700 rounded-none border border-green-300">
            Fixed Item
          </Badge>
        </div>
        <div className="flex items-center gap-3 p-4">
          {slot.menuItem.imageUrl && (
            <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-none bg-zinc-100">
              <Image src={slot.menuItem.imageUrl} alt={slot.menuItem.name} fill className="object-cover" sizes="48px" />
            </div>
          )}
          <div>
            <p className="font-bold text-sm text-zinc-950">{slot.quantity}× {slot.menuItem.name}</p>
            <p className="text-xs text-zinc-500">Included in this deal</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto shrink-0" />
        </div>
      </div>
    );
  }

  // Dynamic slot — show radio group of choices
  const isComplete = !!selection;

  return (
    <div className={cn("border bg-white", isComplete ? "border-primary/50" : "border-border/60")}>
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 border-b",
        isComplete ? "bg-primary/5 border-primary/20" : "bg-zinc-100 border-border/40"
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
          isComplete ? "bg-primary" : "bg-zinc-400"
        )}>
          {isComplete ? "✓" : stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-black uppercase tracking-wide text-zinc-700">
            Step {stepNumber}: {slot.slotName}
          </span>
          {required && (
            <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5">
              {required.charAt(0).toUpperCase() + required.slice(1)} size
            </span>
          )}
        </div>
        {!isComplete && (
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider shrink-0">Choose one</span>
        )}
      </div>

      {choices.length === 0 ? (
        <div className="p-4 text-center text-xs text-zinc-400">
          No items available for this slot.
        </div>
      ) : (
        <RadioGroup
          value={selection?.itemId ?? ""}
          onValueChange={(itemId) => {
            const item = choices.find((c) => c.id === itemId);
            if (!item) return;
            // Find matching variant if required
            let variantId: string | undefined;
            let variantName: string | undefined;
            if (required) {
              const variant = item.variants?.find((v) => v.name.trim().toLowerCase() === required);
              variantId = variant?.id;
              variantName = variant?.name;
            }
            onSelect({ slotId: slot.id, itemId: item.id, itemName: item.name, variantId, variantName, quantity: slot.quantity });
          }}
          className="flex flex-col divide-y divide-border/30"
        >
          {choices.map((item) => {
            const matchingVariant = required
              ? item.variants?.find((v) => v.name.trim().toLowerCase() === required)
              : null;
            const isSelected = selection?.itemId === item.id;

            return (
              <label
                key={item.id}
                htmlFor={`slot-${slot.id}-item-${item.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer min-h-[48px] transition-colors",
                  isSelected ? "bg-primary/5" : "hover:bg-zinc-50"
                )}
              >
                <RadioGroupItem
                  id={`slot-${slot.id}-item-${item.id}`}
                  value={item.id}
                  className="shrink-0"
                />
                {item.imageUrl && (
                  <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-none bg-zinc-100">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="40px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold leading-snug", isSelected ? "text-primary" : "text-zinc-900")}>
                    {item.name}
                  </p>
                  {matchingVariant && (
                    <p className="text-[11px] text-zinc-500 font-medium">
                      {matchingVariant.name} · {STORE_CONSTANTS.CURRENCY} {matchingVariant.price}
                    </p>
                  )}
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </label>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
}

// ─── DealCard (replaces old one) ─────────────────────────────────────────────

export function DealCard({ deal }: { deal: DealItem }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, SlotSelection>>({});

  const addItemStore = useCartStore((state) => state.addItem);
  const addItemUseCart = useCart((state) => state.addItem);

  const savings = deal.originalPrice - deal.dealPrice;
  const savingsPct = Math.round((savings / deal.originalPrice) * 100);
  const isExpiringSoon = deal.validUntil
    ? (new Date(deal.validUntil).getTime() - Date.now()) < 24 * 60 * 60 * 1000
    : false;

  // Derive dynamic slots that require user selection
  const dynamicSlots = useMemo(() =>
    deal.slots.filter((s) => s.categoryId && !s.menuItemId),
    [deal.slots]
  );
  const fixedSlots = useMemo(() =>
    deal.slots.filter((s) => s.menuItemId && !s.categoryId),
    [deal.slots]
  );

  // Completion guard: all dynamic slots must have a selection
  const isComplete = useMemo(() =>
    dynamicSlots.every((s) => !!selections[s.id]),
    [dynamicSlots, selections]
  );

  // Auto-select first choice in each dynamic slot when drawer opens
  useEffect(() => {
    if (!drawerOpen) return;
    const auto: Record<string, SlotSelection> = {};
    dynamicSlots.forEach((slot) => {
      const choices = getSlotChoices(slot);
      if (choices.length > 0 && !selections[slot.id]) {
        const item = choices[0];
        const required = slot.requiredVariantName?.trim().toLowerCase();
        const variant = required ? item.variants?.find((v) => v.name.trim().toLowerCase() === required) : undefined;
        auto[slot.id] = { slotId: slot.id, itemId: item.id, itemName: item.name, variantId: variant?.id, variantName: variant?.name, quantity: slot.quantity };
      }
    });
    if (Object.keys(auto).length > 0) {
      setSelections((prev) => ({ ...auto, ...prev }));
    }
  }, [drawerOpen, dynamicSlots]);

  const handleSelect = (sel: SlotSelection) => {
    setSelections((prev) => ({ ...prev, [sel.slotId]: sel }));
  };

  const handleAddToCart = () => {
    if (!isComplete) return;

    // Build structured specialInstructions for KDS
    const parts: string[] = [];
    let stepNum = 1;
    deal.slots.forEach((slot) => {
      if (slot.menuItemId && slot.menuItem) {
        parts.push(`Step ${stepNum}: ${slot.quantity}× ${slot.menuItem.name}`);
      } else {
        const sel = selections[slot.id];
        if (sel) {
          const variantPart = sel.variantName ? ` (${sel.variantName})` : "";
          parts.push(`Step ${stepNum}: ${sel.quantity}× ${sel.itemName}${variantPart}`);
        }
      }
      stepNum++;
    });
    const instructionsText = `[DEAL: ${deal.name}] - ${parts.join(", ")}`;

    // Build addOns array for cart display
    const addOnsList = deal.slots.map((slot) => {
      if (slot.menuItem) return { name: `${slot.quantity}× ${slot.menuItem.name}`, price: 0 };
      const sel = selections[slot.id];
      return { name: `${sel.quantity}× ${sel.itemName}${sel.variantName ? ` (${sel.variantName})` : ""}`, price: 0 };
    });

    const primaryMenuItemId = deal.slots.find((s) => s.menuItemId)?.menuItemId
      ?? dynamicSlots[0]?.id.substring(0, 36)
      ?? deal.id.substring(0, 36);

    // 1. Add to cart-store (checkout drawer)
    addItemStore({
      id: `deal-${deal.id}-${Date.now()}`,
      name: `[DEAL] ${deal.name}`,
      price: deal.dealPrice,
      quantity,
      options: {
        imageUrl: deal.imageUrl || null,
        variant: deal.eventLabel || "Combo Offer",
        addOns: addOnsList,
        specialInstructions: instructionsText,
      },
    });

    toast.success(`${quantity}× "${deal.name}" added to cart!`);
    setDrawerOpen(false);
    setQuantity(1);
    setSelections({});
  };

  return (
    <>
      {/* ── Card ─────────────────────────────────────── */}
      <div className="group bg-white border border-zinc-200/80 hover:border-primary/50 flex flex-col overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        {/* Image Banner */}
        <div className="relative aspect-[16/9] w-full bg-zinc-100 overflow-hidden">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl} alt={deal.name} fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-amber-50 to-primary/5 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-10 h-10 text-primary opacity-50" />
              <span className="text-[10px] font-black text-primary tracking-widest uppercase">{deal.eventLabel || "Special Deal"}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-1 rounded-none shadow-md">SAVE {savingsPct}%</Badge>
            {deal.dealType === "event" && deal.eventLabel && (
              <Badge className="bg-black text-white font-bold text-xs px-2 py-0.5 rounded-none">{deal.eventLabel}</Badge>
            )}
          </div>
          {savings > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-none">
              Save {STORE_CONSTANTS.CURRENCY} {savings}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col flex-1">
          <h2 className="font-heading font-black text-lg text-zinc-950 tracking-tight leading-snug group-hover:text-primary transition-colors mb-1">
            {deal.name}
          </h2>
          {deal.description && (
            <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{deal.description}</p>
          )}

          {/* Slot list preview */}
          {deal.slots.length > 0 && (
            <div className="mb-5 bg-zinc-50 p-3 border border-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                <Utensils className="w-3 h-3 text-primary" /> What's Included:
              </p>
              <ul className="space-y-1.5">
                {deal.slots.map((slot, idx) => (
                  <li key={idx} className="flex items-center text-xs text-zinc-800 font-semibold gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>
                      <span className="font-bold text-primary mr-1">{slot.quantity}×</span>
                      {slot.slotName}
                      {slot.categoryId && (
                        <span className="ml-1.5 text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.5">
                          (Choose {slot.requiredVariantName || "flavor"})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isExpiringSoon && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-bold mb-4 bg-amber-50 px-2.5 py-1 border border-amber-200/60">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> Limited time remaining!
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
            <div>
              <span className="text-xl font-black text-zinc-950">{STORE_CONSTANTS.CURRENCY} {deal.dealPrice}</span>
              <span className="text-xs text-zinc-400 line-through ml-2">{STORE_CONSTANTS.CURRENCY} {deal.originalPrice}</span>
            </div>
            <Button
              onClick={() => setDrawerOpen(true)}
              className="h-11 px-5 font-bold text-xs uppercase tracking-wider rounded-none gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {dynamicSlots.length > 0 ? "Customize & Order" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Customizer Drawer ────────────────────────── */}
      <AppDrawer open={drawerOpen} onOpenChange={setDrawerOpen} className="max-h-[95vh]">
        {/* Header */}
        <div className="sticky -top-1 z-10 bg-white border-b border-border/60 pb-3 mb-4 -mx-4 px-4">
          {deal.imageUrl && (
            <div className="relative h-32 w-full bg-zinc-100 overflow-hidden -mt-4 mb-3 mx-0">
              <Image src={deal.imageUrl} alt={deal.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <Badge className="bg-primary text-white text-[10px] font-black rounded-none mb-1">{savingsPct}% OFF</Badge>
                <h2 className="text-white font-heading font-black text-lg leading-tight">{deal.name}</h2>
              </div>
            </div>
          )}
          {!deal.imageUrl && (
            <div className="mb-2">
              <Badge className="bg-primary text-white text-[10px] font-black rounded-none mb-1">{savingsPct}% OFF</Badge>
              <h2 className="font-heading font-black text-xl text-zinc-950">{deal.name}</h2>
              {deal.description && <p className="text-xs text-zinc-500 mt-1">{deal.description}</p>}
            </div>
          )}
          {dynamicSlots.length > 0 && (
            <p className="text-xs text-zinc-500 font-medium flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
              Select your preferences for {dynamicSlots.length} item{dynamicSlots.length > 1 ? "s" : ""} below
            </p>
          )}
        </div>

        {/* Slot Steps */}
        <div className="space-y-3 pb-4">
          {deal.slots.map((slot, index) => (
            <SlotStep
              key={slot.id}
              slot={slot}
              stepNumber={index + 1}
              selection={selections[slot.id]}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Quantity + Add to Cart sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-border/60 pt-4 -mx-4 px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total</span>
              <span className="text-lg font-black text-zinc-950">{STORE_CONSTANTS.CURRENCY} {deal.dealPrice * quantity}</span>
            </div>
            <div className="flex items-center border border-zinc-300">
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-black text-sm">{quantity}</span>
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!isComplete}
            className="w-full h-13 font-bold text-sm uppercase tracking-wider rounded-none gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {isComplete
              ? `Add to Cart · ${STORE_CONSTANTS.CURRENCY} ${deal.dealPrice * quantity}`
              : `Choose all items to continue (${Object.keys(selections).length}/${dynamicSlots.length} done)`}
          </Button>
        </div>
      </AppDrawer>
    </>
  );
}
